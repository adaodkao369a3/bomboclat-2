import { EmbedBuilder, Role } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { ROLES } from '../config/index.js';
import { getShopArchetypes, getShopColors } from '../services/shop.js';
import { Command } from './index.js';

interface RoleCategory {
  name: string;
  roles: Role[];
  priority: number;
}

export const roleorderCommand: Command = {
  name: 'roleorder',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    await message.reply('🔄 Analyzing server roles and reordering...');

    try {
      const guild = message.guild;
      const botMember = guild.members.me;
      if (!botMember) {
        await message.reply('❌ Unable to access bot member information.');
        return;
      }

      // Get bot's highest role position to determine what we can move
      const botHighestRole = botMember.roles.highest;
      const botPosition = botHighestRole.position;

      // Fetch all roles
      await guild.roles.fetch();
      const allRoles = Array.from(guild.roles.cache.values());

      // Get shop data for archetype and color detection
      const shopArchetypes = await getShopArchetypes();
      const shopColors = await getShopColors();

      const archetypeNames = new Set(shopArchetypes.map(a => a.name));
      const colorNames = new Set(shopColors.map(c => c.name.toLowerCase()));

      // Define role categories in the desired order (highest to lowest)
      const categories: RoleCategory[] = [
        { name: 'Director', roles: [], priority: 1 },
        { name: 'Server Mafia', roles: [], priority: 2 },
        { name: 'mi bombo studios', roles: [], priority: 3 },
        { name: 'bot-kun', roles: [], priority: 4 },
        { name: 'bob-kun', roles: [], priority: 5 },
        { name: 'Guest Star / Booster', roles: [], priority: 6 },
        { name: 'Colors', roles: [], priority: 7 },
        { name: 'Archetypes', roles: [], priority: 8 },
        { name: 'Executive Producer', roles: [], priority: 9 },
        { name: 'Producer', roles: [], priority: 10 },
        { name: 'Lead Cast', roles: [], priority: 11 },
        { name: 'Principal Cast', roles: [], priority: 12 },
        { name: 'Supporting Cast', roles: [], priority: 13 },
        { name: 'Featured Extra', roles: [], priority: 14 },
        { name: 'Extra', roles: [], priority: 15 },
        { name: 'Audience', roles: [], priority: 16 },
        { name: 'Random Bot Roles', roles: [], priority: 17 },
        { name: 'Bots', roles: [], priority: 18 },
        { name: '@everyone', roles: [], priority: 19 },
      ];

      // Known bot role names to detect random bot roles
      const knownBotRolePatterns = [
        'bot',
        'quote',
        'jjk',
        'make it a quote',
        'meme',
        'music',
        'moderation',
        'automod',
        'level',
        'ticket',
        'giveaway',
        'nitro',
        'verification',
      ];

      // Categorize each role
      const uncategorizedRoles: Role[] = [];

      for (const role of allRoles) {
        // Skip @everyone, we'll handle it separately
        if (role.name === '@everyone') {
          categories.find(c => c.name === '@everyone')?.roles.push(role);
          continue;
        }

        // Check if role is above bot's highest role (can't be moved)
        if (role.position >= botPosition && role.id !== botHighestRole.id) {
          uncategorizedRoles.push(role);
          continue;
        }

        const roleName = role.name.toLowerCase();

        // Director
        if (role.id === ROLES.DIRECTOR) {
          categories.find(c => c.name === 'Director')?.roles.push(role);
        }
        // Server Mafia
        else if (roleName === 'server mafia') {
          categories.find(c => c.name === 'Server Mafia')?.roles.push(role);
        }
        // mi bombo studios
        else if (roleName === 'mi bombo studios') {
          categories.find(c => c.name === 'mi bombo studios')?.roles.push(role);
        }
        // bot-kun
        else if (roleName === 'bot-kun') {
          categories.find(c => c.name === 'bot-kun')?.roles.push(role);
        }
        // bob-kun
        else if (roleName === 'bob-kun') {
          categories.find(c => c.name === 'bob-kun')?.roles.push(role);
        }
        // Guest Star / Booster
        else if (role.id === ROLES.BOOSTER || roleName === 'guest star') {
          categories.find(c => c.name === 'Guest Star / Booster')?.roles.push(role);
        }
        // Color roles (check against shop colors and hex patterns)
        else if (colorNames.has(roleName) || /^#[0-9a-f]{6}$/i.test(roleName) || roleName.includes('color')) {
          categories.find(c => c.name === 'Colors')?.roles.push(role);
        }
        // Archetype roles (check against shop archetypes)
        else if (archetypeNames.has(role.name)) {
          categories.find(c => c.name === 'Archetypes')?.roles.push(role);
        }
        // Executive Producer
        else if (role.id === ROLES.EXECUTIVE_PRODUCER) {
          categories.find(c => c.name === 'Executive Producer')?.roles.push(role);
        }
        // Producer
        else if (role.id === ROLES.PRODUCER) {
          categories.find(c => c.name === 'Producer')?.roles.push(role);
        }
        // Lead Cast
        else if (role.id === ROLES.LEAD_CAST) {
          categories.find(c => c.name === 'Lead Cast')?.roles.push(role);
        }
        // Principal Cast
        else if (role.id === ROLES.PRINCIPAL_CAST) {
          categories.find(c => c.name === 'Principal Cast')?.roles.push(role);
        }
        // Supporting Cast
        else if (role.id === ROLES.SUPPORTING_CAST) {
          categories.find(c => c.name === 'Supporting Cast')?.roles.push(role);
        }
        // Featured Extra
        else if (role.id === ROLES.FEATURED_EXTRA) {
          categories.find(c => c.name === 'Featured Extra')?.roles.push(role);
        }
        // Extra
        else if (role.id === ROLES.EXTRA) {
          categories.find(c => c.name === 'Extra')?.roles.push(role);
        }
        // Audience
        else if (role.id === ROLES.AUDIENCE) {
          categories.find(c => c.name === 'Audience')?.roles.push(role);
        }
        // Bots role
        else if (roleName === 'bots' || roleName === 'bot') {
          categories.find(c => c.name === 'Bots')?.roles.push(role);
        }
        // Random bot roles (detect by patterns)
        else if (knownBotRolePatterns.some(pattern => roleName.includes(pattern))) {
          categories.find(c => c.name === 'Random Bot Roles')?.roles.push(role);
        }
        // Uncategorized
        else {
          uncategorizedRoles.push(role);
        }
      }

      // Sort roles within each category (alphabetically for consistency)
      for (const category of categories) {
        category.roles.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Calculate new positions
      let currentPosition = botPosition - 1; // Start just below bot's highest role
      const roleMovements: { role: Role; oldPosition: number; newPosition: number }[] = [];
      const skippedRoles: Role[] = [];

      // Process categories in priority order
      for (const category of categories.sort((a, b) => a.priority - b.priority)) {
        for (const role of category.roles) {
          // Skip if this role is @everyone (always stays at bottom)
          if (role.name === '@everyone') {
            continue;
          }

          // Skip if role is above bot's highest role (can't move)
          if (role.position >= botPosition && role.id !== botHighestRole.id) {
            skippedRoles.push(role);
            continue;
          }

          const oldPosition = role.position;
          if (oldPosition !== currentPosition) {
            roleMovements.push({ role, oldPosition, newPosition: currentPosition });
          }
          currentPosition--;
        }
      }

      // Apply role position changes
      let successCount = 0;
      let failCount = 0;

      for (const movement of roleMovements) {
        try {
          await movement.role.setPosition(movement.newPosition);
          successCount++;
        } catch (error) {
          console.error(`Failed to move role ${movement.role.name}:`, error);
          failCount++;
          skippedRoles.push(movement.role);
        }
      }

      // Build result embed
      const resultEmbed = new EmbedBuilder()
        .setTitle('✅ Role Reorder Complete')
        .setColor(0x7B61FF)
        .setDescription(`Reordered ${successCount} roles successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`)
        .addFields([
          { name: 'Categories Processed', value: categories.filter(c => c.roles.length > 0).map(c => `${c.name} (${c.roles.length})`).join('\n') || 'None', inline: false },
        ]);

      if (skippedRoles.length > 0) {
        resultEmbed.addFields([
          { name: 'Skipped Roles', value: skippedRoles.map(r => r.name).join(', ') || 'None', inline: false },
        ]);
      }

      if (uncategorizedRoles.length > 0) {
        resultEmbed.addFields([
          { name: 'Uncategorized Roles', value: uncategorizedRoles.map(r => r.name).join(', ') || 'None', inline: false },
        ]);
      }

      resultEmbed.setFooter({ text: 'MI BOM3O Studios' });

      await message.reply({ embeds: [resultEmbed] });

    } catch (error) {
      console.error('Error in roleorder command:', error);
      await message.reply('❌ An error occurred while reordering roles. Check the console for details.');
    }
  },
};
