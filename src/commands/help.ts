import { EmbedBuilder } from 'discord.js';
import { Command } from './index.js';

export const helpCommand: Command = {
  name: 'help',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {

    const embed = new EmbedBuilder()
      .setTitle('<:mspaward:1542331249690026074> Bomboclat Commands')
      .setDescription('Use these commands in chat. (prefix ".")')
      .setColor(0x4900ff);

    // Public commands
    embed.addFields([
      { name: '<:glossystaremoji:1541974836861993101> Profile & Progression', value: '`.profile` `.level` `.res` `.leaderboard`', inline: true },
      { name: '<a:rainbowdaftpunk:1536398335651352657> Fun Commands', value: '`.rizz` `.larp` `.blush` `.cooked` `.fumble` `.cope` `.grass` `.aura` `.huh` `.cry`', inline: true },
      { name: '<:sunglas:1536398312448589884> Custom GIF', value: '`.c <query>`', inline: true },
      { name: '<a:shoppingcart:1542322214303699095> Manage shop items', value: '`.manage` - manage roles', inline: true },
    ]);

    await message.reply({ embeds: [embed] });
  },
};
