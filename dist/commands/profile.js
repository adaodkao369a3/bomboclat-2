"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const residuals_js_1 = require("../services/residuals.js");
const xp_js_1 = require("../services/xp.js");
const cooldowns_js_1 = require("../utils/cooldowns.js");
exports.profileCommand = {
    name: 'profile',
    async execute(message, args, prefix) {
        // Only respond to user prefix
        if (prefix !== index_js_1.PREFIX)
            return;
        // Cooldown check
        const remaining = (0, cooldowns_js_1.getRemaining)(message.author.id);
        if (remaining > 0) {
            await message.reply(`⏱️ Please wait ${remaining} seconds before using .profile again.`);
            return;
        }
        (0, cooldowns_js_1.setCooldown)(message.author.id, 15);
        // Get target user
        let target;
        if (args.length > 0 && message.mentions.members?.first()) {
            target = message.mentions.members.first();
        }
        else if (message.member) {
            target = message.member;
        }
        else {
            await message.reply('❌ Unable to determine target user.');
            return;
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
        const xpRemaining = (0, xp_js_1.calculateXPRemaining)(currentXP, currentLevel);
        const xpProgress = (0, xp_js_1.calculateProgressPercentage)(currentXP, currentLevel);
        const currentRole = userData.current_progression_role;
        const nextRoleThreshold = (0, xp_js_1.getNextProgressionThreshold)(currentRole);
        // Get residuals
        const residualData = await (0, residuals_js_1.getResidualsInfo)(target.user.id);
        const residualsBalance = residualData?.balance || 0;
        // Create progress bar
        const progressBars = Math.floor(xpProgress / 10);
        const progressBar = '█'.repeat(progressBars) + '░'.repeat(10 - progressBars);
        // Format role name
        const roleDisplay = currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Build embed fields
        const fields = [
            { name: 'Level', value: currentLevel.toString(), inline: true },
            { name: 'Current XP', value: `\`${currentXP.toLocaleString()}\``, inline: true },
            { name: 'XP Progress', value: `\`${progressBar} ${Math.floor(xpProgress)}%\`\n\`${xpRemaining.toLocaleString()} XP to Level ${currentLevel + 1}\``, inline: false },
            { name: '◈ Residuals', value: `\`${residualsBalance.toLocaleString()}\``, inline: true },
        ];
        // Add promotion eligibility if not at max role
        if (nextRoleThreshold > 0) {
            const eligibility = userData.promotion_eligibility_percentage || 0;
            fields.push({ name: 'Promotion Eligibility', value: `\`${Math.floor(eligibility)}%\` (Level ${nextRoleThreshold})`, inline: true });
        }
        // Create embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🎬 STUDIO PROFILE')
            .setDescription(`**${target.displayName}**\n\`${roleDisplay}\``)
            .setColor(0x7B61FF)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(fields)
            .setFooter({ text: 'MI BOM3O Studios' });
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=profile.js.map