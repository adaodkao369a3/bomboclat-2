import { EmbedBuilder } from 'discord.js';
import { GIF_COMMANDS, GIF_CAPTIONS, GIF_PHRASES, GIF_COMMAND_LEVELS, GIF_CONFIG, EMOJIS } from '../config/index.js';
import { fetchGIF } from '../services/klipy.js';
import { getUser } from '../database/client.js';
import { ordinal, recordGifUse } from '../services/gifUsage.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

function createGIFCommand(name: string): Command {
  return {
    name,
    allowedPrefix: '.',
    async execute(message, _args, _prefix) {
      const isUserAdmin = message.member ? isAdmin(message.member) : false;

      // Level lock - tell them (with a ping) when it unlocks
      const requiredLevel = GIF_COMMAND_LEVELS[name] ?? 0;
      if (!isUserAdmin) {
        const user = await getUser(message.author.id);
        const userLevel = user?.current_level ?? 0;
        if (userLevel < requiredLevel) {
          await message.reply({
            content: `${message.author} \`.${name}\` unlocks at **level ${requiredLevel}** (you're level ${userLevel}).`,
            allowedMentions: { users: [message.author.id], repliedUser: true },
          });
          return;
        }
      }

      // Check target limit
      const mentions = message.mentions.members;
      if (mentions && mentions.size > GIF_CONFIG.MAX_TARGETS) {
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Maximum ${GIF_CONFIG.MAX_TARGETS} users can be targeted.`);
        return;
      }

      // Calculate cooldown based on targets
      let cooldownTime = GIF_CONFIG.NORMAL_COOLDOWN_SECONDS;
      if (mentions && mentions.size >= 2) {
        cooldownTime = mentions.size === 2 ? GIF_CONFIG.TWO_TARGET_COOLDOWN_SECONDS : GIF_CONFIG.THREE_TARGET_COOLDOWN_SECONDS;
      }

      // Admin bypass - admins are exempt from cooldowns
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
      const gifUrl = await fetchGIF(GIF_COMMANDS[name]);
      if (!gifUrl) {
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} No GIF found.`);
        return;
      }

      // Count this use for everyone targeted (or the sender when nobody is tagged)
      const targetPeople: { id: string; name: string }[] =
        mentions && mentions.size > 0
          ? Array.from(mentions.values()).map(m => ({ id: m.id, name: m.displayName }))
          : [{ id: message.author.id, name: message.member?.displayName ?? message.author.username }];

      const phrase = GIF_PHRASES[name];
      let footerText: string | null = null;
      try {
        const counts = await Promise.all(targetPeople.map(t => recordGifUse(t.id, name)));
        footerText = targetPeople
          .map((t, i) => (i === 0 ? `${t.name} ${phrase}` : t.name) + ` for the ${ordinal(counts[i])} time`)
          .join(' • ');
      } catch (error) {
        console.error('Failed to record GIF usage:', error);
      }

      // Create embed
      const caption = GIF_CAPTIONS[name];
      const embed = new EmbedBuilder()
        .setDescription(`${targets} ${caption}`)
        .setColor(0x4900ff)
        .setImage(gifUrl)
        .setTimestamp();
      if (footerText) embed.setFooter({ text: footerText });

      await message.reply({ embeds: [embed] });
    },
  };
}

export const gifCommands: Command[] = Object.keys(GIF_COMMANDS).map(name => createGIFCommand(name));
