import { EmbedBuilder } from 'discord.js';
import { getLeaderboard } from '../database/client.js';
import { isMemberInGuild } from '../services/memberCache.js';
import { EMOJIS } from '../config/index.js';
import { LB_ENTRIES_PER_PAGE, rankMarker, sendPagedLeaderboard } from '../ui/leaderboardPager.js';
import { Command } from './index.js';

type XPEntry = { user_id: string; username: string; current_xp: number; current_level: number };

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    if (!message.guild) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command can only be used in a server.`);
      return;
    }

    const guildId = message.guild.id;

    // Fetch more than needed to account for people who left the server
    const allEntries = await getLeaderboard(100);
    if (!allEntries || allEntries.length === 0) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} No leaderboard data available.`);
      return;
    }

    // Only members currently in the guild (if the cache is stale, assume they're still here)
    const guildEntries = allEntries.filter(entry => isMemberInGuild(guildId, entry.user_id) !== false);

    // Where does the person asking rank?
    const myIndex = guildEntries.findIndex(entry => entry.user_id === message.author.id);
    const myRank = myIndex === -1 ? null : myIndex + 1;

    await sendPagedLeaderboard(message, guildEntries, (entries, page, totalPages) =>
      createLeaderboardEmbed(entries, page, totalPages, myRank)
    );
  },
};

function createLeaderboardEmbed(entries: XPEntry[], page: number, totalPages: number, myRank: number | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.LADDER} TOP CAST`)
    .setColor(0x4900ff)
    .setFooter({ text: `Page ${page}/${totalPages} • Mi Bombo Studios` });

  if (entries.length === 0) {
    embed.setDescription('No members have XP yet.');
    return embed;
  }

  const rows = entries.map((entry, index) => {
    const rank = (page - 1) * LB_ENTRIES_PER_PAGE + index + 1;
    return `${rankMarker(rank)} __${entry.username}__\n-# ${EMOJIS.STARICON} Level ${entry.current_level} • ${entry.current_xp.toLocaleString()} XP`;
  });

  let description = `The most active members of Mi Bombo\n\n${rows.join('\n\n')}`;
  if (myRank !== null) {
    description += `\n\n-# Your rank: #${myRank}`;
  }

  embed.setDescription(description);
  return embed;
}
