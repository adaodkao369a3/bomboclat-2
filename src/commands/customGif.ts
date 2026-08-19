import { EmbedBuilder } from 'discord.js';
import { PREFIX, GIF_CONFIG } from '../config/index.js';
import { fetchGIF } from '../services/klipy.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { isAdmin, hasSupportingCast } from '../utils/permissions.js';
import { Command } from './index.js';

export const customGifCommand: Command = {
  name: 'c',
  async execute(message, args, prefix) {
    // Only respond to user prefix
    if (prefix !== PREFIX) return;

    // Check permissions (Supporting Cast+ or admins)
    if (!hasSupportingCast(message.member!) && !isAdmin(message.member!)) {
      await message.reply('❌ This command requires Supporting Cast role or higher.');
      return;
    }

    // Check target limit
    const mentions = message.mentions.members;
    if (mentions && mentions.size > GIF_CONFIG.MAX_TARGETS) {
      await message.reply(`❌ Maximum ${GIF_CONFIG.MAX_TARGETS} users can be targeted.`);
      return;
    }

    // Get query
    const query = args.join(' ').trim();
    if (!query) {
      await message.reply('Please provide something to search for.\n\nExample:\n.c door shutting');
      return;
    }

    // Calculate cooldown based on targets
    let cooldownTime = GIF_CONFIG.NORMAL_COOLDOWN_SECONDS;
    if (mentions && mentions.size >= 2) {
      cooldownTime = mentions.size === 2 ? GIF_CONFIG.TWO_TARGET_COOLDOWN_SECONDS : GIF_CONFIG.THREE_TARGET_COOLDOWN_SECONDS;
    }

    // Admin bypass
    if (!isAdmin(message.member!)) {
      const remaining = getRemaining(message.author.id);
      if (remaining > 0) {
        await message.reply(`⏳ Post nut clarity is here. Try again in ${remaining}s.`);
        return;
      }
      setCooldown(message.author.id, cooldownTime);
    }

    // Build targets string
    let targets: string;
    if (mentions && mentions.size > 0) {
      targets = Array.from(mentions.values()).map(m => m.toString()).join(' ');
    } else {
      targets = message.author.toString();
    }

    // Fetch GIF
    const gifUrl = await fetchGIF(query);
    if (!gifUrl) {
      await message.reply(`Couldn't find any GIFs for:\n${query}`);
      return;
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🎬 Custom GIF')
      .setDescription(`${message.author.toString()} "${query}" ${targets ? targets : ''}`)
      .setColor(0x9b5de5)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by Klipy' });

    await message.reply({ embeds: [embed] });
  },
};
