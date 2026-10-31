import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, AttachmentBuilder, TextChannel } from 'discord.js';
import { CHANNELS, EMOJIS } from '../config/index.js';
import {
  getShopArchetypesByTier,
  getShopColorsByTier,
  seedShopArchetypes,
  seedShopColors,
  type ShopArchetype,
  type ShopColor,
} from '../services/shop.js';
import { generateColorGridImage, generateArchetypeGridImage } from '../services/shopImages.js';
import { isBotOwner } from '../utils/permissions.js';
import { Command } from './index.js';
import { unlockLine } from '../services/shopText.js';
import { TIER_SYMBOLS, COLOR_TIERS } from '../config/colors.js';
import { PERSONA_TIER_SYMBOLS, PERSONA_TIERS } from '../config/archetypes.js';

export const updateShopCommand: Command = {
  name: 'updateshop',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check if bot owner (Director only)
    if (!message.member || !isBotOwner(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to the Director.`);
      return;
    }

    if (!CHANNELS.SHOP) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} SHOP_CHANNEL_ID is not configured. Please set it in your environment variables.`);
      return;
    }

    const guild = message.guild;
    const shopChannel = guild?.channels.cache.get(CHANNELS.SHOP);
    if (!shopChannel || !shopChannel.isTextBased()) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Failed to find the shop channel.`);
      return;
    }

    const section = args[0]?.toLowerCase() || 'all';
    if (!['all', 'color', 'archetype'].includes(section)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Usage: \`$updateshop color\`, \`$updateshop archetype\`, or \`$updateshop\` for both.`);
      return;
    }

    // Update shop data from config
    await seedShopArchetypes();
    await seedShopColors();

    if (section === 'color' || section === 'all') {
      const colorsByTier = await getShopColorsByTier();
      await updateColorShop(shopChannel as TextChannel, colorsByTier);
    }

    if (section === 'archetype' || section === 'all') {
      const archetypesByTier = await getShopArchetypesByTier();
      await updateArchetypeShop(shopChannel as TextChannel, archetypesByTier);
    }

    await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} ${section === 'all' ? 'Shop' : section === 'color' ? 'Color shop' : 'Archetype shop'} updated!`);
  },
};

async function updateColorShop(shopChannel: TextChannel, colorsByTier: Record<string, ShopColor[]>): Promise<void> {
  for (const tier of [COLOR_TIERS.STUDIO_CLASSICS, COLOR_TIERS.MIDNIGHT_CINEMA, COLOR_TIERS.NEON_LIGHTS, COLOR_TIERS.AWARD_SEASON] as const) {
    const tierColors = colorsByTier[tier];
    if (!tierColors || tierColors.length === 0) continue;

    const symbol = TIER_SYMBOLS[tier] || '';
    const title = `${symbol} ${tier}`;

    // Split into chunks of max 6 colors per embed
    const chunks: ShopColor[][] = [];
    for (let i = 0; i < tierColors.length; i += 6) {
      chunks.push(tierColors.slice(i, i + 6));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkSuffix = chunks.length > 1 ? ` (${chunkIndex + 1}/${chunks.length})` : '';
      const chunkTitle = `${title}${chunkSuffix}`;

      const filename = `colors_${tier.replace(/\s+/g, '_')}_${chunkIndex}.png`;
      const buffer = generateColorGridImage(chunk);
      const file = new AttachmentBuilder(buffer, { name: filename });

      const embed = new EmbedBuilder()
        .setTitle(chunkTitle)
        .setDescription(unlockLine(chunk, 'buy or equip'))
        .setColor(0x4900ff)
        .setImage(`attachment://${filename}`);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`shop:pickcolor:${tier.replace(/\s+/g, '_')}:${chunkIndex}`)
        .setPlaceholder(`Select a ${tier.toLowerCase()} color`)
        .setMinValues(1)
        .setMaxValues(1);

      for (const color of chunk) {
        const formattedName = color.name.toLowerCase();
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${formattedName} - ${color.price}`)
            .setEmoji(EMOJIS.MONEY)
            .setValue(color.id.toString())
            .setDescription(`Level ${color.min_level} · ${color.hex}`)
        );
      }

      // Find and edit existing message by customId
      const customId = `shop:pickcolor:${tier.replace(/\s+/g, '_')}:${chunkIndex}`;
      const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
      const existing = existingMessages.find(
        msg => msg.author.id === shopChannel.client.user?.id &&
              msg.components.length > 0 &&
              msg.components[0].type === 1 && // ActionRow
              'components' in msg.components[0] &&
              (msg.components[0] as any).components.length > 0 &&
              'customId' in (msg.components[0] as any).components[0] &&
              (msg.components[0] as any).components[0].customId === customId
      );

      if (existing) {
        await existing.edit({
          embeds: [embed],
          files: [file],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
        console.log(`Updated color shop message for ${tier} chunk ${chunkIndex}`);
      } else {
        console.log(`No existing message found for ${tier} chunk ${chunkIndex}, skipping`);
      }
    }
  }
}

async function updateArchetypeShop(shopChannel: TextChannel, archetypesByTier: Record<string, (ShopArchetype & { currentHolders: number })[]>): Promise<void> {
  for (const tier of [PERSONA_TIERS.HIGH_STATUS, PERSONA_TIERS.ELITE, PERSONA_TIERS.LEGENDARY, PERSONA_TIERS.TRANSCENDENT, PERSONA_TIERS.SPECIAL] as const) {
    const tierArchetypes = archetypesByTier[tier];
    if (!tierArchetypes || tierArchetypes.length === 0) continue;

    const symbol = PERSONA_TIER_SYMBOLS[tier] || '';
    const title = `${symbol} ${tier}`;

    // Split into chunks of max 6 archetypes per embed
    const chunks: (ShopArchetype & { currentHolders: number })[][] = [];
    for (let i = 0; i < tierArchetypes.length; i += 6) {
      chunks.push(tierArchetypes.slice(i, i + 6));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkSuffix = chunks.length > 1 ? ` (${chunkIndex + 1}/${chunks.length})` : '';
      const chunkTitle = `${title}${chunkSuffix}`;

      const filename = `archetypes_${tier.replace(/\s+/g, '_')}_${chunkIndex}.png`;
      const buffer = await generateArchetypeGridImage(chunk);
      const file = new AttachmentBuilder(buffer, { name: filename });

      const embed = new EmbedBuilder()
        .setTitle(chunkTitle)
        .setDescription(unlockLine(chunk, 'buy'))
        .setColor(0x4900ff)
        .setImage(`attachment://${filename}`);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`shop:pickpersona:${tier.replace(/\s+/g, '_')}:${chunkIndex}`)
        .setPlaceholder(`Select a ${tier.toLowerCase()} persona`)
        .setMinValues(1)
        .setMaxValues(1);

      for (const archetype of chunk) {
        const formattedName = archetype.name.toLowerCase();
        const holdersText = archetype.max_holders ? `${archetype.currentHolders}/${archetype.max_holders}` : 'Unlimited';
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${formattedName} - ${archetype.price}`)
            .setEmoji(EMOJIS.MONEY)
            .setValue(archetype.id.toString())
            .setDescription(`Level ${archetype.min_level} · Holders: ${holdersText}${archetype.monthly ? ' (monthly)' : ''}`)
        );
      }

      // Find and edit existing message by customId
      const customId = `shop:pickpersona:${tier.replace(/\s+/g, '_')}:${chunkIndex}`;
      const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
      const existing = existingMessages.find(
        msg => msg.author.id === shopChannel.client.user?.id &&
              msg.components.length > 0 &&
              msg.components[0].type === 1 && // ActionRow
              'components' in msg.components[0] &&
              (msg.components[0] as any).components.length > 0 &&
              'customId' in (msg.components[0] as any).components[0] &&
              (msg.components[0] as any).components[0].customId === customId
      );

      if (existing) {
        await existing.edit({
          embeds: [embed],
          files: [file],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
        console.log(`Updated archetype shop message for ${tier} chunk ${chunkIndex}`);
      } else {
        console.log(`No existing message found for ${tier} chunk ${chunkIndex}, skipping`);
      }
    }
  }
}
