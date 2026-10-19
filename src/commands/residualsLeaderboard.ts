import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getResidualsLeaderboard } from '../database/client.js';
import { Command } from './index.js';

const ENTRIES_PER_PAGE = 10;

interface PaginationState {
  page: number;
  totalPages: number;
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

    // Fetch all guild members to filter leaderboard
    let guildMembers;
    try {
      guildMembers = await message.guild.members.fetch();
    } catch (error: any) {
      if (error.code === 130000) { // Rate limit error
        await message.reply('⏳ The bot is being rate limited. Please try again in a few seconds.');
        return;
      }
      console.error('Error fetching guild members:', error);
      await message.reply('❌ Failed to fetch guild members. Please try again later.');
      return;
    }

    const guildMemberIds = new Set(guildMembers.map(m => m.user.id));

    // Fetch all leaderboard entries (no pagination yet)
    const { entries: allEntries } = await getResidualsLeaderboard(1000, 0); // Fetch up to 1000

    // Filter to only members currently in the guild
    const guildEntries = allEntries.filter(entry => guildMemberIds.has(entry.user_id));
    const filteredTotal = guildEntries.length;

    // Initial page load
    const page = 1;
    const totalPages = Math.ceil(filteredTotal / ENTRIES_PER_PAGE);

    paginationStates.set(userId, { page, totalPages });

    const entries = guildEntries.slice(0, ENTRIES_PER_PAGE);
    const embed = createLeaderboardEmbed(entries, page, totalPages, filteredTotal);
    const row = createPaginationButtons(page, totalPages);

    const msg = await message.reply({ embeds: [embed], components: [row] });

    // Wait for button interaction
    try {
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000, // 1 minute timeout
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== userId) {
          await interaction.reply({ content: '❌ You cannot use this pagination.', flags: [1 << 6] });
          return;
        }

        await interaction.deferUpdate();

        const currentState = paginationStates.get(userId);
        if (!currentState) return;

        let newPage = currentState.page;
        if (interaction.customId === 'prev' && currentState.page > 1) {
          newPage = currentState.page - 1;
        } else if (interaction.customId === 'next' && currentState.page < currentState.totalPages) {
          newPage = currentState.page + 1;
        } else if (interaction.customId === 'first') {
          newPage = 1;
        } else if (interaction.customId === 'last') {
          newPage = currentState.totalPages;
        }

        if (newPage !== currentState.page) {
          const startIdx = (newPage - 1) * ENTRIES_PER_PAGE;
          const endIdx = startIdx + ENTRIES_PER_PAGE;
          const newEntries = guildEntries.slice(startIdx, endIdx);

          paginationStates.set(userId, { page: newPage, totalPages: currentState.totalPages });

          const newEmbed = createLeaderboardEmbed(newEntries, newPage, currentState.totalPages, filteredTotal);
          const newRow = createPaginationButtons(newPage, currentState.totalPages);

          await msg.edit({ embeds: [newEmbed], components: [newRow] });
        } else {
          await msg.edit({ components: [row] }); // Reset button states
        }
      });

      collector.on('end', () => {
        // Remove buttons when collector ends
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
    .setDescription(`The wealthiest members of Bombo Studios`)
    .setColor(0xFFD700)
    .setFooter({ text: `Page ${page}/${totalPages} • ${total} members with residuals` });

  if (entries.length === 0) {
    embed.setDescription('No members have residuals yet.');
    return embed;
  }

  entries.forEach((entry, index) => {
    const rank = (page - 1) * ENTRIES_PER_PAGE + index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    embed.addFields({
      name: `${medal} ${entry.username}`,
      value: `💰 ${entry.total_residuals_balance.toLocaleString()} residuals\n📊 Lifetime earned: ${entry.lifetime_residuals_earned.toLocaleString()}`,
      inline: false,
    });
  });

  return embed;
}

function createPaginationButtons(page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const isFirst = page === 1;
  const isLast = page === totalPages;

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('first')
      .setLabel('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLast),
    new ButtonBuilder()
      .setCustomId('last')
      .setLabel('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLast)
  );

  return row;
}
