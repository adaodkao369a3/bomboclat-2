import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from 'discord.js';
import { ADMIN_PREFIX } from '../config/index.js';
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

export const xpCommand: Command = {
  name: 'xp',
  async execute(message, _args, prefix) {
    // Only respond to admin prefix
    if (prefix !== ADMIN_PREFIX) return;

    // Check admin permissions
    if (!isAdmin(message.member!)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    // Get target user
    const target = message.mentions.members?.first();
    if (!target) {
      await message.reply('❌ Please mention a user. Usage: $xp @user');
      return;
    }

    // Get user data
    const userData = await getUser(target.user.id);
    if (!userData) {
      await message.reply('❌ User not found in database.');
      return;
    }

    // Create XP management UI
    const embed = new EmbedBuilder()
      .setTitle('📊 XP Management')
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
        filter: (m: Message) => m.author.id === message.author.id,
        max: 1,
        time: 30000,
      });

      collector.on('collect', async (m: Message) => {
        const amount = parseInt(m.content);
        if (isNaN(amount) || amount < 0) {
          await m.reply('❌ Please enter a valid positive number.');
          return;
        }

        try {
          let newXP: number;

          if (action === 'set_xp') {
            const persistedXP = await setUserXP(target.user.id, amount);
            if (persistedXP === null) throw new Error('Failed to set XP');
            newXP = persistedXP;
          } else if (action === 'add_xp') {
            const persistedXP = await addUserXP(
              target.user.id,
              amount,
              'admin',
              `Manual addition by ${message.author.displayName}`
            );
            if (persistedXP === null) throw new Error('Failed to add XP');
            newXP = persistedXP;
          } else if (action === 'remove_xp') {
            const persistedXP = await setUserXP(
              target.user.id,
              Math.max(0, userData.current_xp - amount)
            );
            if (persistedXP === null) throw new Error('Failed to remove XP');
            newXP = persistedXP;
          } else if (action === 'set_level') {
            newXP = calculateXPForLevel(amount);
            const persistedXP = await setUserXP(target.user.id, newXP);
            if (persistedXP === null) throw new Error('Failed to set XP for level');
          } else {
            throw new Error(`Unknown XP action: ${action}`);
          }

          const newLevel = calculateLevelFromXP(newXP);
          await setUserLevel(target.user.id, newLevel);
          const newRole = getRoleFromLevel(newLevel);
          const syncResult = await synchronizeProgressionRoles(target, newLevel);
          if (!syncResult.success) {
            await m.reply('❌ Failed to update progression roles. XP was saved; please retry synchronization.');
            return;
          }

          if (userData.current_progression_role !== newRole) {
            await setUserProgressionRole(target.user.id, newRole);
          }
          await updatePromotionEligibility(
            target.user.id,
            calculatePromotionEligibility(newXP, newLevel, newRole)
          );

          await m.reply(`✅ XP updated successfully. New XP: ${newXP.toLocaleString()}, New Level: ${newLevel}`);

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
          await m.reply('❌ Failed to update XP. Please try again.');
        }
      });

    } catch (error) {
      console.error('Error waiting for interaction:', error);
      await msg.edit({ components: [] });
    }
  },
};
