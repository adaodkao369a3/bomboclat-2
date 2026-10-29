import { EmbedBuilder, GuildMember, AttachmentBuilder } from 'discord.js';
import { getUser } from '../database/client.js';
import { getResidualsInfo } from '../services/residuals.js';
import { getResidualsLeaderboard } from '../database/client.js';
import { EMOJIS } from '../config/index.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { cooldownMessage, setAuthorHeader, setStandardFooter } from '../ui/index.js';
import { Command } from './index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const moneyImagePath = join(process.cwd(), 'assets/money.png');

export const resCommand: Command = {
  name: 'res',
  allowedPrefix: '.',
  async execute(message, args, _prefix) {

    // Cooldown check
    const remaining = getRemaining(message.author.id, 'res');
    if (remaining > 0) {
      await message.reply(cooldownMessage(remaining));
      return;
    }
    setCooldown(message.author.id, 'res', 15);

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

    // Get rank on residuals leaderboard
    const { entries: allEntries } = await getResidualsLeaderboard(1000, 0);
    const rank = allEntries.findIndex(e => e.user_id === target.user.id) + 1;
    const rankText = rank > 0 ? `#${rank} richest` : 'Not ranked';

    // Create embed
    const moneyImageBuffer = readFileSync(moneyImagePath);
    const moneyAttachment = new AttachmentBuilder(moneyImageBuffer, { name: 'money.png' });

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.CASH} Residuals`)
      .setDescription(`__${target.displayName}__\n-# ${EMOJIS.CASH} ${residualData.balance.toLocaleString()} residuals\n\nLifetime earned: ${residualData.lifetime_earned.toLocaleString()}\nLifetime spent: ${residualData.lifetime_spent.toLocaleString()}\n${rankText}`)
      .setColor(0x4900ff)
      .setThumbnail('attachment://money.png');

    setAuthorHeader(embed, target.displayName, target.user.displayAvatarURL());
    setStandardFooter(embed);

    await message.reply({ embeds: [embed], files: [moneyAttachment] });
  },
};
