import { EmbedBuilder, GuildMember } from 'discord.js';
import { getUser } from '../database/client.js';
import { getResidualsInfo } from '../services/residuals.js';
import { calculateXPForLevel, calculateXPRemaining, calculateProgressPercentage } from '../services/xp.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';

export const levelCommand: Command = {
  name: 'level',
  allowedPrefix: '.',
  async execute(message, args, _prefix) {

    // Cooldown check
    const remaining = getRemaining(message.author.id, 'level');
    if (remaining > 0) {
      await message.reply(`⏱️ Please wait ${remaining} seconds before using .level again.`);
      return;
    }
    setCooldown(message.author.id, 'level', 10);

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

    // Calculate XP progress using centralized functions
    const currentXP = userData.current_xp;
    const currentLevel = userData.current_level;
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    const xpRemaining = calculateXPRemaining(currentXP, currentLevel);
    const xpProgress = calculateProgressPercentage(currentXP, currentLevel);

    // Get residuals
    const residualData = await getResidualsInfo(target.user.id);
    const residualsBalance = residualData?.balance || 0;

    // Create progress bar
    const progressBars = Math.floor(xpProgress / 10);
    const progressBar = '█'.repeat(progressBars) + '░'.repeat(10 - progressBars);

    // Format role name
    const roleDisplay = userData.current_progression_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('📊 LEVEL PROGRESS')
      .setDescription(`**${target.displayName}**\n\`${roleDisplay}\``)
      .setColor(0x7B61FF)
      .setThumbnail(target.user.displayAvatarURL())
      .addFields([
        { name: 'Current Level', value: currentLevel.toString(), inline: true },
        { name: 'Current XP', value: `\`${currentXP.toLocaleString()}\``, inline: true },
        { name: 'XP Required for Next Level', value: `\`${nextLevelXP.toLocaleString()}\``, inline: true },
        { name: 'XP Remaining', value: `\`${xpRemaining.toLocaleString()}\``, inline: true },
        { name: 'XP Progress', value: `\`${progressBar} ${Math.floor(xpProgress)}%\``, inline: false },
        { name: '◈ Residuals', value: `\`${residualsBalance.toLocaleString()}\``, inline: true },
      ])
      .setFooter({ text: 'MI BOM3O Studios' });

    await message.reply({ embeds: [embed] });
  },
};
