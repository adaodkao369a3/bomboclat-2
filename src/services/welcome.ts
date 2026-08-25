import { EmbedBuilder, GuildMember, PartialGuildMember } from 'discord.js';
import {
  CHANNELS,
  ROLES,
  EMOJIS,
  WELCOME_GIF_QUERIES,
  BOOST_GIF_QUERIES,
  WELCOME_MESSAGES,
  BOOST_MESSAGES,
  BOOST_RESIDUAL_GIFT,
} from '../config/index.js';
import { fetchGIF } from './klipy.js';
import { getOrCreateUser } from '../database/client.js';
import { ResidualsService } from './residuals.js';

function randomFrom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function fillTemplate(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => replacements[key] ?? match);
}

const WELCOME_REPLACEMENTS = {
  typing: EMOJIS.TYPING,
  sunglasses: EMOJIS.SUNGLASSES,
  pink: EMOJIS.PINK_HEART,
  orange: EMOJIS.ORANGE_HEART,
};

const BOOST_REPLACEMENTS = {
  crown: EMOJIS.CROWN,
  crown2: EMOJIS.CROWN2,
  money: EMOJIS.MONEY,
  pink: EMOJIS.PINK_HEART,
  orange: EMOJIS.ORANGE_HEART,
  sunglasses: EMOJIS.SUNGLASSES,
};

function guestStarCount(member: GuildMember): number {
  return member.guild.members.cache.filter(m => m.roles.cache.has(ROLES.BOOSTER)).size;
}

/**
 * Sends a randomized welcome embed (one of 10 lines, plus a randomized
 * welcome/red-carpet GIF) whenever a new member joins.
 */
export async function sendWelcomeMessage(member: GuildMember): Promise<void> {
  try {
    const channel = CHANNELS.WELCOME
      ? member.guild.channels.cache.get(CHANNELS.WELCOME)
      : member.guild.systemChannel;

    if (!channel || !channel.isTextBased()) {
      console.warn('[welcome] Welcome channel not found or not text-based; skipping welcome message.');
      return;
    }

    const gifUrl = await fetchGIF(randomFrom(WELCOME_GIF_QUERIES));

    const line = fillTemplate(randomFrom(WELCOME_MESSAGES), {
      ...WELCOME_REPLACEMENTS,
      user: `<@${member.id}>`,
      count: member.guild.memberCount.toString(),
    });

    const embed = new EmbedBuilder()
      .setDescription(line)
      .setColor(0x9b5de5)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `Member #${member.guild.memberCount} - MI BOM3O Studios` })
      .setTimestamp();

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[welcome] Failed to send welcome message:', error);
  }
}

/**
 * Sends a randomized "Guest Star" thank-you embed to the red carpet channel,
 * and gifts the booster a one-time residual bonus.
 */
export async function sendBoosterThankYou(member: GuildMember): Promise<void> {
  try {
    const channel = member.guild.channels.cache.get(CHANNELS.BOOSTER_THANKYOU);
    if (!channel || !channel.isTextBased()) {
      console.warn('[booster] Red carpet channel not found or not text-based; skipping.');
      return;
    }

    const gifUrl = await fetchGIF(randomFrom(BOOST_GIF_QUERIES));

    const line = fillTemplate(randomFrom(BOOST_MESSAGES), {
      ...BOOST_REPLACEMENTS,
      user: `<@${member.id}>`,
    });

    const embed = new EmbedBuilder()
      .setDescription(line)
      .setColor(0xF47FFF)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `Guest Star #${guestStarCount(member)} - MI BOM3O Studios` })
      .setTimestamp();

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[booster] Failed to send booster thank-you message:', error);
  }
}

/**
 * Gifts a one-time residual bonus to a new Guest Star. Safe to call even if
 * the user has no DB row yet.
 */
export async function giftBoosterResiduals(member: GuildMember): Promise<void> {
  try {
    await getOrCreateUser(member.user.id, member.user.username, member.user.displayName);
    const result = await ResidualsService.awardResiduals(
      member.user.id,
      BOOST_RESIDUAL_GIFT,
      'boost',
      'Guest Star boost gift'
    );
    if (result === null) {
      console.error(`[booster] Failed to gift ${BOOST_RESIDUAL_GIFT} residuals to ${member.user.id}`);
    } else {
      console.log(`[booster] Gifted ${BOOST_RESIDUAL_GIFT} residuals to ${member.user.id} (Guest Star boost)`);
      
      // Note: Free archetype and color grants are handled through the shop UI
      // Users can claim their free Standard archetype and Common color via the shop
      // The shop system tracks free grant eligibility separately
    }
  } catch (error) {
    console.error('[booster] Failed to gift booster residuals:', error);
  }
}

export function hasBoosterRole(member: GuildMember | PartialGuildMember): boolean {
  return member.roles.cache.has(ROLES.BOOSTER);
}
