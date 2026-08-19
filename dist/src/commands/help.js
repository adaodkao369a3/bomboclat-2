"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
exports.helpCommand = {
    name: 'help',
    async execute(message, _args, prefix) {
        // Only respond to user prefix
        if (prefix !== index_js_1.PREFIX)
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🎬 Bomboclat Commands')
            .setDescription('Use these commands in chat.')
            .setColor(0x9b5de5)
            .setFooter({ text: `Prefix: ${index_js_1.PREFIX}` });
        // Public commands
        embed.addFields([
            { name: 'Profile & Progression', value: '`profile`, `level`, `res`, `leaderboard`', inline: true },
            { name: 'GIF Commands', value: '`rizz`, `larp`, `blush`, `cooked`, `fumble`, `cope`, `grass`, `aura`, `huh`, `cry`', inline: true },
            { name: 'Custom GIF', value: '`c <query>` (Supporting Cast+)', inline: true },
        ]);
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=help.js.map