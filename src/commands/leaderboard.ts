import { EmbedBuilder } from 'discord.js';
import { getLeaderboard } from '../database/client.js';
import { Command } from './index.js';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {

    // Get leaderboard (max 5)
    const leaderboard = await getLeaderboard(5);
    
    if (!leaderboard || leaderboard.length === 0) {
      await message.reply('❌ No leaderboard data available.');
      return;
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('<a:pokeballsuccess:1545003084948701265> TOP CAST')
      .setDescription('The most active members of MI BOMBO Studios')
      .setColor(0x4900ff)
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
