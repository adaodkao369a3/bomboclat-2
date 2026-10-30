import { EmbedBuilder } from 'discord.js';
import { GIF_CONFIG, EMOJIS, ROLES } from '../config/index.js';
import { fetchGIF } from '../services/klipy.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { isAdmin } from '../utils/permissions.js';
import { getUser } from '../database/client.js';
import { Command } from './index.js';

export const customGifCommand: Command = {
  name: 'c',
  allowedPrefix: '.',
  async execute(message, args, _prefix) {

    // Check permissions (level requirement; admins and boosters (Guest Star) bypass)
    if (!message.member) return;
    const isUserAdmin = isAdmin(message.member);
    const isBooster = message.member.roles.cache.has(ROLES.BOOSTER);
    if (!isUserAdmin && !isBooster) {
      const user = await getUser(message.author.id);
      const userLevel = user?.current_level ?? 0;
      if (userLevel < GIF_CONFIG.CUSTOM_MIN_LEVEL) {
        await message.reply({
          content: `${message.author} \`.c\` unlocks at **level ${GIF_CONFIG.CUSTOM_MIN_LEVEL}** (you're level ${userLevel}).`,
          allowedMentions: { users: [message.author.id], repliedUser: true },
        });
        return;
      }
    }

    // Check target limit
    const mentions = message.mentions.members;
    if (mentions && mentions.size > GIF_CONFIG.MAX_TARGETS) {
      await message.reply(`❌ Maximum ${GIF_CONFIG.MAX_TARGETS} users can be targeted.`);
      return;
    }

    // Get query (strip mentions from the text)
    let query = args.join(' ').trim();
    
    // Remove user mentions from the query text for the output
    if (mentions && mentions.size > 0) {
      mentions.forEach((member) => {
        query = query.replace(new RegExp(`<@!?${member.id}>`, 'g'), '').trim();
      });
    }
    
    if (!query) {
      await message.reply('Please provide something to search for.\n\nExample:\n.c door shutting');
      return;
    }

    // Use query as-is for search
    const searchQuery = query;

    // Calculate cooldown based on targets
    let cooldownTime = GIF_CONFIG.NORMAL_COOLDOWN_SECONDS;
    if (mentions && mentions.size >= 2) {
      cooldownTime = mentions.size === 2 ? GIF_CONFIG.TWO_TARGET_COOLDOWN_SECONDS : GIF_CONFIG.THREE_TARGET_COOLDOWN_SECONDS;
    }

    // Admin bypass - admins are exempt from cooldowns
    if (!isUserAdmin) {
      const remaining = getRemaining(message.author.id, 'c');
      if (remaining > 0) {
        await message.reply(`⏳ You can't use this command for another ${remaining} seconds.`);
        return;
      }
      setCooldown(message.author.id, 'c', cooldownTime);
    }

    // Build targets string
    let targets: string;
    if (mentions && mentions.size > 0) {
      targets = Array.from(mentions.values()).map(m => m.toString()).join(' & ');
    } else {
      targets = message.author.toString();
    }

    // Fetch GIF
    const gifUrl = await fetchGIF(searchQuery);
    if (!gifUrl) {
      await message.reply(`bro i can't find this shit:\n${query}`);
      return;
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.DCROWN} custom gif`)
      .setDescription(`${message.author.toString()} "${query}" ${targets ? targets : ''}`)
      .setColor(0x4900ff)
      .setImage(gifUrl)
      

    await message.reply({ embeds: [embed] });
  },
};