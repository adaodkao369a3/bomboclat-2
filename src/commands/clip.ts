import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { CHANNELS } from '../config/index.js';
import { generateClipSummary } from '../services/groq.js';
import { generateImage } from '../services/huggingface.js';
import { parseClipArguments } from '../services/clip.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

export const clipCommand: Command = {
  name: 'clip',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {

    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    const { style, directorsNote } = parseClipArguments(args);

    try {
      // Fetch last 60 messages from the channel
      const messages: Array<{ author: string; content: string }> = [];
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

      // Generate image (Hugging Face)
      const imageBuffer = await generateImage(summary.summary, style);
      
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

      if (imageBuffer) {
        // Create attachment and send with image
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'bombo_times.png' });
        embed.setImage('attachment://bombo_times.png');
        await bomboTimesChannel.send({ embeds: [embed], files: [attachment] });
        await message.reply('✅ Bombo Times clip published!');
      } else {
        // Send without image if generation failed
        await bomboTimesChannel.send({ embeds: [embed] });
        await message.reply('⚠️ Bombo Times clip published (without artwork due to image generation failure).');
      }

    } catch (error) {
      console.error('Error generating clip:', error);
      await message.reply('❌ Failed to generate clip. Please try again later.');
    }
  },
};
