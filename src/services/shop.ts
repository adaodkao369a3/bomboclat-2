import { getClient } from '../database/client.js';

export interface ShopArchetype {
  id: number;
  name: string;
  tier: string;
  price: number;
  min_role: string | null;
  slot_group: string;
  image_url: string | null;
  role_id: string | null;
}

export interface ShopColor {
  id: number;
  name: string;
  hex: string;
  price_band: string;
  role_id: string | null;
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

// Seed shop archetypes (idempotent).
//
// image_url is intentionally left blank here for each entry — this is where
// real archetype artwork gets filled in directly in code (not via .env).
// Fill in a URL per archetype below, redeploy, and it will pick up automatically
// (the ON CONFLICT DO UPDATE below means editing values here and redeploying
// updates existing rows, it isn't just a first-boot insert).
export async function seedShopArchetypes(): Promise<void> {
  const client = await getClient();
  try {
    const archetypes: Omit<ShopArchetype, 'id'>[] = [
      // Standard archetypes (10 types × 5 slots each = 50 total)
      // Group 1
      { name: 'Comedy Relief', tier: 'standard', price: 200, min_role: null, slot_group: 'comedy', image_url: 'https://pbs.twimg.com/profile_images/1819065962160967684/k_Un-Pg1.jpg', role_id: null },
      { name: 'Drama King', tier: 'standard', price: 250, min_role: null, slot_group: 'drama', image_url: 'https://www.pngitem.com/pimgs/m/84-845622_kanye-west-hd-png-download.png', role_id: null },
      { name: 'Action Hero', tier: 'standard', price: 300, min_role: null, slot_group: 'action', image_url: 'https://media.gq.com/photos/590c8a5fee7e6447b1025be2/1:1/w_1999,h_1999,c_limit/spiderman-3.jpg', role_id: null },
      { name: 'Romantic Lead', tier: 'standard', price: 350, min_role: null, slot_group: 'romance', image_url: 'https://i.pinimg.com/736x/8e/44/fc/8e44fcfb4537a5bbeb9bfc21ca5e4775.jpg', role_id: null },
      { name: 'Mystery Solver', tier: 'standard', price: 400, min_role: null, slot_group: 'mystery', image_url: 'https://i.pinimg.com/1200x/51/68/95/5168958d4a823c4370b03ad8c2b0cf92.jpg', role_id: null },
      // Group 2
      { name: 'Sci-Fi Explorer', tier: 'standard', price: 220, min_role: null, slot_group: 'scifi', image_url: 'https://i.pinimg.com/736x/57/bb/e4/57bbe47568735f71115a077544d86385.jpg', role_id: null },
      { name: 'Fantasy Mage', tier: 'standard', price: 280, min_role: null, slot_group: 'fantasy', image_url: 'https://i.pinimg.com/736x/c2/4c/ec/c24cec3e9bcffefec1101a42efacfd3e.jpg', role_id: null },
      { name: 'Horror Survivor', tier: 'standard', price: 320, min_role: null, slot_group: 'horror', image_url: 'https://i.pinimg.com/736x/61/05/fe/6105fee8f28d5fc57615d6f718f5ca5b.jpg', role_id: null },
      { name: 'Thriller Spy', tier: 'standard', price: 380, min_role: null, slot_group: 'thriller', image_url: 'https://i.pinimg.com/736x/da/d6/3b/dad63b90e9c9196a89fa62052ab2db81.jpg', role_id: null },
      { name: 'Documentary Host', tier: 'standard', price: 450, min_role: null, slot_group: 'documentary', image_url: 'https://i.pinimg.com/736x/63/b5/99/63b5991291e3c884543bbff82a6c7bec.jpg', role_id: null },
      // Legendary archetypes (5 types × 1-2 slots each)
      { name: 'Cinematic Legend', tier: 'legendary', price: 1000, min_role: null, slot_group: 'legendary', image_url: 'https://media-cldnry.s-nbcnews.com/image/upload/t_fit-1500w,f_auto,q_auto:best/streams/2013/September/130911/8C8952203-130911-ent-saulgoodman-hmed.jpg', role_id: null },
      { name: 'Box Office Star', tier: 'legendary', price: 1200, min_role: null, slot_group: 'boxoffice', image_url: 'https://assets.sbs.com.au/dims4/default/426bed7/2147483647/strip/true/crop/640x360+0+0/resize/1280x720!/quality/90/?url=https%3A%2F%2Fsbs-au-brightspot.s3.ap-southeast-2.amazonaws.com%2Fdrupal%2Ffilm%2Fpublic%2Fimages%2F6%2F3%2F6311_the-wolf-of-wall-street-640-2.jpg&imwidth=1280', role_id: null },
      { name: 'Award Winner', tier: 'legendary', price: 1500, min_role: null, slot_group: 'awards', image_url: 'https://images.stockcake.com/public/5/f/7/5f7dbedb-c2c9-4bfd-8b6e-6b90aa909461_large/victory-awaits-glory-stockcake.jpg', role_id: null },
      { name: 'Cult Classic', tier: 'legendary', price: 1800, min_role: null, slot_group: 'cult', image_url: 'https://64.media.tumblr.com/fababb2954021811072b391f73db1413/91b45c92c3c50f84-c7/s1280x1920/bbdba078377976b577e5f2e5882d16d59e336613.png', role_id: null },
      { name: 'Festival Favorite', tier: 'legendary', price: 2000, min_role: null, slot_group: 'festival', image_url: 'https://i.pinimg.com/736x/9c/9d/6d/9c9d6d16269d46970a61b2e02088cb0c.jpg', role_id: null },
      // Mythic archetypes (gate behind Lead Cast)
      { name: 'Director\'s Cut', tier: 'mythic', price: 5000, min_role: 'lead_cast', slot_group: 'mythic', image_url: 'https://images.stockcake.com/public/a/5/1/a511b368-8e38-4f45-827f-f34fde5963cd_large/cinematic-clapperboard-presence-stockcake.jpg', role_id: null },
      { name: 'Oscar Winner', tier: 'mythic', price: 7500, min_role: 'lead_cast', slot_group: 'mythic', image_url: 'https://images.moneycontrol.com/static-mcnews/2024/04/the-oscars.png?impolicy=website&width=1600&height=900', role_id: null },
    ];

    for (const archetype of archetypes) {
      await client.query(
        `INSERT INTO shop_archetypes (name, tier, price, min_role, slot_group, image_url, role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name) DO UPDATE SET
           tier = EXCLUDED.tier,
           price = EXCLUDED.price,
           min_role = EXCLUDED.min_role,
           slot_group = EXCLUDED.slot_group,
           image_url = NULLIF(EXCLUDED.image_url, ''),
           role_id = COALESCE(EXCLUDED.role_id, shop_archetypes.role_id)`,
        [archetype.name, archetype.tier, archetype.price, archetype.min_role, archetype.slot_group, archetype.image_url || null, archetype.role_id || null]
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
      { name: 'Crimson Red', hex: '#DC143C', price_band: 'common', role_id: null },
      { name: 'Ocean Blue', hex: '#4169E1', price_band: 'common', role_id: null },
      { name: 'Forest Green', hex: '#228B22', price_band: 'common', role_id: null },
      { name: 'Golden Yellow', hex: '#FFD700', price_band: 'common', role_id: null },
      { name: 'Royal Purple', hex: '#7851A9', price_band: 'common', role_id: null },
      { name: 'Hot Pink', hex: '#FF69B4', price_band: 'common', role_id: null },
      // Uncommon colors (400-700 range)
      { name: 'Sapphire', hex: '#0F52BA', price_band: 'uncommon', role_id: null },
      { name: 'Emerald', hex: '#50C878', price_band: 'uncommon', role_id: null },
      { name: 'Ruby', hex: '#E0115F', price_band: 'uncommon', role_id: null },
      { name: 'Amethyst', hex: '#9966CC', price_band: 'uncommon', role_id: null },
      { name: 'Topaz', hex: '#FFC87C', price_band: 'uncommon', role_id: null },
      { name: 'Turquoise', hex: '#40E0D0', price_band: 'uncommon', role_id: null },
      // Rare colors (700-1000 range)
      { name: 'Diamond White', hex: '#F0F8FF', price_band: 'rare', role_id: null },
      { name: 'Midnight Black', hex: '#191970', price_band: 'rare', role_id: null },
      { name: 'Sunset Orange', hex: '#FF4500', price_band: 'rare', role_id: null },
      { name: 'Aurora Green', hex: '#00FF7F', price_band: 'rare', role_id: null },
      { name: 'Platinum Silver', hex: '#E5E4E2', price_band: 'rare', role_id: null },
      { name: 'Galaxy Purple', hex: '#4B0082', price_band: 'rare', role_id: null },
    ];

    for (const color of colors) {
      await client.query(
        `INSERT INTO shop_colors (name, hex, price_band, role_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
           hex = EXCLUDED.hex,
           price_band = EXCLUDED.price_band,
           role_id = COALESCE(EXCLUDED.role_id, shop_colors.role_id)`,
        [color.name, color.hex, color.price_band, color.role_id || null]
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