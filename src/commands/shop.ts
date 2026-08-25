import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  TextChannel,
} from 'discord.js';
import { CHANNELS, ROLES } from '../config/index.js';
import type { Guild, GuildMember, Role } from 'discord.js';
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
  type ShopColor,
} from '../services/shop.js';
import { generateColorGridImage, generateArchetypeGridImage } from '../services/shopImages.js';
import { isBotOwner } from '../utils/permissions.js';
import { Command } from './index.js';

const COLOR_PRICE_MAP: Record<string, number> = { common: 200, uncommon: 500, rare: 800 };
const COLOR_BAND_TITLES: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' };
const ARCHETYPE_TIER_TITLES: Record<string, string> = { standard: 'Standard', legendary: 'Legendary', mythic: 'Mythic' };
const ARCHETYPE_SLOT_CAPS_BY_TIER: Record<string, string> = {
  standard: '5 slots each',
  legendary: '1-2 slots each',
  mythic: '1 slot, Lead Cast+ only',
};

export const shopCommand: Command = {
  name: 'shop',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check if bot owner (Director only)
    if (!message.member || !isBotOwner(message.member)) {
      await message.reply('❌ This command is restricted to the Director.');
      return;
    }

    if (!CHANNELS.SHOP) {
      await message.reply('❌ SHOP_CHANNEL_ID is not configured. Please set it in your environment variables.');
      return;
    }

    const guild = message.guild;
    const shopChannel = guild?.channels.cache.get(CHANNELS.SHOP);
    if (!shopChannel || !shopChannel.isTextBased()) {
      await message.reply('❌ Failed to find the shop channel.');
      return;
    }

    const section = args[0]?.toLowerCase() || 'all';
    if (!['all', 'color', 'archetype'].includes(section)) {
      await message.reply('❌ Usage: `$shop color`, `$shop archetype`, or `$shop` for both.');
      return;
    }

    // Seed shop data if needed (also picks up image_url edits made in code).
    await seedShopArchetypes();
    await seedShopColors();

    // Create all shop roles before publishing the shop so the role-backed labels
    // and purchase handlers are ready immediately.
    const shopArchetypesForRoles = await getShopArchetypes();
    const shopColorsForRoles = await getShopColors();
    const roleSetup = await ensureAllShopRoles(guild!, shopArchetypesForRoles, shopColorsForRoles);
    if (roleSetup.errors.length) {
      console.error('Shop role setup warnings:', roleSetup.errors);
    }

    if (section === 'color' || section === 'all') {
      const colors = await getShopColors();
      const colorBands: Record<string, ShopColor[]> = {
        common: colors.filter(c => c.price_band === 'common'),
        uncommon: colors.filter(c => c.price_band === 'uncommon'),
        rare: colors.filter(c => c.price_band === 'rare'),
      };
      await postColorShop(shopChannel as TextChannel, colorBands);
    }

    // Reconcile the command user's existing shop purchases so previously-owned
    // items receive their newly-created Discord roles as well.
    await syncOwnedShopRoles(message.member, shopArchetypesForRoles, shopColorsForRoles);

    if (section === 'archetype' || section === 'all') {
      const archetypes = await getShopArchetypes();
      const archetypeTiers: Record<string, ShopArchetype[]> = {
        standard: archetypes.filter(a => a.tier === 'standard'),
        legendary: archetypes.filter(a => a.tier === 'legendary'),
        mythic: archetypes.filter(a => a.tier === 'mythic'),
      };
      await postArchetypeShop(shopChannel as TextChannel, archetypeTiers);
    }

    await message.reply(`✅ ${section === 'all' ? 'Shop' : section === 'color' ? 'Color shop' : 'Archetype shop'} posted!`);
  },
};

// ---------------------------------------------------------------------------
// Discord shop roles
// ---------------------------------------------------------------------------

function archetypeRoleName(name: string): string {
  return `Archetype • ${name}`;
}

function colorRoleName(name: string): string {
  return `Color • ${name}`;
}

async function ensureShopRole(guild: Guild, name: string, color?: string): Promise<Role | null> {
  const existing = guild.roles.cache.find(role => role.name === name);
  if (existing) return existing;

  try {
    const role = await guild.roles.create({
      name,
      color: color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color as `#${string}` : '#7B61FF',
      reason: 'Shop item role setup',
    });
    return role;
  } catch (error) {
    console.error(`Failed to create shop role "${name}":`, error);
    return null;
  }
}

async function ensureAllShopRoles(
  guild: Guild,
  archetypes: ShopArchetype[],
  colors: ShopColor[],
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  for (const archetype of archetypes) {
    const role = await ensureShopRole(guild, archetypeRoleName(archetype.name));
    if (!role) errors.push(archetypeRoleName(archetype.name));
  }
  for (const color of colors) {
    const role = await ensureShopRole(guild, colorRoleName(color.name), color.hex);
    if (!role) errors.push(colorRoleName(color.name));
  }
  return { errors };
}

async function assignShopRole(member: GuildMember, roleName: string): Promise<boolean> {
  const role = member.guild.roles.cache.find(role => role.name === roleName);
  if (!role) return false;
  if (member.roles.cache.has(role.id)) return true;

  try {
    await member.roles.add(role, 'Shop purchase/grant');
    return true;
  } catch (error) {
    console.error(`Failed to assign shop role "${roleName}" to ${member.id}:`, error);
    return false;
  }
}

async function syncOwnedShopRoles(
  member: GuildMember,
  archetypes: ShopArchetype[],
  colors: ShopColor[],
): Promise<void> {
  const ownedArchetypes = await getUserArchetypes(member.id);
  const ownedColors = await getUserColors(member.id);

  const archetypeById = new Map(archetypes.map(item => [item.id, item]));
  const colorById = new Map(colors.map(item => [item.id, item]));

  for (const owned of ownedArchetypes) {
    const archetype = archetypeById.get(owned.archetype_id);
    if (archetype) await assignShopRole(member, archetypeRoleName(archetype.name));
  }
  for (const owned of ownedColors) {
    const color = colorById.get(owned.color_id);
    if (color) await assignShopRole(member, colorRoleName(color.name));
  }
}

// ---------------------------------------------------------------------------
// Posting: colors
// ---------------------------------------------------------------------------

async function postColorShop(shopChannel: TextChannel, colorBands: Record<string, ShopColor[]>): Promise<void> {
  for (const band of ['common', 'uncommon', 'rare'] as const) {
    const bandColors = colorBands[band];
    if (bandColors.length === 0) continue;

    const title = band === 'common' ? '🎨 Color Shop' : COLOR_BAND_TITLES[band];
    await deleteExistingShopMessages(shopChannel, title);

    const filename = `colors_${band}.png`;
    const buffer = generateColorGridImage(bandColors);
    const file = new AttachmentBuilder(buffer, { name: filename });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${COLOR_BAND_TITLES[band]} colors — ${COLOR_PRICE_MAP[band]} residuals each. Pick one below to buy or equip it.`)
      .setColor(0xFFD700)
      .setImage(`attachment://${filename}`);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`shop_select_color_${band}`)
      .setPlaceholder(`Select a ${COLOR_BAND_TITLES[band].toLowerCase()} color`)
      .setMinValues(1)
      .setMaxValues(1);

    for (const color of bandColors) {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${color.name} - ${COLOR_PRICE_MAP[band]} residuals`)
          .setValue(color.id.toString())
          .setDescription(color.hex)
      );
    }

    // One message per band means the dropdown is directly beneath the image
    // for that band instead of all dropdowns being collected at the bottom.
    const shopMessage = await shopChannel.send({
      embeds: [embed],
      files: [file],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
    });

    const collector = shopMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 0,
      filter: (i) => i.customId === `shop_select_color_${band}`,
    });

    collector.on('collect', async (interaction) => {
      const colorId = parseInt(interaction.values[0], 10);
      await handleColorSelection(interaction, colorId);
    });
  }
}

async function handleColorSelection(interaction: any, colorId: number): Promise<void> {
  const userId = interaction.user.id;
  const userData = await getUser(userId);
  if (!userData) {
    await interaction.reply({ content: '❌ You need to send at least one message first so the bot can create your profile.', ephemeral: true });
    return;
  }

  const colors = await getShopColors();
  const color = colors.find(c => c.id === colorId);
  if (!color) {
    await interaction.reply({ content: '❌ Color not found.', ephemeral: true });
    return;
  }

  const userColors = await getUserColors(userId);
  const owned = userColors.some(uc => uc.color_id === color.id);
  const active = userColors.some(uc => uc.color_id === color.id && uc.active);
  const price = COLOR_PRICE_MAP[color.price_band] || 200;
  const canAfford = userData.total_residuals_balance >= price;

  const member = await interaction.guild?.members.fetch(userId).catch(() => null);
  const isBooster = member?.roles.cache.has(ROLES.BOOSTER) || false;
  const freeGrants = isBooster ? await hasBoosterFreeGrants(userId) : { archetype: false, color: false };
  const isFreeGrant = freeGrants.color && color.price_band === 'common' && !owned;

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
        .setStyle(ButtonStyle.Danger)
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

  await interaction.reply({ embeds: [detailEmbed], components: [confirmRow], ephemeral: true });

  const buttonCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
    filter: (i: any) => i.user.id === userId && (i.customId === `purchase_color_${colorId}` || i.customId === `equip_color_${colorId}` || i.customId === 'cancel_color'),
  });

  buttonCollector?.on('collect', async (buttonInteraction: any) => {
    if (buttonInteraction.customId === `purchase_color_${colorId}`) {
      const result = await purchaseColor(userId, colorId, isFreeGrant);
      if (result.success) {
        const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
        const roleAssigned = member ? await assignShopRole(member, colorRoleName(color.name)) : false;
        await buttonInteraction.update({
          content: `${isFreeGrant ? '✅ Free color claimed and equipped!' : '✅ Color purchased and equipped!'}${roleAssigned ? `\n🎨 Role assigned: **${colorRoleName(color.name)}**` : '\n⚠️ Purchase saved, but the Discord role could not be assigned.'}`,
          embeds: [],
          components: [],
        });
      } else {
        await buttonInteraction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
      }
      buttonCollector.stop();
    } else if (buttonInteraction.customId === `equip_color_${colorId}`) {
      const result = await switchActiveColor(userId, colorId);
      if (result.success) {
        const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
        const roleAssigned = member ? await assignShopRole(member, colorRoleName(color.name)) : false;
        await buttonInteraction.update({
          content: roleAssigned ? `✅ Color equipped!\n🎨 Role confirmed: **${colorRoleName(color.name)}**` : '✅ Color equipped!\n⚠️ The color role could not be assigned.',
          embeds: [],
          components: [],
        });
      } else {
        await buttonInteraction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
      }
      buttonCollector.stop();
    } else if (buttonInteraction.customId === 'cancel_color') {
      await buttonInteraction.update({ content: 'Cancelled.', embeds: [], components: [] });
      buttonCollector.stop();
    }
  });
}

// ---------------------------------------------------------------------------
// Posting: archetypes
// ---------------------------------------------------------------------------

async function postArchetypeShop(shopChannel: TextChannel, archetypeTiers: Record<string, ShopArchetype[]>): Promise<void> {
  for (const tier of ['standard', 'legendary', 'mythic'] as const) {
    const tierArchetypes = archetypeTiers[tier];
    if (tierArchetypes.length === 0) continue;

    const title = tier === 'standard' ? '🎭 Archetype Shop' : ARCHETYPE_TIER_TITLES[tier];
    await deleteExistingShopMessages(shopChannel, title);

    const filename = `archetypes_${tier}.png`;
    const buffer = await generateArchetypeGridImage(tierArchetypes);
    const file = new AttachmentBuilder(buffer, { name: filename });

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${ARCHETYPE_TIER_TITLES[tier]} archetypes — ${ARCHETYPE_SLOT_CAPS_BY_TIER[tier]}. Pick one below to buy it.`)
      .setColor(0x7B61FF)
      .setImage(`attachment://${filename}`);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`shop_select_archetype_${tier}`)
      .setPlaceholder(`Select a ${ARCHETYPE_TIER_TITLES[tier].toLowerCase()} archetype`)
      .setMinValues(1)
      .setMaxValues(1);

    for (const archetype of tierArchetypes) {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${archetype.name} - ${archetype.price} residuals`)
          .setValue(archetype.id.toString())
          .setDescription(archetype.min_role ? `Requires ${archetype.min_role.replace(/_/g, ' ')}` : archetype.slot_group)
      );
    }

    // One message per tier keeps each dropdown immediately below its own image.
    const shopMessage = await shopChannel.send({
      embeds: [embed],
      files: [file],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
    });

    const collector = shopMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 0,
      filter: (i) => i.customId === `shop_select_archetype_${tier}`,
    });

    collector.on('collect', async (interaction) => {
      const archetypeId = parseInt(interaction.values[0], 10);
      await handleArchetypeSelection(interaction, archetypeId);
    });
  }
}

async function handleArchetypeSelection(interaction: any, archetypeId: number): Promise<void> {
  const userId = interaction.user.id;
  const userData = await getUser(userId);
  if (!userData) {
    await interaction.reply({ content: '❌ You need to send at least one message first so the bot can create your profile.', ephemeral: true });
    return;
  }

  const archetypes = await getShopArchetypes();
  const archetype = archetypes.find(a => a.id === archetypeId);
  if (!archetype) {
    await interaction.reply({ content: '❌ Archetype not found.', ephemeral: true });
    return;
  }

  const userArchetypes = await getUserArchetypes(userId);
  const owned = userArchetypes.some(ua => ua.archetype_id === archetype.id);
  const canAfford = userData.total_residuals_balance >= archetype.price;

  const member = await interaction.guild?.members.fetch(userId).catch(() => null);
  const isBooster = member?.roles.cache.has(ROLES.BOOSTER) || false;
  const freeGrants = isBooster ? await hasBoosterFreeGrants(userId) : { archetype: false, color: false };
  const isFreeGrant = freeGrants.archetype && archetype.tier === 'standard' && !owned;

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
        .setStyle(ButtonStyle.Danger)
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

  if (archetype.image_url) {
    detailEmbed.setThumbnail(archetype.image_url);
  }

  await interaction.reply({ embeds: [detailEmbed], components: [confirmRow], ephemeral: true });

  const buttonCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
    filter: (i: any) => i.user.id === userId && (i.customId === `confirm_archetype_${archetypeId}` || i.customId === 'cancel_archetype'),
  });

  buttonCollector?.on('collect', async (buttonInteraction: any) => {
    if (buttonInteraction.customId === `confirm_archetype_${archetypeId}`) {
      const result = await purchaseArchetype(userId, archetypeId, isFreeGrant);
      if (result.success) {
        const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
        const roleAssigned = member ? await assignShopRole(member, archetypeRoleName(archetype.name)) : false;
        await buttonInteraction.update({
          content: `${isFreeGrant ? '✅ Free archetype claimed successfully!' : '✅ Archetype purchased successfully!'}${roleAssigned ? `\n🎭 Role assigned: **${archetypeRoleName(archetype.name)}**` : '\n⚠️ Purchase saved, but the Discord role could not be assigned.'}`,
          embeds: [],
          components: [],
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
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

async function deleteExistingShopMessages(shopChannel: TextChannel, title: string): Promise<void> {
  const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
  const existing = existingMessages.filter(
    msg => msg.author.id === shopChannel.client.user?.id && msg.embeds.length > 0 && msg.embeds[0].title === title
  );

  await Promise.all(existing.map(message => message.delete().catch(() => undefined)));
}
