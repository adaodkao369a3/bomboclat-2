import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { CHANNELS, ROLES, CLIP_CONFIG } from '../config/index.js';
import { generateClipSummary } from '../services/groq.js';
import { generateImage } from '../services/huggingface.js';
import { parseClipArguments } from '../services/clip.js';
import { getSetting } from '../services/settings.js';
import { isStaff } from '../utils/permissions.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';

export const clipCommand: Command = {
  name: 'clip',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {

    // Check staff permissions - Casting Director, Producer, Executive Producer, Director
    if (!message.member || !isStaff(message.member)) {
      await message.reply('❌ This command is restricted to staff.');
      return;
    }

    // Check channel allowlist
    const clipChannelsSetting = await getSetting('clip_channels');
    let allowedChannels: string[] = [];
    if (clipChannelsSetting) {
      try {
        allowedChannels = JSON.parse(clipChannelsSetting);
      } catch {
        console.error('Invalid clip_channels data in database');
      }
    }

    // An explicit allowlist is authoritative. When it is empty, only Bombo Times
    // is allowed. CASTING is not implicitly added; it is only allowed when an
    // admin explicitly adds it with $settings clip_channels add #casting.
    const effectiveChannels = allowedChannels.length > 0
      ? allowedChannels
      : [CHANNELS.BOMBO_TIMES];

    if (!effectiveChannels.includes(message.channel.id)) {
      await message.reply('<:glossyredcancelx:1541974834370842654> This command can only be used in allowed channels.');
      return;
    }

    // Only the Director role gets full access (summary + artwork).
    // Any other admin (e.g. Executive Producer) only gets the AI summary,
    // no image generation, and has to wait between uses.
    const isDirector = message.member.roles.cache.has(ROLES.DIRECTOR);

    if (!isDirector) {
      const remaining = getRemaining(message.author.id, 'clip_admin');
      if (remaining > 0) {
        const minutesRemaining = Math.ceil(remaining / 60);
        await message.reply(`<a:typing:1529443144901464205> Please wait ${minutesRemaining} minute(s) before generating another $clip summary.`);
        return;
      }
    }

    const { style, directorsNote, fromMessageId, toMessageId } = parseClipArguments(args);

    if (fromMessageId && toMessageId) {
      try {
        if (BigInt(fromMessageId) >= BigInt(toMessageId)) {
          await message.reply('<:glossyredcancelx:1541974834370842654> Invalid message range. The starting message ID must be older than the ending message ID.');
          return;
        }
      } catch {
        await message.reply('<:glossyredcancelx:1541974834370842654> Invalid message ID range.');
        return;
      }
    }

    try {
      // Verify explicitly supplied IDs belong to this channel before fetching
      // the range. This gives staff a useful error instead of a generic AI error.
      if (fromMessageId) {
        try {
          await message.channel.messages.fetch(fromMessageId);
          if (toMessageId) {
            await message.channel.messages.fetch(toMessageId);
          }
        } catch {
          await message.reply('<:glossyredcancelx:1541974834370842654> One or more message IDs were not found in this channel.');
          return;
        }
      }

      // Fetch messages based on arguments.
      // Discord message IDs are snowflakes, so BigInt comparison is safe and
      // avoids accidental lexical ordering surprises.
      const messages: Array<{ author: string; content: string }> = [];
      const MAX_MESSAGES = 200;

      if (fromMessageId && toMessageId) {
        let afterId = fromMessageId;
        let fetchedCount = 0;
        let done = false;

        while (!done && fetchedCount <= MAX_MESSAGES) {
          const batch = await message.channel.messages.fetch({
            after: afterId,
            before: toMessageId,
            limit: 100,
          });

          const ordered = [...batch.values()].sort(
            (left, right) => left.createdTimestamp - right.createdTimestamp
          );

          if (ordered.length === 0) {
            break;
          }

          for (const msg of ordered) {
            const msgId = BigInt(msg.id);
            const endId = BigInt(toMessageId);
            if (msgId >= endId) {
              done = true;
              break;
            }

            fetchedCount++;
            if (fetchedCount > MAX_MESSAGES) {
              await message.reply(`<:glossyredcancelx:1541974834370842654> Message range too large. Maximum ${MAX_MESSAGES} messages allowed.`);
              return;
            }

            if (!msg.author.bot && msg.content) {
              messages.push({
                author: msg.author.displayName,
                content: msg.content,
              });
            }

            afterId = msg.id;
          }

          if (ordered.length < 100 || done) {
            break;
          }
        }
      } else if (fromMessageId) {
        const fetchedMessages = await message.channel.messages.fetch({
          after: fromMessageId,
          limit: MAX_MESSAGES,
        });

        const ordered = [...fetchedMessages.values()].sort(
          (left, right) => left.createdTimestamp - right.createdTimestamp
        );

        if (ordered.length >= MAX_MESSAGES) {
          await message.reply(`<:glossyredcancelx:1541974834370842654> Message range too large. Maximum ${MAX_MESSAGES} messages allowed.`);
          return;
        }

        for (const msg of ordered) {
          if (!msg.author.bot && msg.content) {
            messages.push({
              author: msg.author.displayName,
              content: msg.content,
            });
          }
        }
      } else {
        // Default: fetch last 60 messages
        const fetchedMessages = await message.channel.messages.fetch({ limit: 60 });

        for (const msg of [...fetchedMessages.values()].sort(
          (left, right) => left.createdTimestamp - right.createdTimestamp
        )) {
          if (!msg.author.bot && msg.content) {
            messages.push({
              author: msg.author.displayName,
              content: msg.content,
            });
          }
        }
      }

      if (messages.length < 5) {
        await message.reply('<:glossyredcancelx:1541974834370842654> Not enough messages to generate a clip. Need at least 5 messages.');
        return;
      }

      // Generate AI summary (Groq)
      const summary = await generateClipSummary(messages);
      if (!summary || !summary.title || !summary.summary) {
        await message.reply('<:glossyredcancelx:1541974834370842654> AI summarization failed. Please try again later.');
        return;
      }

      // Generate image (Hugging Face) - Director only
      const imageBuffer = isDirector ? await generateImage(summary.summary, style) : null;

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(summary.title)
        .setDescription(summary.summary)
        .setColor(0x4900ff);

      if (directorsNote) {
        embed.addFields({ name: "Director's Note", value: directorsNote, inline: false });
      }

      embed.setFooter({ text: 'MI BOM3O Studios' });

      // Send to Bombo Times channel
      const bomboTimesChannel = message.guild?.channels.cache.get(CHANNELS.BOMBO_TIMES);
      if (!bomboTimesChannel || !bomboTimesChannel.isTextBased()) {
        await message.reply('<:glossyredcancelx:1541974834370842654> Failed to find Bombo Times channel.');
        return;
      }

      // Start the cooldown for non-Director admins now that generation succeeded
      if (!isDirector) {
        setCooldown(message.author.id, 'clip_admin', CLIP_CONFIG.ADMIN_COOLDOWN_SECONDS);
      }

      if (imageBuffer) {
        // Create attachment and send with image
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'bombo_times.png' });
        embed.setImage('attachment://bombo_times.png');
        await bomboTimesChannel.send({ embeds: [embed], files: [attachment] });
        await message.reply('<a:sparkles:1529443142175166585> Bombo Times clip published!');
      } else if (isDirector) {
        // Director requested artwork, but generation failed
        await bomboTimesChannel.send({ embeds: [embed] });
        await message.reply('⚠️ Bombo Times clip published (without artwork due to image generation failure).');
      } else {
        // Non-Director admins only ever get the summary, no artwork
        await bomboTimesChannel.send({ embeds: [embed] });
        await message.reply('<a:sparkles:1529443142175166585> Bombo Times summary published! (Artwork generation is Director-only.)');
      }

    } catch (error) {
      console.error('Error generating clip:', error);
      await message.reply('<:glossyredcancelx:1541974834370842654> Failed to generate clip. Please try again later.');
    }
  },
};
