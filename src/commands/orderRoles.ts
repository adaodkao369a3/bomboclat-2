import { Command } from './index.js';
import { isBotOwner } from '../utils/permissions.js';
import { ROLES } from '../config/index.js';
import { getShopArchetypes, getShopColors } from '../services/shop.js';

// Progression + Spectator roles, identified by ID (never by name)
const LEVEL_ROLE_IDS: string[] = [
  ROLES.SAINT, ROLES.EMPEROR, ROLES.TYRANT, ROLES.OVERLORD, ROLES.KINGPIN,
  ROLES.MASTERMIND, ROLES.VILLAIN, ROLES.OUTLAW, ROLES.RENEGADE, ROLES.ROGUE,
  ROLES.ANTI_HERO, ROLES.SUPERHERO, ROLES.GUARDIAN, ROLES.CHAMPION,
  ROLES.HERO, ROLES.SIDEKICK, ROLES.CIVILIAN, ROLES.SPECTATOR,
];

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
      const levelRoleIds = LEVEL_ROLE_IDS.filter(id => roleMap.has(id));

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

      // Only roles below the bot's own highest role can be moved, and
      // @everyone must stay at position 0. Drop everything else from the list.
      const botTop = guild.members.me?.roles.highest.position ?? 0;
      const movable = [...new Set(orderedRoles)].filter(id => {
        const role = roleMap.get(id);
        return !!role && id !== guild.id && role.position < botTop;
      });

      // Discord positions: higher number = higher in the list.
      // The first role in the list gets the highest position.
      const updates = movable.map((id, i) => ({
        role: id,
        position: movable.length - i,
      }));

      await guild.roles.setPositions(updates);

      await message.reply('✅ Roles have been reordered successfully!');
    } catch (error) {
      console.error('Error ordering roles:', error);
      await message.reply('❌ Failed to order roles. Check the console for details.');
    }
  },
};
