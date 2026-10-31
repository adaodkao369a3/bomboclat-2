import { EmbedBuilder } from 'discord.js';
import { ROLE_GIF_COMMANDS, type RoleGifCommand } from '../config/roleGifCommands.js';
import { fetchGIF } from '../services/klipy.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { getUserArchetypes } from '../services/shop.js';
import { PERSONAS_CONFIG } from '../config/archetypes.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
function createRoleGifCommand(roleGif: RoleGifCommand): Command {
  return {
    name: roleGif.name,
    allowedPrefix: '.',
    async execute(message, _args, _prefix) {
      const userId = message.author.id;

      // Ownership comes from the purchase record (persona key), never from role names
      const userArchetypes = await getUserArchetypes(userId);
      const ownsRole = userArchetypes.some(ua => ua.persona_key === roleGif.persona);

      if (!ownsRole) {
        const personaName = PERSONAS_CONFIG.find(p => p.key === roleGif.persona)?.name ?? 'the required';
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command requires the **${personaName}** persona.`);
        return;
      }

      // Check target limit
      const mentions = message.mentions.members;
      if (mentions && mentions.size > 3) {
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Maximum 3 users can be targeted.`);
        return;
      }

      // Calculate cooldown based on targets
      let cooldownTime = 10;
      if (mentions && mentions.size >= 2) {
        cooldownTime = mentions.size === 2 ? 120 : 180;
      }

      // Check cooldown
      const remaining = getRemaining(userId, roleGif.name);
      if (remaining > 0) {
        await message.reply(`${EMOJIS.HOURGLASS} You can't use this command for another ${remaining} seconds.`);
        return;
      }
      setCooldown(userId, roleGif.name, cooldownTime);

      // Build targets string
      let targets: string;
      if (mentions && mentions.size > 0) {
        targets = Array.from(mentions.values()).map(m => m.toString()).join(' ');
      } else {
        targets = message.author.toString();
      }

      // Fetch GIF
      const gifUrl = await fetchGIF(roleGif.query);
      if (!gifUrl) {
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} No GIF found.`);
        return;
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setDescription(`${targets} ${roleGif.caption}`)
        .setColor(0x4900ff)
        .setImage(gifUrl);

      await message.reply({ embeds: [embed] });
    },
  };
}

export const roleGifCommands: Command[] = ROLE_GIF_COMMANDS.map(cmd => createRoleGifCommand(cmd));
