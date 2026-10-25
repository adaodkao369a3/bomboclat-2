import type { GuildMember } from 'discord.js';
import { getClient } from '../database/client.js';

export interface ShopRoleReconcileResult {
  added: string[];
  removed: string[];
  failed: string[];
}

/**
 * Make a member's Discord shop roles match the database. Roles are always
 * identified by their stored role ID, never by name.
 *
 *  - Persona roles: the member should have exactly the personas they own
 *    (expired Unknown Entity rows are ignored).
 *  - Color roles: the member should have exactly the colors they own AND
 *    have equipped.
 *  - Any other shop role (a persona or color the member does not own) is
 *    removed. Non-shop roles are never touched.
 *
 * Safe to call at any time (join, audit, after buy/sell/equip). It only
 * changes roles that differ from the database.
 */
export async function reconcileShopRoles(member: GuildMember): Promise<ShopRoleReconcileResult> {
  const result: ShopRoleReconcileResult = { added: [], removed: [], failed: [] };
  const client = await getClient();

  let desired: Set<string>;
  let allShopRoleIds: Set<string>;
  try {
    const personaRows = await client.query(
      `SELECT sa.role_id
       FROM user_archetypes ua
       JOIN shop_archetypes sa ON sa.id = ua.archetype_id
       WHERE ua.user_id = $1 AND sa.role_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM role_expiry re
           WHERE re.user_id = ua.user_id AND re.archetype_id = ua.archetype_id
             AND re.expires_at <= CURRENT_TIMESTAMP
         )`,
      [member.id]
    );
    const colorRows = await client.query(
      `SELECT sc.role_id
       FROM user_colors uc
       JOIN shop_colors sc ON sc.id = uc.color_id
       WHERE uc.user_id = $1 AND uc.active = true AND sc.role_id IS NOT NULL`,
      [member.id]
    );
    const everyShopRole = await client.query(
      `SELECT role_id FROM shop_archetypes WHERE role_id IS NOT NULL
       UNION
       SELECT role_id FROM shop_colors WHERE role_id IS NOT NULL`
    );

    desired = new Set<string>([
      ...personaRows.rows.map((r: { role_id: string }) => r.role_id),
      ...colorRows.rows.map((r: { role_id: string }) => r.role_id),
    ]);
    allShopRoleIds = new Set<string>(everyShopRole.rows.map((r: { role_id: string }) => r.role_id));
  } finally {
    client.release();
  }

  // Add what is missing (only roles that still exist in the guild)
  for (const roleId of desired) {
    if (member.roles.cache.has(roleId)) continue;
    if (!member.guild.roles.cache.has(roleId)) continue;
    try {
      await member.roles.add(roleId, 'Shop roles synced from database');
      result.added.push(roleId);
    } catch (error) {
      console.error(`[shopRoles] Failed to add role ${roleId} to ${member.id}:`, error);
      result.failed.push(roleId);
    }
  }

  // Remove shop roles the member should not have
  for (const roleId of member.roles.cache.keys()) {
    if (!allShopRoleIds.has(roleId) || desired.has(roleId)) continue;
    try {
      await member.roles.remove(roleId, 'Shop role not owned/equipped');
      result.removed.push(roleId);
    } catch (error) {
      console.error(`[shopRoles] Failed to remove role ${roleId} from ${member.id}:`, error);
      result.failed.push(roleId);
    }
  }

  return result;
}
