import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { CHANNELS, ROLES, CLIP_CONFIG } from '../config/index.js';
import { generateClipSummary } from '../services/groq.js';
import { generateImage } from '../services/huggingface.js';
import { parseClipArguments } from '../services/clip.js';
import { getSetting } from '../services/settings.js';
import { isAdmin } from '../utils/permissions.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';

export const clipCommand: Command = {
  name: 'clip',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {

    // Check admin permissions - no one but admins may use $clip
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
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

    // CASTING channel is always allowed (bug fix: command should be usable where results are posted)
    // If allowlist is empty, fall back to BOMBO_TIMES and CASTING
    // If allowlist is set, only allow those channels PLUS CASTING (always allowed)
    const effectiveChannels = allowedChannels.length > 0 
      ? [...allowedChannels, CHANNELS.CASTING] 
      : [CHANNELS.BOMBO_TIMES, CHANNELS.CASTING];

    if (!effectiveChannels.includes(message.channel.id)) {
      await message.reply('❌ This command can only be used in allowed channels. Use $settings clip_channels list to see allowed channels.');
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
        await message.reply(`⏱️ Please wait ${minutesRemaining} minute(s) before generating another $clip summary.`);
        return;
      }
    }

    const { style, directorsNote, fromMessageId, toMessageId } = parseClipArguments(args);

    try {
      // Fetch messages based on arguments
      const messages: Array<{ author: string; content: string }> = [];
      const MAX_MESSAGES = 200;

      if (fromMessageId && toMessageId) {
        // Fetch messages between two IDs
        const fetchedMessages = await message.channel.messages.fetch({
          after: fromMessageId,
          before: toMessageId,
          limit: MAX_MESSAGES,
        });

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

        if (messages.length >= MAX_MESSAGES) {
          await message.reply(`❌ Message range too large. Maximum ${MAX_MESSAGES} messages allowed.`);
          return;
        }
      } else if (fromMessageId) {
        // Fetch messages from a specific ID onwards
        const fetchedMessages = await message.channel.messages.fetch({
          after: fromMessageId,
          limit: MAX_MESSAGES,
        });

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

        if (messages.length >= MAX_MESSAGES) {
          await message.reply(`❌ Message range too large. Maximum ${MAX_MESSAGES} messages allowed.`);
          return;
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
        await message.reply('❌ Not enough messages to generate a clip. Need at least 5 messages.');
        return;
      }

      // Generate AI summary (Groq)
      const summary = await generateClipSummary(messages);
      if (!summary || !summary.title || !summary.summary) {
        await message.reply('❌ AI summarization failed. Please try again later.');
        return;
      }

      // Generate image (Hugging Face) - Director only
      const imageBuffer = isDirector ? await generateImage(summary.summary, style) : null;

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(summary.title)
        .setDescription(summary.summary)
        .setColor(0x7B61FF);

      if (directorsNote) {
        embed.addFields({ name: "Director's Note", value: directorsNote, inline: false });
      }

      embed.setFooter({ text: 'MI BOM3O Studios' });

      // Send to Bombo Times channel
      const bomboTimesChannel = message.guild?.channels.cache.get(CHANNELS.BOMBO_TIMES);
      if (!bomboTimesChannel || !bomboTimesChannel.isTextBased()) {
        await message.reply('❌ Failed to find Bombo Times channel.');
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
      await message.reply('❌ Failed to generate clip. Please try again later.');
    }
  },
};
