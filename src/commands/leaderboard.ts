import { EmbedBuilder } from 'discord.js';
import { PREFIX } from '../config/index.js';
import { getLeaderboard } from '../database/client.js';
import { Command } from './index.js';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  async execute(message, _args, prefix) {
    // Only respond to user prefix
    if (prefix !== PREFIX) return;

    // Get leaderboard (max 5)
    const leaderboard = await getLeaderboard(5);
    
    if (!leaderboard || leaderboard.length === 0) {
      await message.reply('❌ No leaderboard data available.');
      return;
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🏆 TOP CAST')
      .setDescription('The most active members of MI BOMBO Studios')
      .setColor(0xFFD700)
      .setFooter({ text: 'MI BOM3O Studios' });

    // Add leaderboard entries
    leaderboard.forEach((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      embed.addFields({
        name: `${medal} ${entry.username}`,
        value: `Level ${entry.current_level} • ${entry.current_xp.toLocaleString()} XP`,
        inline: false,
      });
    });

    await message.reply({ embeds: [embed] });
  },
};
