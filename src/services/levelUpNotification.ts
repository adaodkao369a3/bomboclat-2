import { Guild, EmbedBuilder } from 'discord.js';
import { CHANNELS, XP_CONFIG, EMOJIS, GIF_CONFIG, GIF_TIER_LEVELS } from '../config/index.js';
import { getRoleFromLevel, type XPAwardResult } from './xp.js';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function isRoleMilestone(level: number): boolean {
  return Object.values(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS).includes(level as any);
}

// 'anti_hero' / 'antiHero' / 'Anti-Hero' all become 'antihero'
function normalizeRole(role: string): string {
  return role.replace(/[^a-z]/gi, '').toLowerCase();
}

// Headline perk per progression role (custom emojis only)
const ROLE_HEADLINES: Record<string, { icon: string; text: string }> = {
  civilian: { icon: EMOJIS.CIVILIAN, text: 'Welcome to the cast! Start your journey.' },
  sidekick: { icon: EMOJIS.STAR, text: "Supporting role unlocked - You're gaining recognition!" },
  hero: { icon: EMOJIS.HERO, text: "Hero status - You're a recognized member of the cast" },
  champion: { icon: EMOJIS.CROWN2, text: 'Champion privileges' },
  guardian: { icon: EMOJIS.GUARDIAN, text: 'Guardian status - Trusted cast member' },
  superhero: { icon: EMOJIS.SUPERHERO, text: 'Superhero privileges' },
  antihero: { icon: EMOJIS.MOON, text: 'Anti-Hero status - Walk the darker path' },
  rogue: { icon: EMOJIS.FIRE, text: 'Rogue privileges' },
  renegade: { icon: EMOJIS.RENEGADE, text: 'Renegade status' },
  outlaw: { icon: EMOJIS.BLOB_SUNGLASSES, text: 'Outlaw privileges' },
  villain: { icon: EMOJIS.THEATRE, text: 'Villain status - Embrace your role' },
  mastermind: { icon: EMOJIS.SPARKLES, text: 'Mastermind privileges' },
  kingpin: { icon: EMOJIS.KINGPIN, text: 'Kingpin status - Rule the underworld' },
  overlord: { icon: EMOJIS.DCROWN, text: 'Overlord privileges' },
  tyrant: { icon: EMOJIS.JOLLY, text: 'Tyrant status - Absolute power' },
  emperor: { icon: EMOJIS.EMPEROR, text: 'Emperor privileges - Supreme ruler' },
  saint: { icon: EMOJIS.SAINT, text: 'Saint status - Maximum enlightenment' },
};

const ROLE_ORDER = Object.keys(ROLE_HEADLINES);

function roleMinLevel(roleKey: string): number {
  for (const [name, level] of Object.entries(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS)) {
    if (normalizeRole(name) === roleKey) return level as number;
  }
  return 0;
}

export function getUnlockedPerks(role: string): string[] {
  const key = normalizeRole(role);
  const headline = ROLE_HEADLINES[key];
  if (!headline) return [];

  const index = ROLE_ORDER.indexOf(key);
  const level = roleMinLevel(key);
  const perks: string[] = [];

  // GIF tiers are unlocked by level, custom search (.c) by its own level
  const unlockedTiers = GIF_TIER_LEVELS.filter(l => l <= level);
  if (unlockedTiers.length > 0) {
    perks.push(`${EMOJIS.GLOSSY_STAR} GIF commands unlocked up to level ${unlockedTiers[unlockedTiers.length - 1]}`);
  }
  if (level >= GIF_CONFIG.CUSTOM_MIN_LEVEL) {
    perks.push(`${EMOJIS.GLOSSY_STAR} Custom GIF search (.c) unlocked`);
  }
  if (index >= ROLE_ORDER.indexOf('champion')) {
    perks.push(`${EMOJIS.STAR} Additional media permissions`);
  }

  perks.push(`${headline.icon} ${headline.text}`);

  if (index >= ROLE_ORDER.indexOf('superhero')) perks.push(`${EMOJIS.STARICON} Rare shop access`);
  if (index >= ROLE_ORDER.indexOf('mastermind')) perks.push(`${EMOJIS.CROWN} VIP status`);
  if (key === 'saint') perks.push(`${EMOJIS.STARICON} Mythic shop access`);

  return perks;
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
        { name: `${EMOJIS.MONEY} Earned`, value: `+${result.levelUpResiduals.toLocaleString()}`, inline: true },
        { name: 'Current Role', value: formatRole(currentRole), inline: true },
        { name: 'Perks Unlocked', value: perksText, inline: false },
      )
      .setFooter({ text: 'Mi Bombo Studios' })
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
