import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ButtonInteraction,
  type GuildMember,
  type Interaction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { registerInteractionHandler, parseCustomId } from '../index.js';
import {
  getShopColors,
  getUserArchetypes,
  getUserColors,
  sellArchetype,
  sellColors,
  setColorActive,
} from '../../services/shop.js';
import { reconcileShopRoles } from '../../services/shopRoles.js';

/**
 * Persistent `.manage` interactions. State is never kept in memory: every
 * custom ID carries what is needed and the database is re-read on each click,
 * so these buttons keep working after a restart.
 *
 * Custom IDs (userId is always the 3rd part and must match the clicker):
 *   manage:selcolor:<userId>                 select: pick an owned color
 *   manage:equip:<userId>:<colorId>
 *   manage:unequip:<userId>:<colorId>
 *   manage:sellcolors:<userId>               button: open the sell-colors picker
 *   manage:sellpick:<userId>                 select: colors to sell (multi)
 *   manage:sellconfirm:<userId>:<id,id,...>  confirm selling those colors
 *   manage:sellpersona:<userId>              button: open the sell-persona card
 *   manage:personaconfirm:<userId>           confirm selling the persona
 *   manage:sellcancel:<userId>
 */

const EPHEMERAL = MessageFlags.Ephemeral;
const COLOR_EMOJI = '<:palette:1545852130517319812>';
const PERSONA_EMOJI = '<:theatre:1558592490662138017>';

async function getMember(interaction: Interaction): Promise<GuildMember | null> {
  if (!interaction.guild) return null;
  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

// ---------------------------------------------------------------------------
// Equip / unequip
// ---------------------------------------------------------------------------

async function handleSelectColor(interaction: StringSelectMenuInteraction): Promise<void> {
  const userId = interaction.user.id;
  const colorId = parseInt(interaction.values[0], 10);
  const owned = (await getUserColors(userId)).find(uc => uc.color_id === colorId);
  if (!owned) {
    await interaction.reply({ content: '❌ You no longer own that color.', flags: EPHEMERAL });
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`manage:equip:${userId}:${colorId}`)
      .setLabel('Equip')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(owned.active),
    new ButtonBuilder()
      .setCustomId(`manage:unequip:${userId}:${colorId}`)
      .setLabel('Unequip')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!owned.active),
  );

  await interaction.reply({
    content: `**${owned.name}** \`${owned.hex}\` — currently ${owned.active ? 'equipped 🔹' : 'unequipped ⬜'}.`,
    components: [row],
    flags: EPHEMERAL,
  });
}

async function handleEquip(interaction: ButtonInteraction, colorId: number, equip: boolean): Promise<void> {
  const result = await setColorActive(interaction.user.id, colorId, equip);
  if (!result.success) {
    await interaction.update({ content: `❌ ${result.reason}`, components: [] });
    return;
  }

  const member = await getMember(interaction);
  if (member) await reconcileShopRoles(member);

  const color = (await getShopColors()).find(c => c.id === colorId);
  const role = member && color?.role_id ? await member.guild.roles.fetch(color.role_id).catch(() => null) : null;
  const roleLine = role
    ? `\n${COLOR_EMOJI} Role ${equip ? 'assigned' : 'removed'}: **${role.name}**`
    : '';

  await interaction.update({
    content: `${equip ? '✅ Color equipped!' : '✅ Color unequipped.'}${roleLine}`,
    components: [],
  });
}

// ---------------------------------------------------------------------------
// Sell colors
// ---------------------------------------------------------------------------

function refundFor(price: number, freeGrant: boolean): number {
  return freeGrant ? 0 : Math.floor(price * 0.5);
}

/**
 * The confirm button carries the chosen IDs in its custom ID (max 100 chars),
 * so cap how many colors can be picked in one sale to what is guaranteed to fit.
 */
function maxSellPerBatch(userId: string, colorIds: number[], count: number): number {
  const budget = 100 - `manage:sellconfirm:${userId}:`.length;
  const widest = Math.max(1, ...colorIds.map(id => id.toString().length));
  return Math.max(1, Math.min(count, 25, Math.floor((budget + 1) / (widest + 1))));
}

async function handleSellColorsOpen(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;
  const userColors = await getUserColors(userId);
  if (userColors.length === 0) {
    await interaction.reply({ content: '❌ You do not own any colors to sell.', flags: EPHEMERAL });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`manage:sellpick:${userId}`)
    .setPlaceholder('Select colors to sell (50% refund)')
    .setMinValues(1)
    .setMaxValues(maxSellPerBatch(userId, userColors.map(uc => uc.color_id), userColors.length));

  for (const uc of userColors.slice(0, 25)) {
    const refund = refundFor(uc.price, uc.free_grant);
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(uc.name)
        .setValue(uc.color_id.toString())
        .setDescription(`${uc.hex} — Sell for ${uc.free_grant ? 'Free (no refund)' : `${refund} residuals`}`),
    );
  }

  await interaction.reply({
    content: 'Select the colors you want to sell. You will receive 50% of the original value for each (free grants refund 0). If you own a lot, sell them in a few batches.',
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    flags: EPHEMERAL,
  });
}

async function handleSellColorsPick(interaction: StringSelectMenuInteraction): Promise<void> {
  const userId = interaction.user.id;
  const ids = interaction.values.map(v => parseInt(v, 10));
  const userColors = await getUserColors(userId);
  const selected = userColors.filter(uc => ids.includes(uc.color_id));
  if (selected.length === 0) {
    await interaction.update({ content: '❌ You no longer own those colors.', components: [] });
    return;
  }

  const refunds = selected.map(uc => ({ name: uc.name, refund: refundFor(uc.price, uc.free_grant) }));
  const total = refunds.reduce((sum, r) => sum + r.refund, 0);
  const list = refunds
    .map(r => `• **${r.name}** — ${r.refund > 0 ? `${r.refund} residuals` : 'Free (no refund)'}`)
    .join('\n');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      // the selected IDs ride in the custom ID, so no memory is needed
      .setCustomId(`manage:sellconfirm:${userId}:${selected.map(s => s.color_id).join(',')}`)
      .setLabel(`Confirm Sale (+${total} residuals)`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`manage:sellcancel:${userId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    content: `You are about to sell:\n${list}\n\n**Total refund: ${total} residuals**\n\nAre you sure?`,
    components: [row],
  });
}

async function handleSellColorsConfirm(interaction: ButtonInteraction, idList: string): Promise<void> {
  const ids = idList.split(',').map(v => parseInt(v, 10)).filter(n => Number.isFinite(n));
  const result = await sellColors(interaction.user.id, ids);
  if (!result.success) {
    await interaction.update({ content: `❌ ${result.reason}`, components: [] });
    return;
  }

  const member = await getMember(interaction);
  if (member) await reconcileShopRoles(member);

  await interaction.update({
    content:
      `✅ Successfully sold ${result.sold?.length ?? 0} color(s) for **${result.refundTotal} residuals**!` +
      `\n${COLOR_EMOJI} The matching roles were removed from your profile.`,
    components: [],
  });
}

// ---------------------------------------------------------------------------
// Sell persona (normal persona only; Unknown Entity is never sold here)
// ---------------------------------------------------------------------------

async function handleSellPersonaOpen(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;
  const persona = (await getUserArchetypes(userId)).find(p => !p.monthly);
  if (!persona) {
    await interaction.reply({ content: '❌ You do not own a persona to sell.', flags: EPHEMERAL });
    return;
  }

  const refund = refundFor(persona.price, persona.free_grant);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`manage:personaconfirm:${userId}`)
      .setLabel(`Confirm Sale (+${refund} residuals)`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`manage:sellcancel:${userId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content:
      `You are about to sell your persona: **${persona.name.toLowerCase()}**\n\n` +
      `**Refund: ${persona.free_grant ? 'Free (no refund)' : `${refund} residuals`}**\n\nAre you sure?`,
    components: [row],
    flags: EPHEMERAL,
  });
}

async function handleSellPersonaConfirm(interaction: ButtonInteraction): Promise<void> {
  const result = await sellArchetype(interaction.user.id);
  if (!result.success) {
    await interaction.update({ content: `❌ ${result.reason}`, components: [] });
    return;
  }

  const member = await getMember(interaction);
  if (member) await reconcileShopRoles(member);

  await interaction.update({
    content:
      `✅ Successfully sold **${result.name?.toLowerCase()}** for **${result.refund} residuals**!` +
      `\n${PERSONA_EMOJI} Role removed from your profile.`,
    components: [],
  });
}

// ---------------------------------------------------------------------------
// Router entry
// ---------------------------------------------------------------------------

export async function handleManageInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const parts = parseCustomId(interaction.customId);
  const action = parts[1];

  // The `.manage` message belongs to whoever ran it
  if (parts[2] !== interaction.user.id) {
    await interaction.reply({ content: '❌ This menu belongs to someone else. Run `.manage` yourself.', flags: EPHEMERAL });
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (action === 'selcolor') return handleSelectColor(interaction);
    if (action === 'sellpick') return handleSellColorsPick(interaction);
    return;
  }

  switch (action) {
    case 'equip':
      return handleEquip(interaction, parseInt(parts[3], 10), true);
    case 'unequip':
      return handleEquip(interaction, parseInt(parts[3], 10), false);
    case 'sellcolors':
      return handleSellColorsOpen(interaction);
    case 'sellconfirm':
      return handleSellColorsConfirm(interaction, parts[3] ?? '');
    case 'sellpersona':
      return handleSellPersonaOpen(interaction);
    case 'personaconfirm':
      return handleSellPersonaConfirm(interaction);
    case 'sellcancel':
      await interaction.update({ content: '❌ Sale cancelled.', components: [] });
      return;
  }
}

registerInteractionHandler('manage', handleManageInteraction);
