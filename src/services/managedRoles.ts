import { ROLES } from '../config/index.js';
import { getClient } from '../database/client.js';
import type { Guild } from 'discord.js';

export interface RoleTemplate {
  name: string;
  color: string;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  position?: number;
  icon?: string;
  emoji?: string;
}

const MANAGED_ROLE_KEYS = [
  'spectator',
  'civilian',
  'sidekick',
  'hero',
  'champion',
  'guardian',
  'superhero',
  'antiHero',
  'rogue',
  'renegade',
  'outlaw',
  'villain',
  'mastermind',
  'kingpin',
  'overlord',
  'tyrant',
  'emperor',
  'saint',
] as const;

type ManagedRoleKey = (typeof MANAGED_ROLE_KEYS)[number];

// In-memory cache for role IDs
const roleIdCache = new Map<ManagedRoleKey, string | null>();

/**
 * Map camelCase keys to UPPER_CASE_WITH_UNDERSCORE config keys
 */
function mapKeyToConfigKey(key: ManagedRoleKey): keyof typeof ROLES {
  const keyMap: Record<ManagedRoleKey, keyof typeof ROLES> = {
    spectator: 'SPECTATOR',
    civilian: 'CIVILIAN',
    sidekick: 'SIDEKICK',
    hero: 'HERO',
    champion: 'CHAMPION',
    guardian: 'GUARDIAN',
    superhero: 'SUPERHERO',
    antiHero: 'ANTI_HERO',
    rogue: 'ROGUE',
    renegade: 'RENEGADE',
    outlaw: 'OUTLAW',
    villain: 'VILLAIN',
    mastermind: 'MASTERMIND',
    kingpin: 'KINGPIN',
    overlord: 'OVERLORD',
    tyrant: 'TYRANT',
    emperor: 'EMPEROR',
    saint: 'SAINT',
  };
  return keyMap[key];
}

/**
 * Get role ID from cache first, then database, then fallback to hardcoded config
 */
export async function getRoleId(key: ManagedRoleKey): Promise<string | null> {
  // Check cache first
  if (roleIdCache.has(key)) {
    return roleIdCache.get(key) || null;
  }

  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT role_id FROM public.managed_roles WHERE key = $1',
      [key]
    );

    if (result.rows.length > 0) {
      const roleId = result.rows[0].role_id;
      roleIdCache.set(key, roleId);
      return roleId;
    }

    // Fall back to hardcoded config with proper key mapping
    const configKey = mapKeyToConfigKey(key);
    const hardcodedId = ROLES[configKey];
    if (hardcodedId) {
      roleIdCache.set(key, hardcodedId);
      return hardcodedId;
    }

    roleIdCache.set(key, null);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Load all role IDs into cache at startup
 */
export async function loadRoleIdCache(): Promise<void> {
  const client = await getClient();
  try {
    const result = await client.query('SELECT key, role_id FROM public.managed_roles');
    
    // Clear existing cache
    roleIdCache.clear();
    
    // Load from database
    for (const row of result.rows) {
      roleIdCache.set(row.key as ManagedRoleKey, row.role_id);
    }
    
    // Fill in missing keys from hardcoded config
    for (const key of MANAGED_ROLE_KEYS) {
      if (!roleIdCache.has(key)) {
        const configKey = mapKeyToConfigKey(key);
        const hardcodedId = ROLES[configKey];
        roleIdCache.set(key, hardcodedId || null);
      }
    }
    
    console.log('[managedRoles] Loaded role ID cache');
  } finally {
    client.release();
  }
}

/**
 * Update cache when a role is recreated
 */
export function updateRoleIdCache(key: ManagedRoleKey, roleId: string): void {
  roleIdCache.set(key, roleId);
}

/**
 * Seed managed roles from hardcoded config (called on startup)
 * Only stores key + role_id; template is filled from live role on startup
 */
export async function seedManagedRoles(): Promise<void> {
  const client = await getClient();
  try {
    for (const key of MANAGED_ROLE_KEYS) {
      const configKey = mapKeyToConfigKey(key);
      const hardcodedId = ROLES[configKey];
      if (!hardcodedId) continue;

      await client.query(
        `INSERT INTO public.managed_roles (key, role_id)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, hardcodedId]
      );
    }

    console.log('[managedRoles] Seeded managed roles from config');
  } finally {
    client.release();
  }
}

/**
 * Refresh role template from existing guild role
 */
export async function refreshRoleTemplate(guild: Guild, key: ManagedRoleKey): Promise<void> {
  const roleId = await getRoleId(key);
  if (!roleId) return;

  const role = guild.roles.cache.get(roleId);
  if (!role) return;

  const client = await getClient();
  try {
    const template: RoleTemplate = {
      name: role.name,
      color: role.hexColor,
      permissions: role.permissions.bitfield.toString(),
      hoist: role.hoist,
      mentionable: role.mentionable,
      position: role.position,
      icon: role.icon ?? undefined,
      emoji: role.unicodeEmoji ?? undefined,
    };

    await client.query(
      `UPDATE public.managed_roles
       SET template = $1, updated_at = CURRENT_TIMESTAMP
       WHERE key = $2`,
      [JSON.stringify(template), key]
    );

    console.log(`[managedRoles] Refreshed template for ${key}`);
  } finally {
    client.release();
  }
}

/**
 * Ensure a managed role exists
 * - If stored role ID exists in guild: refresh template from live role, do nothing else
 * - If stored role ID missing AND real template exists: create role at stored position
 * - If stored role ID missing AND no real template: log error, do not create
 */
export async function ensureManagedRole(guild: Guild, key: ManagedRoleKey): Promise<{ success: boolean; roleId: string | null }> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT role_id, template FROM public.managed_roles WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      console.error(`[managedRoles] No entry found for ${key}`);
      return { success: false, roleId: null };
    }

    const { role_id: storedRoleId, template } = result.rows[0];

    // Check if role exists in guild
    const existingRole = guild.roles.cache.get(storedRoleId);
    if (existingRole) {
      // Role exists: refresh template from live role, do nothing else
      await refreshRoleTemplate(guild, key);
      console.log(`[managedRoles] Role ${key} exists, template refreshed`);
      return { success: true, roleId: storedRoleId };
    }

    // Role does not exist: check if we have a real template
    if (!template) {
      console.error(`[managedRoles] Role ${key} missing from guild and has no template - cannot create`);
      return { success: false, roleId: null };
    }

    const roleTemplate = JSON.parse(template) as RoleTemplate;

    // Check if template is a placeholder (name = key, color #000000, permissions 0)
    const isPlaceholder = roleTemplate.name === key &&
                          roleTemplate.color === '#000000' &&
                          roleTemplate.permissions === '0';

    if (isPlaceholder) {
      console.error(`[managedRoles] Role ${key} missing from guild and has placeholder template - cannot create`);
      return { success: false, roleId: null };
    }

    // Create new role from real template
    try {
      const newRole = await guild.roles.create({
        name: roleTemplate.name,
        color: roleTemplate.color as `#${string}`,
        permissions: BigInt(roleTemplate.permissions),
        hoist: roleTemplate.hoist,
        mentionable: roleTemplate.mentionable,
        reason: 'Managed role creation',
      });

      // Set position if template has one
      if (roleTemplate.position !== undefined) {
        try {
          await newRole.setPosition(roleTemplate.position, { reason: 'Managed role creation' });
        } catch (error) {
          console.error(`[managedRoles] Failed to set position for ${key}:`, error);
        }
      }

      // Update database with new ID
      await client.query(
        'UPDATE public.managed_roles SET role_id = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
        [newRole.id, key]
      );

      // Update cache
      updateRoleIdCache(key, newRole.id);

      console.log(`[managedRoles] Created role ${key} with ID ${newRole.id}`);
      return { success: true, roleId: newRole.id };
    } catch (error) {
      console.error(`[managedRoles] Failed to create role ${key}:`, error);
      return { success: false, roleId: null };
    }
  } finally {
    client.release();
  }
}

/**
 * Refresh all role templates from live guild roles (called on startup)
 */
export async function refreshAllRoleTemplates(guild: Guild): Promise<void> {
  for (const key of MANAGED_ROLE_KEYS) {
    try {
      await refreshRoleTemplate(guild, key);
    } catch (error) {
      console.error(`[managedRoles] Failed to refresh template for ${key}:`, error);
    }
  }
}

/**
 * Ensure all managed roles exist and have correct templates
 */
export async function ensureManagedRoles(guild: Guild): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const key of MANAGED_ROLE_KEYS) {
    try {
      const result = await ensureManagedRole(guild, key);
      if (result.success) {
        success.push(key);
      } else {
        failed.push(key);
      }
    } catch (error) {
      console.error(`[managedRoles] Error ensuring role ${key}:`, error);
      failed.push(key);
    }
  }

  return { success, failed };
}

/**
 * Get all managed role keys
 */
export function getManagedRoleKeys(): readonly ManagedRoleKey[] {
  return MANAGED_ROLE_KEYS;
}
