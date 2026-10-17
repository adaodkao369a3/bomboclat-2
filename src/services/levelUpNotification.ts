import { Guild, EmbedBuilder } from 'discord.js';
import { CHANNELS, XP_CONFIG } from '../config/index.js';
import { getRoleFromLevel, type XPAwardResult } from './xp.js';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function isRoleMilestone(level: number): boolean {
  return Object.values(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS).includes(level as any);
}

export function getUnlockedPerks(role: string): string[] {
  switch (role) {
    case 'civilian':
      return ['🎬 Welcome to the cast! Start your journey.'];
    case 'sidekick':
      return ['⭐ Supporting role unlocked - You\'re gaining recognition!'];
    case 'hero':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '🦸 Hero status - You\'re a recognized member of the cast',
      ];
    case 'champion':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🏆 Champion privileges',
      ];
    case 'guardian':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🛡️ Guardian status - Trusted cast member',
      ];
    case 'superhero':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🦸‍♂️ Superhero privileges',
        '💎 Rare shop access',
      ];
    case 'anti_hero':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🌑 Anti-Hero status - Walk the darker path',
        '💎 Rare shop access',
      ];
    case 'rogue':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🗡️ Rogue privileges',
        '💎 Rare shop access',
      ];
    case 'renegade':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '⚡ Renegade status',
        '💎 Rare shop access',
      ];
    case 'outlaw':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🎯 Outlaw privileges',
        '💎 Rare shop access',
      ];
    case 'villain':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '😈 Villain status - Embrace your role',
        '💎 Rare shop access',
      ];
    case 'mastermind':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🧠 Mastermind privileges',
        '� Rare shop access',
        '�👑 VIP status',
      ];
    case 'kingpin':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '👑 Kingpin status - Rule the underworld',
        '💎 Rare shop access',
        '👑 VIP status',
      ];
    case 'overlord':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '🏰 Overlord privileges',
        '💎 Rare shop access',
        '👑 VIP status',
      ];
    case 'tyrant':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '⚔️ Tyrant status - Absolute power',
        '💎 Rare shop access',
        '👑 VIP status',
      ];
    case 'emperor':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '👑 Emperor privileges - Supreme ruler',
        '💎 Rare shop access',
        '👑 VIP status',
      ];
    case 'saint':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<:star:1545002693368750193> Additional media permissions',
        '😇 Saint status - Maximum enlightenment',
        '💎 Rare shop access',
        '👑 VIP status',
        '💎 Mythic shop access',
      ];
    default:
      return [];
  }
}

export async function sendLevelUpNotification(
  guild: Guild,
  userId: string,
  displayName: string,
  avatarUrl: string,
  result: XPAwardResult
): Promise<void> {
  if (!result.levelUpOccurred || result.newXP === null) return;

  // Only send notifications for role milestones, not regular level ups
  if (!result.roleChanged && !isRoleMilestone(result.newLevel)) return;

  try {
    const currentRole = result.newRole || getRoleFromLevel(result.newLevel);
    const perks = result.roleChanged ? getUnlockedPerks(currentRole) : [];
    const perksText = perks.length > 0
      ? perks.join('\n')
      : 'Keep going to unlock the next progression perk.';

    const embed = new EmbedBuilder()
      .setTitle(result.roleChanged ? '<a:oldtelephone:1561008142169677954> PROMOTION ALERT!' : '<:greenglossytickcheckmark:1545126564247633970> LEVEL UP!')
      .setDescription(
        result.roleChanged
          ? `**${displayName}** has been promoted to <:ladder:1545126567145906246> **${formatRole(currentRole)}**!`
          : `**${displayName}** has reached level **${result.newLevel}**!`
      )
      .setColor(0x7B61FF)
      .addFields(
        { name: 'New Level', value: result.newLevel.toString(), inline: true },
        { name: 'Total XP', value: result.newXP.toLocaleString(), inline: true },
        { name: '<a:cash:1545126549035024524> Residuals Earned', value: `+${result.levelUpResiduals}`, inline: true },
        { name: 'Current Role', value: formatRole(currentRole), inline: true },
        { name: 'Perks Unlocked', value: perksText, inline: false },
      )
      .setFooter({ text: 'Bombo Studios' })
      .setThumbnail(avatarUrl);

    const castingChannel = guild.channels.cache.get(CHANNELS.CASTING);
    if (!castingChannel || !castingChannel.isTextBased()) {
      console.error(`Cannot send level-up notification: casting channel ${CHANNELS.CASTING} is unavailable.`);
      return;
    }

    await castingChannel.send({
      content: `<@${userId}>`,
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to send level-up notification:', error);
  }
}
