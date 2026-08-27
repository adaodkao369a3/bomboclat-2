import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { getUser } from '../database/client.js';
import {
  getShopColors,
  getUserArchetypes,
  getUserColors,
  setColorActive,
  sellColors,
  sellArchetype,
  getColorPrice,
} from '../services/shop.js';
import { Command } from './index.js';

// Colors stack — a user can own several at once — so `.manage` is where they
// pick which owned colors currently have their Discord role turned on.
// Archetypes are shown for reference only, since only one can ever be owned
// at a time (buying a new one auto-replaces the old one, see `$shop`).
export const manageCommand: Command = {
  name: 'manage',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    const userId = message.author.id;
    const userData = await getUser(userId);
    if (!userData) {
      await message.reply('❌ You need to send at least one message first so the bot can create your profile.');
      return;
    }

    const [userColors, userArchetypes, shopColors] = await Promise.all([
      getUserColors(userId),
      getUserArchetypes(userId),
      getShopColors(),
    ]);

    if (userColors.length === 0 && userArchetypes.length === 0) {
      await message.reply('<:crown:1529443082406461521> You don\'t own any shop items yet — check out the shop channel to buy a color or archetype.');
      return;
    }

    const colorRoleById = new Map(shopColors.map(c => [c.id, c]));

    const archetypeLine = userArchetypes.length > 0
      ? `**${(userArchetypes[0] as any).name}**`
      : '_None owned_';

    const colorLines = userColors.length > 0
      ? userColors.map((uc: any) => `${uc.active ? '🔹' : '⬜'} **${uc.name}** \`${uc.hex}\` — ${uc.active ? 'Equipped' : 'Unequipped'}`).join('\n')
      : '_None owned_';

    const embed = new EmbedBuilder()
      .setTitle('🛠️ Manage Your Items')
      .setColor(0x4900ff)
      .addFields([
        { name: '<:crown:1529443082406461521> Archetype', value: archetypeLine, inline: false },
        { name: '<:designpalette:1542338996217184356> Colors', value: colorLines, inline: false },
      ])
      .setFooter({ text: 'Use the buttons below to manage your items.' });

    // Create button row for main actions
    const mainButtonRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('manage_sell_colors')
          .setLabel('Sell Colors')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(userColors.length === 0),
        new ButtonBuilder()
          .setCustomId('manage_sell_archetype')
          .setLabel('Sell Archetype')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(userArchetypes.length === 0),
      );

    if (userColors.length === 0 && userArchetypes.length === 0) {
      await message.reply({ embeds: [embed] });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('manage_select_color')
      .setPlaceholder('Select a color to equip/unequip')
      .setMinValues(1)
      .setMaxValues(1);

    for (const uc of userColors as any[]) {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(uc.name)
          .setValue(uc.color_id.toString())
          .setDescription(`${uc.hex} — ${uc.active ? 'Equipped' : 'Unequipped'}`)
      );
    }

    const components: ActionRowBuilder<any>[] = [];
    if (userColors.length > 0) {
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }
    components.push(mainButtonRow);

    const reply = await message.reply({
      embeds: [embed],
      components,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
      filter: (i) => i.user.id === userId && i.customId === 'manage_select_color',
    });

    const buttonCollector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
      filter: (i) => i.user.id === userId && (i.customId === 'manage_sell_colors' || i.customId === 'manage_sell_archetype'),
    });

    collector.on('collect', async (interaction) => {
      const colorId = parseInt(interaction.values[0], 10);
      const latestUserColors = await getUserColors(userId);
      const owned = latestUserColors.find((uc: any) => uc.color_id === colorId) as any;
      if (!owned) {
        await interaction.reply({ content: '❌ You no longer own that color.', flags: [1 << 6] });
        return;
      }
      const color = colorRoleById.get(colorId);

      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`manage_equip_${colorId}`)
            .setLabel('Equip')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(owned.active),
          new ButtonBuilder()
            .setCustomId(`manage_unequip_${colorId}`)
            .setLabel('Unequip')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!owned.active),
        );

      await interaction.reply({
        content: `**${owned.name}** \`${owned.hex}\` — currently ${owned.active ? 'equipped 🔹' : 'unequipped ⬜'}.`,
        components: [actionRow],
        flags: [1 << 6],
      });

      const buttonCollector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i: any) => i.user.id === userId && (i.customId === `manage_equip_${colorId}` || i.customId === `manage_unequip_${colorId}`),
      });

      buttonCollector?.on('collect', async (buttonInteraction: any) => {
        try {
          const equip = buttonInteraction.customId === `manage_equip_${colorId}`;
          const result = await setColorActive(userId, colorId, equip);
          if (!result.success) {
            await buttonInteraction.reply({ content: `❌ ${result.reason}`, flags: [1 << 6] });
            buttonCollector.stop();
            return;
          }

          const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
          let roleMessage = '';
          if (member && color?.role_id) {
            try {
              const role = await member.guild.roles.fetch(color.role_id);
              if (role) {
                if (equip && !member.roles.cache.has(role.id)) {
                  await member.roles.add(role, 'Color equipped via .manage');
                  roleMessage = `\n<:designpalette:1542338996217184356> Role assigned: **${role.name}**`;
                } else if (!equip && member.roles.cache.has(role.id)) {
                  await member.roles.remove(role, 'Color unequipped via .manage');
                  roleMessage = `\n<:designpalette:1542338996217184356> Role removed: **${role.name}**`;
                }
              }
            } catch (error) {
              console.error(`Failed to sync Discord role for color ${colorId}:`, error);
              roleMessage = '\n⚠️ The Discord role could not be updated.';
            }
          }

          await buttonInteraction.update({
            content: `${equip ? '✅ Color equipped!' : '✅ Color unequipped.'}${roleMessage}`,
            components: [],
          });
        } catch (error) {
          console.error('Error handling manage button interaction:', error);
          try {
            await buttonInteraction.reply({ content: '❌ An error occurred while processing your request.', flags: [1 << 6] });
          } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
          }
        }
        buttonCollector.stop();
      });
    });

    // Handle sell buttons
    buttonCollector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'manage_sell_colors') {
        await handleSellColors(buttonInteraction, userId, userColors, shopColors);
      } else if (buttonInteraction.customId === 'manage_sell_archetype') {
        await handleSellArchetype(buttonInteraction, userId, userArchetypes);
      }
    });
  },
};

async function handleSellColors(interaction: any, userId: string, userColors: any[], shopColors: any[]) {
  const colorRoleById = new Map(shopColors.map(c => [c.id, c]));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('sell_select_colors')
    .setPlaceholder('Select colors to sell (50% refund)')
    .setMinValues(1)
    .setMaxValues(userColors.length);

  for (const uc of userColors) {
    const color = colorRoleById.get(uc.color_id);
    const price = color ? getColorPrice(color.price_band) : 0;
    const refund = uc.free_grant ? 0 : Math.floor(price * 0.5);
    const refundText = uc.free_grant ? 'Free (no refund)' : `${refund} residuals`;

    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(uc.name)
        .setValue(uc.color_id.toString())
        .setDescription(`${uc.hex} — Sell for ${refundText}`)
    );
  }

  await interaction.reply({
    content: 'Select the colors you want to sell. You will receive 50% of the original value for each (free grants refund 0).',
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
    flags: [1 << 6],
  });

  const selectCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
    filter: (i: any) => i.user.id === userId && i.customId === 'sell_select_colors',
  });

  selectCollector?.on('collect', async (selectInteraction: any) => {
    const selectedColorIds = selectInteraction.values.map((v: string) => parseInt(v, 10));
    
    // Calculate total refund
    const selectedColors = userColors.filter((uc: any) => selectedColorIds.includes(uc.color_id));
    let totalRefund = 0;
    const colorDetails = selectedColors.map((uc: any) => {
      const color = colorRoleById.get(uc.color_id);
      const price = color ? getColorPrice(color.price_band) : 0;
      const refund = uc.free_grant ? 0 : Math.floor(price * 0.5);
      totalRefund += refund;
      return { name: uc.name, refund };
    });

    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_sell_colors')
      .setLabel(`Confirm Sale (+${totalRefund} residuals)`)
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_sell_colors')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const colorList = colorDetails.map(c => `• **${c.name}** — ${c.refund > 0 ? `${c.refund} residuals` : 'Free (no refund)'}`).join('\n');

    await selectInteraction.update({
      content: `You are about to sell:\n${colorList}\n\n**Total refund: ${totalRefund} residuals**\n\nAre you sure?`,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)],
    });

    const confirmCollector = selectInteraction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i: any) => i.user.id === userId && (i.customId === 'confirm_sell_colors' || i.customId === 'cancel_sell_colors'),
    });

    confirmCollector?.on('collect', async (confirmInteraction: any) => {
      if (confirmInteraction.customId === 'confirm_sell_colors') {
        const result = await sellColors(userId, selectedColorIds);
        if (result.success) {
          // Remove Discord roles for sold colors
          const member = await confirmInteraction.guild?.members.fetch(userId).catch(() => null);
          let rolesRemoved = 0;
          
          if (member && result.sold) {
            for (const sold of result.sold) {
              if (sold.roleId) {
                try {
                  await member.roles.remove(sold.roleId, 'Color sold');
                  rolesRemoved++;
                } catch (error) {
                  console.error(`Failed to remove role ${sold.roleId}:`, error);
                }
              }
            }
          }
          
          let message = `✅ Successfully sold ${result.sold?.length || 0} color(s) for **${result.refundTotal} residuals**!`;
          if (rolesRemoved > 0) {
            message += `\n<:designpalette:1542338996217184356> Removed ${rolesRemoved} role(s) from your profile.`;
          }
          
          await confirmInteraction.update({
            content: message,
            components: [],
          });
        } else {
          await confirmInteraction.update({
            content: `❌ ${result.reason}`,
            components: [],
          });
        }
      } else {
        await confirmInteraction.update({
          content: '❌ Sale cancelled.',
          components: [],
        });
      }
      confirmCollector.stop();
    });

    selectCollector.stop();
  });
}

async function handleSellArchetype(interaction: any, userId: string, userArchetypes: any[]) {
  if (userArchetypes.length === 0) {
    await interaction.reply({ content: '❌ You do not own an archetype to sell.', flags: [1 << 6] });
    return;
  }

  const archetype = userArchetypes[0];
  const refund = archetype.free_grant ? 0 : Math.floor(archetype.price * 0.5);
  const refundText = archetype.free_grant ? 'Free (no refund)' : `${refund} residuals`;

  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_sell_archetype')
    .setLabel(`Confirm Sale (+${refund} residuals)`)
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_sell_archetype')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  await interaction.reply({
    content: `You are about to sell your archetype: **${archetype.name}**\n\n**Refund: ${refundText}**\n\nAre you sure?`,
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)],
    flags: [1 << 6],
  });

  const confirmCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
    filter: (i: any) => i.user.id === userId && (i.customId === 'confirm_sell_archetype' || i.customId === 'cancel_sell_archetype'),
  });

  confirmCollector?.on('collect', async (confirmInteraction: any) => {
    if (confirmInteraction.customId === 'confirm_sell_archetype') {
      const result = await sellArchetype(userId);
      if (result.success) {
        // Remove Discord role for sold archetype
        const member = await confirmInteraction.guild?.members.fetch(userId).catch(() => null);
        let roleRemoved = false;
        
        if (member && result.roleId) {
          try {
            await member.roles.remove(result.roleId, 'Archetype sold');
            roleRemoved = true;
          } catch (error) {
            console.error(`Failed to remove role ${result.roleId}:`, error);
          }
        }
        
        let message = `✅ Successfully sold **${result.name}** for **${result.refund} residuals**!`;
        if (roleRemoved) {
          message += `\n<:crown:1529443082406461521> Role removed from your profile.`;
        }
        
        await confirmInteraction.update({
          content: message,
          components: [],
        });
      } else {
        await confirmInteraction.update({
          content: `❌ ${result.reason}`,
          components: [],
        });
      }
    } else {
      await confirmInteraction.update({
        content: '❌ Sale cancelled.',
        components: [],
      });
    }
    confirmCollector.stop();
  });
}
