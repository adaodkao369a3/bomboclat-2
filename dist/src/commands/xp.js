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
        if (!message.member || !(0, permissions_js_1.isAdmin)(message.member)) {
            await message.reply('❌ This command is restricted to admins.');
            return;
        }
        // Get target user
        const target = message.mentions.members?.first();
        if (!target || !target.user) {
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
            if (!('createMessageCollector' in message.channel)) {
                await message.reply('❌ This channel cannot collect messages.');
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
                    let newXP;
                    if (action === 'set_xp') {
                        const persistedXP = await (0, client_js_1.setUserXP)(target.user.id, amount);
                        if (persistedXP === null)
                            throw new Error('Failed to set XP');
                        newXP = persistedXP;
                    }
                    else if (action === 'add_xp') {
                        const persistedXP = await (0, client_js_1.addUserXP)(target.user.id, amount, 'admin', `Manual addition by ${message.author.displayName}`);
                        if (persistedXP === null)
                            throw new Error('Failed to add XP');
                        newXP = persistedXP;
                    }
                    else if (action === 'remove_xp') {
                        const persistedXP = await (0, client_js_1.setUserXP)(target.user.id, Math.max(0, userData.current_xp - amount));
                        if (persistedXP === null)
                            throw new Error('Failed to remove XP');
                        newXP = persistedXP;
                    }
                    else if (action === 'set_level') {
                        newXP = (0, xp_js_1.calculateXPForLevel)(amount);
                        const persistedXP = await (0, client_js_1.setUserXP)(target.user.id, newXP);
                        if (persistedXP === null)
                            throw new Error('Failed to set XP for level');
                    }
                    else {
                        throw new Error(`Unknown XP action: ${action}`);
                    }
                    const newLevel = (0, xp_js_1.calculateLevelFromXP)(newXP);
                    await (0, client_js_1.setUserLevel)(target.user.id, newLevel);
                    const newRole = (0, xp_js_1.getRoleFromLevel)(newLevel);
                    const syncResult = await (0, xp_js_1.synchronizeProgressionRoles)(target, newLevel);
                    if (!syncResult.success) {
                        await m.reply('❌ Failed to update progression roles. XP was saved; please retry synchronization.');
                        return;
                    }
                    if (userData.current_progression_role !== newRole) {
                        await (0, client_js_2.setUserProgressionRole)(target.user.id, newRole);
                    }
                    await (0, client_js_2.updatePromotionEligibility)(target.user.id, (0, xp_js_1.calculatePromotionEligibility)(newXP, newLevel, newRole));
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