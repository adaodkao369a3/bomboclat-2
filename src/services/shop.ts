import { getClient } from '../database/client.js';

export interface ShopArchetype {
  id: number;
  name: string;
  tier: string;
  price: number;
  min_role: string | null;
  slot_group: string;
}

export interface ShopColor {
  id: number;
  name: string;
  hex: string;
  price_band: string;
}

export interface UserArchetype {
  id: number;
  user_id: string;
  archetype_id: number;
  slot_index: number;
  acquired_at: Date;
  free_grant: boolean;
}

export interface UserColor {
  id: number;
  user_id: string;
  color_id: number;
  active: boolean;
  acquired_at: Date;
  free_grant: boolean;
}

// Seed shop archetypes (idempotent)
export async function seedShopArchetypes(): Promise<void> {
  const client = await getClient();
  try {
    const archetypes: Omit<ShopArchetype, 'id'>[] = [
      // Standard archetypes (10 types × 5 slots each = 50 total)
      // Group 1
      { name: 'Comedy Relief', tier: 'standard', price: 200, min_role: null, slot_group: 'comedy' },
      { name: 'Drama King', tier: 'standard', price: 250, min_role: null, slot_group: 'drama' },
      { name: 'Action Hero', tier: 'standard', price: 300, min_role: null, slot_group: 'action' },
      { name: 'Romantic Lead', tier: 'standard', price: 350, min_role: null, slot_group: 'romance' },
      { name: 'Mystery Solver', tier: 'standard', price: 400, min_role: null, slot_group: 'mystery' },
      // Group 2
      { name: 'Sci-Fi Explorer', tier: 'standard', price: 220, min_role: null, slot_group: 'scifi' },
      { name: 'Fantasy Mage', tier: 'standard', price: 280, min_role: null, slot_group: 'fantasy' },
      { name: 'Horror Survivor', tier: 'standard', price: 320, min_role: null, slot_group: 'horror' },
      { name: 'Thriller Spy', tier: 'standard', price: 380, min_role: null, slot_group: 'thriller' },
      { name: 'Documentary Host', tier: 'standard', price: 450, min_role: null, slot_group: 'documentary' },
      // Legendary archetypes (5 types × 1-2 slots each)
      { name: 'Cinematic Legend', tier: 'legendary', price: 1000, min_role: null, slot_group: 'legendary' },
      { name: 'Box Office Star', tier: 'legendary', price: 1200, min_role: null, slot_group: 'boxoffice' },
      { name: 'Award Winner', tier: 'legendary', price: 1500, min_role: null, slot_group: 'awards' },
      { name: 'Cult Classic', tier: 'legendary', price: 1800, min_role: null, slot_group: 'cult' },
      { name: 'Festival Favorite', tier: 'legendary', price: 2000, min_role: null, slot_group: 'festival' },
      // Mythic archetypes (gate behind Lead Cast)
      { name: 'Director\'s Cut', tier: 'mythic', price: 5000, min_role: 'lead_cast', slot_group: 'mythic' },
      { name: 'Oscar Winner', tier: 'mythic', price: 7500, min_role: 'lead_cast', slot_group: 'mythic' },
    ];

    for (const archetype of archetypes) {
      await client.query(
        `INSERT INTO shop_archetypes (name, tier, price, min_role, slot_group)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO NOTHING`,
        [archetype.name, archetype.tier, archetype.price, archetype.min_role, archetype.slot_group]
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
    const colors: Omit<ShopColor, 'id'>[] = [
      // Common colors (200-400 range)
      { name: 'Crimson Red', hex: '#DC143C', price_band: 'common' },
      { name: 'Ocean Blue', hex: '#4169E1', price_band: 'common' },
      { name: 'Forest Green', hex: '#228B22', price_band: 'common' },
      { name: 'Golden Yellow', hex: '#FFD700', price_band: 'common' },
      { name: 'Royal Purple', hex: '#7851A9', price_band: 'common' },
      { name: 'Hot Pink', hex: '#FF69B4', price_band: 'common' },
      // Uncommon colors (400-700 range)
      { name: 'Sapphire', hex: '#0F52BA', price_band: 'uncommon' },
      { name: 'Emerald', hex: '#50C878', price_band: 'uncommon' },
      { name: 'Ruby', hex: '#E0115F', price_band: 'uncommon' },
      { name: 'Amethyst', hex: '#9966CC', price_band: 'uncommon' },
      { name: 'Topaz', hex: '#FFC87C', price_band: 'uncommon' },
      { name: 'Turquoise', hex: '#40E0D0', price_band: 'uncommon' },
      // Rare colors (700-1000 range)
      { name: 'Diamond White', hex: '#F0F8FF', price_band: 'rare' },
      { name: 'Midnight Black', hex: '#191970', price_band: 'rare' },
      { name: 'Sunset Orange', hex: '#FF4500', price_band: 'rare' },
      { name: 'Aurora Green', hex: '#00FF7F', price_band: 'rare' },
      { name: 'Platinum Silver', hex: '#E5E4E2', price_band: 'rare' },
      { name: 'Galaxy Purple', hex: '#4B0082', price_band: 'rare' },
    ];

    for (const color of colors) {
      await client.query(
        `INSERT INTO shop_colors (name, hex, price_band)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [color.name, color.hex, color.price_band]
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
    const result = await client.query('SELECT * FROM shop_archetypes ORDER BY tier, price');
    return result.rows;
  } finally {
    client.release();
  }
}

// Get all shop colors
export async function getShopColors(): Promise<ShopColor[]> {
  const client = await getClient();
  try {
    const result = await client.query('SELECT * FROM shop_colors ORDER BY price_band, name');
    return result.rows;
  } finally {
    client.release();
  }
}

// Get user's archetypes
export async function getUserArchetypes(userId: string): Promise<UserArchetype[]> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT ua.*, sa.name, sa.tier, sa.slot_group
       FROM user_archetypes ua
       JOIN shop_archetypes sa ON ua.archetype_id = sa.id
       WHERE ua.user_id = $1
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
      `SELECT uc.*, sc.name, sc.hex, sc.price_band
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

const SHOP_SLOT_CAPS: Record<string, number> = {
  comedy: 5,
  drama: 5,
  action: 5,
  romance: 5,
  mystery: 5,
  scifi: 5,
  fantasy: 5,
  horror: 5,
  thriller: 5,
  documentary: 5,
  legendary: 2,
  boxoffice: 2,
  awards: 2,
  cult: 2,
  festival: 2,
  mythic: 1,
};

async function checkCanPurchaseArchetype(
  client: import('pg').PoolClient,
  userId: string,
  archetypeId: number
): Promise<{ canPurchase: boolean; reason?: string }> {
  const archetypeResult = await client.query(
    'SELECT * FROM shop_archetypes WHERE id = $1',
    [archetypeId]
  );
  if (archetypeResult.rows.length === 0) {
    return { canPurchase: false, reason: 'Archetype not found' };
  }

  const archetype = archetypeResult.rows[0] as ShopArchetype;
  const userResult = await client.query(
    'SELECT current_progression_role FROM users WHERE user_id = $1 FOR UPDATE',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return { canPurchase: false, reason: 'User not found' };
  }

  if (archetype.min_role) {
    const roleHierarchy = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
    const userRole = userResult.rows[0].current_progression_role;
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(archetype.min_role);

    if (userRoleIndex < requiredRoleIndex) {
      return { canPurchase: false, reason: `Requires ${archetype.min_role.replace('_', ' ')} role or higher` };
    }
  }

  const maxSlots = SHOP_SLOT_CAPS[archetype.slot_group] || 1;
  const currentSlotsResult = await client.query(
    `SELECT COUNT(*) as count
     FROM user_archetypes ua
     JOIN shop_archetypes sa ON ua.archetype_id = sa.id
     WHERE ua.user_id = $1 AND sa.slot_group = $2`,
    [userId, archetype.slot_group]
  );

  const currentSlots = Number(currentSlotsResult.rows[0].count);
  if (currentSlots >= maxSlots) {
    return { canPurchase: false, reason: `Slot cap reached for ${archetype.slot_group} (max ${maxSlots})` };
  }

  return { canPurchase: true };
}

// Check if user can purchase archetype (slot cap + tier gating)
export async function canPurchaseArchetype(
  userId: string,
  archetypeId: number
): Promise<{ canPurchase: boolean; reason?: string }> {
  const client = await getClient();
  try {
    return await checkCanPurchaseArchetype(client, userId, archetypeId);
  } finally {
    client.release();
  }
}

export async function purchaseArchetype(
  userId: string,
  archetypeId: number,
  freeGrant: boolean = false
): Promise<{ success: boolean; reason?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check if user can purchase
    const canPurchase = await checkCanPurchaseArchetype(client, userId, archetypeId);
    if (!canPurchase.canPurchase) {
      await client.query('ROLLBACK');
      return { success: false, reason: canPurchase.reason };
    }

    // Get archetype price
    const archetypeResult = await client.query(
      'SELECT price FROM shop_archetypes WHERE id = $1',
      [archetypeId]
    );
    const price = archetypeResult.rows[0].price;

    // Check user balance (unless free grant) - use FOR UPDATE to prevent race conditions
    let balanceBefore = 0;
    if (!freeGrant) {
      const balanceResult = await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      balanceBefore = balanceResult.rows[0].total_residuals_balance;
      
      if (balanceBefore < price) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'Insufficient residuals' };
      }

      // Deduct residuals
      await client.query(
        `UPDATE users
         SET total_residuals_balance = total_residuals_balance - $1,
             lifetime_residuals_spent = lifetime_residuals_spent + $1
         WHERE user_id = $2`,
        [price, userId]
      );
    } else {
      // For free grants, still lock the user row for consistency
      await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
    }

    // Get next available slot index
    const slotResult = await client.query(
      `SELECT COALESCE(MAX(slot_index), -1) + 1 as next_slot
       FROM user_archetypes
       WHERE user_id = $1`,
      [userId]
    );
    const nextSlot = slotResult.rows[0].next_slot;

    // Add archetype to user
    await client.query(
      `INSERT INTO user_archetypes (user_id, archetype_id, slot_index, free_grant)
       VALUES ($1, $2, $3, $4)`,
      [userId, archetypeId, nextSlot, freeGrant]
    );

    // Log transaction
    if (!freeGrant) {
      const balanceAfter = balanceBefore - price;
      await client.query(
        `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
         VALUES ($1, $2, $3, $4, 'purchase', 'shop_purchase', 'Archetype purchase')`,
        [userId, -price, balanceBefore, balanceAfter]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing archetype:', error);
    return { success: false, reason: 'Purchase failed' };
  } finally {
    client.release();
  }
}

// Purchase color
export async function purchaseColor(
  userId: string,
  colorId: number,
  freeGrant: boolean = false
): Promise<{ success: boolean; reason?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get color price
    const colorResult = await client.query(
      'SELECT * FROM shop_colors WHERE id = $1',
      [colorId]
    );
    if (colorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Color not found' };
    }
    const color = colorResult.rows[0] as ShopColor;

    // Check if already owned
    const ownedResult = await client.query(
      'SELECT id FROM user_colors WHERE user_id = $1 AND color_id = $2',
      [userId, colorId]
    );
    if (ownedResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Color already owned' };
    }

    // Determine price based on band
    const priceMap: Record<string, number> = {
      common: 200,
      uncommon: 500,
      rare: 800,
    };
    const price = priceMap[color.price_band] || 200;

    // Check user balance (unless free grant) - use FOR UPDATE to prevent race conditions
    let balanceBefore = 0;
    if (!freeGrant) {
      const balanceResult = await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
      balanceBefore = balanceResult.rows[0].total_residuals_balance;
      
      if (balanceBefore < price) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'Insufficient residuals' };
      }

      // Deduct residuals
      await client.query(
        `UPDATE users
         SET total_residuals_balance = total_residuals_balance - $1,
             lifetime_residuals_spent = lifetime_residuals_spent + $1
         WHERE user_id = $2`,
        [price, userId]
      );
    } else {
      // For free grants, still lock the user row for consistency
      await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
    }

    // Deactivate all existing colors
    await client.query(
      'UPDATE user_colors SET active = FALSE WHERE user_id = $1',
      [userId]
    );

    // Add color to user (active by default)
    await client.query(
      `INSERT INTO user_colors (user_id, color_id, active, free_grant)
       VALUES ($1, $2, TRUE, $3)`,
      [userId, colorId, freeGrant]
    );

    // Log transaction
    if (!freeGrant) {
      const balanceAfter = balanceBefore - price;
      await client.query(
        `INSERT INTO residual_transactions (user_id, amount, balance_before, balance_after, transaction_type, source, reason)
         VALUES ($1, $2, $3, $4, 'purchase', 'shop_purchase', 'Color purchase')`,
        [userId, -price, balanceBefore, balanceAfter]
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

// Switch active color
export async function switchActiveColor(userId: string, colorId: number): Promise<{ success: boolean; reason?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check if user owns the color
    const ownedResult = await client.query(
      'SELECT id FROM user_colors WHERE user_id = $1 AND color_id = $2',
      [userId, colorId]
    );
    if (ownedResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Color not owned' };
    }

    // Deactivate all colors
    await client.query(
      'UPDATE user_colors SET active = FALSE WHERE user_id = $1',
      [userId]
    );

    // Activate selected color
    await client.query(
      'UPDATE user_colors SET active = TRUE WHERE user_id = $1 AND color_id = $2',
      [userId, colorId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error switching color:', error);
    return { success: false, reason: 'Switch failed' };
  } finally {
    client.release();
  }
}

// Check if user has booster free grants available
export async function hasBoosterFreeGrants(userId: string): Promise<{ archetype: boolean; color: boolean }> {
  const client = await getClient();
  try {
    const archetypeResult = await client.query(
      `SELECT COUNT(*) as count FROM user_archetypes 
       WHERE user_id = $1 AND free_grant = TRUE`,
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