"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xpCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const xp_js_1 = require("../services/xp.js");
const client_js_2 = require("../database/client.js");
const permissions_js_1 = require("../utils/permissions.js");
exports.xpCommand = {
    name: 'xp',
    async execute(message, _args, prefix) {
        // Only respond to admin prefix
        if (prefix !== index_js_1.ADMIN_PREFIX)
            return;
        // Check admin permissions
        if (!(0, permissions_js_1.isAdmin)(message.member)) {
            await message.reply('❌ This command is restricted to admins.');
            return;
        }
        // Get target user
        const target = message.mentions.members?.first();
        if (!target) {
            await message.reply('❌ Please mention a user. Usage: $xp @user');
            return;
        }
        // Get user data
        const userData = await (0, client_js_1.getUser)(target.user.id);
        if (!userData) {
            await message.reply('❌ User not found in database.');
            return;
        }
        // Create XP management UI
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('📊 XP Management')
            .setDescription(`Managing XP for **${target.displayName}**`)
            .setColor(0x7B61FF)
            .addFields([
            { name: 'Current XP', value: userData.current_xp.toLocaleString(), inline: true },
            { name: 'Current Level', value: userData.current_level.toString(), inline: true },
            { name: 'Current Role', value: userData.current_progression_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
        ])
            .setFooter({ text: 'Select an action below' });
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_xp')
            .setLabel('Set XP')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId('add_xp')
            .setLabel('Add XP')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId('remove_xp')
            .setLabel('Remove XP')
            .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
            .setCustomId('set_level')
            .setLabel('Set Level')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        const msg = await message.reply({ embeds: [embed], components: [row] });
        // Wait for button interaction
        try {
            const interaction = await msg.awaitMessageComponent({
                componentType: discord_js_1.ComponentType.Button,
                time: 60000,
            });
            const action = interaction.customId;
            // Ask for amount
            await interaction.reply({ content: `Please enter the ${action.replace('_', ' ')} amount:`, ephemeral: true });
            // Wait for user response
            if (!message.channel.isTextBased()) {
                await message.reply('❌ This command can only be used in text channels.');
                return;
            }
            const collector = message.channel.createMessageCollector({
                filter: (m) => m.author.id === message.author.id,
                max: 1,
                time: 30000,
            });
            collector.on('collect', async (m) => {
                const amount = parseInt(m.content);
                if (isNaN(amount) || amount < 0) {
                    await m.reply('❌ Please enter a valid positive number.');
                    return;
                }
                try {
                    let newXP = userData.current_xp;
                    let newLevel = userData.current_level;
                    if (action === 'set_xp') {
                        newXP = await (0, client_js_1.setUserXP)(target.user.id, amount) || amount;
                        newLevel = (0, xp_js_1.calculateLevelFromXP)(newXP);
                        await (0, client_js_1.setUserLevel)(target.user.id, newLevel);
                    }
                    else if (action === 'add_xp') {
                        newXP = await (0, client_js_1.addUserXP)(target.user.id, amount, 'admin', `Manual addition by ${message.author.displayName}`) || userData.current_xp + amount;
                        newLevel = (0, xp_js_1.calculateLevelFromXP)(newXP);
                        await (0, client_js_1.setUserLevel)(target.user.id, newLevel);
                    }
                    else if (action === 'remove_xp') {
                        newXP = await (0, client_js_1.addUserXP)(target.user.id, -amount, 'admin', `Manual removal by ${message.author.displayName}`) || userData.current_xp - amount;
                        if (newXP < 0)
                            newXP = 0;
                        newLevel = (0, xp_js_1.calculateLevelFromXP)(newXP);
                        await (0, client_js_1.setUserLevel)(target.user.id, newLevel);
                    }
                    else if (action === 'set_level') {
                        newLevel = amount;
                        newXP = 0; // Will be recalculated
                        await (0, client_js_1.setUserLevel)(target.user.id, newLevel);
                    }
                    // Update progression roles
                    const newRole = (0, xp_js_1.getRoleFromLevel)(newLevel);
                    const currentRole = userData.current_progression_role;
                    const roleKeys = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
                    const currentIndex = roleKeys.indexOf(currentRole);
                    const targetIndex = roleKeys.indexOf(newRole);
                    if (targetIndex > currentIndex) {
                        // Award new roles (promotion)
                        const successfullyAddedRoles = [];
                        for (let i = currentIndex + 1; i <= targetIndex; i++) {
                            const roleName = roleKeys[i];
                            const success = await (0, xp_js_1.addProgressionRole)(target, roleName);
                            if (success && await (0, xp_js_1.verifyRoleAssignment)(target, roleName)) {
                                successfullyAddedRoles.push(roleName);
                            }
                            else {
                                // Rollback
                                await (0, xp_js_1.rollbackRoles)(target, successfullyAddedRoles);
                                await m.reply('❌ Failed to update progression roles.');
                                return;
                            }
                        }
                        if (successfullyAddedRoles.length > 0) {
                            await (0, client_js_2.setUserProgressionRole)(target.user.id, newRole);
                            const eligibility = 0; // Recalculate if needed
                            await (0, client_js_2.updatePromotionEligibility)(target.user.id, eligibility);
                        }
                    }
                    else if (targetIndex < currentIndex) {
                        // Remove higher roles (demotion)
                        const rolesToRemove = [];
                        for (let i = currentIndex; i > targetIndex; i--) {
                            rolesToRemove.push(roleKeys[i]);
                        }
                        for (const roleName of rolesToRemove) {
                            const roleId = index_js_1.ROLES[roleName.toUpperCase()];
                            if (roleId && target.roles.cache.has(roleId)) {
                                const role = target.guild?.roles.cache.get(roleId);
                                if (role) {
                                    await target.roles.remove(role, 'XP management: role demotion');
                                }
                            }
                        }
                        await (0, client_js_2.setUserProgressionRole)(target.user.id, newRole);
                        const eligibility = 0;
                        await (0, client_js_2.updatePromotionEligibility)(target.user.id, eligibility);
                    }
                    await m.reply(`✅ XP updated successfully. New XP: ${newXP.toLocaleString()}, New Level: ${newLevel}`);
                    // Disable buttons
                    const disabledRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId('set_xp')
                        .setLabel('Set XP')
                        .setStyle(discord_js_1.ButtonStyle.Primary)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('add_xp')
                        .setLabel('Add XP')
                        .setStyle(discord_js_1.ButtonStyle.Success)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('remove_xp')
                        .setLabel('Remove XP')
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('set_level')
                        .setLabel('Set Level')
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setDisabled(true));
                    await msg.edit({ components: [disabledRow] });
                }
                catch (error) {
                    console.error('Error updating XP:', error);
                    await m.reply('❌ Failed to update XP. Please try again.');
                }
            });
        }
        catch (error) {
            console.error('Error waiting for interaction:', error);
            await msg.edit({ components: [] });
        }
    },
};
//# sourceMappingURL=xp.js.map