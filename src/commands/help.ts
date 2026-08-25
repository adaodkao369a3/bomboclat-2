import { EmbedBuilder } from 'discord.js';
import { PREFIX } from '../config/index.js';
import { Command } from './index.js';

export const helpCommand: Command = {
  name: 'help',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {

    const embed = new EmbedBuilder()
      .setTitle('🎬 Bomboclat Commands')
      .setDescription('Use these commands in chat.')
      .setColor(0x9b5de5)
      .setFooter({ text: `Prefix: ${PREFIX}` });

    // Public commands
    embed.addFields([
      { name: 'Profile & Progression', value: '`profile`, `level`, `res`, `leaderboard`', inline: true },
      { name: 'GIF Commands', value: '`rizz`, `larp`, `blush`, `cooked`, `fumble`, `cope`, `grass`, `aura`, `huh`, `cry`', inline: true },
      { name: 'Custom GIF', value: '`c <query>` (Featured Extra+ or Guest Star)', inline: true },
    ]);

    await message.reply({ embeds: [embed] });
  },
};
