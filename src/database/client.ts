import { Pool, PoolClient, type QueryResultRow } from 'pg';
import { DATABASE_URL, SCHEMA } from '../config/index.js';

let pool: Pool | null = null;

export interface User extends QueryResultRow {
  user_id: string;
  username: string;
  nickname: string | null;
  current_xp: number;
  current_level: number;
  current_progression_role: string;
  promotion_eligibility_percentage: number;
  total_residuals_balance: number;
  lifetime_residuals_earned: number;
  lifetime_residuals_spent: number;
  last_xp_timestamp: Date | null;
  daily_xp_earned: number;
  last_daily_xp_reset: Date | null;
  daily_bonus_paid: boolean;
  last_promotion_timestamp: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ResidualBalanceRow extends QueryResultRow {
  total_residuals_balance: number;
  lifetime_residuals_earned: number;
  lifetime_residuals_spent: number;
}

interface LeaderboardRow extends QueryResultRow {
  user_id: string;
  username: string;
  current_xp: number;
  current_level: number;
}

export interface XPTransaction {
  id: number;
  user_id: string;
  amount: number;
  source: string;
  reason: string | null;
  created_at: Date;
}

export interface ResidualTransaction {
  id: number;
  user_id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_type: string;
  source: string;
  reason: string | null;
  admin_user_id: string | null;
  description: string | null;
  created_at: Date;
}

export async function connect(): Promise<void> {
  if (pool) {
    console.log('Database pool already initialized');
    return;
  }

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
  });

  // This is idempotent schema initialization, not a versioned migration system.
  try {
    await pool.query(SCHEMA);
    console.log('✓ Database connected and schema initialized');
  } catch (error) {
    console.error('✗ Failed to initialize database schema:', error);
    await pool.end().catch(endError => {
      console.error('✗ Failed to close database pool after initialization error:', endError);
    });
    pool = null;
    throw error;
  }
}

export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✓ Database disconnected');
  }
}

export async function getClient(): Promise<PoolClient> {
  if (!pool) {
    throw new Error('Database not connected. Call connect() first.');
  }
  return pool.connect();
}

export async function getOrCreateUser(userId: string, username: string, nickname: string): Promise<User> {
  const client = await getClient();
  try {
    console.log(`[getOrCreateUser] Looking for user_id: ${userId} (type: ${typeof userId})`);

    // Try to get existing user
    const result = await client.query<User>(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      console.log(`[getOrCreateUser] Found existing user: ${username}`);
      // Update username/nickname if changed
      await client.query(
        'UPDATE users SET username = $1, nickname = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [username, nickname, userId]
      );
      return mapRowToUser(result.rows[0]);
    }

    console.log(`[getOrCreateUser] Creating new user: ${username} with user_id: ${userId}`);
    // Create new user
    const insertResult = await client.query<User>(
      `INSERT INTO users (user_id, username, nickname, current_progression_role)
       VALUES ($1, $2, $3, 'audience')
       RETURNING *`,
      [userId, username, nickname]
    );

    return mapRowToUser(insertResult.rows[0]);
  } finally {
    client.release();
  }
}

export async function getUser(userId: string): Promise<User | null> {
  const client = await getClient();
  try {
    console.log(`[getUser] Querying for user_id: ${userId} (type: ${typeof userId})`);

    const result = await client.query<User>(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    console.log(`[getUser] Query returned ${result.rows.length} rows`);

    if (result.rows.length === 0) {
      // Check if there are any users at all in the database
      const countResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`[getUser] Total users in database: ${countResult.rows[0].count}`);

      // Show a sample of existing user_ids for debugging
      const sampleResult = await client.query('SELECT user_id, username FROM users LIMIT 5');
      console.log(`[getUser] Sample user_ids in database:`, sampleResult.rows.map(r => ({ id: r.user_id, type: typeof r.user_id, username: r.username })));

      return null;
    }

    return mapRowToUser(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function addUserXP(userId: string, amount: number, source: string, reason?: string): Promise<number | null> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Update user XP
    const updateResult = await client.query(
      `UPDATE users 
       SET current_xp = current_xp + $1,
           daily_xp_earned = daily_xp_earned + $1,
           last_xp_timestamp = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING current_xp`,
      [amount, userId]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const newXP = updateResult.rows[0].current_xp;

    // Log transaction
    await client.query(
      `INSERT INTO xp_transactions (user_id, amount, source, reason)
       VALUES ($1, $2, $3, $4)`,
      [userId, amount, source, reason || null]
    );

    await client.query('COMMIT');
    return newXP;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to add user XP:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function setUserXP(userId: string, amount: number, adminUserId?: string, reason?: string): Promise<number | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT current_xp FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const oldXP = result.rows[0].current_xp;

    const updateResult = await client.query(
      `UPDATE users 
       SET current_xp = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING current_xp`,
      [amount, userId]
    );

    if (updateResult.rows.length === 0) {
      return null;
    }

    // Log admin change if adminUserId provided
    if (adminUserId) {
      await client.query(
        `INSERT INTO admin_xp_changes (admin_user_id, target_user_id, change_type, old_value, new_value, reason)
         VALUES ($1, $2, 'set', $3, $4, $5)`,
        [adminUserId, userId, oldXP.toString(), amount.toString(), reason || null]
      );
    }

    return updateResult.rows[0].current_xp;
  } finally {
    client.release();
  }
}

export async function setUserLevel(userId: string, level: number): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `UPDATE users 
       SET current_level = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [level, userId]
    );
  } finally {
    client.release();
  }
}

export async function setUserProgressionRole(userId: string, role: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `UPDATE users 
       SET current_progression_role = $1, 
           last_promotion_timestamp = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [role, userId]
    );
  } finally {
    client.release();
  }
}

export async function updatePromotionEligibility(userId: string, eligibility: number): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `UPDATE users 
       SET promotion_eligibility_percentage = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [eligibility, userId]
    );
  } finally {
    client.release();
  }
}

export async function resetDailyXP(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `UPDATE users
       SET daily_xp_earned = 0,
           daily_bonus_paid = FALSE,
           last_daily_xp_reset = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
  } finally {
    client.release();
  }
}

export async function setDailyBonusPaid(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `UPDATE users
       SET daily_bonus_paid = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
  } finally {
    client.release();
  }
}

export async function addResiduals(
  userId: string,
  amount: number,
  source: string,
  reason?: string,
  adminUserId?: string,
  description?: string
): Promise<number | null> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get current balance
    const userResult = await client.query<ResidualBalanceRow>(
      'SELECT total_residuals_balance, lifetime_residuals_earned, lifetime_residuals_spent FROM users WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const balanceBefore = userResult.rows[0].total_residuals_balance;
    const balanceAfter = balanceBefore + amount;
    if (balanceAfter < 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Update user balance
    await client.query(
      `UPDATE users 
       SET total_residuals_balance = total_residuals_balance + $1,
           lifetime_residuals_earned = lifetime_residuals_earned + GREATEST($1, 0),
           lifetime_residuals_spent = lifetime_residuals_spent + GREATEST(-$1, 0),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [amount, userId]
    );

    // Determine transaction type
    let transactionType = 'neutral';
    if (amount > 0) transactionType = 'earn';
    if (amount < 0) transactionType = 'spend';

    // Log transaction
    await client.query(
      `INSERT INTO residual_transactions 
       (user_id, amount, balance_before, balance_after, transaction_type, source, reason, admin_user_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        transactionType,
        source,
        reason || null,
        adminUserId || null,
        description || null,
      ]
    );

    await client.query('COMMIT');
    return balanceAfter;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to add residuals:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function setResiduals(
  userId: string,
  amount: number,
  adminUserId: string,
  reason?: string
): Promise<number | null> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get current balance
    const userResult = await client.query(
      'SELECT total_residuals_balance FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const balanceBefore = userResult.rows[0].total_residuals_balance;

    // Update user balance
    await client.query(
      `UPDATE users 
       SET total_residuals_balance = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [amount, userId]
    );

    // Log admin change
    await client.query(
      `INSERT INTO admin_residual_changes (admin_user_id, target_user_id, change_type, old_value, new_value, reason)
       VALUES ($1, $2, 'set', $3, $4, $5)`,
      [adminUserId, userId, balanceBefore, amount, reason || null]
    );

    await client.query('COMMIT');
    return amount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to set residuals:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function getResiduals(userId: string): Promise<{ balance: number; lifetime_earned: number; lifetime_spent: number } | null> {
  const client = await getClient();
  try {
    const result = await client.query<ResidualBalanceRow>(
      'SELECT total_residuals_balance, lifetime_residuals_earned, lifetime_residuals_spent FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      balance: row.total_residuals_balance,
      lifetime_earned: row.lifetime_residuals_earned,
      lifetime_spent: row.lifetime_residuals_spent,
    };
  } finally {
    client.release();
  }
}

export async function getResidualHistory(userId: string, limit: number = 20): Promise<ResidualTransaction[]> {
  const client = await getClient();
  try {
    const result = await client.query<ResidualTransaction>(
      `SELECT * FROM residual_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(mapRowToResidualTransaction);
  } finally {
    client.release();
  }
}

export async function getLeaderboard(limit: number = 5): Promise<Array<{ user_id: string; username: string; current_xp: number; current_level: number }>> {
  const client = await getClient();
  try {
    const result = await client.query<LeaderboardRow>(
      `SELECT user_id, username, current_xp, current_level 
       FROM users 
       ORDER BY current_xp DESC 
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      user_id: row.user_id,
      username: row.username,
      current_xp: row.current_xp,
      current_level: row.current_level,
    }));
  } finally {
    client.release();
  }
}

function mapRowToUser(row: User): User {
  return {
    user_id: row.user_id,
    username: row.username,
    nickname: row.nickname,
    current_xp: row.current_xp,
    current_level: row.current_level,
    current_progression_role: row.current_progression_role,
    promotion_eligibility_percentage: row.promotion_eligibility_percentage,
    total_residuals_balance: row.total_residuals_balance,
    lifetime_residuals_earned: row.lifetime_residuals_earned,
    lifetime_residuals_spent: row.lifetime_residuals_spent,
    last_xp_timestamp: row.last_xp_timestamp,
    daily_xp_earned: row.daily_xp_earned,
    last_daily_xp_reset: row.last_daily_xp_reset,
    daily_bonus_paid: row.daily_bonus_paid || false,
    last_promotion_timestamp: row.last_promotion_timestamp,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRowToResidualTransaction(row: ResidualTransaction): ResidualTransaction {
  return {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    balance_before: row.balance_before,
    balance_after: row.balance_after,
    transaction_type: row.transaction_type,
    source: row.source,
    reason: row.reason,
    admin_user_id: row.admin_user_id,
    description: row.description,
    created_at: row.created_at,
  };
}
