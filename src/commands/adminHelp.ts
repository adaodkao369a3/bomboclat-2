import { EmbedBuilder } from 'discord.js';
import { ADMIN_PREFIX, PREFIX } from '../config/index.js';
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

    // Admin commands
    embed.addFields([
      { name: 'Bombo Times', value: '`$clip [style] [director\'s note]` - Generate AI summary and artwork', inline: false },
      { name: 'XP Management', value: '`$xp @user` - Manage user XP and progression', inline: false },
      { name: 'Residuals Management', value: '`$residuals @user` - Manage user Residuals (Admin/Staff)', inline: false },
      { name: 'Role Synchronization', value: '`$syncroles` - Synchronize all progression roles', inline: false },
      { name: 'Owner Commands', value: '`$rules` - Display Director\'s rules (Director only)', inline: false },
    ]);

    // Public commands reference
    embed.addFields([
      { name: 'Public Commands', value: '`help`, `profile`, `level`, `res`, `leaderboard`, GIF commands, `c <query>` (Featured Extra+)', inline: false },
    ]);

    await message.reply({ embeds: [embed] });
  },
};
