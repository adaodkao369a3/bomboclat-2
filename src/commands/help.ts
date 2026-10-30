import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJIS, GIF_COMMANDS, GIF_TIER_LEVELS, GIF_TIERS } from '../config/index.js';
import { PERSONA_TIER_SYMBOLS } from '../config/archetypes.js';
import { Command } from './index.js';
import { getAvailableCommands, getPersonaCommandGroups, type PersonaCommandGroup } from './registry.js';
import { registerInteractionHandler, parseCustomId, isInteractionExpired } from '../interactions/index.js';
import { setStandardFooter } from '../ui/index.js';
import { getUser } from '../database/client.js';
import { getUserArchetypes } from '../services/shop.js';

const HELP_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const PERSONAS_PER_HELP_PAGE = 4;

/** Number of persona pages (pure, used by tests) */
export function getPersonaPageCount(groups: PersonaCommandGroup[] = getPersonaCommandGroups()): number {
  return Math.max(1, Math.ceil(groups.length / PERSONAS_PER_HELP_PAGE));
}

/** Keep a page number inside 0..pageCount-1 (pure, used by tests) */
export function clampPersonaPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page)) return 0;
  return Math.min(Math.max(0, Math.floor(page)), pageCount - 1);
}

function buildMainRow(ownerId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('help:profile').setLabel('🪜 Profile').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('help:fun').setLabel('😊 Fun').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('help:leaderboard').setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('help:shop').setLabel('🛒 Shop').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`help:personas:${ownerId}:0`).setLabel('🎭 Personas').setStyle(ButtonStyle.Primary),
  );
}

function buildMainEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.STAR} Help Menu`)
    .setDescription('Select a category to view commands')
    .setColor(0x4900ff);
  setStandardFooter(embed);
  return embed;
}

/**
 * One page of the persona help (4 personas per page, low tier → high tier).
 * No backticks: names are underlined and commands are bold.
 */
export function buildPersonaPage(
  page: number,
  ownedKeys: string[],
  ownerId: string,
): { embed: EmbedBuilder; rows: ActionRowBuilder<ButtonBuilder>[] } {
  const groups = getPersonaCommandGroups();
  const pageCount = getPersonaPageCount(groups);
  const current = clampPersonaPage(page, pageCount);
  const slice = groups.slice(current * PERSONAS_PER_HELP_PAGE, (current + 1) * PERSONAS_PER_HELP_PAGE);

  const blocks = slice.map(group => {
    const symbol = PERSONA_TIER_SYMBOLS[group.tier] || '';
    const owned = ownedKeys.includes(group.key) ? ' ✅ owned' : '';
    const spots = group.maxHolders === null ? 'unlimited holders' : `${group.maxHolders} ${group.maxHolders === 1 ? 'spot' : 'spots'}`;
    const monthly = group.monthly ? ' • monthly' : '';
    const header = `__${group.name}__${owned}\n-# ${symbol} ${group.tier} • level ${group.minLevel} • ${spots}${monthly}`;
    const lines = group.commands.length > 0
      ? group.commands.map(c => `**.${c.name}** - ${c.description}`).join('\n')
      : '-# No commands';
    return `${header}\n${lines}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎭 Persona Commands (${current + 1}/${pageCount})`)
    .setDescription(
      `Each persona unlocks its own commands. Only owners can use them.\n\n${blocks.join('\n\n')}`
    )
    .setColor(0x4900ff);
  setStandardFooter(embed);

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`help:personas:${ownerId}:0`)
      .setLabel('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current === 0),
    new ButtonBuilder()
      .setCustomId(`help:personas:${ownerId}:${current - 1}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current === 0),
    new ButtonBuilder()
      .setCustomId(`help:pagelabel:${ownerId}`)
      .setLabel(`Page ${current + 1}/${pageCount}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`help:personas:${ownerId}:${current + 1}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current >= pageCount - 1),
    new ButtonBuilder()
      .setCustomId(`help:personas:${ownerId}:${pageCount - 1}`)
      .setLabel('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current >= pageCount - 1),
  );

  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`help:menu:${ownerId}`)
      .setLabel('Back to Help')
      .setStyle(ButtonStyle.Primary),
  );

  return { embed, rows: [navRow, backRow] };
}

// Register interaction handler for help namespace
registerInteractionHandler('help', async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = parseCustomId(interaction.customId);
  const category = parts[1];

  // Check if message expired
  if (isInteractionExpired(interaction, HELP_TIMEOUT)) {
    await interaction.reply({
      content: '⏱️ This menu expired. Run `.help` again.',
      ephemeral: true,
    });
    await interaction.message.edit({ components: [] }).catch(console.error);
    return;
  }

  // Persona pages and the back button belong to whoever ran .help
  if (category === 'personas' || category === 'menu') {
    const ownerId = parts[2];
    if (ownerId !== interaction.user.id) {
      await interaction.reply({ content: '❌ This menu belongs to someone else. Run `.help` yourself.', ephemeral: true });
      return;
    }

    if (category === 'menu') {
      await interaction.update({ embeds: [buildMainEmbed()], components: [buildMainRow(ownerId)] });
      return;
    }

    // Ownership comes from the database (persona key), not Discord role names
    const owned = await getUserArchetypes(interaction.user.id);
    const ownedKeys = owned.map(a => a.persona_key).filter((k): k is string => !!k);
    const page = parseInt(parts[3] ?? '0', 10);
    const { embed, rows } = buildPersonaPage(Number.isNaN(page) ? 0 : page, ownedKeys, ownerId);
    await interaction.update({ embeds: [embed], components: rows });
    return;
  }

  // Get this user's available commands (level + owned personas from the database)
  const userData = await getUser(interaction.user.id);
  const userLevel = userData?.current_level || 0;
  const owned = await getUserArchetypes(interaction.user.id);
  const ownedKeys = owned.map(a => a.persona_key).filter((k): k is string => !!k);
  const availableCommands = getAvailableCommands(userLevel, ownedKeys);

  // Build category embed
  let embed: EmbedBuilder;
  const row = buildMainRow(interaction.user.id);

  if (category === 'profile') {
    const profileCommands = availableCommands.filter(cmd =>
      ['profile', 'level', 'res'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.LADDER} Profile & Progression`)
      .setDescription('Track your server progress and stats')
      .setColor(0x4900ff)
      .addFields(
        profileCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else if (category === 'fun') {
    const funCommands = availableCommands.filter(cmd => cmd.name in GIF_COMMANDS);
    // Tiers the user hasn't unlocked yet, shown as a teaser
    const lockedTiers = GIF_TIERS
      .map((cmds, i) => ({ level: GIF_TIER_LEVELS[i], cmds }))
      .filter(t => t.level > userLevel)
      .map(t => `**Level ${t.level}:** ${t.cmds.map(c => `\`.${c}\``).join(' ')}`);
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.GLOSSY_STAR} Fun Commands`)
      .setDescription('Express yourself with reactions')
      .setColor(0x4900ff)
      .addFields(
        funCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: true,
        }))
      );
    if (lockedTiers.length > 0) {
      embed.addFields({ name: '🔒 Locked', value: lockedTiers.join('\n'), inline: false });
    }
  } else if (category === 'leaderboard') {
    const lbCommands = availableCommands.filter(cmd =>
      ['leaderboard', 'reslb'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.STARICON} Leaderboards`)
      .setDescription('See how you rank against others')
      .setColor(0x4900ff)
      .addFields(
        lbCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else if (category === 'shop') {
    const shopCommands = availableCommands.filter(cmd =>
      ['manage', 'c'].includes(cmd.name)
    );
    embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SHOPPING_CART} Shop & Economy`)
      .setDescription('Manage your shop items and roles')
      .setColor(0x4900ff)
      .addFields(
        shopCommands.map(cmd => ({
          name: `.${cmd.name}`,
          value: cmd.description,
          inline: false,
        }))
      );
  } else {
    // Default: show the main menu
    embed = buildMainEmbed();
  }

  setStandardFooter(embed);

  await interaction.update({ embeds: [embed], components: [row] });
});

export const helpCommand: Command = {
  name: 'help',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    await message.reply({
      embeds: [buildMainEmbed()],
      components: [buildMainRow(message.author.id)],
    });
  },
};
