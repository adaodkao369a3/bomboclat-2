import { EmbedBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
export const channelsCommand: Command = {
  name: 'channels',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to admins.`);
      return;
    }

    if (!message.guild) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command can only be used in a server.`);
      return;
    }

    const guild = message.guild;

    // Get all channels grouped by category
    const categories = new Map<string, { name: string; channels: string[] }>();

    // Fetch all channels
    await guild.channels.fetch();

    // Group channels by category
    guild.channels.cache.forEach((channel) => {
      if (channel.isVoiceBased()) return; // Skip voice channels

      const category = channel.parent;
      const categoryName = category ? category.name : 'Uncategorized';

      if (!categories.has(categoryName)) {
        categories.set(categoryName, { name: categoryName, channels: [] });
      }

      const categoryData = categories.get(categoryName)!;
      categoryData.channels.push(`<#${channel.id}>`);
    });

    // Sort categories alphabetically
    const sortedCategories = Array.from(categories.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Build the embed
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.BOX} Server Channels by Category`)
      .setDescription(`Total categories: ${sortedCategories.length}`)
      .setColor(0x4900ff)
      .setFooter({ text: `Requested by ${message.author.tag}` });

    // Add each category as a field
    sortedCategories.forEach((category) => {
      const channelList = category.channels.join(', ') || 'No channels';
      embed.addFields({
        name: category.name,
        value: channelList,
        inline: false,
      });
    });

    await message.reply({ embeds: [embed] });
  },
};
