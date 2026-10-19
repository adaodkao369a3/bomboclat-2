import { EmbedBuilder, GuildMember } from 'discord.js';
import { getUser, getLeaderboard, getXPBySource } from '../database/client.js';
import { calculateXPForLevel, calculateXPRemaining, PROGRESSION_ROLE_KEYS } from '../services/xp.js';
import { XP_CONFIG } from '../config/index.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { cooldownMessage, setAuthorHeader, setStandardFooter } from '../ui/index.js';
import { Command } from './index.js';

function formatRoleName(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const levelCommand: Command = {
  name: 'level',
  allowedPrefix: '.',
  aliases: ['lvl'],
  async execute(message, args, _prefix) {

    // Cooldown check
    const remaining = getRemaining(message.author.id, 'level');
    if (remaining > 0) {
      await message.reply(cooldownMessage(remaining));
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

    const currentLevel = userData.current_level;
    const currentXP = userData.current_xp;
    const currentRole = userData.current_progression_role;
    const roleDisplay = formatRoleName(currentRole);

    // Calculate XP for current and next level
    const currentLevelXP = calculateXPForLevel(currentLevel);
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    const xpToNext = calculateXPRemaining(currentXP, currentLevel);
    const progressPercentage = Math.min(Math.max(((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100, 0), 100);

    // Consistent progress bar (filled emoji for progress, empty for remaining)
    const filledBars = Math.floor(progressPercentage / 10);
    const progressBar = '⬛'.repeat(filledBars) + '⬜'.repeat(10 - filledBars);

    // Get XP by source (chat and voice)
    const xpBySource = await getXPBySource(target.user.id);

    // Get XP leaderboard rank
    const leaderboard = await getLeaderboard(100);
    const rank = leaderboard.findIndex(e => e.user_id === target.user.id) + 1;
    const rankText = rank > 0 ? `#${rank}` : 'Not ranked';

    // Role ladder - current role + next two
    const currentRoleIndex = PROGRESSION_ROLE_KEYS.indexOf(currentRole as any);
    const maxRoleIndex = Math.min(currentRoleIndex + 2, PROGRESSION_ROLE_KEYS.length - 1);
    
    const roleLadder = PROGRESSION_ROLE_KEYS.slice(currentRoleIndex, maxRoleIndex + 1).map((roleKey) => {
      const requiredLevel = XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[roleKey];
      const achieved = currentLevel >= requiredLevel;
      const icon = achieved ? '✅' : '🔒';
      const isCurrent = roleKey === currentRole;
      const marker = isCurrent ? ' ← Current' : '';
      return `${icon} __${formatRoleName(roleKey)}__ (Level ${requiredLevel})${marker}`;
    }).join('\n');

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('<:ladder:1545126567145906246> LEVEL PROGRESS')
      .setDescription(
        `__${target.displayName}__\n` +
        `-# Level ${currentLevel} • ${roleDisplay}\n\n` +
        `__XP Progress__\n` +
        `-# ${currentXP.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP\n` +
        `-# ${xpToNext.toLocaleString()} XP to go\n` +
        `${progressBar} ${Math.floor(progressPercentage)}%\n\n` +
        `__Earned from chat and voice__\n` +
        `-# Chat: ${xpBySource.message.toLocaleString()} XP\n` +
        `-# Voice: ${xpBySource.voice.toLocaleString()} XP\n\n` +
        `__Leaderboard Rank__\n` +
        `-# ${rankText}\n\n` +
        `__Role Ladder__\n` +
        roleLadder
      )
      .setColor(0x4900ff)
      .setThumbnail(target.user.displayAvatarURL());

    setAuthorHeader(embed, target.displayName, target.user.displayAvatarURL());
    setStandardFooter(embed);

    await message.reply({ embeds: [embed] });
  },
};
