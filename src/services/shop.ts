import { getClient } from '../database/client.js';
import { COLORS_CONFIG, RETIRED_COLORS } from '../config/colors.js';
import { PERSONAS_CONFIG, PERSONA_KEYS } from '../config/archetypes.js';
import { levelTooLow, shortOnFunds } from './shopText.js';

export interface ShopArchetype {
  id: number;
  persona_key: string | null;
  name: string;
  tier: string;
  price: number;
  min_level: number;
  max_holders: number | null;
  monthly: boolean;
  active: boolean;
  role_id: string | null;
}

export interface ShopColor {
  id: number;
  name: string;
  hex: string;
  price: number;
  tier: string;
  min_level: number;
  active: boolean;
  sort_order: number;
  role_id: string | null;
}

export interface UserArchetype {
  id: number;
  user_id: string;
  archetype_id: number;
  persona_key: string | null;
  role_id: string | null;
  monthly: boolean;
  slot_index: number;
  acquired_at: Date;
  free_grant: boolean;
  name: string;
  tier: string;
  price: number;
}

export interface UserColor {
  id: number;
  user_id: string;
  color_id: number;
  active: boolean;
  acquired_at: Date;
  free_grant: boolean;
  name: string;
  hex: string;
  price: number;
}

// Seed shop personas (idempotent).
// Personas are identified by their permanent persona_key. Display names can
// change in the config without losing owners, role IDs or holder counts.
export async function seedShopArchetypes(): Promise<void> {
  const client = await getClient();
  try {
    const keys = PERSONAS_CONFIG.map(p => p.key);

    // Backfill: rows created before persona_key existed are matched by name once.
    for (const personaConfig of PERSONAS_CONFIG) {
      await client.query(
        `UPDATE shop_archetypes SET persona_key = $1
         WHERE persona_key IS NULL AND name = $2
           AND NOT EXISTS (SELECT 1 FROM shop_archetypes WHERE persona_key = $1)`,
        [personaConfig.key, personaConfig.name]
      );
    }

    // Retire personas that are no longer in the config. Rows nobody owns are
    // removed; rows people own are only hidden (never DELETE owned rows).
    await client.query(
      'UPDATE shop_archetypes SET active = false WHERE persona_key IS NULL OR NOT (persona_key = ANY($1::text[]))',
      [keys]
    );
    await client.query(
      `DELETE FROM shop_archetypes sa
       WHERE (sa.persona_key IS NULL OR NOT (sa.persona_key = ANY($1::text[])))
         AND NOT EXISTS (SELECT 1 FROM user_archetypes ua WHERE ua.archetype_id = sa.id)`,
      [keys]
    );

    // Insert / update personas from config (role_id is kept)
    for (const personaConfig of PERSONAS_CONFIG) {
      await client.query(
        `INSERT INTO shop_archetypes (persona_key, name, tier, price, min_level, max_holders, monthly, active, sort_order, role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NULL)
         ON CONFLICT (persona_key) DO UPDATE SET
           name = EXCLUDED.name,
           tier = EXCLUDED.tier,
           price = EXCLUDED.price,
           min_level = EXCLUDED.min_level,
           max_holders = EXCLUDED.max_holders,
           monthly = EXCLUDED.monthly,
           active = true,
           sort_order = EXCLUDED.sort_order`,
        [
          personaConfig.key,
          personaConfig.name,
          personaConfig.tier,
          personaConfig.price,
          personaConfig.minLevel,
          personaConfig.maxHolders,
          personaConfig.monthly,
          personaConfig.sortOrder,
        ]
      );
    }
  } finally {
    client.release();
  }
}

// Seed shop colors (idempotent)
export async function seedShopColors(): Promise<void> {
  const client = await getClient();
  try {
    // First, set all retired colors to inactive
    for (const retiredName of RETIRED_COLORS) {
      await client.query(
        `UPDATE shop_colors
         SET active = false
         WHERE name = $1`,
        [retiredName]
      );
    }

    // Insert or update new colors from config
    for (const colorConfig of COLORS_CONFIG) {
      await client.query(
        `INSERT INTO shop_colors (name, hex, price, tier, min_level, active, sort_order, role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (name) DO UPDATE SET
           hex = EXCLUDED.hex,
           price = EXCLUDED.price,
           tier = EXCLUDED.tier,
           min_level = EXCLUDED.min_level,
           active = EXCLUDED.active,
           sort_order = EXCLUDED.sort_order,
           role_id = COALESCE(EXCLUDED.role_id, shop_colors.role_id)`,
        [
          colorConfig.name,
          colorConfig.hex,
          colorConfig.price,
          colorConfig.tier,
          colorConfig.minLevel,
          true, // active
          colorConfig.sortOrder,
          null, // role_id will be set by $shop
        ]
      );
    }
  } finally {
    client.release();
  }
}

// Get all shop archetypes
export async function getShopArchetypes(): Promise<ShopArchetype[]> {
  const client = await getClient();
  try {
    const result = await client.query('SELECT * FROM shop_archetypes WHERE active = true ORDER BY sort_order, name');
    return result.rows;
  } finally {
    client.release();
  }
}

// Get archetypes grouped by tier with holder counts
export async function getShopArchetypesByTier(): Promise<Record<string, (ShopArchetype & { currentHolders: number })[]>> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT sa.*, COUNT(ua.user_id) as current_holders
       FROM shop_archetypes sa
       LEFT JOIN user_archetypes ua ON sa.id = ua.archetype_id
       WHERE sa.active = true
       GROUP BY sa.id
       ORDER BY sa.sort_order, sa.name`
    );
    const archetypes = result.rows as (ShopArchetype & { current_holders: string })[];
    const grouped: Record<string, (ShopArchetype & { currentHolders: number })[]> = {};

    for (const archetype of archetypes) {
      if (!grouped[archetype.tier]) {
        grouped[archetype.tier] = [];
      }
      grouped[archetype.tier].push({
        ...archetype,
        currentHolders: parseInt(archetype.current_holders),
      });
    }

    return grouped;
  } finally {
    client.release();
  }
}

// Get all shop colors (only active ones)
export async function getShopColors(): Promise<ShopColor[]> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT * FROM shop_colors WHERE active = true ORDER BY sort_order, name'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// Get colors grouped by tier
export async function getShopColorsByTier(): Promise<Record<string, ShopColor[]>> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT * FROM shop_colors WHERE active = true ORDER BY sort_order, name'
    );
    const colors = result.rows as ShopColor[];
    const grouped: Record<string, ShopColor[]> = {};

    for (const color of colors) {
      if (!grouped[color.tier]) {
        grouped[color.tier] = [];
      }
      grouped[color.tier].push(color);
    }

    return grouped;
  } finally {
    client.release();
  }
}

// Get user's archetypes
export async function getUserArchetypes(userId: string): Promise<UserArchetype[]> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT ua.*, sa.persona_key, sa.role_id, sa.monthly, sa.name, sa.tier, sa.price
       FROM user_archetypes ua
       JOIN shop_archetypes sa ON ua.archetype_id = sa.id
       WHERE ua.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM role_expiry re
           WHERE re.user_id = ua.user_id AND re.archetype_id = ua.archetype_id
             AND re.expires_at <= CURRENT_TIMESTAMP
         )
       ORDER BY ua.slot_index, ua.acquired_at`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// Get user's colors
export async function getUserColors(userId: string): Promise<UserColor[]> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT uc.*, sc.name, sc.hex, sc.price
       FROM user_colors uc
       JOIN shop_colors sc ON uc.color_id = sc.id
       WHERE uc.user_id = $1
       ORDER BY uc.active DESC, uc.acquired_at`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}



export async function purchaseArchetype(
  userId: string,
  archetypeId: number,
  freeGrant: boolean = false
): Promise<{ success: boolean; reason?: string; refund?: number }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get archetype details
    const archetypeResult = await client.query(
      'SELECT * FROM shop_archetypes WHERE id = $1 FOR UPDATE',
      [archetypeId]
    );
    if (archetypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Archetype not found' };
    }
    const archetype = archetypeResult.rows[0] as ShopArchetype;

    // Check if archetype is active
    if (!archetype.active) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'This archetype is no longer available' };
    }

    // Unknown Entity is special: no limit, no refund, doesn't replace existing archetype
    const isUnknownEntity = archetype.persona_key === PERSONA_KEYS.UNKNOWN_ENTITY;

    // Level gate (checked below)
    const userResult = await client.query(
      'SELECT current_level FROM users WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'User not found' };
    }
    const userLevel = userResult.rows[0].current_level;

    // Every persona is level-gated
    if (userLevel < archetype.min_level) {
      await client.query('ROLLBACK');
      return { success: false, reason: levelTooLow(archetype.name, archetype.min_level, userLevel) };
    }

    // Already owns this persona? (checked before the cap so the message is accurate)
    if (!isUnknownEntity) {
      const alreadyOwned = await client.query(
        'SELECT 1 FROM user_archetypes WHERE user_id = $1 AND archetype_id = $2',
        [userId, archetypeId]
      );
      if (alreadyOwned.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'You already own this persona' };
      }
    }

    // Check server-wide holder cap (unless unlimited)
    if (archetype.max_holders !== null) {
      const holdersResult = await client.query(
        'SELECT COUNT(*) as count FROM user_archetypes WHERE archetype_id = $1',
        [archetypeId]
      );
      const currentHolders = parseInt(holdersResult.rows[0].count);
      if (currentHolders >= archetype.max_holders) {
        await client.query('ROLLBACK');
        return { success: false, reason: `All ${archetype.max_holders} spots are taken` };
      }
    }

    // For Unknown Entity, check if user already has an active (non-expired) subscription
    if (isUnknownEntity) {
      const existingExpiryResult = await client.query(
        `SELECT expires_at FROM role_expiry
         WHERE user_id = $1 AND archetype_id = $2 AND expires_at > CURRENT_TIMESTAMP`,
        [userId, archetypeId]
      );

      if (existingExpiryResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'You already have an active Unknown Entity subscription. Wait for it to expire before renewing.' };
      }
    }

    let refundAmount = 0;
    let balanceBefore = 0;

    // If user already has an archetype and this isn't Unknown Entity, remove it and refund 50%
    if (!isUnknownEntity) {
      const existingResult = await client.query(
        `SELECT ua.archetype_id, ua.free_grant
         FROM user_archetypes ua
         JOIN shop_archetypes sa ON sa.id = ua.archetype_id
         WHERE ua.user_id = $1 AND sa.monthly = false`,
        [userId]
      );

      if (existingResult.rows.length > 0) {
        const existingArchetype = existingResult.rows[0];

        if (existingArchetype.archetype_id === archetypeId) {
          await client.query('ROLLBACK');
          return { success: false, reason: 'You already own this persona' };
        }

        // Get price of existing archetype for refund
        const existingPriceResult = await client.query(
          'SELECT price FROM shop_archetypes WHERE id = $1',
          [existingArchetype.archetype_id]
        );
        const existingPrice = existingPriceResult.rows[0].price;

        // Only refund if it wasn't a free grant
        if (!existingArchetype.free_grant) {
          refundAmount = Math.floor(existingPrice * 0.5);
        }

        // Remove existing archetype
        await client.query(
          'DELETE FROM user_archetypes WHERE user_id = $1 AND archetype_id = $2',
          [userId, existingArchetype.archetype_id]
        );
      }
    }

    // Check user balance (unless free grant) - use FOR UPDATE to prevent race conditions
    if (!freeGrant) {
      const balanceResult = await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      balanceBefore = balanceResult.rows[0].total_residuals_balance;

      const netCost = archetype.price - refundAmount;

      if (balanceBefore < netCost) {
        await client.query('ROLLBACK');
        return { success: false, reason: shortOnFunds(netCost, balanceBefore) };
      }

      // Deduct residuals (net cost after refund)
      await client.query(
        `UPDATE users
         SET total_residuals_balance = total_residuals_balance - $1,
             lifetime_residuals_spent = lifetime_residuals_spent + $1
         WHERE user_id = $2`,
        [netCost, userId]
      );
    } else {
      // For free grants, still lock the user row for consistency
      await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
    }

    // Add new archetype (always slot 0 since only one allowed, except Unknown Entity)
    await client.query(
      `INSERT INTO user_archetypes (user_id, archetype_id, slot_index, free_grant)
       VALUES ($1, $2, 0, $3)`,
      [userId, archetypeId, freeGrant]
    );

    // For Unknown Entity (monthly), add expiry record (30 days from now)
    if (isUnknownEntity) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await client.query(
        `INSERT INTO role_expiry (user_id, archetype_id, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, archetype_id) DO UPDATE SET
           expires_at = EXCLUDED.expires_at`,
        [userId, archetypeId, expiresAt]
      );
    }

    // Log transaction
    if (!freeGrant) {
      const netCost = archetype.price - refundAmount;
      const balanceAfter = balanceBefore - netCost;
      
      // Log the purchase
      await client.query(
        `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
         VALUES ($1, $2, $3, $4, 'purchase', 'shop_purchase', 'Archetype purchase')`,
        [userId, -archetype.price, balanceBefore, balanceBefore - archetype.price]
      );
      
      // Log the refund if applicable
      if (refundAmount > 0) {
        await client.query(
          `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
           VALUES ($1, $2, $3, $4, 'refund', 'shop_refund', '50% refund for archetype replacement')`,
          [userId, refundAmount, balanceBefore - archetype.price, balanceAfter]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, refund: refundAmount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing archetype:', error);
    return { success: false, reason: 'Purchase failed' };
  } finally {
    client.release();
  }
}

// Purchase color.
//
// Unlike archetypes, colors STACK: a user can own as many color roles as
// they want at once. Buying a new color never removes or refunds an old
// one — it's simply added to the collection and equipped immediately.
// Which owned colors are actually equipped (i.e. have the Discord role on)
// is controlled independently afterward via setColorActive / `.manage`.
export async function purchaseColor(
  userId: string,
  colorId: number,
  freeGrant: boolean = false
): Promise<{ success: boolean; reason?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get color details
    const colorResult = await client.query(
      'SELECT * FROM shop_colors WHERE id = $1',
      [colorId]
    );
    if (colorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Color not found' };
    }
    const color = colorResult.rows[0] as ShopColor;

    // Check if color is active
    if (!color.active) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'This color is no longer available' };
    }

    // Get user data (colors are level-gated)
    const userResult = await client.query(
      'SELECT current_level FROM users WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'User not found' };
    }
    if (userResult.rows[0].current_level < color.min_level) {
      await client.query('ROLLBACK');
      return { success: false, reason: levelTooLow(color.name, color.min_level, userResult.rows[0].current_level) };
    }

    // Check if user already owns this specific color (unique index handles this, but check for better error message)
    const ownedResult = await client.query(
      'SELECT id FROM user_colors WHERE user_id = $1 AND color_id = $2',
      [userId, colorId]
    );
    if (ownedResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Color already owned' };
    }

    let balanceBefore = 0;

    // Check user balance (unless free grant) - use FOR UPDATE to prevent race conditions
    if (!freeGrant) {
      const balanceResult = await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      balanceBefore = balanceResult.rows[0].total_residuals_balance;

      if (balanceBefore < color.price) {
        await client.query('ROLLBACK');
        return { success: false, reason: shortOnFunds(color.price, balanceBefore) };
      }

      // Deduct residuals
      await client.query(
        `UPDATE users
         SET total_residuals_balance = total_residuals_balance - $1,
             lifetime_residuals_spent = lifetime_residuals_spent + $1
         WHERE user_id = $2`,
        [color.price, userId]
      );
    }

    // Add new color, equipped (active) right away — it joins whatever
    // colors the user already owns rather than replacing them.
    await client.query(
      `INSERT INTO user_colors (user_id, color_id, active, free_grant)
       VALUES ($1, $2, TRUE, $3)`,
      [userId, colorId, freeGrant]
    );

    // Log transaction
    if (!freeGrant) {
      await client.query(
        `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
         VALUES ($1, $2, $3, $4, 'purchase', 'shop_purchase', 'Color purchase')`,
        [userId, -color.price, balanceBefore, balanceBefore - color.price]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing color:', error);
    return { success: false, reason: 'Purchase failed' };
  } finally {
    client.release();
  }
}

// Equip or unequip a single owned color independently of any others the
// user owns. This is what `.manage` (and the shop's Equip/Unequip buttons)
// call — since colors stack, more than one can be active at the same time.
export async function setColorActive(
  userId: string,
  colorId: number,
  active: boolean
): Promise<{ success: boolean; reason?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ownedResult = await client.query(
      'SELECT id, active FROM user_colors WHERE user_id = $1 AND color_id = $2',
      [userId, colorId]
    );
    if (ownedResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Color not owned' };
    }

    await client.query(
      'UPDATE user_colors SET active = $1 WHERE user_id = $2 AND color_id = $3',
      [active, userId, colorId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating color equip state:', error);
    return { success: false, reason: 'Update failed' };
  } finally {
    client.release();
  }
}

// Sell one or more owned colors back for 50% of their original value.
// Free-grant colors are removed but refund 0 (nothing was paid for them).
// All requested colors must be owned or the whole sale is rejected — no
// partial sells.
export async function sellColors(
  userId: string,
  colorIds: number[]
): Promise<{ success: boolean; reason?: string; refundTotal?: number; sold?: { colorId: number; name: string; refund: number; roleId?: string }[] }> {
  if (colorIds.length === 0) {
    return { success: false, reason: 'No colors selected' };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ownedResult = await client.query(
      `SELECT uc.color_id, uc.free_grant, sc.name, sc.price, sc.role_id
       FROM user_colors uc
       JOIN shop_colors sc ON uc.color_id = sc.id
       WHERE uc.user_id = $1 AND uc.color_id = ANY($2::int[])`,
      [userId, colorIds]
    );

    if (ownedResult.rows.length !== colorIds.length) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'One or more selected colors are not owned' };
    }

    const sold = ownedResult.rows.map((row: any) => ({
      colorId: row.color_id,
      name: row.name,
      refund: row.free_grant ? 0 : Math.floor(row.price * 0.5),
      roleId: row.role_id,
    }));
    const refundTotal = sold.reduce((sum: number, item: { refund: number }) => sum + item.refund, 0);

    const balanceResult = await client.query(
      'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    const balanceBefore = balanceResult.rows[0].total_residuals_balance;

    await client.query(
      'DELETE FROM user_colors WHERE user_id = $1 AND color_id = ANY($2::int[])',
      [userId, colorIds]
    );

    if (refundTotal > 0) {
      await client.query(
        `UPDATE users SET total_residuals_balance = total_residuals_balance + $1 WHERE user_id = $2`,
        [refundTotal, userId]
      );
    }

    let runningBalance = balanceBefore;
    for (const item of sold) {
      const balanceAfter = runningBalance + item.refund;
      await client.query(
        `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
         VALUES ($1, $2, $3, $4, 'refund', 'shop_sell', $5)`,
        [userId, item.refund, runningBalance, balanceAfter, `Sold color: ${item.name}`]
      );
      runningBalance = balanceAfter;
    }

    await client.query('COMMIT');
    return { success: true, refundTotal, sold };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error selling colors:', error);
    return { success: false, reason: 'Sale failed' };
  } finally {
    client.release();
  }
}

// Sell the user's current archetype back for 50% of its value. Only one
// archetype can ever be owned, so there's nothing to select — this just
// sells whichever one they have.
export async function sellArchetype(
  userId: string
): Promise<{ success: boolean; reason?: string; refund?: number; name?: string; roleId?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ownedResult = await client.query(
      `SELECT ua.archetype_id, ua.free_grant, sa.name, sa.price, sa.role_id
       FROM user_archetypes ua
       JOIN shop_archetypes sa ON ua.archetype_id = sa.id
       WHERE ua.user_id = $1 AND sa.monthly = false`,
      [userId]
    );

    if (ownedResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'No archetype owned' };
    }

    const owned = ownedResult.rows[0];
    const refund = owned.free_grant ? 0 : Math.floor(owned.price * 0.5);

    const balanceResult = await client.query(
      'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    const balanceBefore = balanceResult.rows[0].total_residuals_balance;

    await client.query('DELETE FROM user_archetypes WHERE user_id = $1 AND archetype_id = $2', [userId, owned.archetype_id]);

    if (refund > 0) {
      await client.query(
        `UPDATE users SET total_residuals_balance = total_residuals_balance + $1 WHERE user_id = $2`,
        [refund, userId]
      );

      await client.query(
        `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
         VALUES ($1, $2, $3, $4, 'refund', 'shop_sell', $5)`,
        [userId, refund, balanceBefore, balanceBefore + refund, `Sold archetype: ${owned.name}`]
      );
    }

    await client.query('COMMIT');
    return { success: true, refund, name: owned.name, roleId: owned.role_id };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error selling archetype:', error);
    return { success: false, reason: 'Sale failed' };
  } finally {
    client.release();
  }
}

// Check if user has booster free grants available
export async function hasBoosterFreeGrants(userId: string): Promise<{ archetype: boolean; color: boolean }> {
  const client = await getClient();
  try {
    const archetypeResult = await client.query(
      `SELECT COUNT(*) as count FROM user_archetypes ua
       JOIN shop_archetypes sa ON ua.archetype_id = sa.id
       WHERE ua.user_id = $1 AND ua.free_grant = TRUE AND (sa.tier = 'standard' OR sa.tier = 'standard2')`,
      [userId]
    );
    const colorResult = await client.query(
      `SELECT COUNT(*) as count FROM user_colors
       WHERE user_id = $1 AND free_grant = TRUE`,
      [userId]
    );

    return {
      archetype: parseInt(archetypeResult.rows[0].count) === 0,
      color: parseInt(colorResult.rows[0].count) === 0,
    };
  } finally {
    client.release();
  }
}

// Check and remove expired monthly archetypes (e.g., Unknown Entity)
// Returns list of { userId, archetypeId, archetypeName } for removed roles
export async function checkExpiredRoles(): Promise<Array<{ userId: string; archetypeId: number; archetypeName: string }>> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find expired roles
    const expiredResult = await client.query(
      `SELECT re.user_id, re.archetype_id, sa.name as archetype_name
       FROM role_expiry re
       JOIN shop_archetypes sa ON re.archetype_id = sa.id
       WHERE re.expires_at <= CURRENT_TIMESTAMP`
    );

    const expired = expiredResult.rows.map((row: any) => ({
      userId: row.user_id,
      archetypeId: row.archetype_id,
      archetypeName: row.archetype_name,
    }));

    if (expired.length > 0) {
      // Remove from user_archetypes
      await client.query(
        `DELETE FROM user_archetypes
         WHERE (user_id, archetype_id) IN (
           SELECT user_id, archetype_id FROM role_expiry WHERE expires_at <= CURRENT_TIMESTAMP
         )`
      );

      // Remove from role_expiry
      await client.query(
        `DELETE FROM role_expiry WHERE expires_at <= CURRENT_TIMESTAMP`
      );
    }

    await client.query('COMMIT');
    return expired;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error checking expired roles:', error);
    return [];
  } finally {
    client.release();
  }
}