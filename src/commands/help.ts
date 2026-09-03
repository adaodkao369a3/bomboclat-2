import { EmbedBuilder } from 'discord.js';
import { Command } from './index.js';

export const helpCommand: Command = {
  name: 'commands',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {

    const embed = new EmbedBuilder()
      .setTitle('<:star:1545002693368750193> Bomboclat Commands')
      .setDescription('Use these commands in chat. (prefix ".")')
      .setColor(0x4900ff);

    // Public commands
    embed.addFields([
      { name: '<a:pokeballsuccess:1545003084948701265> Profile & Progression', value: '`.profile` `.level` `.res` `.leaderboard`', inline: true },
      { name: '<:glossystaremoji:1545004043699626004> Fun Commands', value: '`.rizz` `.larp` `.blush` `.cooked` `.fumble` `.cope` `.grass` `.aura` `.huh` `.cry`', inline: true },
      { name: '<:jolly:1545004994418446403> Custom GIF', value: '`.c <query>`', inline: true },
      { name: '<a:shoppingcart:1545005246579875860> Manage shop items', value: '`.manage` - manage roles', inline: true },
    ]);

    await message.reply({ embeds: [embed] });
  },
};
