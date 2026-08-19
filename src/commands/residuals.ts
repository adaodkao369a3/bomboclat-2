import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from 'discord.js';
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
      .setColor(0xFFD700)
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
          await interaction.reply({ content: 'No transaction history found.', ephemeral: true });
        } else {
          const historyEmbed = new EmbedBuilder()
            .setTitle('📜 Residuals History')
            .setDescription(`Recent transactions for **${target.displayName}**`)
            .setColor(0xFFD700);

          history.forEach((tx: ResidualTransaction) => {
            const sign = tx.amount >= 0 ? '+' : '';
            historyEmbed.addFields({
              name: `${sign}${tx.amount} (${tx.transaction_type})`,
              value: `${tx.source}${tx.reason ? ` - ${tx.reason}` : ''}`,
              inline: false,
            });
          });

          await interaction.reply({ embeds: [historyEmbed], ephemeral: true });
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

      // Ask for amount
      await interaction.reply({ content: `Please enter the ${action.replace('_', ' ')} amount:`, ephemeral: true });

      // Wait for user response
      if (!message.channel.isTextBased()) {
        await message.reply('❌ This command can only be used in text channels.');
        return;
      }
      if (!('createMessageCollector' in message.channel)) {
        await message.reply('❌ This channel cannot collect messages.');
        return;
      }

      const collector = message.channel.createMessageCollector({
        filter: (m: Message) => m.author.id === message.author.id && m.id !== message.id,
        max: 1,
        time: 30000,
      });

      collector.on('collect', async (m: Message) => {
        const amount = parseInt(m.content);
        if (isNaN(amount) || amount < 0) {
          await m.reply('❌ Please enter a valid positive number.');
          return;
        }
        if ((action === 'add_residuals' || action === 'remove_residuals') && amount === 0) {
          await m.reply('❌ Add and remove amounts must be greater than zero.');
          return;
        }

        try {
          let newBalance = residualData.balance;

          if (action === 'set_residuals') {
            const persistedBalance = await ResidualsService.setResiduals(
              target.user.id,
              amount,
              message.author.id,
              `Manual set by ${message.author.displayName}`
            );
            if (persistedBalance === null) {
              await m.reply('❌ Failed to set Residuals.');
              return;
            }
            newBalance = persistedBalance;
          } else if (action === 'add_residuals') {
            const persistedBalance = await ResidualsService.awardResiduals(
              target.user.id,
              amount,
              'staff',
              `Manual addition by ${message.author.displayName}`,
              message.author.id
            );
            if (persistedBalance === null) {
              await m.reply('❌ Failed to add Residuals.');
              return;
            }
            newBalance = persistedBalance;
          } else if (action === 'remove_residuals') {
            const persistedBalance = await ResidualsService.removeResiduals(
              target.user.id,
              amount,
              'staff',
              `Manual removal by ${message.author.displayName}`,
              message.author.id
            );
            if (persistedBalance === null) {
              await m.reply('❌ Insufficient Residuals or update failed.');
              return;
            }
            newBalance = persistedBalance;
          }

          await m.reply(`✅ Residuals updated successfully. New balance: ${newBalance?.toLocaleString() || 'Unknown'}`);

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
          await m.reply('❌ Failed to update Residuals. Please try again.');
        }
      });

    } catch (error) {
      console.error('Error waiting for interaction:', error);
      await msg.edit({ components: [] });
    }
  },
};
