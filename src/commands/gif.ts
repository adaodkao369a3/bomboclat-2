import { EmbedBuilder } from 'discord.js';
import { GIF_COMMANDS, GIF_CAPTIONS, GIF_CONFIG } from '../config/index.js';
import { fetchGIF } from '../services/klipy.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

function createGIFCommand(name: string): Command {
  return {
    name,
    allowedPrefix: '.',
    async execute(message, _args, _prefix) {

      // Check target limit
      const mentions = message.mentions.members;
      if (mentions && mentions.size > GIF_CONFIG.MAX_TARGETS) {
        await message.reply(`<:glossyredcancelx:1541974834370842654> Maximum ${GIF_CONFIG.MAX_TARGETS} users can be targeted.`);
        return;
      }

      // Calculate cooldown based on targets
      let cooldownTime = GIF_CONFIG.NORMAL_COOLDOWN_SECONDS;
      if (mentions && mentions.size >= 2) {
        cooldownTime = mentions.size === 2 ? GIF_CONFIG.TWO_TARGET_COOLDOWN_SECONDS : GIF_CONFIG.THREE_TARGET_COOLDOWN_SECONDS;
      }

      // Admin bypass - admins are exempt from cooldowns
      const isUserAdmin = message.member ? isAdmin(message.member) : false;
      if (!isUserAdmin) {
        const remaining = getRemaining(message.author.id, name);
        if (remaining > 0) {
          await message.reply(`⏳ You can't use this command for another ${remaining} seconds.`);
          return;
        }
        setCooldown(message.author.id, name, cooldownTime);
      }

      // Build targets string
      let targets: string;
      if (mentions && mentions.size > 0) {
        targets = Array.from(mentions.values()).map(m => m.toString()).join(' ');
      } else {
        targets = message.author.toString();
      }

      // Fetch GIF
      const gifUrl = await fetchGIF(GIF_COMMANDS[name as keyof typeof GIF_COMMANDS]);
      if (!gifUrl) {
        await message.reply('<:glossyredcancelx:1541974834370842654> No GIF found.');
        return;
      }

      // Create embed
      const caption = GIF_CAPTIONS[name as keyof typeof GIF_CAPTIONS];
      const embed = new EmbedBuilder()
        .setDescription(`${targets} ${caption}`)
        .setColor(0x4900ff)
        .setImage(gifUrl)
        

      await message.reply({ embeds: [embed] });
    },
  };
}

export const gifCommands: Command[] = Object.keys(GIF_COMMANDS).map(name => createGIFCommand(name));
