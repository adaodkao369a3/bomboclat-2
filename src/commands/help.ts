import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { Command } from './index.js';
import { getAvailableCommands } from './registry.js';
import { registerInteractionHandler, parseCustomId, isInteractionExpired } from '../interactions/index.js';
import { setStandardFooter } from '../ui/index.js';
import { getUser } from '../database/client.js';

const HELP_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Register interaction handler for help namespace
registerInteractionHandler('help', async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = parseCustomId(interaction.customId);
  const category = parts[1];

  // Check if message expired
  if (isInteractionExpired(interaction, HELP_TIMEOUT)) {
    await interaction.reply({
      content: '⏱️ This menu expired. Run `.help` again.',
      ephemeral: true,
    });
    await interaction.message.edit({ components: [] }).catch(console.error);
    return;
  }

  // Get user's available commands
  const guild = interaction.guild;
  const member = guild?.members.cache.get(interaction.user.id);
  const userData = await getUser(interaction.user.id);
  const userLevel = userData?.current_level || 0;
  const userRoles = member?.roles.cache.map(r => r.name) || [];
  const availableCommands = getAvailableCommands(userLevel, userRoles);

  // Build category embed
  let embed: EmbedBuilder;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('help:profile')
      .setLabel('🪜 Profile')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help:fun')
      .setLabel('😊 Fun')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help:leaderboard')
      .setLabel('🏆 Leaderboard')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('help:shop')
      .setLabel('🛒 Shop')
      .setStyle(ButtonStyle.Primary),
  );

  if (category === 'profile') {
    const profileCommands = availableCommands.filter(cmd =>
      ['profile', 'level', 'res'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.LADDER} Profile & Progression`)
      .setDescription('Track your server progress and stats')
      .setColor(0x4900ff)
      .addFields(
        profileCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else if (category === 'fun') {
    const funCommands = availableCommands.filter(cmd =>
      ['rizz', 'larp', 'blush', 'cooked', 'fumble', 'cope', 'grass', 'aura', 'huh', 'cry', 'leash'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.GLOSSY_STAR} Fun Commands`)
      .setDescription('Express yourself with reactions')
      .setColor(0x4900ff)
      .addFields(
        funCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else if (category === 'leaderboard') {
    const lbCommands = availableCommands.filter(cmd =>
      ['leaderboard', 'reslb'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STARICON} Leaderboards`)
      .setDescription('See how you rank against others')
      .setColor(0x4900ff)
      .addFields(
        lbCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else if (category === 'shop') {
    const shopCommands = availableCommands.filter(cmd =>
      ['manage', 'c'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SHOPPING_CART} Shop & Economy`)
      .setDescription('Manage your shop items and roles')
      .setColor(0x4900ff)
      .addFields(
        shopCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else {
    // Default: show all commands
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STAR} Help Menu`)
      .setDescription('Select a category to view commands')
      .setColor(0x4900ff);
  }

  setStandardFooter(embed);

  await interaction.update({ embeds: [embed], components: [row] });
});

export const helpCommand: Command = {
  name: 'help',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STAR} Help Menu`)
      .setDescription('Select a category to view commands')
      .setColor(0x4900ff);

    setStandardFooter(embed);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('help:profile')
        .setLabel('🪜 Profile')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('help:fun')
        .setLabel('😊 Fun')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('help:leaderboard')
        .setLabel('🏆 Leaderboard')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('help:shop')
        .setLabel('🛒 Shop')
        .setStyle(ButtonStyle.Primary),
    );

    await message.reply({ embeds: [embed], components: [row] });
  },
};
