"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const residuals_js_1 = require("../services/residuals.js");
const cooldowns_js_1 = require("../utils/cooldowns.js");
exports.resCommand = {
    name: 'res',
    async execute(message, args, prefix) {
        // Only respond to user prefix
        if (prefix !== index_js_1.PREFIX)
            return;
        // Cooldown check
        const remaining = (0, cooldowns_js_1.getRemaining)(message.author.id);
        if (remaining > 0) {
            await message.reply(`⏱️ Please wait ${remaining} seconds before using .res again.`);
            return;
        }
        (0, cooldowns_js_1.setCooldown)(message.author.id, 15);
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
        // Get residuals
        const residualData = await (0, residuals_js_1.getResidualsInfo)(target.user.id);
        if (!residualData) {
            await message.reply('❌ Residuals data not found.');
            return;
        }
        // Create embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('💰 RESIDUALS')
            .setDescription(`**${target.displayName}**`)
            .setColor(0xFFD700)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields([
            { name: 'Current Balance', value: `\`${residualData.balance.toLocaleString()}\``, inline: true },
            { name: 'Lifetime Earned', value: `\`${residualData.lifetime_earned.toLocaleString()}\``, inline: true },
            { name: 'Lifetime Spent', value: `\`${residualData.lifetime_spent.toLocaleString()}\``, inline: true },
        ])
            .setFooter({ text: 'MI BOM3O Studios' });
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=res.js.map