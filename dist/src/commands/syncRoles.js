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
        if (!(0, permissions_js_1.isAdmin)(message.member)) {
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
        const roleKeys = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
        for (const member of message.guild.members.cache.values()) {
            if (member.user.bot)
                continue;
            checkedCount++;
            try {
                const userData = await (0, client_js_1.getUser)(member.user.id);
                if (!userData)
                    continue;
                const currentLevel = userData.current_level;
                const expectedRole = (0, xp_js_1.getRoleFromLevel)(currentLevel);
                const currentRole = userData.current_progression_role;
                // Get current Discord progression roles
                const currentDiscordRoles = new Set();
                for (const [roleName, roleId] of Object.entries(index_js_1.ROLES)) {
                    if ((0, permissions_js_1.isProgressionRole)(roleId) && member.roles.cache.has(roleId)) {
                        currentDiscordRoles.add(roleName.toLowerCase());
                    }
                }
                // Get expected stacked roles
                const expectedIndex = roleKeys.indexOf(expectedRole);
                const expectedStackedRoles = new Set(roleKeys.slice(0, expectedIndex + 1));
                // Compare
                if (currentDiscordRoles.size === expectedStackedRoles.size &&
                    [...currentDiscordRoles].every(r => expectedStackedRoles.has(r))) {
                    alreadyCorrectCount++;
                    continue;
                }
                // Synchronize roles - remove outdated progression roles first
                for (const [roleName, roleId] of Object.entries(index_js_1.ROLES)) {
                    // Skip special roles (Hall of Fame) and staff roles - never touch these
                    if ((0, permissions_js_1.isSpecialRole)(roleId) || (0, permissions_js_1.isStaffRole)(roleId)) {
                        continue;
                    }
                    if ((0, permissions_js_1.isProgressionRole)(roleId) && member.roles.cache.has(roleId)) {
                        const roleIndex = roleKeys.indexOf(roleName.toLowerCase());
                        if (roleIndex > expectedIndex) {
                            // Remove this role - it's higher than their current level
                            const role = member.guild.roles.cache.get(roleId);
                            if (role) {
                                await member.roles.remove(role, 'Role synchronization: removing outdated progression role');
                            }
                        }
                    }
                }
                // Add missing progression roles
                const currentIndex = roleKeys.indexOf(currentRole);
                const successfullyAddedRoles = [];
                for (let i = currentIndex + 1; i <= expectedIndex; i++) {
                    const roleName = roleKeys[i];
                    const success = await (0, xp_js_1.addProgressionRole)(member, roleName);
                    if (success && await (0, xp_js_1.verifyRoleAssignment)(member, roleName)) {
                        successfullyAddedRoles.push(roleName);
                    }
                    else {
                        // Rollback
                        await (0, xp_js_1.rollbackRoles)(member, successfullyAddedRoles);
                        throw new Error(`Failed to add role ${roleName}`);
                    }
                }
                if (successfullyAddedRoles.length > 0) {
                    await (0, client_js_1.setUserProgressionRole)(member.user.id, expectedRole);
                    const eligibility = 0; // Recalculate if needed
                    await (0, client_js_1.updatePromotionEligibility)(member.user.id, eligibility);
                    changedCount++;
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