import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getResidualsLeaderboard } from '../database/client.js';
import { isMemberInGuild } from '../services/memberCache.js';
import { Command } from './index.js';

const ENTRIES_PER_PAGE = 10;
const MAX_PAGES = 5; // Top 50 total

interface PaginationState {
  page: number;
  totalPages: number;
  userId: string;
  guildId: string;
  timestamp: number;
}

const paginationStates = new Map<string, PaginationState>();

export const residualsLeaderboardCommand: Command = {
  name: 'reslb',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    const userId = message.author.id;
    const guildId = message.guild.id;

    // Fetch all leaderboard entries
    const { entries: allEntries } = await getResidualsLeaderboard(1000, 0); // Fetch up to 1000

    // Filter to only members currently in the guild (use cache if available)
    const guildEntries = allEntries.filter(entry => {
      const inGuild = isMemberInGuild(guildId, entry.user_id);
      // If cache is stale/null, assume they're in guild (fallback)
      return inGuild !== false;
    });

    const filteredTotal = guildEntries.length;
    const totalPages = Math.min(Math.ceil(filteredTotal / ENTRIES_PER_PAGE), MAX_PAGES);
    const page = 1;

    // Store pagination state
    paginationStates.set(userId, { page, totalPages, userId, guildId, timestamp: Date.now() });

    const entries = guildEntries.slice(0, ENTRIES_PER_PAGE);
    const embed = createLeaderboardEmbed(entries, page, totalPages, filteredTotal);
    const row = createPaginationButtons(userId, page, totalPages);

    const msg = await message.reply({ embeds: [embed], components: [row] });

    // Wait for button interaction
    try {
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes
      });

      collector.on('collect', async (interaction) => {
        // Verify ownership using customId
        const parts = interaction.customId.split(':');
        const buttonUserId = parts[1];

        if (buttonUserId !== interaction.user.id) {
          await interaction.reply({ content: '❌ You cannot use this pagination.', flags: [1 << 6] });
          return;
        }

        await interaction.deferUpdate();

        const currentState = paginationStates.get(userId);
        if (!currentState) return;

        let newPage = currentState.page;
        if (interaction.customId === 'reslb_prev' && currentState.page > 1) {
          newPage = currentState.page - 1;
        } else if (interaction.customId === 'reslb_next' && currentState.page < currentState.totalPages) {
          newPage = currentState.page + 1;
        } else if (interaction.customId === 'reslb_first') {
          newPage = 1;
        } else if (interaction.customId === 'reslb_last') {
          newPage = currentState.totalPages;
        }

        if (newPage !== currentState.page) {
          const startIdx = (newPage - 1) * ENTRIES_PER_PAGE;
          const endIdx = startIdx + ENTRIES_PER_PAGE;
          const newEntries = guildEntries.slice(startIdx, endIdx);

          paginationStates.set(userId, { ...currentState, page: newPage, timestamp: Date.now() });

          const newEmbed = createLeaderboardEmbed(newEntries, newPage, currentState.totalPages, filteredTotal);
          const newRow = createPaginationButtons(userId, newPage, currentState.totalPages);

          await msg.edit({ embeds: [newEmbed], components: [newRow] });
        }
      });

      collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
        paginationStates.delete(userId);
      });
    } catch (error) {
      console.error('Error in pagination collector:', error);
    }
  },
};

function createLeaderboardEmbed(
  entries: Array<{ user_id: string; username: string; total_residuals_balance: number; lifetime_residuals_earned: number }>,
  page: number,
  totalPages: number,
  total: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('<a:cash:1545126549035024524> RESIDUALS LEADERBOARD')
    .setDescription('The wealthiest members of Mi Bombo Studios')
    .setColor(0xFFD700)
    .setFooter({ text: `Page ${page}/${totalPages} • ${total} members with residuals` });

  if (entries.length === 0) {
    embed.setDescription('No members have residuals yet.');
    return embed;
  }

  // Build description with entries (no embed fields, no backticks)
  let description = '';
  entries.forEach((entry, index) => {
    const rank = (page - 1) * ENTRIES_PER_PAGE + index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    description += `${medal} __${entry.username}__\n-# ${entry.total_residuals_balance.toLocaleString()} residuals • Lifetime: ${entry.lifetime_residuals_earned.toLocaleString()}\n`;
  });

  embed.setDescription(description);
  return embed;
}

function createPaginationButtons(userId: string, page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const isFirst = page === 1;
  const isLast = page === totalPages;

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`reslb_first:${userId}`)
      .setLabel('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId(`reslb_prev:${userId}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId(`reslb_page:${userId}`)
      .setLabel(`Page ${page}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`reslb_next:${userId}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLast),
    new ButtonBuilder()
      .setCustomId(`reslb_last:${userId}`)
      .setLabel('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLast)
  );

  return row;
}
