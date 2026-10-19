import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getLeaderboard } from '../database/client.js';
import { isMemberInGuild } from '../services/memberCache.js';
import { Command } from './index.js';

const ENTRIES_PER_PAGE = 10;
const MAX_PAGES = 5; // Top 50 total

// Pagination state stored in-memory for simplicity
// In production, could be stored in database for full restart-proofness
const paginationStates = new Map<string, { page: number; userId: string; guildId: string; timestamp: number }>();

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    const userId = message.author.id;
    const guildId = message.guild.id;

    // Fetch leaderboard entries (fetch more than needed to account for filtering)
    const allEntries = await getLeaderboard(100);

    if (!allEntries || allEntries.length === 0) {
      await message.reply('❌ No leaderboard data available.');
      return;
    }

    // Filter to only members currently in the guild (use cache if available)
    const guildEntries = allEntries.filter(entry => {
      const inGuild = isMemberInGuild(guildId, entry.user_id);
      // If cache is stale/null, assume they're in guild (fallback)
      return inGuild !== false;
    });

    const totalPages = Math.min(Math.ceil(guildEntries.length / ENTRIES_PER_PAGE), MAX_PAGES);
    const page = 1;

    // Store pagination state
    paginationStates.set(userId, { page, userId, guildId, timestamp: Date.now() });

    const entries = guildEntries.slice(0, ENTRIES_PER_PAGE);
    const embed = createLeaderboardEmbed(entries, page, totalPages, guildEntries.length);
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
        if (interaction.customId === 'lb_prev' && currentState.page > 1) {
          newPage = currentState.page - 1;
        } else if (interaction.customId === 'lb_next' && currentState.page < totalPages) {
          newPage = currentState.page + 1;
        } else if (interaction.customId === 'lb_first') {
          newPage = 1;
        } else if (interaction.customId === 'lb_last') {
          newPage = totalPages;
        }

        if (newPage !== currentState.page) {
          const startIdx = (newPage - 1) * ENTRIES_PER_PAGE;
          const endIdx = startIdx + ENTRIES_PER_PAGE;
          const newEntries = guildEntries.slice(startIdx, endIdx);

          paginationStates.set(userId, { ...currentState, page: newPage, timestamp: Date.now() });

          const newEmbed = createLeaderboardEmbed(newEntries, newPage, totalPages, guildEntries.length);
          const newRow = createPaginationButtons(userId, newPage, totalPages);

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
  entries: Array<{ user_id: string; username: string; current_xp: number; current_level: number }>,
  page: number,
  _totalPages: number,
  _total: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('<:ladder:1545126567145906246> TOP CAST')
    .setDescription('The most active members of Bombo')
    .setColor(0x4900ff)
    .setFooter({ text: 'Bombo Studios' });

  if (entries.length === 0) {
    embed.setDescription('No members have XP yet.');
    return embed;
  }

  // Build description with entries (no embed fields, no backticks)
  let description = '';
  entries.forEach((entry, index) => {
    const rank = (page - 1) * ENTRIES_PER_PAGE + index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    description += `${medal} __${entry.username}__\n-# Level ${entry.current_level} • ${entry.current_xp.toLocaleString()} XP\n\n`;
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
      .setCustomId(`lb:first:${userId}`)
      .setLabel('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId(`lb:prev:${userId}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId(`lb:page:${userId}`)
      .setLabel(`Page ${page}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`lb:next:${userId}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLast),
    new ButtonBuilder()
      .setCustomId(`lb:last:${userId}`)
      .setLabel('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLast)
  );

  return row;
}
