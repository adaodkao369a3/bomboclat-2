"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levelCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const residuals_js_1 = require("../services/residuals.js");
const xp_js_1 = require("../services/xp.js");
const cooldowns_js_1 = require("../utils/cooldowns.js");
exports.levelCommand = {
    name: 'level',
    async execute(message, args, prefix) {
        // Only respond to user prefix
        if (prefix !== index_js_1.PREFIX)
            return;
        // Cooldown check
        const remaining = (0, cooldowns_js_1.getRemaining)(message.author.id);
        if (remaining > 0) {
            await message.reply(`⏱️ Please wait ${remaining} seconds before using .level again.`);
            return;
        }
        (0, cooldowns_js_1.setCooldown)(message.author.id, 10);
        // Get target user
        let target;
        if (args.length > 0 && message.mentions.members?.first()) {
            target = message.mentions.members.first();
        }
        else {
            target = message.member;
        }
        // Get user data
        const userData = await (0, client_js_1.getUser)(target.user.id);
        if (!userData) {
            await message.reply('❌ User not found in database.');
            return;
        }
        // Calculate XP progress using centralized functions
        const currentXP = userData.current_xp;
        const currentLevel = userData.current_level;
        const nextLevelXP = (0, xp_js_1.calculateXPForLevel)(currentLevel + 1);
        const xpRemaining = (0, xp_js_1.calculateXPRemaining)(currentXP, currentLevel);
        const xpProgress = (0, xp_js_1.calculateProgressPercentage)(currentXP, currentLevel);
        // Get residuals
        const residualData = await (0, residuals_js_1.getResidualsInfo)(target.user.id);
        const residualsBalance = residualData?.balance || 0;
        // Create progress bar
        const progressBars = Math.floor(xpProgress / 10);
        const progressBar = '█'.repeat(progressBars) + '░'.repeat(10 - progressBars);
        // Format role name
        const roleDisplay = userData.current_progression_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Create embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('📊 LEVEL PROGRESS')
            .setDescription(`**${target.displayName}**\n\`${roleDisplay}\``)
            .setColor(0x7B61FF)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields([
            { name: 'Current Level', value: currentLevel.toString(), inline: true },
            { name: 'Current XP', value: `\`${currentXP.toLocaleString()}\``, inline: true },
            { name: 'XP Required for Next Level', value: `\`${nextLevelXP.toLocaleString()}\``, inline: true },
            { name: 'XP Remaining', value: `\`${xpRemaining.toLocaleString()}\``, inline: true },
            { name: 'XP Progress', value: `\`${progressBar} ${Math.floor(xpProgress)}%\``, inline: false },
            { name: '◈ Residuals', value: `\`${residualsBalance.toLocaleString()}\``, inline: true },
        ])
            .setFooter({ text: 'MI BOM3O Studios' });
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=level.js.map