import { join } from 'path';
import { getClient } from '../database/client.js';

// Local archetype artwork lives in the `image/` folder at the project root
// (same place assets/fonts/Roboto-Bold.ttf lives) instead of being hotlinked
// from random sites, which was fragile (dead links, rate limits, hotlink
// blocks). Files are loaded straight off disk in shopImages.ts.
const IMAGE_DIR = join(process.cwd(), 'image');
const archetypeImage = (filename: string): string => join(IMAGE_DIR, filename);

// Shared color pricing so purchase, sale, and display logic never drift
// out of sync with each other.
export const COLOR_PRICE_MAP: Record<string, number> = { common: 200, uncommon: 500, rare: 800 };
export function getColorPrice(priceBand: string): number {
  return COLOR_PRICE_MAP[priceBand] || 200;
}

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
    // "Documentary Host" was renamed to "Ceo of Sex" (meme reference, not an
    // NSFW role). Rename the row in place first so its id, role_id, and any
    // existing owners carry over instead of leaving an orphaned old row and
    // creating a brand new one on the ON CONFLICT (name) upsert below.
    await client.query(
      `UPDATE shop_archetypes SET name = 'Ceo of Sex'
       WHERE name = 'Documentary Host'
         AND NOT EXISTS (SELECT 1 FROM shop_archetypes WHERE name = 'Ceo of Sex')`
    );

    const archetypes: Omit<ShopArchetype, 'id'>[] = [
      // Standard archetypes (10 types × 5 slots each = 50 total)
      // Group 1
      { name: 'Comedy Relief', tier: 'standard', price: 200, min_role: null, slot_group: 'comedy', image_url: archetypeImage('Comedy Relief.jpg'), role_id: null },
      { name: 'Drama King', tier: 'standard', price: 250, min_role: null, slot_group: 'drama', image_url: archetypeImage('drama king.png'), role_id: null },
      { name: 'Action Hero', tier: 'standard', price: 300, min_role: null, slot_group: 'action', image_url: archetypeImage('action hero.jpg'), role_id: null },
      { name: 'Romantic Lead', tier: 'standard', price: 350, min_role: null, slot_group: 'romance', image_url: archetypeImage('romantic lead.jpg'), role_id: null },
      { name: 'Mystery Solver', tier: 'standard', price: 400, min_role: null, slot_group: 'mystery', image_url: archetypeImage('mystery solver.jpg'), role_id: null },
      // Group 2
      { name: 'Sci-Fi Explorer', tier: 'standard', price: 220, min_role: null, slot_group: 'scifi', image_url: archetypeImage('scifi.jpg'), role_id: null },
      { name: 'Fantasy Mage', tier: 'standard', price: 280, min_role: null, slot_group: 'fantasy', image_url: archetypeImage('mage.jpg'), role_id: null },
      { name: 'Horror Survivor', tier: 'standard', price: 320, min_role: null, slot_group: 'horror', image_url: archetypeImage('horror survivor.jpg'), role_id: null },
      { name: 'Thriller Spy', tier: 'standard', price: 380, min_role: null, slot_group: 'thriller', image_url: archetypeImage('thriller spy.jpg'), role_id: null },
      { name: 'Ceo of Sex', tier: 'standard', price: 450, min_role: null, slot_group: 'documentary', image_url: archetypeImage('ceo of sex.jpg'), role_id: null },
      // Legendary archetypes (5 types × 1-2 slots each)
      { name: 'Cinematic Legend', tier: 'legendary', price: 1000, min_role: null, slot_group: 'legendary', image_url: archetypeImage('cinematic legen.jpg'), role_id: null },
      { name: 'Box Office Star', tier: 'legendary', price: 1200, min_role: null, slot_group: 'boxoffice', image_url: archetypeImage('box offic.jpg'), role_id: null },
      { name: 'Award Winner', tier: 'legendary', price: 1500, min_role: null, slot_group: 'awards', image_url: archetypeImage('award winner.jpg'), role_id: null },
      { name: 'Cult Classic', tier: 'legendary', price: 1800, min_role: null, slot_group: 'cult', image_url: archetypeImage('cult classic.png'), role_id: null },
      { name: 'Festival Favorite', tier: 'legendary', price: 2000, min_role: null, slot_group: 'festival', image_url: archetypeImage('festival favorite.jpg'), role_id: null },
      // Mythic archetypes (gate behind Lead Cast)
      { name: 'Director\'s Cut', tier: 'mythic', price: 5000, min_role: 'lead_cast', slot_group: 'mythic', image_url: archetypeImage('directors cut.jpg'), role_id: null },
      { name: 'Oscar Winner', tier: 'mythic', price: 7500, min_role: 'lead_cast', slot_group: 'mythic', image_url: archetypeImage('oscar winner.jpg'), role_id: null },
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
      `SELECT ua.*, sa.name, sa.tier, sa.slot_group, sa.price
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
): Promise<{ success: boolean; reason?: string; refund?: number }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get archetype details
    const archetypeResult = await client.query(
      'SELECT price, tier, min_role FROM shop_archetypes WHERE id = $1',
      [archetypeId]
    );
    if (archetypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Archetype not found' };
    }
    const archetype = archetypeResult.rows[0];

    // Check tier gating
    if (archetype.min_role) {
      const userResult = await client.query(
        'SELECT current_progression_role FROM users WHERE user_id = $1',
        [userId]
      );
      const userRole = userResult.rows[0]?.current_progression_role;
      
      const roleHierarchy = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
      const userRoleIndex = roleHierarchy.indexOf(userRole);
      const requiredRoleIndex = roleHierarchy.indexOf(archetype.min_role);
      
      if (userRoleIndex < requiredRoleIndex) {
        await client.query('ROLLBACK');
        return { success: false, reason: `Requires ${archetype.min_role.replace('_', ' ')} role or higher` };
      }
    }

    // Check if user already owns this archetype
    const existingResult = await client.query(
      'SELECT archetype_id, free_grant FROM user_archetypes WHERE user_id = $1',
      [userId]
    );
    
    let refundAmount = 0;
    let balanceBefore = 0;

    // If user already has an archetype, remove it and refund 50%
    if (existingResult.rows.length > 0) {
      const existingArchetype = existingResult.rows[0];
      
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
        'DELETE FROM user_archetypes WHERE user_id = $1',
        [userId]
      );
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
        return { success: false, reason: `Insufficient residuals (need ${netCost}, have ${balanceBefore})` };
      }

      // Deduct residuals (net cost after refund)
      await client.query(
        `UPDATE users
         SET total_residuals_balance = total_residuals_balance - $1,
             lifetime_residuals_spent = lifetime_residuals_spent + $1
         WHERE user_id = $2`,
        [netCost, userId]
      );
      
      // Add refund if applicable
      if (refundAmount > 0) {
        await client.query(
          `UPDATE users
           SET total_residuals_balance = total_residuals_balance + $1
           WHERE user_id = $2`,
          [refundAmount, userId]
        );
      }
    } else {
      // For free grants, still lock the user row for consistency
      await client.query(
        'SELECT total_residuals_balance FROM users WHERE user_id = $1 FOR UPDATE',
        [userId]
      );
    }

    // Add new archetype (always slot 0 since only one allowed)
    await client.query(
      `INSERT INTO user_archetypes (user_id, archetype_id, slot_index, free_grant)
       VALUES ($1, $2, 0, $3)`,
      [userId, archetypeId, freeGrant]
    );

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

    // Determine price based on band
    const price = getColorPrice(color.price_band);

    // Check if user already owns this specific color
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

      if (balanceBefore < price) {
        await client.query('ROLLBACK');
        return { success: false, reason: `Insufficient residuals (need ${price}, have ${balanceBefore})` };
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
        [userId, -price, balanceBefore, balanceBefore - price]
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
): Promise<{ success: boolean; reason?: string; refundTotal?: number; sold?: { colorId: number; name: string; refund: number }[] }> {
  if (colorIds.length === 0) {
    return { success: false, reason: 'No colors selected' };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ownedResult = await client.query(
      `SELECT uc.color_id, uc.free_grant, sc.name, sc.price_band
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
      refund: row.free_grant ? 0 : Math.floor(getColorPrice(row.price_band) * 0.5),
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
): Promise<{ success: boolean; reason?: string; refund?: number; name?: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const ownedResult = await client.query(
      `SELECT ua.archetype_id, ua.free_grant, sa.name, sa.price
       FROM user_archetypes ua
       JOIN shop_archetypes sa ON ua.archetype_id = sa.id
       WHERE ua.user_id = $1`,
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

    await client.query('DELETE FROM user_archetypes WHERE user_id = $1', [userId]);

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
    return { success: true, refund, name: owned.name };
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