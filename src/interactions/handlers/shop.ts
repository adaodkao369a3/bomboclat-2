import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type GuildMember,
  type Interaction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { registerInteractionHandler, parseCustomId } from '../index.js';
import { getUser } from '../../database/client.js';
import {
  getShopArchetypes,
  getShopColors,
  getUserArchetypes,
  getUserColors,
  purchaseArchetype,
  purchaseColor,
  setColorActive,
} from '../../services/shop.js';
import { reconcileShopRoles } from '../../services/shopRoles.js';
import { PERSONA_KEYS } from '../../config/archetypes.js';
import { EMOJIS } from '../../config/index.js';
import { levelTooLow } from '../../services/shopText.js';

/**
 * Persistent shop interactions. Nothing here lives in memory: every custom ID
 * carries what the handler needs and all state is re-read from the database on
 * every click, so the shop keeps working after a restart/redeploy.
 *
 * Custom IDs:
 *   shop:pickpersona:<tier>:<chunk>        public select menu on the shop post
 *   shop:pickcolor:<tier>:<chunk>          public select menu on the shop post
 *   shop:buypersona:<userId>:<personaId>   ephemeral buy button
 *   shop:buycolor:<userId>:<colorId>
 *   shop:equipcolor:<userId>:<colorId>
 *   shop:unequipcolor:<userId>:<colorId>
 *   shop:cancel:<userId>
 */

const EPHEMERAL = MessageFlags.Ephemeral;
const PERSONA_EMOJI = '<:theatre:1558592490662138017>';
const COLOR_EMOJI = '<:palette:1545852130517319812>';

/** Discord role names are the plain lowercase item name. */
const roleName = (name: string): string => name.toLowerCase();

function noProfile(): { content: string; flags: typeof EPHEMERAL } {
  return {
    content: `${EMOJIS.GLOSSY_RED_CANCEL} You need to send at least one message first so the bot can create your profile.`,
    flags: EPHEMERAL,
  };
}

async function getMember(interaction: Interaction): Promise<GuildMember | null> {
  if (!interaction.guild) return null;
  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

/** Role name for an item, read by saved role ID (falls back to the item name). */
async function discordRoleName(member: GuildMember | null, roleId: string | null, fallback: string): Promise<string> {
  if (!member || !roleId) return roleName(fallback);
  const role = await member.guild.roles.fetch(roleId).catch(() => null);
  return role?.name ?? roleName(fallback);
}

// ---------------------------------------------------------------------------
// Persona: select menu -> detail card with Purchase / Cancel
// ---------------------------------------------------------------------------

async function handlePickPersona(interaction: StringSelectMenuInteraction): Promise<void> {
  const userId = interaction.user.id;
  const userData = await getUser(userId);
  if (!userData) {
    await interaction.reply(noProfile());
    return;
  }

  const personaId = parseInt(interaction.values[0], 10);
  const personas = await getShopArchetypes();
  const persona = personas.find(p => p.id === personaId);
  if (!persona || !persona.active) {
    await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} That persona is no longer available.`, flags: EPHEMERAL });
    return;
  }

  const isUnknownEntity = persona.persona_key === PERSONA_KEYS.UNKNOWN_ENTITY;

  // Every persona is level-gated
  if (userData.current_level < persona.min_level) {
    await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} ${levelTooLow(persona.min_level)} You are level ${userData.current_level}.`, flags: EPHEMERAL });
    return;
  }

  const owned = (await getUserArchetypes(userId)).some(ua => ua.archetype_id === persona.id);
  const canAfford = userData.total_residuals_balance >= persona.price;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop:buypersona:${userId}:${persona.id}`)
      .setLabel('Purchase')
      .setStyle(ButtonStyle.Success)
      // Unknown Entity can be renewed after it expires; the service blocks early renewals
      .setDisabled((owned && !isUnknownEntity) || !canAfford),
    new ButtonBuilder()
      .setCustomId(`shop:cancel:${userId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );

  const holderText = persona.max_holders ? `Limited to ${persona.max_holders} holders.` : 'Unlimited holders.';
  const monthlyText = persona.monthly ? ' This is a monthly subscription (30 days).' : '';
  const swapNote = isUnknownEntity
    ? '\n\nUnknown Entity does not replace your current persona and has no refund.'
    : '\n\nYou can only hold one persona at a time. Buying a new one replaces your current persona and refunds 50% of what the old one cost.';

  const embed = new EmbedBuilder()
    .setTitle(`${roleName(persona.name)} (${persona.tier})`)
    .setDescription(owned && !isUnknownEntity ? `${EMOJIS.GREEN_GLOSSY_TICK} You already own this persona!` : `Price: ${EMOJIS.MONEY} ${persona.price}`)
    .setColor(0x4900ff)
    .addFields([
      { name: 'Tier', value: persona.tier, inline: true },
      { name: 'Price', value: persona.price.toString(), inline: true },
      { name: 'Unlocks at', value: `Level ${persona.min_level}`, inline: true },
      { name: 'Details', value: `${holderText}${monthlyText}${swapNote}`, inline: false },
    ]);

  await interaction.reply({ embeds: [embed], components: [row], flags: EPHEMERAL });
}

async function handleBuyPersona(interaction: ButtonInteraction, personaId: number): Promise<void> {
  const userId = interaction.user.id;
  const result = await purchaseArchetype(userId, personaId, false);
  if (!result.success) {
    await interaction.update({ content: `${EMOJIS.GLOSSY_RED_CANCEL} ${result.reason}`, embeds: [], components: [] });
    return;
  }

  const member = await getMember(interaction);
  // Make Discord match the database (adds the new role, removes the replaced one)
  if (member) await reconcileShopRoles(member);

  const persona = (await getShopArchetypes()).find(p => p.id === personaId);
  const name = await discordRoleName(member, persona?.role_id ?? null, persona?.name ?? 'persona');
  const hasRole = !!(member && persona?.role_id && member.roles.cache.has(persona.role_id));

  let message = `${EMOJIS.GREEN_GLOSSY_TICK} Persona purchased successfully!`;
  if (result.refund && result.refund > 0) {
    message += `\n${EMOJIS.MONEY} Refunded ${result.refund} (50% of your previous persona)`;
  }
  message += hasRole
    ? `\n${PERSONA_EMOJI} Role assigned: **${name}**`
    : `\n${EMOJIS.WARNING} Purchase saved, but the Discord role could not be assigned.`;

  await interaction.update({ content: message, embeds: [], components: [] });
}

// ---------------------------------------------------------------------------
// Color: select menu -> detail card with Purchase / Equip / Unequip / Cancel
// ---------------------------------------------------------------------------

async function handlePickColor(interaction: StringSelectMenuInteraction): Promise<void> {
  const userId = interaction.user.id;
  const userData = await getUser(userId);
  if (!userData) {
    await interaction.reply(noProfile());
    return;
  }

  const colorId = parseInt(interaction.values[0], 10);
  const color = (await getShopColors()).find(c => c.id === colorId);
  if (!color) {
    await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} Color not found.`, flags: EPHEMERAL });
    return;
  }

  if (userData.current_level < color.min_level) {
    await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} ${levelTooLow(color.min_level)} You are level ${userData.current_level}.`, flags: EPHEMERAL });
    return;
  }

  const userColors = await getUserColors(userId);
  const owned = userColors.some(uc => uc.color_id === color.id);
  const active = userColors.some(uc => uc.color_id === color.id && uc.active);
  const canAfford = userData.total_residuals_balance >= color.price;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop:buycolor:${userId}:${colorId}`)
      .setLabel('Purchase')
      .setStyle(ButtonStyle.Success)
      .setDisabled(owned || !canAfford),
    new ButtonBuilder()
      .setCustomId(`shop:equipcolor:${userId}:${colorId}`)
      .setLabel('Equip')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!owned || active),
    new ButtonBuilder()
      .setCustomId(`shop:unequipcolor:${userId}:${colorId}`)
      .setLabel('Unequip')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!owned || !active),
    new ButtonBuilder()
      .setCustomId(`shop:cancel:${userId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );

  const embed = new EmbedBuilder()
    .setTitle(color.name)
    .setDescription(owned ? (active ? `${EMOJIS.RIGHT_ARROW} Currently equipped` : `${EMOJIS.GREEN_GLOSSY_TICK} Owned (click Equip to use)`) : `Price: ${EMOJIS.MONEY} ${color.price}`)
    .setColor(parseInt(color.hex.replace('#', ''), 16))
    .addFields([
      { name: 'Tier', value: color.tier, inline: true },
      { name: 'Price', value: color.price.toString(), inline: true },
      { name: 'Hex', value: color.hex, inline: true },
      {
        name: 'Note',
        value: "You can own multiple colors at once. Buying a new one doesn't remove your others — use Equip/Unequip here (or `.manage`) to control which color roles are active.",
        inline: false,
      },
    ]);

  await interaction.reply({ embeds: [embed], components: [row], flags: EPHEMERAL });
}

async function handleBuyColor(interaction: ButtonInteraction, colorId: number): Promise<void> {
  const userId = interaction.user.id;
  const result = await purchaseColor(userId, colorId, false);
  if (!result.success) {
    await interaction.update({ content: `${EMOJIS.GLOSSY_RED_CANCEL} ${result.reason}`, embeds: [], components: [] });
    return;
  }

  const member = await getMember(interaction);
  if (member) await reconcileShopRoles(member);

  const color = (await getShopColors()).find(c => c.id === colorId);
  const name = await discordRoleName(member, color?.role_id ?? null, color?.name ?? 'color');
  const hasRole = !!(member && color?.role_id && member.roles.cache.has(color.role_id));

  await interaction.update({
    content:
      `${EMOJIS.GREEN_GLOSSY_TICK} Color purchased and equipped!` +
      (hasRole ? `\n${COLOR_EMOJI} Role assigned: **${name}**` : `\n${EMOJIS.WARNING} Purchase saved, but the Discord role could not be assigned.`),
    embeds: [],
    components: [],
  });
}

async function handleEquipColor(interaction: ButtonInteraction, colorId: number, equip: boolean): Promise<void> {
  const result = await setColorActive(interaction.user.id, colorId, equip);
  if (!result.success) {
    await interaction.update({ content: `${EMOJIS.GLOSSY_RED_CANCEL} ${result.reason}`, embeds: [], components: [] });
    return;
  }

  const member = await getMember(interaction);
  if (member) await reconcileShopRoles(member);

  const color = (await getShopColors()).find(c => c.id === colorId);
  const name = await discordRoleName(member, color?.role_id ?? null, color?.name ?? 'color');
  await interaction.update({
    content: equip
      ? `${EMOJIS.GREEN_GLOSSY_TICK} Color equipped!\n${COLOR_EMOJI} Role confirmed: **${name}**`
      : `${EMOJIS.GREEN_GLOSSY_TICK} Color unequipped.\n${COLOR_EMOJI} Role removed — the color stays in your collection to re-equip anytime.`,
    embeds: [],
    components: [],
  });
}

// ---------------------------------------------------------------------------
// Router entry
// ---------------------------------------------------------------------------

export async function handleShopInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const parts = parseCustomId(interaction.customId);
  const action = parts[1];

  // Public select menus on the shop posts: anyone can open their own private card
  if (interaction.isStringSelectMenu()) {
    if (action === 'pickpersona') return handlePickPersona(interaction);
    if (action === 'pickcolor') return handlePickColor(interaction);
    return;
  }

  // Everything else is a private button that belongs to the person who opened it
  const ownerId = parts[2];
  if (ownerId !== interaction.user.id) {
    await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} This button belongs to someone else.`, flags: EPHEMERAL });
    return;
  }

  const itemId = parseInt(parts[3], 10);
  switch (action) {
    case 'buypersona':
      return handleBuyPersona(interaction, itemId);
    case 'buycolor':
      return handleBuyColor(interaction, itemId);
    case 'equipcolor':
      return handleEquipColor(interaction, itemId, true);
    case 'unequipcolor':
      return handleEquipColor(interaction, itemId, false);
    case 'cancel':
      await interaction.update({ content: 'Cancelled.', embeds: [], components: [] });
      return;
  }
}

registerInteractionHandler('shop', handleShopInteraction);
