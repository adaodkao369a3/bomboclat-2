import { EmbedBuilder } from 'discord.js';
import { ROLE_GIF_COMMANDS } from '../config/roleGifCommands.js';
import { fetchGIF } from '../services/klipy.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { getUserArchetypes } from '../services/shop.js';
import { Command } from './index.js';

function createRoleGifCommand(roleGif: { role: string; name: string; query: string; caption: string }): Command {
  return {
    name: roleGif.name,
    allowedPrefix: '.',
    async execute(message, _args, _prefix) {
      const userId = message.author.id;

      // Check if user owns the required archetype role in the database
      const userArchetypes = await getUserArchetypes(userId);
      const ownsRole = userArchetypes.some(ua => ua.name === roleGif.role);

      if (!ownsRole) {
        await message.reply(`❌ This command requires the **${roleGif.role}** archetype role.`);
        return;
      }

      // Check target limit
      const mentions = message.mentions.members;
      if (mentions && mentions.size > 3) {
        await message.reply('❌ Maximum 3 users can be targeted.');
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
        await message.reply(`⏳ You can't use this command for another ${remaining} seconds.`);
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
        await message.reply('❌ No GIF found.');
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
