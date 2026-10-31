import { EmbedBuilder } from 'discord.js';
import { getResidualsLeaderboard } from '../database/client.js';
import { isMemberInGuild } from '../services/memberCache.js';
import { EMOJIS } from '../config/index.js';
import { LB_ENTRIES_PER_PAGE, rankMarker, sendPagedLeaderboard } from '../ui/leaderboardPager.js';
import { Command } from './index.js';

type ResidualsEntry = {
  user_id: string;
  username: string;
  total_residuals_balance: number;
  lifetime_residuals_earned: number;
};

export const residualsLeaderboardCommand: Command = {
  name: 'reslb',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    if (!message.guild) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command can only be used in a server.`);
      return;
    }

    const guildId = message.guild.id;

    const { entries: allEntries } = await getResidualsLeaderboard(1000, 0); // up to 1000

    // Only members currently in the guild (if the cache is stale, assume they're still here)
    const guildEntries = allEntries.filter(entry => isMemberInGuild(guildId, entry.user_id) !== false);

    const myIndex = guildEntries.findIndex(entry => entry.user_id === message.author.id);
    const myRank = myIndex === -1 ? null : myIndex + 1;

    await sendPagedLeaderboard(message, guildEntries, (entries, page, totalPages, total) =>
      createLeaderboardEmbed(entries, page, totalPages, total, myRank)
    );
  },
};

function createLeaderboardEmbed(
  entries: ResidualsEntry[],
  page: number,
  totalPages: number,
  total: number,
  myRank: number | null,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.CASH} RESIDUALS LEADERBOARD`)
    .setColor(0xFFD700)
    // footers can't show custom emojis, so this one uses the normal one
    .setFooter({ text: `Page ${page}/${totalPages} • 💵 ${total} members` });

  if (entries.length === 0) {
    embed.setDescription('No members have any yet.');
    return embed;
  }

  const rows = entries.map((entry, index) => {
    const rank = (page - 1) * LB_ENTRIES_PER_PAGE + index + 1;
    return `${rankMarker(rank)} __${entry.username}__\n-# ${EMOJIS.MONEY} ${entry.total_residuals_balance.toLocaleString()} • Lifetime ${entry.lifetime_residuals_earned.toLocaleString()}`;
  });

  let description = `The wealthiest members of Mi Bombo Studios\n\n${rows.join('\n\n')}`;
  if (myRank !== null) {
    description += `\n\n-# Your rank: #${myRank}`;
  }

  embed.setDescription(description);
  return embed;
}
