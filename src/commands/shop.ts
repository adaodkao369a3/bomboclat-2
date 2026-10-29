import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  TextChannel,
} from 'discord.js';
import { CHANNELS, ROLES } from '../config/index.js';
import type { Guild, GuildMember, Role } from 'discord.js';
import {
  getShopArchetypes,
  getShopArchetypesByTier,
  getShopColors,
  getShopColorsByTier,
  getUserArchetypes,
  getUserColors,
  seedShopArchetypes,
  seedShopColors,
  type ShopArchetype,
  type ShopColor,
} from '../services/shop.js';
import { generateColorGridImage, generateArchetypeGridImage } from '../services/shopImages.js';
import { isBotOwner } from '../utils/permissions.js';
import { Command } from './index.js';
import { unlockLine } from '../services/shopText.js';
import '../interactions/handlers/shop.js'; // registers the persistent shop button/select handlers
import { TIER_SYMBOLS, COLOR_TIERS } from '../config/colors.js';
import { PERSONA_TIER_SYMBOLS, PERSONA_TIERS, PERSONAS_CONFIG } from '../config/archetypes.js';



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

function archetypeRoleName(name: string, _tier: string): string {
  // No emoji prefix - just lowercase name
  return name.toLowerCase();
}

function colorRoleName(name: string, _tier: string): string {
  // No emoji prefix - just lowercase name
  return name.toLowerCase();
}

async function ensureShopRole(guild: Guild, name: string, color?: string, existingRoleId?: string | null, protectedRoleIds: Set<string> = new Set()): Promise<Role | null> {
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

  // One-time adoption of a hand-made role with the same name. Only when this
  // shop item has NEVER had a role ID stored (a stored ID that no longer exists
  // means the role was deleted, so a fresh role is created instead). Roles that
  // already belong to something else (other shop items, progression, staff,
  // booster, bot-managed) are never adopted. The adopted ID is saved by the
  // caller, so after this, the role is tracked by ID only.
  if (!existingRoleId) {
    const existingByName = guild.roles.cache.find(
      role => role.name === name && !role.managed && role.id !== guild.id && !protectedRoleIds.has(role.id)
    );
    if (existingByName) {
      console.log(`Adopted existing role by name (one time): ${existingByName.name} (${existingByName.id})`);
      return existingByName;
    }
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
    // Role IDs that belong to something else and must never be adopted by name
    const protectedRoleIds = new Set<string>(Object.values(ROLES) as string[]);
    const claimed = await client.query(
      `SELECT role_id FROM shop_archetypes WHERE role_id IS NOT NULL
       UNION SELECT role_id FROM shop_colors WHERE role_id IS NOT NULL`
    );
    for (const row of claimed.rows) protectedRoleIds.add(row.role_id);

    // Handle archetypes
    for (const archetype of archetypes) {
      const roleName = archetypeRoleName(archetype.name, archetype.tier);
      const signatureColor = PERSONAS_CONFIG.find(pc => pc.key === archetype.persona_key)?.signatureColor;
      const role = await ensureShopRole(guild, roleName, signatureColor, archetype.role_id, protectedRoleIds);
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
      const role = await ensureShopRole(guild, roleName, color.hex, color.role_id, protectedRoleIds);
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
  const introTitle = '<:palette:1545852130517319812> Colors Shop';
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
        const formattedName = colorRoleName(color.name, color.tier);
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${formattedName} - ${color.price} residuals`)
            .setValue(color.id.toString())
            .setDescription(`Level ${color.min_level} · ${color.hex}`)
        );
      }

      // Try to edit existing message by customId, otherwise send new
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
      } else {
        await shopChannel.send({
          embeds: [embed],
          files: [file],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      }

    }
  }
}


// ---------------------------------------------------------------------------
// Posting: archetypes
// ---------------------------------------------------------------------------

async function postArchetypeShopIntro(shopChannel: TextChannel): Promise<void> {
  const introTitle = '<:theatre:1558592490662138017> Persona Roles Shop';
  const introEmbed = new EmbedBuilder()
    .setTitle(introTitle)
    .setDescription('Collect personas to give your profile its own identity.\n\nPersonas climb from rare **Special** ones to prestigious **Transcendent** roles. You need the level to buy them.\n\n🛡️ **High-status** — Level 50+ (2000 residuals)\n⚔️ **Elite** — Level 70+ (3000 residuals)\n� **Legendary** — Level 90+ (4000 residuals)\n✨ **Transcendent** — Level 90+ (4500 residuals)\n🎭 **Special** — Level 30+ (5000 residuals, Unknown Entity needs level 100)\n\nSelect a category below to browse the collection.')
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
  for (const tier of [PERSONA_TIERS.HIGH_STATUS, PERSONA_TIERS.ELITE, PERSONA_TIERS.LEGENDARY, PERSONA_TIERS.TRANSCENDENT, PERSONA_TIERS.SPECIAL] as const) {
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

      const embed = new EmbedBuilder()
        .setTitle(chunkTitle)
        .setDescription(unlockLine(chunk, 'buy'))
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
        .setCustomId(`shop:pickpersona:${tier.replace(/\s+/g, '_')}:${chunkIndex}`)
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
            .setDescription(`Level ${archetype.min_level} · ${holderText}${monthlyText}`)
        );
      }

      // Try to edit existing message by customId, otherwise send new
      const customId = `shop:pickpersona:${tier.replace(/\s+/g, '_')}:${chunkIndex}`;
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

      if (existing) {
        await existing.edit({
          embeds: [embed],
          files: file ? [file] : [],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      } else {
        await shopChannel.send({
          embeds: [embed],
          files: file ? [file] : [],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
        });
      }

    }
  }
}


// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

