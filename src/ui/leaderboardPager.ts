import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message } from 'discord.js';
import { EMOJIS } from '../config/index.js';
import { registerInteractionHandler } from '../interactions/index.js';

export const LB_ENTRIES_PER_PAGE = 10;
export const LB_MAX_PAGES = 5; // top 50

// The collector in sendPagedLeaderboard handles these buttons. Registering a no-op
// keeps the global router from logging "No handler registered" on every click.
registerInteractionHandler('lb', async () => {});

/** Medal for the top 3, bold number for everyone else */
export function rankMarker(rank: number): string {
  if (rank === 1) return EMOJIS.MEDAL_GOLD;
  if (rank === 2) return EMOJIS.MEDAL_SILVER;
  if (rank === 3) return EMOJIS.MEDAL_BRONZE;
  return `**${rank}.**`;
}

function buildButtons(ownerId: string, page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const id = (action: string) => `lb:${action}:${ownerId}`;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(id('first')).setEmoji(EMOJIS.FIRST_PAGE).setStyle(ButtonStyle.Secondary).setDisabled(isFirst),
    new ButtonBuilder().setCustomId(id('prev')).setEmoji(EMOJIS.LEFT_ARROW).setStyle(ButtonStyle.Primary).setDisabled(isFirst),
    new ButtonBuilder().setCustomId(id('page')).setLabel(`Page ${page}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(id('next')).setEmoji(EMOJIS.RIGHT_ARROW).setStyle(ButtonStyle.Primary).setDisabled(isLast),
    new ButtonBuilder().setCustomId(id('last')).setEmoji(EMOJIS.LAST_PAGE).setStyle(ButtonStyle.Secondary).setDisabled(isLast),
  );
}

/**
 * Reply with page 1 of a leaderboard and let the person who ran the command
 * flip through the pages for 5 minutes.
 */
export async function sendPagedLeaderboard<T>(
  message: Message,
  entries: T[],
  buildEmbed: (pageEntries: T[], page: number, totalPages: number, total: number) => EmbedBuilder,
): Promise<void> {
  const shown = entries.slice(0, LB_ENTRIES_PER_PAGE * LB_MAX_PAGES);
  const totalPages = Math.max(1, Math.ceil(shown.length / LB_ENTRIES_PER_PAGE));
  const ownerId = message.author.id;

  const render = (page: number) => ({
    embeds: [buildEmbed(shown.slice((page - 1) * LB_ENTRIES_PER_PAGE, page * LB_ENTRIES_PER_PAGE), page, totalPages, shown.length)],
    components: totalPages > 1 ? [buildButtons(ownerId, page, totalPages)] : [],
  });

  let page = 1;
  const sent = await message.reply(render(page));
  if (totalPages === 1) return;

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  collector.on('collect', async (interaction) => {
    const [namespace, action, buttonOwnerId] = interaction.customId.split(':');
    if (namespace !== 'lb') return;

    if (buttonOwnerId !== interaction.user.id) {
      await interaction.reply({
        content: `${EMOJIS.GLOSSY_RED_CANCEL} This leaderboard belongs to someone else. Run the command yourself to flip through it.`,
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    if (action === 'first') page = 1;
    else if (action === 'prev') page = Math.max(1, page - 1);
    else if (action === 'next') page = Math.min(totalPages, page + 1);
    else if (action === 'last') page = totalPages;

    await interaction.update(render(page)).catch(error => console.error('Leaderboard page update failed:', error));
  });

  collector.on('end', () => {
    sent.edit({ components: [] }).catch(() => {});
  });
}
