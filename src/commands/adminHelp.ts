import { EmbedBuilder } from 'discord.js';
import { ADMIN_PREFIX, PREFIX, ART_STYLES, ART_STYLE_INFO, ROLES } from '../config/index.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

export const adminHelpCommand: Command = {
  name: 'help',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔧 Admin Commands')
      .setDescription('Commands available to admins (Executive Producer & Director)')
      .setColor(0xFF0000)
      .setFooter({ text: `Admin Prefix: ${ADMIN_PREFIX} | User Prefix: ${PREFIX}` });

    const artStylesList = ART_STYLES.map(s => `\`${s}\` - ${ART_STYLE_INFO[s] || ''}`).join('\n');

    // Admin commands
    embed.addFields([
      {
        name: 'Bombo Times',
        value:
          '`$clip [style] [from_id] [to_id] [director\'s note]` - Generate AI summary (+ artwork, Director only)\n' +
          `Only <@&${ROLES.DIRECTOR}> (Director) gets full access with artwork.\n` +
          'Other admins get a summary only, no artwork, and a 30 minute cooldown between uses.',
        inline: false,
      },
      { name: '🎨 $clip Art Styles', value: artStylesList, inline: false },
      { name: 'XP Management', value: '`$xp @user` - Manage user XP and progression', inline: false },
      { name: 'Residuals Management', value: '`$residuals @user` - Manage user Residuals (Admin/Staff)', inline: false },
      { name: 'Role Synchronization', value: '`$syncroles` - Synchronize all progression roles', inline: false },
      { name: 'Role Ordering', value: '`$roleorder` - Reorder server roles into the proper hierarchy', inline: false },
      { name: 'Settings', value: '`$settings clip_channels <add|remove|list> [#channel]` or `$settings <key> set <value>`', inline: false },
      { name: 'Shop', value: '`$shop` - Publish/re-post the public shop message (Director only)', inline: false },
      { name: 'Testing', value: '`$testwelcome` - Preview the welcome message\n`$testbooster` - Preview the Guest Star message (no residuals gifted)', inline: false },
      { name: 'Owner Commands', value: '`$rules` - Display Director\'s rules (Director only)', inline: false },
    ]);

    // Public commands reference
    embed.addFields([
      { name: 'Public Commands', value: '`help`, `profile`, `level`, `res`, `leaderboard`, GIF commands, `c <query>` (Featured Extra+ or Guest Star)', inline: false },
    ]);

    await message.reply({ embeds: [embed] });
  },
};
