import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { CHANNELS, ROLES } from '../config/index.js';
import { getUser } from '../database/client.js';
import { 
  getShopArchetypes, 
  getShopColors, 
  getUserArchetypes, 
  getUserColors,
  purchaseArchetype,
  purchaseColor,
  switchActiveColor,
  seedShopArchetypes,
  seedShopColors,
  hasBoosterFreeGrants,
  type ShopArchetype,
  type ShopColor
} from '../services/shop.js';
import { isBotOwner } from '../utils/permissions.js';
import { Command } from './index.js';

export const shopCommand: Command = {
  name: 'shop',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    // Check if bot owner (Director only)
    if (!message.member || !isBotOwner(message.member)) {
      await message.reply('❌ This command is restricted to the Director.');
      return;
    }

    // Check if shop channel is configured
    if (!CHANNELS.SHOP) {
      await message.reply('❌ SHOP_CHANNEL_ID is not configured. Please set it in your environment variables.');
      return;
    }

    // Find the shop channel
    const shopChannel = message.guild?.channels.cache.get(CHANNELS.SHOP);
    if (!shopChannel || !shopChannel.isTextBased()) {
      await message.reply('❌ Failed to find the shop channel.');
      return;
    }

    // Seed shop data if needed
    await seedShopArchetypes();
    await seedShopColors();

    // Create shop embed
    const embed = new EmbedBuilder()
      .setTitle('🛒 MI BOM3O Studios Shop')
      .setDescription('Browse and purchase archetypes and colors with your residuals!')
      .setColor(0xFFD700)
      .addFields([
        { name: '💎 Archetypes', value: 'Collect unique character archetypes to customize your profile', inline: false },
        { name: '🎨 Colors', value: 'Purchase and equip custom colors for your profile', inline: false },
        { name: '✨ Booster Perks', value: 'Boosters get +25% XP and free Standard archetype + Common color', inline: false },
      ])
      .setFooter({ text: 'Click a button below to browse' });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('shop_archetypes')
          .setLabel('🎭 Archetypes')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shop_colors')
          .setLabel('🎨 Colors')
          .setStyle(ButtonStyle.Secondary),
      );

    // Check if there's an existing shop message and delete it
    // Look at more messages to find existing shop messages
    const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
    const existingShopMessage = existingMessages.find(msg => 
      msg.author.id === message.client.user?.id && 
      msg.embeds.length > 0 && 
      msg.embeds[0].title === '🛒 MI BOM3O Studios Shop'
    );
    
    if (existingShopMessage) {
      await existingShopMessage.delete();
    }

    // Post new shop message
    const shopMessage = await shopChannel.send({ embeds: [embed], components: [row] });

    // Set up collector for button interactions
    const collector = shopMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 0, // Infinite collector
    });

    collector.on('collect', async (interaction) => {
      if (!interaction.isButton()) return;

      const userId = interaction.user.id;
      const customId = interaction.customId;

      if (customId === 'shop_archetypes') {
        await showArchetypeShop(interaction, userId);
      } else if (customId === 'shop_colors') {
        await showColorShop(interaction, userId);
      }
    });

    await message.reply('✅ Shop message posted!');
  },
};

async function showArchetypeShop(interaction: any, userId: string): Promise<void> {
  const archetypes = await getShopArchetypes();
  const userArchetypes = await getUserArchetypes(userId);
  const userData = await getUser(userId);
  
  if (!userData) {
    await interaction.reply({ content: '❌ User not found in database.', ephemeral: true });
    return;
  }

  // Check if user is booster and has free grant available
  const member = await interaction.guild?.members.fetch(userId).catch(() => null);
  const isBooster = member?.roles.cache.has(ROLES.BOOSTER) || false;
  const freeGrants = isBooster ? await hasBoosterFreeGrants(userId) : { archetype: false, color: false };

  // Group by tier
  const tierGroups: Record<string, ShopArchetype[]> = {
    standard: archetypes.filter(a => a.tier === 'standard'),
    legendary: archetypes.filter(a => a.tier === 'legendary'),
    mythic: archetypes.filter(a => a.tier === 'mythic'),
  };

  // Create select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_archetype')
    .setPlaceholder('Select an archetype to view details')
    .setMinValues(1)
    .setMaxValues(1);

  // Add options for each archetype
  for (const archetype of archetypes) {
    const owned = userArchetypes.some(ua => ua.archetype_id === archetype.id);
    const canAfford = userData.total_residuals_balance >= archetype.price;
    
    // Check if this is a free grant option for booster
    const isFreeOption = freeGrants.archetype && archetype.tier === 'standard' && !owned;
    
    let label = `${archetype.name} (${archetype.tier})`;
    if (isFreeOption) {
      label += ' - 🎁 FREE';
    } else {
      label += ` - ${archetype.price} residuals`;
    }
    
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(archetype.id.toString())
      .setDescription(owned ? '✅ Owned' : (isFreeOption ? '🎁 Free Booster Grant' : (canAfford ? '💰 Affordable' : '❌ Cannot afford')));
    
    if (owned) {
      option.setDefault(true);
    }
    
    selectMenu.addOptions(option);
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  let description = `Your balance: ${userData.total_residuals_balance.toLocaleString()} residuals`;
  if (freeGrants.archetype) {
    description += '\n\n🎁 You have a free Standard archetype available!';
  }

  const embed = new EmbedBuilder()
    .setTitle('🎭 Archetype Shop')
    .setDescription(description)
    .setColor(0x7B61FF)
    .addFields([
      { name: 'Standard', value: `${tierGroups.standard.length} available (5 slots each)`, inline: true },
      { name: 'Legendary', value: `${tierGroups.legendary.length} available (2 slots each)`, inline: true },
      { name: 'Mythic', value: `${tierGroups.mythic.length} available (1 slot, Lead Cast+)`, inline: true },
    ]);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

  // Wait for select menu interaction
  const selectCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 300000,
    filter: (i: any) => i.customId === 'select_archetype' && i.user.id === userId,
  });

  selectCollector?.on('collect', async (selectInteraction: any) => {
    const archetypeId = parseInt(selectInteraction.values[0]);
    const archetype = archetypes.find(a => a.id === archetypeId);
    
    if (!archetype) {
      await selectInteraction.reply({ content: '❌ Archetype not found.', ephemeral: true });
      return;
    }

    const owned = userArchetypes.some(ua => ua.archetype_id === archetype.id);
    const canAfford = userData.total_residuals_balance >= archetype.price;
    
    // Check if this is a free grant
    const isFreeGrant = freeGrants.archetype && archetype.tier === 'standard' && !owned;

    // Create purchase confirmation
    const confirmRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_archetype_${archetypeId}`)
          .setLabel(isFreeGrant ? 'Claim Free' : 'Purchase')
          .setStyle(ButtonStyle.Success)
          .setDisabled(owned || (!isFreeGrant && !canAfford)),
        new ButtonBuilder()
          .setCustomId('cancel_archetype')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger),
      );

    const detailEmbed = new EmbedBuilder()
      .setTitle(`${archetype.name} (${archetype.tier})`)
      .setDescription(owned ? '✅ You already own this archetype!' : (isFreeGrant ? '🎁 Free Booster Grant - No cost!' : `Price: ${archetype.price} residuals`))
      .setColor(0x7B61FF)
      .addFields([
        { name: 'Tier', value: archetype.tier, inline: true },
        { name: 'Price', value: isFreeGrant ? 'FREE' : archetype.price.toString(), inline: true },
        { name: 'Slot Group', value: archetype.slot_group, inline: true },
        { name: 'Requirements', value: archetype.min_role ? `Requires ${archetype.min_role.replace('_', ' ')}` : 'None', inline: false },
      ]);

    await selectInteraction.update({ embeds: [detailEmbed], components: [confirmRow] });

    // Wait for confirmation
    const buttonCollector = selectInteraction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i: any) => i.user.id === userId,
    });

    buttonCollector?.on('collect', async (buttonInteraction: any) => {
      if (buttonInteraction.customId === `confirm_archetype_${archetypeId}`) {
        const result = await purchaseArchetype(userId, archetypeId, isFreeGrant);
        
        if (result.success) {
          await buttonInteraction.update({ 
            content: isFreeGrant ? '✅ Free archetype claimed successfully!' : '✅ Archetype purchased successfully!', 
            embeds: [], 
            components: [] 
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
        }
        
        buttonCollector.stop();
      } else if (buttonInteraction.customId === 'cancel_archetype') {
        await buttonInteraction.update({ content: 'Purchase cancelled.', embeds: [], components: [] });
        buttonCollector.stop();
      }
    });
  });
}

async function showColorShop(interaction: any, userId: string): Promise<void> {
  const colors = await getShopColors();
  const userColors = await getUserColors(userId);
  const userData = await getUser(userId);
  
  if (!userData) {
    await interaction.reply({ content: '❌ User not found in database.', ephemeral: true });
    return;
  }

  // Check if user is booster and has free grant available
  const member = await interaction.guild?.members.fetch(userId).catch(() => null);
  const isBooster = member?.roles.cache.has(ROLES.BOOSTER) || false;
  const freeGrants = isBooster ? await hasBoosterFreeGrants(userId) : { archetype: false, color: false };

  // Group by price band
  const bandGroups: Record<string, ShopColor[]> = {
    common: colors.filter(c => c.price_band === 'common'),
    uncommon: colors.filter(c => c.price_band === 'uncommon'),
    rare: colors.filter(c => c.price_band === 'rare'),
  };

  // Create select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_color')
    .setPlaceholder('Select a color to view details')
    .setMinValues(1)
    .setMaxValues(1);

  // Add options for each color
  for (const color of colors) {
    const owned = userColors.some(uc => uc.color_id === color.id);
    const active = userColors.some(uc => uc.color_id === color.id && uc.active);
    const priceMap: Record<string, number> = { common: 200, uncommon: 500, rare: 800 };
    const price = priceMap[color.price_band] || 200;
    const canAfford = userData.total_residuals_balance >= price;
    
    // Check if this is a free grant option for booster
    const isFreeOption = freeGrants.color && color.price_band === 'common' && !owned;
    
    let label = `${color.name} (${color.price_band})`;
    if (isFreeOption) {
      label += ' - 🎁 FREE';
    } else {
      label += ` - ${price} residuals`;
    }
    
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(color.id.toString())
      .setDescription(active ? '🔹 Active' : (owned ? '✅ Owned' : (isFreeOption ? '🎁 Free Booster Grant' : (canAfford ? '💰 Affordable' : '❌ Cannot afford'))));
    
    if (active) {
      option.setDefault(true);
    }
    
    selectMenu.addOptions(option);
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  let description = `Your balance: ${userData.total_residuals_balance.toLocaleString()} residuals`;
  if (freeGrants.color) {
    description += '\n\n🎁 You have a free Common color available!';
  }

  const embed = new EmbedBuilder()
    .setTitle('🎨 Color Shop')
    .setDescription(description)
    .setColor(0xFFD700)
    .addFields([
      { name: 'Common', value: `${bandGroups.common.length} available (200 residuals)`, inline: true },
      { name: 'Uncommon', value: `${bandGroups.uncommon.length} available (500 residuals)`, inline: true },
      { name: 'Rare', value: `${bandGroups.rare.length} available (800 residuals)`, inline: true },
    ]);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

  // Wait for select menu interaction
  const selectCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 300000,
    filter: (i: any) => i.customId === 'select_color' && i.user.id === userId,
  });

  selectCollector?.on('collect', async (selectInteraction: any) => {
    const colorId = parseInt(selectInteraction.values[0]);
    const color = colors.find(c => c.id === colorId);
    
    if (!color) {
      await selectInteraction.reply({ content: '❌ Color not found.', ephemeral: true });
      return;
    }

    const owned = userColors.some(uc => uc.color_id === color.id);
    const active = userColors.some(uc => uc.color_id === color.id && uc.active);
    const priceMap: Record<string, number> = { common: 200, uncommon: 500, rare: 800 };
    const price = priceMap[color.price_band] || 200;
    const canAfford = userData.total_residuals_balance >= price;
    
    // Check if this is a free grant
    const isFreeGrant = freeGrants.color && color.price_band === 'common' && !owned;

    // Create action buttons
    const confirmRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`purchase_color_${colorId}`)
          .setLabel(isFreeGrant ? 'Claim Free' : 'Purchase')
          .setStyle(ButtonStyle.Success)
          .setDisabled(owned || (!isFreeGrant && !canAfford)),
        new ButtonBuilder()
          .setCustomId(`equip_color_${colorId}`)
          .setLabel('Equip')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!owned || active),
        new ButtonBuilder()
          .setCustomId('cancel_color')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger),
      );

    const detailEmbed = new EmbedBuilder()
      .setTitle(color.name)
      .setDescription(owned ? (active ? '🔹 Currently equipped' : '✅ Owned (click Equip to use)') : (isFreeGrant ? '🎁 Free Booster Grant - No cost!' : `Price: ${price} residuals`))
      .setColor(parseInt(color.hex.replace('#', ''), 16))
      .addFields([
        { name: 'Price Band', value: color.price_band, inline: true },
        { name: 'Price', value: isFreeGrant ? 'FREE' : price.toString(), inline: true },
        { name: 'Hex', value: color.hex, inline: true },
      ]);

    await selectInteraction.update({ embeds: [detailEmbed], components: [confirmRow] });

    // Wait for button interaction
    const buttonCollector = selectInteraction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i: any) => i.user.id === userId,
    });

    buttonCollector?.on('collect', async (buttonInteraction: any) => {
      if (buttonInteraction.customId === `purchase_color_${colorId}`) {
        const result = await purchaseColor(userId, colorId, isFreeGrant);
        
        if (result.success) {
          await buttonInteraction.update({ 
            content: isFreeGrant ? '✅ Free color claimed and equipped!' : '✅ Color purchased and equipped!', 
            embeds: [], 
            components: [] 
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
        }
        
        buttonCollector.stop();
      } else if (buttonInteraction.customId === `equip_color_${colorId}`) {
        const result = await switchActiveColor(userId, colorId);
        
        if (result.success) {
          await buttonInteraction.update({ 
            content: '✅ Color equipped!', 
            embeds: [], 
            components: [] 
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
        }
        
        buttonCollector.stop();
      } else if (buttonInteraction.customId === 'cancel_color') {
        await buttonInteraction.update({ content: 'Action cancelled.', embeds: [], components: [] });
        buttonCollector.stop();
      }
    });
  });
}