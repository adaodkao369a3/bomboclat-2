"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.residualsCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const client_js_1 = require("../database/client.js");
const residuals_js_1 = require("../services/residuals.js");
const permissions_js_1 = require("../utils/permissions.js");
exports.residualsCommand = {
    name: 'residuals',
    async execute(message, _args, prefix) {
        // Only respond to admin prefix
        if (prefix !== index_js_1.ADMIN_PREFIX)
            return;
        // Check staff permissions
        if (!(0, permissions_js_1.isStaff)(message.member)) {
            await message.reply('❌ This command is restricted to staff.');
            return;
        }
        // Get target user
        const target = message.mentions.members?.first();
        if (!target) {
            await message.reply('❌ Please mention a user. Usage: $residuals @user');
            return;
        }
        // Get user data
        const userData = await (0, client_js_1.getUser)(target.user.id);
        if (!userData) {
            await message.reply('❌ User not found in database.');
            return;
        }
        // Get residuals data
        const residualData = await residuals_js_1.ResidualsService.getResiduals(target.user.id);
        if (!residualData) {
            await message.reply('❌ Residuals data not found.');
            return;
        }
        // Create Residuals management UI
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('💰 Residuals Management')
            .setDescription(`Managing Residuals for **${target.displayName}**`)
            .setColor(0xFFD700)
            .addFields([
            { name: 'Current Balance', value: residualData.balance.toLocaleString(), inline: true },
            { name: 'Lifetime Earned', value: residualData.lifetime_earned.toLocaleString(), inline: true },
            { name: 'Lifetime Spent', value: residualData.lifetime_spent.toLocaleString(), inline: true },
        ])
            .setFooter({ text: 'Select an action below' });
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('set_residuals')
            .setLabel('Set')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId('add_residuals')
            .setLabel('Add')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId('remove_residuals')
            .setLabel('Remove')
            .setStyle(discord_js_1.ButtonStyle.Danger), new discord_js_1.ButtonBuilder()
            .setCustomId('show_history')
            .setLabel('History')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        const msg = await message.reply({ embeds: [embed], components: [row] });
        // Wait for button interaction
        try {
            const interaction = await msg.awaitMessageComponent({
                componentType: discord_js_1.ComponentType.Button,
                time: 60000,
            });
            const action = interaction.customId;
            if (action === 'show_history') {
                // Show history
                const history = await residuals_js_1.ResidualsService.getResidualHistory(target.user.id, 10);
                if (!history || history.length === 0) {
                    await interaction.reply({ content: 'No transaction history found.', ephemeral: true });
                }
                else {
                    const historyEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle('📜 Residuals History')
                        .setDescription(`Recent transactions for **${target.displayName}**`)
                        .setColor(0xFFD700);
                    history.forEach((tx) => {
                        const sign = tx.amount >= 0 ? '+' : '';
                        historyEmbed.addFields({
                            name: `${sign}${tx.amount} (${tx.transaction_type})`,
                            value: `${tx.source}${tx.reason ? ` - ${tx.reason}` : ''}`,
                            inline: false,
                        });
                    });
                    await interaction.reply({ embeds: [historyEmbed], ephemeral: true });
                }
                // Disable buttons
                const disabledRow = new discord_js_1.ActionRowBuilder()
                    .addComponents(new discord_js_1.ButtonBuilder()
                    .setCustomId('set_residuals')
                    .setLabel('Set')
                    .setStyle(discord_js_1.ButtonStyle.Primary)
                    .setDisabled(true), new discord_js_1.ButtonBuilder()
                    .setCustomId('add_residuals')
                    .setLabel('Add')
                    .setStyle(discord_js_1.ButtonStyle.Success)
                    .setDisabled(true), new discord_js_1.ButtonBuilder()
                    .setCustomId('remove_residuals')
                    .setLabel('Remove')
                    .setStyle(discord_js_1.ButtonStyle.Danger)
                    .setDisabled(true), new discord_js_1.ButtonBuilder()
                    .setCustomId('show_history')
                    .setLabel('History')
                    .setStyle(discord_js_1.ButtonStyle.Secondary)
                    .setDisabled(true));
                await msg.edit({ components: [disabledRow] });
                return;
            }
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
                    let newBalance = residualData.balance;
                    if (action === 'set_residuals') {
                        newBalance = await residuals_js_1.ResidualsService.setResiduals(target.user.id, amount, message.author.id, `Manual set by ${message.author.displayName}`) || amount;
                    }
                    else if (action === 'add_residuals') {
                        newBalance = await residuals_js_1.ResidualsService.awardResiduals(target.user.id, amount, 'staff', `Manual addition by ${message.author.displayName}`, message.author.id) || residualData.balance + amount;
                    }
                    else if (action === 'remove_residuals') {
                        newBalance = await residuals_js_1.ResidualsService.removeResiduals(target.user.id, amount, 'staff', `Manual removal by ${message.author.displayName}`, message.author.id) || residualData.balance - amount;
                        if (newBalance < 0)
                            newBalance = 0;
                    }
                    await m.reply(`✅ Residuals updated successfully. New balance: ${newBalance?.toLocaleString() || 'Unknown'}`);
                    // Disable buttons
                    const disabledRow = new discord_js_1.ActionRowBuilder()
                        .addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId('set_residuals')
                        .setLabel('Set')
                        .setStyle(discord_js_1.ButtonStyle.Primary)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('add_residuals')
                        .setLabel('Add')
                        .setStyle(discord_js_1.ButtonStyle.Success)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('remove_residuals')
                        .setLabel('Remove')
                        .setStyle(discord_js_1.ButtonStyle.Danger)
                        .setDisabled(true), new discord_js_1.ButtonBuilder()
                        .setCustomId('show_history')
                        .setLabel('History')
                        .setStyle(discord_js_1.ButtonStyle.Secondary)
                        .setDisabled(true));
                    await msg.edit({ components: [disabledRow] });
                }
                catch (error) {
                    console.error('Error updating Residuals:', error);
                    await m.reply('❌ Failed to update Residuals. Please try again.');
                }
            });
        }
        catch (error) {
            console.error('Error waiting for interaction:', error);
            await msg.edit({ components: [] });
        }
    },
};
//# sourceMappingURL=residuals.js.map