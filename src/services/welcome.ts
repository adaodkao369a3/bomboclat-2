import { EmbedBuilder, GuildMember, PartialGuildMember } from 'discord.js';
import { CHANNELS, ROLES, EMOJIS, WELCOME_GIF_QUERIES, BOOST_GIF_QUERIES } from '../config/index.js';
import { fetchGIF } from './klipy.js';

function randomQuery(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Sends a randomized, pretty welcome embed (with a randomized GIF) whenever
 * a new member joins. A fresh GIF query is rolled every single time so the
 * GIF shown is different join to join.
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

    const gifUrl = await fetchGIF(randomQuery(WELCOME_GIF_QUERIES));

    const embed = new EmbedBuilder()
      .setTitle('🎬 ✨ A New Star Has Entered The Set! ✨')
      .setDescription(
        `Welcome to **MI BOM3O Studios**, ${member.toString()}! 🌟🎉\n\n` +
        `We're so hyped to have you join the cast 🍿 grab a seat, introduce yourself, and start your journey ` +
        `from **Audience** all the way up to **Lead Cast** 🎭💫\n\n` +
        `🎥 Check out the rules, say hey in chat, and let's make some magic happen!`
      )
      .setColor(0x9b5de5)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `🎟️ Member #${member.guild.memberCount} • MI BOM3O Studios` })
      .setTimestamp();

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    await channel.send({ content: `${member.toString()} 🎬`, embeds: [embed] });
  } catch (error) {
    console.error('[welcome] Failed to send welcome message:', error);
  }
}

/**
 * Sends a pretty, randomized "thank you for boosting" embed (with a
 * randomized GIF) to the configured booster shoutout channel.
 */
export async function sendBoosterThankYou(member: GuildMember): Promise<void> {
  try {
    const channel = member.guild.channels.cache.get(CHANNELS.BOOSTER_THANKYOU);
    if (!channel || !channel.isTextBased()) {
      console.warn('[booster] Booster thank-you channel not found or not text-based; skipping.');
      return;
    }

    const gifUrl = await fetchGIF(randomQuery(BOOST_GIF_QUERIES));

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.CROWN} A Boost Fit For Royalty! ${EMOJIS.CROWN}`)
      .setDescription(
        `${member.toString()} just boosted **MI BOM3O Studios**! 💜🚀\n\n` +
        `Thank you so much for the love and support ${EMOJIS.CROWN} you're keeping the lights on set and the ` +
        `cameras rolling for the whole cast 🎬✨\n\n` +
        `You're officially VIP cast now ${EMOJIS.CROWN} 🌟💎`
      )
      .setColor(0xF47FFF)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `${EMOJIS.CROWN} Boosts help the whole studio shine • MI BOM3O Studios` })
      .setTimestamp();

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    await channel.send({ content: `${EMOJIS.CROWN} ${member.toString()} ${EMOJIS.CROWN}`, embeds: [embed] });
  } catch (error) {
    console.error('[booster] Failed to send booster thank-you message:', error);
  }
}

export function hasBoosterRole(member: GuildMember | PartialGuildMember): boolean {
  return member.roles.cache.has(ROLES.BOOSTER);
}
