import { Guild, EmbedBuilder } from 'discord.js';
import { CHANNELS, XP_CONFIG } from '../config/index.js';
import { getRoleFromLevel, type XPAwardResult } from './xp.js';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function isRoleMilestone(level: number): boolean {
  return Object.values(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS).includes(level as any);
}

function getUnlockedPerks(role: string): string[] {
  switch (role) {
    case 'featured_extra':
      return ['<:glossystaremoji:1545004043699626004> Custom GIF search unlocked'];
    case 'supporting_cast':
      return ['<:glossystaremoji:1545004043699626004> Custom GIF search unlocked', '<a:happystar:1541974913781338273> Additional media permissions'];
    case 'principal_cast':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<a:happystar:1541974913781338273> Additional media permissions',
        '👑 Principal Cast privileges',
      ];
    case 'lead_cast':
      return [
        '<:glossystaremoji:1545004043699626004> Custom GIF search unlocked',
        '<a:happystar:1541974913781338273> Additional media permissions',
        '👑 Lead Cast privileges',
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
      .setTitle(result.roleChanged ? '<a:oldtelephone:1529443123602653225> PROMOTION ALERT!' : '<:greenglossytickcheckmark:1541974842398482472> LEVEL UP!')
      .setDescription(
        result.roleChanged
          ? `**${displayName}** has been promoted to <a:pokeballsuccess:1545003084948701265> **${formatRole(currentRole)}**!`
          : `**${displayName}** has reached level **${result.newLevel}**!`
      )
      .setColor(0x7B61FF)
      .addFields(
        { name: 'New Level', value: result.newLevel.toString(), inline: true },
        { name: 'Total XP', value: result.newXP.toLocaleString(), inline: true },
        { name: '<a:doginaldollar:1541974906252828672> Residuals Earned', value: `+${result.levelUpResiduals}`, inline: true },
        { name: 'Current Role', value: formatRole(currentRole), inline: true },
        { name: 'Perks Unlocked', value: perksText, inline: false },
      )
      .setFooter({ text: 'MI BOM3O Studios' })
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
