import { EmbedBuilder, GuildMember } from 'discord.js';
import { PREFIX } from '../config/index.js';
import { getUser } from '../database/client.js';
import { getResidualsInfo } from '../services/residuals.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';

export const resCommand: Command = {
  name: 'res',
  async execute(message, args, prefix) {
    // Only respond to user prefix
    if (prefix !== PREFIX) return;

    // Cooldown check
    const remaining = getRemaining(message.author.id);
    if (remaining > 0) {
      await message.reply(`⏱️ Please wait ${remaining} seconds before using .res again.`);
      return;
    }
    setCooldown(message.author.id, 15);

    // Get target user
    let target: GuildMember;
    if (args.length > 0 && message.mentions.members?.first()) {
      target = message.mentions.members.first()!;
    } else if (message.member) {
      target = message.member as GuildMember;
    } else {
      await message.reply('❌ Unable to determine target user.');
      return;
    }

    // Get user data
    const userData = await getUser(target.user.id);
    if (!userData) {
      await message.reply('❌ User not found in database.');
      return;
    }

    // Get residuals
    const residualData = await getResidualsInfo(target.user.id);
    if (!residualData) {
      await message.reply('❌ Residuals data not found.');
      return;
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('💰 RESIDUALS')
      .setDescription(`**${target.displayName}**`)
      .setColor(0xFFD700)
      .setThumbnail(target.user.displayAvatarURL())
      .addFields([
        { name: 'Current Balance', value: `\`${residualData.balance.toLocaleString()}\``, inline: true },
        { name: 'Lifetime Earned', value: `\`${residualData.lifetime_earned.toLocaleString()}\``, inline: true },
        { name: 'Lifetime Spent', value: `\`${residualData.lifetime_spent.toLocaleString()}\``, inline: true },
      ])
      .setFooter({ text: 'MI BOM3O Studios' });

    await message.reply({ embeds: [embed] });
  },
};
