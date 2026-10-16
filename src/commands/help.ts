import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { Command } from './index.js';

export const helpCommand: Command = {
  name: 'help',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    const categories = {
      profile: {
        title: `${EMOJIS.LADDER} Profile & Progression`,
        description: 'Track your server progress and stats',
        fields: [
          { name: '`.profile`', value: 'View your profile with stats', inline: false },
          { name: '`.level`', value: 'Check your current level', inline: false },
          { name: '`.res`', value: 'View your residuals (earnings)', inline: false },
          { name: '`.leaderboard`', value: 'See the top players', inline: false },
        ],
      },
      fun: {
        title: `${EMOJIS.GLOSSY_STAR} Fun Commands`,
        description: 'Express yourself with reactions',
        fields: [
          { name: '`.rizz`', value: 'Show off your rizz', inline: false },
          { name: '`.larp`', value: 'Larp moment', inline: false },
          { name: '`.blush`', value: 'Blush reaction', inline: false },
          { name: '`.cooked`', value: 'You got cooked', inline: false },
          { name: '`.fumble`', value: 'Big fumble', inline: false },
          { name: '`.cope`', value: 'Cope moment', inline: false },
          { name: '`.grass`', value: 'Touch grass', inline: false },
          { name: '`.aura`', value: 'Check your aura', inline: false },
          { name: '`.huh`', value: 'Huh reaction', inline: false },
          { name: '`.cry`', value: 'Cry reaction', inline: false },
          { name: '`.leash`', value: 'Leash reaction', inline: false },
        ],
      },
      gif: {
        title: `${EMOJIS.DCROWN} Custom GIF`,
        description: 'Search and share custom GIFs',
        fields: [
          { name: '`.c <query>`', value: 'Search for a custom GIF (Hero+ or Guest Star)', inline: false },
        ],
      },
      shop: {
        title: `${EMOJIS.SHOPPING_CART} Shop & Economy`,
        description: 'Manage your shop items and earnings',
        fields: [
          { name: '`.shop`', value: 'View the shop', inline: false },
          { name: '`.manage`', value: 'Manage your shop items and roles', inline: false },
        ],
      },
      utility: {
        title: `${EMOJIS.STAR} Utility & System`,
        description: 'Account management and system commands',
        fields: [
          { name: '`.reset`', value: 'Reset your profile (use with caution)', inline: false },
          { name: '`.xp`', value: 'Check your XP points', inline: false },
          { name: '`.residuals`', value: 'View your residuals breakdown', inline: false },
        ],
      },
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('profile')
        .setLabel('🪜 Profile')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('fun')
        .setLabel('😊 Fun')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('gif')
        .setLabel('👑 GIF')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('shop')
        .setLabel('🛒 Shop')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('utility')
        .setLabel('⭐ Utility')
        .setStyle(ButtonStyle.Primary),
    );

    const msg = await message.reply({
      embeds: [],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      const category = categories[i.customId as keyof typeof categories];
      if (!category) return;

      const embed = new EmbedBuilder()
        .setTitle(category.title)
        .setDescription(category.description)
        .setColor(0x4900ff)
        .addFields(category.fields);

      await i.update({
        embeds: [embed],
        components: [row],
      });
    });

    collector.on('end', async () => {
      await msg.edit({ components: [] });
    });
  },
};
