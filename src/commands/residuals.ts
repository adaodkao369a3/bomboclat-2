import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getUser, type ResidualTransaction } from '../database/client.js';
import { ResidualsService } from '../services/residuals.js';
import { canManageResiduals } from '../utils/permissions.js';
import { Command } from './index.js';

export const residualsCommand: Command = {
  name: 'residuals',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {

    // Check staff permissions
    if (!message.member || !canManageResiduals(message.member)) {
      await message.reply('❌ This command is restricted to staff.');
      return;
    }

    // Get target user
    const target = message.mentions.members?.first();
    if (!target || !target.user) {
      await message.reply('❌ Please mention a user. Usage: $residuals @user');
      return;
    }

    // Get user data
    const userData = await getUser(target.user.id);
    if (!userData) {
      await message.reply('❌ User not found in database.');
      return;
    }

    // Get residuals data
    const residualData = await ResidualsService.getResiduals(target.user.id);
    if (!residualData) {
      await message.reply('❌ Residuals data not found.');
      return;
    }

    // Create Residuals management UI
    const embed = new EmbedBuilder()
      .setTitle('💰 Residuals Management')
      .setDescription(`Managing Residuals for **${target.displayName}**`)
      .setColor(0x4900ff)
      .addFields([
        { name: 'Current Balance', value: residualData.balance.toLocaleString(), inline: true },
        { name: 'Lifetime Earned', value: residualData.lifetime_earned.toLocaleString(), inline: true },
        { name: 'Lifetime Spent', value: residualData.lifetime_spent.toLocaleString(), inline: true },
      ])
      .setFooter({ text: 'Select an action below' });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('set_residuals')
          .setLabel('Set')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('add_residuals')
          .setLabel('Add')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('remove_residuals')
          .setLabel('Remove')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('show_history')
          .setLabel('History')
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

      if (action === 'show_history') {
        // Show history
        const history = await ResidualsService.getResidualHistory(target.user.id, 10);
        if (!history || history.length === 0) {
          await interaction.reply({ content: 'No transaction history found.', flags: [1 << 6] });
        } else {
          const historyEmbed = new EmbedBuilder()
            .setTitle('📜 Residuals History')
            .setDescription(`Recent transactions for **${target.displayName}**`)
            .setColor(0x4900ff);

          history.forEach((tx: ResidualTransaction) => {
            const sign = tx.amount >= 0 ? '+' : '';
            historyEmbed.addFields({
              name: `${sign}${tx.amount} (${tx.transaction_type})`,
              value: `${tx.source}${tx.reason ? ` - ${tx.reason}` : ''}`,
              inline: false,
            });
          });

          await interaction.reply({ embeds: [historyEmbed], flags: [1 << 6] });
        }

        // Disable buttons
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('set_residuals')
              .setLabel('Set')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('add_residuals')
              .setLabel('Add')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('remove_residuals')
              .setLabel('Remove')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('show_history')
              .setLabel('History')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
          );

        await msg.edit({ components: [disabledRow] });
        return;
      }

      // Create modal for amount input
      const modal = new ModalBuilder()
        .setCustomId(`residuals_${action}`)
        .setTitle(`${action.replace('_', ' ').toUpperCase()} RESIDUALS`);

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
        await modalInteraction.reply({ content: '❌ Please enter a valid positive number.', flags: [1 << 6] });
        return;
      }

      // Add reasonable bounds to prevent abuse
      const MAX_RESIDUALS_CHANGE = 1000000; // 1 million residuals max per change
      if (amount > MAX_RESIDUALS_CHANGE) {
        await modalInteraction.reply({ content: `❌ Amount too large. Maximum allowed is ${MAX_RESIDUALS_CHANGE.toLocaleString()} residuals.`, flags: [1 << 6] });
        return;
      }

      if ((action === 'add_residuals' || action === 'remove_residuals') && amount === 0) {
        await modalInteraction.reply({ content: '❌ Add and remove amounts must be greater than zero.', flags: [1 << 6] });
        return;
      }

      try {
        let newBalance = residualData.balance;

        if (action === 'set_residuals') {
          const persistedBalance = await ResidualsService.setResiduals(
            target.user.id,
            amount,
            message.author.id,
            reason
          );
          if (persistedBalance === null) {
            await modalInteraction.reply({ content: '❌ Failed to set Residuals.', flags: [1 << 6] });
            return;
          }
          newBalance = persistedBalance;
        } else if (action === 'add_residuals') {
          const persistedBalance = await ResidualsService.awardResiduals(
            target.user.id,
            amount,
            'staff',
            reason,
            message.author.id
          );
          if (persistedBalance === null) {
            await modalInteraction.reply({ content: '❌ Failed to add Residuals.', flags: [1 << 6] });
            return;
          }
          newBalance = persistedBalance;
        } else if (action === 'remove_residuals') {
          const persistedBalance = await ResidualsService.removeResiduals(
            target.user.id,
            amount,
            'staff',
            reason,
            message.author.id
          );
          if (persistedBalance === null) {
            await modalInteraction.reply({ content: '❌ Insufficient Residuals or update failed.', flags: [1 << 6] });
            return;
          }
          newBalance = persistedBalance;
        }

        await modalInteraction.reply({ content: `✅ Residuals updated successfully. New balance: ${newBalance?.toLocaleString() || 'Unknown'}`, flags: [1 << 6] });

        // Disable buttons
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('set_residuals')
              .setLabel('Set')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('add_residuals')
              .setLabel('Add')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('remove_residuals')
              .setLabel('Remove')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('show_history')
              .setLabel('History')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
          );

        await msg.edit({ components: [disabledRow] });

      } catch (error) {
        console.error('Error updating Residuals:', error);
        await modalInteraction.reply({ content: '❌ Failed to update Residuals. Please try again.', flags: [1 << 6] });
      }

    } catch (error) {
      console.error('Error waiting for interaction:', error);
      await msg.edit({ components: [] });
    }
  },
};
