"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
exports.leaderboardCommand = {
    name: 'leaderboard',
    async execute(message, _args, prefix) {
        // Only respond to user prefix
        if (prefix !== index_js_1.PREFIX)
            return;
        // Get leaderboard (max 5)
        const leaderboard = await (0, client_js_1.getLeaderboard)(5);
        if (!leaderboard || leaderboard.length === 0) {
            await message.reply('❌ No leaderboard data available.');
            return;
        }
        // Create embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🏆 TOP CAST')
            .setDescription('The most active members of MI BOMBO Studios')
            .setColor(0xFFD700)
            .setFooter({ text: 'MI BOM3O Studios' });
        // Add leaderboard entries
        leaderboard.forEach((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            embed.addFields({
                name: `${medal} ${entry.username}`,
                value: `Level ${entry.current_level} • ${entry.current_xp.toLocaleString()} XP`,
                inline: false,
            });
        });
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=leaderboard.js.map