"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gifCommands = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const klipy_js_1 = require("../services/klipy.js");
const cooldowns_js_1 = require("../utils/cooldowns.js");
const permissions_js_1 = require("../utils/permissions.js");
function createGIFCommand(name) {
    return {
        name,
        async execute(message, _args, prefix) {
            // Only respond to user prefix
            if (prefix !== index_js_1.PREFIX)
                return;
            // Check target limit
            const mentions = message.mentions.members;
            if (mentions && mentions.size > index_js_1.GIF_CONFIG.MAX_TARGETS) {
                await message.reply(`❌ Maximum ${index_js_1.GIF_CONFIG.MAX_TARGETS} users can be targeted.`);
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
            const gifUrl = await (0, klipy_js_1.fetchGIF)(index_js_1.GIF_COMMANDS[name]);
            if (!gifUrl) {
                await message.reply('❌ No GIF found.');
                return;
            }
            // Create embed
            const caption = index_js_1.GIF_CAPTIONS[name];
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`✨ ${name.toUpperCase()} ✨`)
                .setDescription(`${targets} ${caption}`)
                .setColor(0x9b5de5)
                .setImage(gifUrl)
                .setFooter({ text: 'Powered by Klipy' });
            await message.reply({ embeds: [embed] });
        },
    };
}
exports.gifCommands = Object.keys(index_js_1.GIF_COMMANDS).map(name => createGIFCommand(name));
//# sourceMappingURL=gif.js.map