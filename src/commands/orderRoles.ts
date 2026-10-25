import { Command } from './index.js';
import { isBotOwner } from '../utils/permissions.js';
import { ROLES } from '../config/index.js';
import { getShopArchetypes, getShopColors } from '../services/shop.js';
import { getClient } from '../database/client.js';

export const orderRolesCommand: Command = {
  name: 'orderroles',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    // Check if bot owner (Director only)
    if (!message.member || !isBotOwner(message.member)) {
      await message.reply('❌ This command is restricted to the Director.');
      return;
    }

    if (!message.guild) {
      await message.reply('❌ This command can only be used in servers.');
      return;
    }

    await message.reply('⏳ Ordering roles... This may take a moment.');

    try {
      const guild = message.guild;

      // Fetch all roles
      const allRoles = await guild.roles.fetch();
      const roleMap = new Map(allRoles.map(r => [r.id, r]));

      // Get shop data
      const shopArchetypes = await getShopArchetypes();
      const shopColors = await getShopColors();

      // Collect role IDs for each category
      const boosterRoleId = ROLES.BOOSTER;
      const colorRoleIds = shopColors
        .filter(c => c.role_id)
        .map(c => c.role_id!)
        .filter(id => roleMap.has(id));

      const personaRoleIds = shopArchetypes
        .filter(a => a.role_id)
        .map(a => a.role_id!)
        .filter(id => roleMap.has(id));

      // Level progression roles (fetch from database or config)
      const levelRoleIds = await getLevelRoleIds(guild);

      // Build the ordered list
      const orderedRoles: string[] = [];

      // 1. Top roles (roles above Guest Star - leave as-is)
      // We'll identify these by their current position being above the booster role
      const boosterRole = roleMap.get(boosterRoleId);
      if (boosterRole) {
        const rolesAboveBooster = Array.from(roleMap.values())
          .filter(r => r.position > boosterRole.position)
          .sort((a, b) => b.position - a.position)
          .map(r => r.id);
        orderedRoles.push(...rolesAboveBooster);
      }

      // 2. Guest Star (booster role)
      if (boosterRoleId && roleMap.has(boosterRoleId)) {
        orderedRoles.push(boosterRoleId);
      }

      // 3. Color roles
      orderedRoles.push(...colorRoleIds);

      // 4. Persona roles
      orderedRoles.push(...personaRoleIds);

      // 5. Level roles
      orderedRoles.push(...levelRoleIds);

      // 6. Remaining roles (everything below Guest Star that's not already included)
      const remainingRoles = Array.from(roleMap.values())
        .filter(r => 
          !orderedRoles.includes(r.id) &&
          (boosterRole ? r.position < boosterRole.position : true)
        )
        .sort((a, b) => b.position - a.position)
        .map(r => r.id);
      orderedRoles.push(...remainingRoles);

      // Set positions
      // Discord positions are inverted (higher number = lower in list)
      // We need to set them in descending order
      let position = orderedRoles.length;
      const updates: Promise<void>[] = [];

      for (const roleId of orderedRoles) {
        const role = roleMap.get(roleId);
        if (role) {
          updates.push(
            role.setPosition(position, 'Role reordering').catch(err => {
              console.error(`Failed to set position for role ${role.name}:`, err);
            })
          );
          position--;
        }
      }

      await Promise.all(updates);

      await message.reply('✅ Roles have been reordered successfully!');
    } catch (error) {
      console.error('Error ordering roles:', error);
      await message.reply('❌ Failed to order roles. Check the console for details.');
    }
  },
};

async function getLevelRoleIds(guild: any): Promise<string[]> {
  // Try to fetch level roles from the database or config
  // For now, we'll look for roles that match common level role patterns
  const allRoles = await guild.roles.fetch();
  const levelRolePatterns = [
    /^level \d+$/i,
    /^lvl \d+$/i,
    /^\d+$/i,
  ];

  const levelRoleIds: string[] = [];
  for (const [id, role] of allRoles) {
    const roleName = (role as any).name;
    for (const pattern of levelRolePatterns) {
      if (pattern.test(roleName)) {
        levelRoleIds.push(id);
        break;
      }
    }
  }

  return levelRoleIds;
}
