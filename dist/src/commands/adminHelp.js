"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminHelpCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const permissions_js_1 = require("../utils/permissions.js");
exports.adminHelpCommand = {
    name: 'help',
    async execute(message, _args, prefix) {
        // Only respond to admin prefix
        if (prefix !== index_js_1.ADMIN_PREFIX)
            return;
        // Check admin permissions
        if (!(0, permissions_js_1.isAdmin)(message.member)) {
            await message.reply('❌ This command is restricted to admins.');
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🔧 Admin Commands')
            .setDescription('Commands available to admins (Executive Producer & Director)')
            .setColor(0xFF0000)
            .setFooter({ text: `Admin Prefix: ${index_js_1.ADMIN_PREFIX} | User Prefix: ${index_js_1.PREFIX}` });
        // Admin commands
        embed.addFields([
            { name: 'Bombo Times', value: '`$clip [style] [director\'s note]` - Generate AI summary and artwork', inline: false },
            { name: 'XP Management', value: '`$xp @user` - Manage user XP and progression', inline: false },
            { name: 'Residuals Management', value: '`$residuals @user` - Manage user Residuals (Admin/Staff)', inline: false },
            { name: 'Role Synchronization', value: '`$syncroles` - Synchronize all progression roles', inline: false },
            { name: 'Owner Commands', value: '`$rules` - Display Director\'s rules (Director only)', inline: false },
        ]);
        // Public commands reference
        embed.addFields([
            { name: 'Public Commands', value: '`help`, `profile`, `level`, `res`, `leaderboard`, GIF commands, `c <query>`', inline: false },
        ]);
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=adminHelp.js.map