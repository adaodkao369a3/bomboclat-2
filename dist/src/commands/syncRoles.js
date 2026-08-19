"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRolesCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const xp_js_1 = require("../services/xp.js");
const permissions_js_1 = require("../utils/permissions.js");
exports.syncRolesCommand = {
    name: 'syncroles',
    async execute(message, _args, prefix) {
        // Only respond to admin prefix
        if (prefix !== index_js_1.ADMIN_PREFIX)
            return;
        // Check admin permissions
        if (!message.member || !(0, permissions_js_1.isAdmin)(message.member)) {
            await message.reply('❌ This command is restricted to admins.');
            return;
        }
        if (!message.guild) {
            await message.reply('❌ This command can only be used in a server.');
            return;
        }
        await message.reply('🔄 Starting role synchronization...');
        let checkedCount = 0;
        let changedCount = 0;
        let alreadyCorrectCount = 0;
        let errorCount = 0;
        for (const member of message.guild.members.cache.values()) {
            if (!member.user || member.user.bot)
                continue;
            checkedCount++;
            try {
                const userData = await (0, client_js_1.getUser)(member.user.id);
                if (!userData)
                    continue;
                const expectedLevel = (0, xp_js_1.calculateLevelFromXP)(userData.current_xp);
                const expectedRole = (0, xp_js_1.getRoleFromLevel)(expectedLevel);
                const currentRole = userData.current_progression_role;
                const syncResult = await (0, xp_js_1.synchronizeProgressionRoles)(member, expectedLevel);
                if (!syncResult.success)
                    throw new Error('Failed to synchronize progression roles');
                if (userData.current_level !== expectedLevel) {
                    await (0, client_js_1.setUserLevel)(member.user.id, expectedLevel);
                }
                if (currentRole !== expectedRole) {
                    await (0, client_js_1.setUserProgressionRole)(member.user.id, expectedRole);
                }
                await (0, client_js_1.updatePromotionEligibility)(member.user.id, (0, xp_js_1.calculatePromotionEligibility)(userData.current_xp, expectedLevel, expectedRole));
                const changed = syncResult.addedRoles.length > 0 ||
                    syncResult.removedRoles.length > 0 ||
                    userData.current_level !== expectedLevel ||
                    currentRole !== expectedRole;
                if (changed) {
                    changedCount++;
                }
                else {
                    alreadyCorrectCount++;
                }
            }
            catch (error) {
                console.error(`Error synchronizing roles for ${member.user.id}:`, error);
                errorCount++;
            }
        }
        const summaryEmbed = new discord_js_1.EmbedBuilder()
            .setTitle('✅ Role Synchronization Complete')
            .setColor(0x7B61FF)
            .addFields([
            { name: 'Members Checked', value: checkedCount.toString(), inline: true },
            { name: 'Members Changed', value: changedCount.toString(), inline: true },
            { name: 'Already Correct', value: alreadyCorrectCount.toString(), inline: true },
            { name: 'Errors', value: errorCount.toString(), inline: true },
        ])
            .setFooter({ text: 'MI BOM3O Studios' });
        await message.reply({ embeds: [summaryEmbed] });
    },
};
//# sourceMappingURL=syncRoles.js.map