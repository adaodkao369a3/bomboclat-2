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
import { CHANNELS, EMOJIS } from '../config/index.js';
import type { Guild, GuildMember, Role } from 'discord.js';
import { getUser } from '../database/client.js';
import {
  getShopArchetypes,
  getShopArchetypesByTier,
  getShopColors,
  getShopColorsByTier,
  getUserArchetypes,
  getUserColors,
  purchaseArchetype,
  purchaseColor,
  setColorActive,
  seedShopArchetypes,
  seedShopColors,
  type ShopArchetype,
  type ShopColor,
} from '../services/shop.js';
import { generateColorGridImage, generateArchetypeGridImage } from '../services/shopImages.js';
import { isBotOwner } from '../utils/permissions.js';
import { Command } from './index.js';
import { TIER_SYMBOLS, COLOR_TIERS } from '../config/colors.js';
import { PERSONA_TIER_SYMBOLS, PERSONA_TIERS, PERSONA_SIGNATURE_COLORS, PERSONA_TIER_BACKGROUNDS } from '../config/archetypes.js';



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

    // Delete retired colors with zero owners and their Discord roles
    await deleteRetiredColorsWithNoOwners(guild!);

    // Create all shop roles before publishing the shop so the role-backed labels
    // and purchase handlers are ready immediately.
    const shopArchetypesForRoles = await getShopArchetypes();
    const shopColorsForRoles = await getShopColors();
    const roleSetup = await ensureAllShopRoles(guild!, shopArchetypesForRoles, shopColorsForRoles);
    if (roleSetup.errors.length) {
      console.error('Shop role setup warnings:', roleSetup.errors);
    }

    if (section === 'color' || section === 'all') {
      const colorsByTier = await getShopColorsByTier();
      await postColorShopIntro(shopChannel as TextChannel);
      await postColorShop(shopChannel as TextChannel, colorsByTier);
    }

    // Reconcile the command user's existing shop purchases so previously-owned
    // items receive their newly-created Discord roles as well.
    await syncOwnedShopRoles(message.member, shopArchetypesForRoles, shopColorsForRoles);

    if (section === 'archetype' || section === 'all') {
      const archetypesByTier = await getShopArchetypesByTier();
      await postArchetypeShopIntro(shopChannel as TextChannel);
      await postArchetypeShop(shopChannel as TextChannel, archetypesByTier);
    }

    await message.reply(`✅ ${section === 'all' ? 'Shop' : section === 'color' ? 'Color shop' : 'Archetype shop'} posted!`);
  },
};

// ---------------------------------------------------------------------------
// Discord shop roles
// ---------------------------------------------------------------------------

function archetypeRoleName(name: string, tier: string): string {
  // No emoji prefix - just lowercase name
  return name.toLowerCase();
}

function colorRoleName(name: string, tier: string): string {
  // No emoji prefix - just lowercase name
  return name.toLowerCase();
}

async function ensureShopRole(guild: Guild, name: string, color?: string, existingRoleId?: string | null): Promise<Role | null> {
  // First try to find by ID if we have one stored
  if (existingRoleId) {
    try {
      const existing = await guild.roles.fetch(existingRoleId);
      if (existing) {
        // Keep the Discord role name in sync if the underlying shop item was
        // renamed (e.g. "Documentary Host" -> "Ceo of Sex") — otherwise the
        // role would keep displaying its old name forever.
        let updated = existing;
        if (existing.name !== name) {
          try {
            updated = await existing.setName(name, 'Shop item renamed');
            console.log(`Renamed existing role ${existing.id} to: ${updated.name}`);
          } catch (renameError) {
            console.error(`Failed to rename role ${existing.id} to "${name}":`, renameError);
          }
        }

        // Update role color if provided and different
        if (color && /^#[0-9A-Fa-f]{6}$/.test(color) && existing.color !== parseInt(color.replace('#', ''), 16)) {
          try {
            updated = await existing.setColor(color as `#${string}`, 'Shop color updated');
            console.log(`Updated color for role ${existing.id} to: ${color}`);
          } catch (colorError) {
            console.error(`Failed to update color for role ${existing.id}:`, colorError);
          }
        }

        console.log(`Found existing role by ID: ${updated.name} (${updated.id})`);
        return updated;
      }
    } catch (error) {
      console.log(`Role ID ${existingRoleId} not found, will try to find by name or create new`);
    }
  }

  // Try to find by name
  const existingByName = guild.roles.cache.find(role => role.name === name);
  if (existingByName) {
    console.log(`Found existing role by name: ${existingByName.name} (${existingByName.id})`);
    return existingByName;
  }

  // Create new role
  try {
    const role = await guild.roles.create({
      name,
      color: color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color as `#${string}` : '#7B61FF',
      reason: 'Shop item role setup',
    });
    console.log(`Created new role: ${role.name} (${role.id})`);
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
  const client = await (await import('../database/client.js')).getClient();

  try {
    // Handle archetypes
    for (const archetype of archetypes) {
      const roleName = archetypeRoleName(archetype.name, archetype.tier);
      const signatureColor = PERSONA_SIGNATURE_COLORS[archetype.name];
      const role = await ensureShopRole(guild, roleName, signatureColor, archetype.role_id);
      if (role) {
        // Update the database with the role ID
        await client.query(
          'UPDATE shop_archetypes SET role_id = $1 WHERE id = $2',
          [role.id, archetype.id]
        );
      } else {
        errors.push(roleName);
      }
    }

    // Handle colors
    for (const color of colors) {
      const roleName = colorRoleName(color.name, color.tier);
      const role = await ensureShopRole(guild, roleName, color.hex, color.role_id);
      if (role) {
        // Update the database with the role ID
        await client.query(
          'UPDATE shop_colors SET role_id = $1 WHERE id = $2',
          [role.id, color.id]
        );
      } else {
        errors.push(roleName);
      }
    }
  } finally {
    client.release();
  }

  return { errors };
}

async function assignShopRole(member: GuildMember, roleId: string): Promise<boolean> {
  try {
    const role = await member.guild.roles.fetch(roleId);
    if (!role) {
      console.error(`Role ID ${roleId} not found in guild`);
      return false;
    }
    if (member.roles.cache.has(role.id)) return true;

    await member.roles.add(role, 'Shop purchase/grant');
    console.log(`Assigned role ${role.name} (${role.id}) to user ${member.id}`);
    return true;
  } catch (error) {
    console.error(`Failed to assign shop role ID ${roleId} to ${member.id}:`, error);
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
    if (archetype && archetype.role_id) {
      await assignShopRole(member, archetype.role_id);
    }
  }
  for (const owned of ownedColors) {
    // Only sync roles for colors the user currently has equipped — an owned
    // but unequipped color should stay off until they re-equip it.
    if (!owned.active) continue;
    const color = colorById.get(owned.color_id);
    if (color && color.role_id) {
      await assignShopRole(member, color.role_id);
    }
  }
}

// ---------------------------------------------------------------------------
// Delete retired colors with no owners
// ---------------------------------------------------------------------------

async function deleteRetiredColorsWithNoOwners(guild: Guild): Promise<void> {
  const client = await (await import('../database/client.js')).getClient();
  try {
    // Get all inactive colors
    const result = await client.query(
      `SELECT sc.id, sc.name, sc.role_id
       FROM shop_colors sc
       WHERE sc.active = false`
    );

    for (const row of result.rows) {
      // Check if anyone owns this color
      const ownershipResult = await client.query(
        'SELECT COUNT(*) as count FROM user_colors WHERE color_id = $1',
        [row.id]
      );
      const ownerCount = parseInt(ownershipResult.rows[0].count);

      if (ownerCount === 0) {
        console.log(`Deleting retired color with no owners: ${row.name}`);

        // Delete the Discord role if it exists
        if (row.role_id) {
          try {
            const role = await guild.roles.fetch(row.role_id);
            if (role) {
              await role.delete('Retired color with no owners');
              console.log(`Deleted Discord role for: ${row.name}`);
            }
          } catch (error) {
            console.error(`Failed to delete role ${row.role_id} for ${row.name}:`, error);
          }
        }

        // Delete the color from the database
        await client.query('DELETE FROM shop_colors WHERE id = $1', [row.id]);
        console.log(`Deleted color from database: ${row.name}`);
      }
    }
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Posting: colors
// ---------------------------------------------------------------------------

async function postColorShopIntro(shopChannel: TextChannel): Promise<void> {
  const introTitle = '<:designpalette:1542338996217184356> Colors Shop';
  const introEmbed = new EmbedBuilder()
    .setTitle(introTitle)
    .setDescription('Give your profile some personality with collectible colors.\n\nColors are divided into tiers, each unlocking at a specific level.\n\n**Studio Classics** — Level 20\n**Midnight Cinema** — Level 40\n**Neon Lights** — Level 40\n**Award Season** — Level 60\n\nSelect a category below to browse its colors.')
    .setColor(0x4900ff);

  // Try to edit existing message, otherwise send new
  const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
  const existing = existingMessages.find(
    msg => msg.author.id === shopChannel.client.user?.id && msg.embeds.length > 0 && msg.embeds[0].title === introTitle
  );

  if (existing) {
    await existing.edit({ embeds: [introEmbed] });
  } else {
    await shopChannel.send({
      embeds: [introEmbed],
    });
  }
}

async function postColorShop(shopChannel: TextChannel, colorsByTier: Record<string, ShopColor[]>): Promise<void> {
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

      const firstColor = chunk[0];
      const unlockLevel = firstColor.min_level;
      const embed = new EmbedBuilder()
        .setTitle(chunkTitle)
        .setDescription(`Unlocks at level ${unlockLevel}. Pick one below to buy or equip it.`)
        .setColor(0x4900ff)
        .setImage(`attachment://${filename}`);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`shop_select_color_${tier.replace(/\s+/g, '_')}_${chunkIndex}`)
        .setPlaceholder(`Select a ${tier.toLowerCase()} color`)
        .setMinValues(1)
        .setMaxValues(1);

      for (const color of chunk) {
        const formattedName = colorRoleName(color.name, color.tier);
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${formattedName} - ${color.price} residuals`)
            .setValue(color.id.toString())
            .setDescription(color.hex)
        );
      }

      // Try to edit existing message by customId, otherwise send new
      const customId = `shop_select_color_${tier.replace(/\s+/g, '_')}_${chunkIndex}`;
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

      let shopMessage;
      if (existing) {
        shopMessage = await existing.edit({
          embeds: [embed],
          files: [file],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      } else {
        shopMessage = await shopChannel.send({
          embeds: [embed],
          files: [file],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      }

      const collector = shopMessage.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 0,
        filter: (i: any) => i.customId === `shop_select_color_${tier.replace(/\s+/g, '_')}_${chunkIndex}`,
      });

      collector.on('collect', async (interaction: any) => {
        const colorId = parseInt(interaction.values[0], 10);
        await handleColorSelection(interaction, colorId);
      });
    }
  }
}

async function handleColorSelection(interaction: any, colorId: number): Promise<void> {
  const userId = interaction.user.id;
  const userData = await getUser(userId);
  if (!userData) {
    await interaction.reply({ content: '❌ You need to send at least one message first so the bot can create your profile.', flags: [1 << 6] });
    return;
  }

  const colors = await getShopColors();
  const color = colors.find(c => c.id === colorId);
  if (!color) {
    await interaction.reply({ content: '❌ Color not found.', flags: [1 << 6] });
    return;
  }

  // No level gate for colors - just need cash
  // minLevel is for display only

  const userColors = await getUserColors(userId);
  const owned = userColors.some(uc => uc.color_id === color.id);
  const active = userColors.some(uc => uc.color_id === color.id && uc.active);
  const price = color.price;
  const canAfford = userData.total_residuals_balance >= price;

  // TODO: booster perks - no free colors currently
  const isFreeGrant = false;

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
        .setCustomId(`unequip_color_${colorId}`)
        .setLabel('Unequip')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!owned || !active),
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
      { name: 'Tier', value: color.tier, inline: true },
      { name: 'Price', value: isFreeGrant ? 'FREE' : price.toString(), inline: true },
      { name: 'Hex', value: color.hex, inline: true },
      { name: 'Note', value: 'You can own multiple colors at once. Buying a new one doesn\'t remove your others — use the Equip/Unequip buttons here (or `.manage`) to control which color roles are active.', inline: false },
    ]);

  await interaction.reply({ embeds: [detailEmbed], components: [confirmRow], flags: [1 << 6] }).catch((error: unknown) => {
    console.error('Failed to reply to color selection interaction:', error);
  });

  const buttonCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000, // Increased to 2 minutes
    filter: (i: any) => i.user.id === userId && (i.customId === `purchase_color_${colorId}` || i.customId === `equip_color_${colorId}` || i.customId === `unequip_color_${colorId}` || i.customId === 'cancel_color'),
  });

  buttonCollector?.on('collect', async (buttonInteraction: any) => {
    try {
      if (buttonInteraction.customId === `purchase_color_${colorId}`) {
        const result = await purchaseColor(userId, colorId, isFreeGrant);
        if (result.success) {
          const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);

          // Colors stack — the new color is equipped alongside anything the
          // user already owns, so no other color roles are touched here.
          const roleAssigned = member && color.role_id ? await assignShopRole(member, color.role_id) : false;
          const roleName = member?.guild.roles.cache.get(color.role_id || '')?.name || colorRoleName(color.name, color.tier);
          let message = `${isFreeGrant ? '✅ Free color claimed and equipped!' : '✅ Color purchased and equipped!'}`;
          message += roleAssigned ? `\n<:designpalette:1542338996217184356> Role assigned: **${roleName}**` : '\n⚠️ Purchase saved, but the Discord role could not be assigned.';

          await buttonInteraction.update({
            content: message,
            embeds: [],
            components: [],
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, flags: [1 << 6] });
        }
        buttonCollector.stop();
      } else if (buttonInteraction.customId === `equip_color_${colorId}`) {
        const result = await setColorActive(userId, colorId, true);
        if (result.success) {
          const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
          const roleAssigned = member && color.role_id ? await assignShopRole(member, color.role_id) : false;
          const roleName = member?.guild.roles.cache.get(color.role_id || '')?.name || colorRoleName(color.name, color.tier);
          await buttonInteraction.update({
            content: roleAssigned ? `✅ Color equipped!\n<:designpalette:1542338996217184356> Role confirmed: **${roleName}**` : '✅ Color equipped!\n⚠️ The color role could not be assigned.',
            embeds: [],
            components: [],
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, flags: [1 << 6] });
        }
        buttonCollector.stop();
      } else if (buttonInteraction.customId === `unequip_color_${colorId}`) {
        const result = await setColorActive(userId, colorId, false);
        if (result.success) {
          const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
          let roleRemoved = false;
          if (member && color.role_id) {
            try {
              const role = await member.guild.roles.fetch(color.role_id);
              if (role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role, 'Color unequipped');
                roleRemoved = true;
              }
            } catch (error) {
              console.error(`Failed to remove color role ${color.role_id}:`, error);
            }
          }
          await buttonInteraction.update({
            content: roleRemoved ? '✅ Color unequipped.\n<:designpalette:1542338996217184356> Role removed — the color stays in your collection to re-equip anytime.' : '✅ Color unequipped.',
            embeds: [],
            components: [],
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, flags: [1 << 6] });
        }
        buttonCollector.stop();
      } else if (buttonInteraction.customId === 'cancel_color') {
        await buttonInteraction.update({ content: 'Cancelled.', embeds: [], components: [] });
        buttonCollector.stop();
      }
    } catch (error) {
      console.error('Error handling color button interaction:', error);
      try {
        await buttonInteraction.reply({ content: '❌ An error occurred while processing your request.', flags: [1 << 6] });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
      buttonCollector.stop();
    }
  });

  buttonCollector?.on('end', (_collected: unknown, reason: string) => {
    if (reason === 'time') {
      console.log(`Color selection for user ${userId} timed out`);
    }
  });
}

// ---------------------------------------------------------------------------
// Posting: archetypes
// ---------------------------------------------------------------------------

async function postArchetypeShopIntro(shopChannel: TextChannel): Promise<void> {
  const introTitle = '<:3dmovie:1542345279070806067> Persona Roles Shop';
  const introEmbed = new EmbedBuilder()
    .setTitle(introTitle)
    .setDescription('Collect personas to give your profile its own identity.\n\nPersonas range from prestigious **Legendary** roles to rare **Special** personas.\n\n👑 **Legendary** — Level 90+ (5000 residuals)\n⚔️ **Elite** — Level 70+ (3000 residuals)\n� **High-status** — Level 50+ (2000 residuals)\n🎭 **Special** — Level 30+ (5000 residuals)\n\nSelect a category below to browse the collection.')
    .setColor(0x4900ff);

  // Try to edit existing message, otherwise send new
  const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
  const existing = existingMessages.find(
    msg => msg.author.id === shopChannel.client.user?.id && msg.embeds.length > 0 && msg.embeds[0].title === introTitle
  );

  if (existing) {
    await existing.edit({ embeds: [introEmbed] });
  } else {
    await shopChannel.send({
      embeds: [introEmbed],
    });
  }
}

async function postArchetypeShop(shopChannel: TextChannel, archetypeTiers: Record<string, (ShopArchetype & { currentHolders: number })[]>): Promise<void> {
  for (const tier of [PERSONA_TIERS.LEGENDARY, PERSONA_TIERS.ELITE, PERSONA_TIERS.HIGH_STATUS, PERSONA_TIERS.SPECIAL] as const) {
    const tierArchetypes = archetypeTiers[tier];
    if (!tierArchetypes || tierArchetypes.length === 0) continue;

    const symbol = PERSONA_TIER_SYMBOLS[tier] || '';
    const title = `${symbol} ${tier}`;

    // Split into chunks of max 6 roles per embed
    const chunks: (ShopArchetype & { currentHolders: number })[][] = [];
    for (let i = 0; i < tierArchetypes.length; i += 6) {
      chunks.push(tierArchetypes.slice(i, i + 6));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkSuffix = chunks.length > 1 ? ` (${chunkIndex + 1}/${chunks.length})` : '';
      const chunkTitle = `${title}${chunkSuffix}`;

      const firstArchetype = chunk[0];
      const unlockLevel = firstArchetype.min_level;
      const embed = new EmbedBuilder()
        .setTitle(chunkTitle)
        .setDescription(`Unlocks at level ${unlockLevel}. Pick one below to buy it.`)
        .setColor(0x4900ff);

      // Try to load artwork, fall back to plain embed if missing
      const slug = chunk[0].name.toLowerCase().replace(/\s+/g, '-');
      let file: AttachmentBuilder | undefined;

      try {
        const buffer = await generateArchetypeGridImage(chunk);
        file = new AttachmentBuilder(buffer, { name: `archetypes_${tier.replace(/\s+/g, '_')}_${chunkIndex}.png` });
        embed.setImage(`attachment://${file.name}`);
      } catch (error) {
        console.warn(`Failed to load artwork for ${slug}, using plain embed`);
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`shop_select_archetype_${tier.replace(/\s+/g, '_')}_${chunkIndex}`)
        .setPlaceholder(`Select a ${tier.toLowerCase()} archetype`)
        .setMinValues(1)
        .setMaxValues(1);

      for (const archetype of chunk) {
        const formattedName = archetypeRoleName(archetype.name, archetype.tier);
        const holderText = archetype.max_holders ? `${archetype.currentHolders}/${archetype.max_holders} taken` : 'Unlimited';
        const monthlyText = archetype.monthly ? ' (monthly)' : '';
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${formattedName} - ${archetype.price} residuals`)
            .setValue(archetype.id.toString())
            .setDescription(`${holderText}${monthlyText}`)
        );
      }

      // Try to edit existing message by customId, otherwise send new
      const customId = `shop_select_archetype_${tier.replace(/\s+/g, '_')}_${chunkIndex}`;
      const existingMessages = await shopChannel.messages.fetch({ limit: 100 });
      const existing = existingMessages.find(
        msg => msg.author.id === shopChannel.client.user?.id &&
              msg.components.length > 0 &&
              msg.components[0].type === 1 &&
              'components' in msg.components[0] &&
              (msg.components[0] as any).components.length > 0 &&
              'customId' in (msg.components[0] as any).components[0] &&
              (msg.components[0] as any).components[0].customId === customId
      );

      let shopMessage;
      if (existing) {
        shopMessage = await existing.edit({
          embeds: [embed],
          files: file ? [file] : [],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      } else {
        shopMessage = await shopChannel.send({
          embeds: [embed],
          files: file ? [file] : [],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      }

      const collector = shopMessage.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 0,
        filter: (i: any) => i.customId === `shop_select_archetype_${tier.replace(/\s+/g, '_')}_${chunkIndex}`,
      });

      collector.on('collect', async (interaction: any) => {
        const archetypeId = parseInt(interaction.values[0], 10);
        await handleArchetypeSelection(interaction, archetypeId);
      });
    }
  }
}

async function handleArchetypeSelection(interaction: any, archetypeId: number): Promise<void> {
  const userId = interaction.user.id;
  const userData = await getUser(userId);
  if (!userData) {
    await interaction.reply({ content: '❌ You need to send at least one message first so the bot can create your profile.', flags: [1 << 6] });
    return;
  }

  const archetypes = await getShopArchetypes();
  const archetype = archetypes.find(a => a.id === archetypeId);
  if (!archetype) {
    await interaction.reply({ content: '❌ Archetype not found.', flags: [1 << 6] });
    return;
  }

  // Check level gate (only for Unknown Entity)
  if (archetype.name === 'Unknown Entity' && userData.current_level < archetype.min_level) {
    await interaction.reply({ content: `❌ This archetype unlocks at level ${archetype.min_level}.`, flags: [1 << 6] });
    return;
  }

  const userArchetypes = await getUserArchetypes(userId);
  const owned = userArchetypes.some(ua => ua.archetype_id === archetype.id);
  const canAfford = userData.total_residuals_balance >= archetype.price;

  // TODO: booster perks - no free archetypes currently
  const isFreeGrant = false;

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

  const holderText = archetype.max_holders ? `${archetype.name} has a limit of ${archetype.max_holders} holders.` : 'Unlimited holders.';
  const monthlyText = archetype.monthly ? ' This is a monthly subscription.' : '';
  const unknownEntityNote = archetype.name === 'Unknown Entity' ? '\n\nUnknown Entity does not replace your current archetype and has no refund.' : '\n\nYou can only own one archetype at a time. Purchasing a new one will replace your current archetype with a 50% refund.';

  const detailEmbed = new EmbedBuilder()
    .setTitle(`${archetypeRoleName(archetype.name, archetype.tier)} (${archetype.tier})`)
    .setDescription(owned ? '✅ You already own this archetype!' : (isFreeGrant ? '🎁 Free Grant - No cost!' : `Price: ${archetype.price} residuals`))
    .setColor(0x4900ff)
    .addFields([
      { name: 'Tier', value: archetype.tier, inline: true },
      { name: 'Price', value: isFreeGrant ? 'FREE' : archetype.price.toString(), inline: true },
      { name: 'Unlocks at', value: `Level ${archetype.min_level}`, inline: true },
      { name: 'Details', value: `${holderText}${monthlyText}${unknownEntityNote}`, inline: false },
    ]);

  await interaction.reply({ embeds: [detailEmbed], components: [confirmRow], flags: [1 << 6] }).catch((error: unknown) => {
    console.error('Failed to reply to archetype selection interaction:', error);
  });

  const buttonCollector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000, // Increased to 2 minutes
    filter: (i: any) => i.user.id === userId && (i.customId === `confirm_archetype_${archetypeId}` || i.customId === 'cancel_archetype'),
  });

  buttonCollector?.on('collect', async (buttonInteraction: any) => {
    try {
      if (buttonInteraction.customId === `confirm_archetype_${archetypeId}`) {
        const result = await purchaseArchetype(userId, archetypeId, isFreeGrant);
        if (result.success) {
          const member = await buttonInteraction.guild?.members.fetch(userId).catch(() => null);
          
          // Remove old archetype roles if any
          const userArchetypes = await getUserArchetypes(userId);
          for (const userArchetype of userArchetypes) {
            if (userArchetype.archetype_id !== archetypeId) {
              const oldArchetype = archetypes.find(a => a.id === userArchetype.archetype_id);
              if (oldArchetype && oldArchetype.role_id && member) {
                try {
                  const role = await member.guild.roles.fetch(oldArchetype.role_id);
                  if (role && member.roles.cache.has(role.id)) {
                    await member.roles.remove(role, 'Archetype replacement');
                  }
                } catch (error) {
                  console.error(`Failed to remove old archetype role ${oldArchetype.role_id}:`, error);
                }
              }
            }
          }
          
          const roleAssigned = member && archetype.role_id ? await assignShopRole(member, archetype.role_id) : false;
          const roleName = member?.guild.roles.cache.get(archetype.role_id || '')?.name || archetypeRoleName(archetype.name, archetype.tier);
          let message = `${isFreeGrant ? '✅ Free archetype claimed successfully!' : '✅ Archetype purchased successfully!'}`;
          if (result.refund && result.refund > 0) {
            message += `\n${EMOJIS.CASH} Refunded ${result.refund} residuals (50% of previous archetype)`;
          }
          message += roleAssigned ? `\n<:3dmovie:1542345279070806067> Role assigned: **${roleName}**` : '\n⚠️ Purchase saved, but the Discord role could not be assigned.';
          
          await buttonInteraction.update({
            content: message,
            embeds: [],
            components: [],
          });
        } else {
          await buttonInteraction.reply({ content: `❌ ${result.reason}`, flags: [1 << 6] });
        }
        buttonCollector.stop();
      } else if (buttonInteraction.customId === 'cancel_archetype') {
        await buttonInteraction.update({ content: 'Purchase cancelled.', embeds: [], components: [] });
        buttonCollector.stop();
      }
    } catch (error) {
      console.error('Error handling archetype button interaction:', error);
      try {
        await buttonInteraction.reply({ content: '❌ An error occurred while processing your request.', flags: [1 << 6] });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
      buttonCollector.stop();
    }
  });

  buttonCollector?.on('end', (_collected: unknown, reason: string) => {
    if (reason === 'time') {
      console.log(`Archetype selection for user ${userId} timed out`);
    }
  });
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

