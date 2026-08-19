"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customGifCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const klipy_js_1 = require("../services/klipy.js");
const cooldowns_js_1 = require("../utils/cooldowns.js");
const permissions_js_1 = require("../utils/permissions.js");
exports.customGifCommand = {
    name: 'c',
    async execute(message, args, prefix) {
        // Only respond to user prefix
        if (prefix !== index_js_1.PREFIX)
            return;
        // Check permissions (Supporting Cast+ or admins)
        if (!message.member || (!(0, permissions_js_1.hasSupportingCast)(message.member) && !(0, permissions_js_1.isAdmin)(message.member))) {
            await message.reply('❌ This command requires Supporting Cast role or higher.');
            return;
        }
        // Check target limit
        const mentions = message.mentions.members;
        if (mentions && mentions.size > index_js_1.GIF_CONFIG.MAX_TARGETS) {
            await message.reply(`❌ Maximum ${index_js_1.GIF_CONFIG.MAX_TARGETS} users can be targeted.`);
            return;
        }
        // Get query
        const query = args.join(' ').trim();
        if (!query) {
            await message.reply('Please provide something to search for.\n\nExample:\n.c door shutting');
            return;
        }
        // Calculate cooldown based on targets
        let cooldownTime = index_js_1.GIF_CONFIG.NORMAL_COOLDOWN_SECONDS;
        if (mentions && mentions.size >= 2) {
            cooldownTime = mentions.size === 2 ? index_js_1.GIF_CONFIG.TWO_TARGET_COOLDOWN_SECONDS : index_js_1.GIF_CONFIG.THREE_TARGET_COOLDOWN_SECONDS;
        }
        // Admin bypass
        const isUserAdmin = message.member ? (0, permissions_js_1.isAdmin)(message.member) : false;
        if (!isUserAdmin) {
            const remaining = (0, cooldowns_js_1.getRemaining)(message.author.id);
            if (remaining > 0) {
                await message.reply(`⏳ Post nut clarity is here. Try again in ${remaining}s.`);
                return;
            }
            (0, cooldowns_js_1.setCooldown)(message.author.id, cooldownTime);
        }
        // Build targets string
        let targets;
        if (mentions && mentions.size > 0) {
            targets = Array.from(mentions.values()).map(m => m.toString()).join(' ');
        }
        else {
            targets = message.author.toString();
        }
        // Fetch GIF
        const gifUrl = await (0, klipy_js_1.fetchGIF)(query);
        if (!gifUrl) {
            await message.reply(`Couldn't find any GIFs for:\n${query}`);
            return;
        }
        // Create embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🎬 Custom GIF')
            .setDescription(`${message.author.toString()} "${query}" ${targets ? targets : ''}`)
            .setColor(0x9b5de5)
            .setImage(gifUrl)
            .setFooter({ text: 'Powered by Klipy' });
        await message.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=customGif.js.map