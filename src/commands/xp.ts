import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getUser, setUserXP, setUserLevel, addUserXP } from '../database/client.js';
import {
  calculateLevelFromXP,
  calculatePromotionEligibility,
  calculateXPForLevel,
  getRoleFromLevel,
  synchronizeProgressionRoles,
} from '../services/xp.js';
import { setUserProgressionRole, updatePromotionEligibility } from '../database/client.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
export const xpCommand: Command = {
  name: 'xp',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {

    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to admins.`);
      return;
    }

    // Get target user
    const target = message.mentions.members?.first();
    if (!target || !target.user) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Please mention a user. Usage: $xp @user`);
      return;
    }

    // Get user data
    const userData = await getUser(target.user.id);
    if (!userData) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} User not found in database.`);
      return;
    }

    // Create XP management UI
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.LADDER} XP Management`)
      .setDescription(`Managing XP for **${target.displayName}**`)
      .setColor(0x7B61FF)
      .addFields([
        { name: 'Current XP', value: userData.current_xp.toLocaleString(), inline: true },
        { name: 'Current Level', value: userData.current_level.toString(), inline: true },
        { name: 'Current Role', value: userData.current_progression_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
      ])
      .setFooter({ text: 'Select an action below' });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('set_xp')
          .setLabel('Set XP')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('add_xp')
          .setLabel('Add XP')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('remove_xp')
          .setLabel('Remove XP')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('set_level')
          .setLabel('Set Level')
          .setStyle(ButtonStyle.Secondary),
      );

    const msg = await message.reply({ embeds: [embed], components: [row] });

    // Wait for button interaction
    try {
      const interaction = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 60000,
      });

      const action = interaction.customId;

      // Create modal for amount input
      const modal = new ModalBuilder()
        .setCustomId(`xp_${action}`)
        .setTitle(`${action.replace('_', ' ').toUpperCase()} XP`);

      const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Enter amount')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 100')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('e.g., Bonus for event participation')
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput);
      const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
      modal.addComponents(firstActionRow, secondActionRow);

      await interaction.showModal(modal);

      // Wait for modal submission
      const modalInteraction = await interaction.awaitModalSubmit({
        time: 300000,
      });

      const amountStr = modalInteraction.fields.getTextInputValue('amount');
      const amount = parseInt(amountStr);
      const reason = modalInteraction.fields.getTextInputValue('reason') || `Manual ${action} by ${message.author.displayName}`;

      if (isNaN(amount) || amount < 0) {
        await modalInteraction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Please enter a valid positive number.`, flags: [1 << 6] });
        return;
      }

      // Add reasonable bounds to prevent abuse
      const MAX_XP_CHANGE = 1000000; // 1 million XP max per change
      if (amount > MAX_XP_CHANGE) {
        await modalInteraction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Amount too large. Maximum allowed is ${MAX_XP_CHANGE.toLocaleString()} XP.`, flags: [1 << 6] });
        return;
      }

      // Additional validation for specific actions
      if (action === 'set_level') {
        if (amount < 0 || amount > 150) {
          await modalInteraction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Level must be between 0 and 150.`, flags: [1 << 6] });
          return;
        }
      }

      // Add/remove should not be zero
      if ((action === 'add_xp' || action === 'remove_xp') && amount === 0) {
        await modalInteraction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Add and remove amounts must be greater than zero.`, flags: [1 << 6] });
        return;
      }

      try {
        let newXP: number;

        if (action === 'set_xp') {
          const persistedXP = await setUserXP(target.user.id, amount, message.author.id, reason);
          if (persistedXP === null) throw new Error('Failed to set XP');
          newXP = persistedXP;
        } else if (action === 'add_xp') {
          const persistedXP = await addUserXP(
            target.user.id,
            amount,
            'admin',
            reason
          );
          if (persistedXP === null) throw new Error('Failed to add XP');
          newXP = persistedXP;
        } else if (action === 'remove_xp') {
          const persistedXP = await setUserXP(
            target.user.id,
            Math.max(0, userData.current_xp - amount),
            message.author.id,
            reason
          );
          if (persistedXP === null) throw new Error('Failed to remove XP');
          newXP = persistedXP;
        } else if (action === 'set_level') {
          newXP = calculateXPForLevel(amount);
          const persistedXP = await setUserXP(target.user.id, newXP, message.author.id, reason);
          if (persistedXP === null) throw new Error('Failed to set XP for level');
        } else {
          throw new Error(`Unknown XP action: ${action}`);
        }

        const newLevel = calculateLevelFromXP(newXP);
        await setUserLevel(target.user.id, newLevel);
        const newRole = getRoleFromLevel(newLevel);
        const syncResult = await synchronizeProgressionRoles(target, newLevel);
        if (!syncResult.success) {
          await modalInteraction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Failed to update progression roles. XP was saved; please retry synchronization. Failed roles: ${syncResult.failedRoles.join(', ')}`, flags: [1 << 6] });
          return;
        }

        if (userData.current_progression_role !== newRole) {
          await setUserProgressionRole(target.user.id, newRole);
        }
        await updatePromotionEligibility(
          target.user.id,
          calculatePromotionEligibility(newXP, newLevel, newRole)
        );

        await modalInteraction.reply({ content: `${EMOJIS.GREEN_GLOSSY_TICK} XP updated successfully. New XP: ${newXP.toLocaleString()}, New Level: ${newLevel}`, flags: [1 << 6] });

        // Disable buttons
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('set_xp')
              .setLabel('Set XP')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('add_xp')
              .setLabel('Add XP')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('remove_xp')
              .setLabel('Remove XP')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('set_level')
              .setLabel('Set Level')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
          );

        await msg.edit({ components: [disabledRow] });

      } catch (error) {
        console.error('Error updating XP:', error);
        await modalInteraction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Failed to update XP. Please try again.`, flags: [1 << 6] });
      }

    } catch (error) {
      console.error('Error waiting for interaction:', error);
      await msg.edit({ components: [] });
    }
  },
};
