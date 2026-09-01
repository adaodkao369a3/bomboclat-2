import { EmbedBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

// Role definitions for the progression system
const PROGRESSION_ROLES = [
  // CAST ARC
  { name: 'Audience', configKey: 'AUDIENCE', color: 0x808080 },
  { name: 'Extra', configKey: 'EXTRA', color: 0x95a5a6 },
  { name: 'Featured Extra', configKey: 'FEATURED_EXTRA', color: 0x7f8c8d },
  { name: 'Supporting Cast', configKey: 'SUPPORTING_CAST', color: 0x3498db },
  { name: 'Principal Cast', configKey: 'PRINCIPAL_CAST', color: 0x9b59b6 },
  { name: 'Lead Cast', configKey: 'LEAD_CAST', color: 0xe91e63 },
  // ANTI-HERO ARC
  { name: 'Rogue', configKey: 'ROGUE', color: 0xf39c12 },
  { name: 'Mercenary', configKey: 'MERCENARY', color: 0xd35400 },
  { name: 'Vigilante', configKey: 'VIGILANTE', color: 0xc0392b },
  { name: 'Renegade', configKey: 'RENEGADE', color: 0x8e44ad },
  // VILLAIN ARC
  { name: 'Villain', configKey: 'VILLAIN', color: 0x2c3e50 },
  { name: 'Nemesis', configKey: 'NEMESIS', color: 0x1a1a2e },
  { name: 'Mastermind', configKey: 'MASTERMIND', color: 0x4a0e4e },
  { name: 'Overlord', configKey: 'OVERLORD', color: 0x000000 },
];

export const setupRolesCommand: Command = {
  name: 'setuproles',
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

    await message.reply('🔍 Checking server roles...');

    const createdRoles: { name: string; id: string }[] = [];
    const reusedRoles: { name: string; id: string }[] = [];
    const errors: string[] = [];

    for (const roleDef of PROGRESSION_ROLES) {
      try {
        // Check if role already exists by name
        const existingRole = message.guild.roles.cache.find(
          (r) => r.name === roleDef.name
        );

        if (existingRole) {
          reusedRoles.push({ name: roleDef.name, id: existingRole.id });
          console.log(`✓ Found existing role: ${roleDef.name} (${existingRole.id})`);
        } else {
          // Create the role
          const newRole = await message.guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            permissions: [], // No special permissions
            reason: 'Progression system role setup',
          });
          createdRoles.push({ name: roleDef.name, id: newRole.id });
          console.log(`✓ Created new role: ${roleDef.name} (${newRole.id})`);
        }
      } catch (error) {
        const errorMsg = `Failed to setup role ${roleDef.name}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Generate summary embed
    const embed = new EmbedBuilder()
      .setTitle('🎭 Role Setup Complete')
      .setColor(0x7B61FF)
      .addFields([
        {
          name: '✅ Roles Created',
          value: createdRoles.length > 0 
            ? createdRoles.map(r => `${r.name} (\`${r.id}\`)`).join('\n')
            : 'None',
          inline: false,
        },
        {
          name: '♻️ Roles Reused',
          value: reusedRoles.length > 0
            ? reusedRoles.map(r => `${r.name} (\`${r.id}\`)`).join('\n')
            : 'None',
          inline: false,
        },
      ]);

    if (errors.length > 0) {
      embed.addFields({
        name: '❌ Errors',
        value: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''),
        inline: false,
      });
    }

    embed.addFields({
      name: '📝 Next Steps',
      value: 'Update the ROLES configuration in `src/config/index.ts` with the role IDs above, then run `$syncroles` to update existing users.',
      inline: false,
    });

    await message.reply({ embeds: [embed] });
  },
};
