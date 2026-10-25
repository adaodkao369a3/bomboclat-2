import { EmbedBuilder, GuildMember, PartialGuildMember } from 'discord.js';
import {
  CHANNELS,
  ROLES,
  EMOJIS,
  WELCOME_MESSAGES,
  BOOST_MESSAGES,
  BOOST_RESIDUAL_GIFT,
  BOOSTER_ROLE_LABEL,
} from '../config/index.js';
import { getOrCreateUser, getClient } from '../database/client.js';
import { ResidualsService } from './residuals.js';
import { assignRolesOnJoin } from './roleAudit.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Use process.cwd() to get the project root at runtime
const WELCOME_IMAGE_PATH = join(process.cwd(), 'assets/welcome.png');
const BOOSTER_IMAGE_PATH = join(process.cwd(), 'assets/booster.png');

function randomFrom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function fillTemplate(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => replacements[key] ?? match);
}

const BOOST_REPLACEMENTS = {
  crown: EMOJIS.CROWN,
  crown2: EMOJIS.CROWN2,
  money: EMOJIS.MONEY,
  pink: EMOJIS.PINK_HEART,
  orange: EMOJIS.ORANGE_HEART,
  sunglasses: EMOJIS.JOLLY,
};

async function guestStarCount(member: GuildMember): Promise<number> {
  return member.guild.members.cache.filter(m => m.roles.cache.has(ROLES.BOOSTER)).size;
}

/**
 * Sends a randomized welcome embed (one of 10 lines, plus the welcome PNG)
 * whenever a new member joins.
 * @param member - The guild member who joined
 * @param testChannel - Optional channel to send to for testing (if provided, skips role assignment)
 */
export async function sendWelcomeMessage(member: GuildMember, testChannel?: any): Promise<void> {
  try {
    // Only assign roles if not in test mode
    if (!testChannel) {
      await assignRolesOnJoin(member);
    }

    const channel = testChannel || (CHANNELS.WELCOME
      ? member.guild.channels.cache.get(CHANNELS.WELCOME)
      : member.guild.systemChannel);

    if (!channel || !channel.isTextBased()) {
      console.warn('[welcome] Welcome channel not found or not text-based; skipping welcome message.');
      return;
    }

    const line = fillTemplate(randomFrom(WELCOME_MESSAGES), {
      user: `<@${member.id}>`,
      count: member.guild.memberCount.toString(),
    });

    const embed = new EmbedBuilder()
      .setDescription(line)
      .setColor(0x9b5de5)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `Member #${member.guild.memberCount} - MI BOMBO` })
      .setTimestamp();

    // Use welcome.png as the image
    try {
      const welcomeImageBuffer = readFileSync(WELCOME_IMAGE_PATH);
      await channel.send({
        embeds: [embed],
        files: [{ attachment: welcomeImageBuffer, name: 'welcome.png' }],
      });
    } catch (imageError) {
      console.error('[welcome] Failed to read welcome.png, sending without image:', imageError);
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[welcome] Failed to send welcome message:', error);
  }
}

/**
 * Sends a randomized "Guest Star" thank-you embed to the red carpet channel,
 * and gifts the booster a one-time residual bonus.
 * @param member - The guild member who boosted
 * @param testChannel - Optional channel to send to for testing (if provided, skips residual gifting)
 */
export async function sendBoosterThankYou(member: GuildMember, testChannel?: any, gifted: boolean = true): Promise<void> {
  try {
    const channel = testChannel || member.guild.channels.cache.get(CHANNELS.BOOSTER_THANKYOU);
    if (!channel || !channel.isTextBased()) {
      console.warn('[booster] Red carpet channel not found or not text-based; skipping.');
      return;
    }

    const line = fillTemplate(randomFrom(BOOST_MESSAGES), {
      ...BOOST_REPLACEMENTS,
      user: `<@${member.id}>`,
    });

    const guestStarCountValue = await guestStarCount(member);

    const embed = new EmbedBuilder()
      .setDescription(line)
      .addFields({ name: `${EMOJIS.CROWN} Your Guest Star perks`, value: buildBoosterPerks(gifted), inline: false })
      .setColor(0xF47FFF)
      .setFooter({ text: `Guest Star #${guestStarCountValue} - MI BOMBO` })
      .setTimestamp();

    // Use booster.png as the thumbnail (right side of embed)
    try {
      const boosterImageBuffer = readFileSync(BOOSTER_IMAGE_PATH);
      embed.setThumbnail('attachment://booster.png');
      await channel.send({
        embeds: [embed],
        files: [{ attachment: boosterImageBuffer, name: 'booster.png' }],
      });
    } catch (imageError) {
      console.error('[booster] Failed to read booster.png, sending without image:', imageError);
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[booster] Failed to send booster thank-you message:', error);
  }
}

/**
 * The list of things a Guest Star gets. Keep this in sync with what the bot
 * really does (XP multiplier in xp.ts, access in permissions.ts, and the
 * target protection in perish.ts / transform.ts).
 */
export function buildBoosterPerks(gifted: boolean = true): string {
  const gift = gifted
    ? `${EMOJIS.MONEY} **${BOOST_RESIDUAL_GIFT.toLocaleString('en-US')} residuals**, a one-time thank-you gift`
    : `${EMOJIS.MONEY} Your one-time residual gift was already claimed on your first boost`;
  return [
    `${EMOJIS.CROWN} The **${BOOSTER_ROLE_LABEL}** role`,
    gift,
    `${EMOJIS.FIRE} **+25% XP** on messages and voice`,
    `${EMOJIS.GLOSSY_STAR} **Custom GIF search** with \`.c\`, unlocked from the start`,
    `${EMOJIS.CROWN2} **Protected** from \`.perish\` and \`.transform\``,
  ].join('\n');
}

/**
 * Gifts a one-time residual bonus to a new Guest Star. Safe to call even if
 * the user has no DB row yet.
 */
export async function giftBoosterResiduals(member: GuildMember): Promise<boolean> {
  try {
    await getOrCreateUser(member.user.id, member.user.username, member.user.displayName);

    // One gift per person, ever, so boosting/unboosting can't be farmed
    const client = await getClient();
    try {
      const prior = await client.query(
        "SELECT 1 FROM residual_transactions WHERE user_id = $1 AND source = 'boost' LIMIT 1",
        [member.user.id]
      );
      if (prior.rows.length > 0) {
        console.log(`[booster] ${member.user.id} already received the boost gift; skipping.`);
        return false;
      }
    } finally {
      client.release();
    }

    const result = await ResidualsService.awardResiduals(
      member.user.id,
      BOOST_RESIDUAL_GIFT,
      'boost',
      'Guest Star boost gift'
    );
    if (result === null) {
      console.error(`[booster] Failed to gift ${BOOST_RESIDUAL_GIFT} residuals to ${member.user.id}`);
      return false;
    }
    console.log(`[booster] Gifted ${BOOST_RESIDUAL_GIFT} residuals to ${member.user.id} (Guest Star boost)`);
    return true;
  } catch (error) {
    console.error('[booster] Failed to gift booster residuals:', error);
    return false;
  }
}

export function hasBoosterRole(member: GuildMember | PartialGuildMember): boolean {
  return member.roles.cache.has(ROLES.BOOSTER);
}
