"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clipCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../config/index.js");
const groq_js_1 = require("../services/groq.js");
const huggingface_js_1 = require("../services/huggingface.js");
const permissions_js_1 = require("../utils/permissions.js");
exports.clipCommand = {
    name: 'clip',
    async execute(message, args, prefix) {
        // Only respond to admin prefix
        if (prefix !== index_js_1.ADMIN_PREFIX)
            return;
        // Check admin permissions
        if (!(0, permissions_js_1.isAdmin)(message.member)) {
            await message.reply('❌ This command is restricted to admins.');
            return;
        }
        // Parse arguments
        let style = 'anime';
        let directorsNote = '';
        if (args.length > 0) {
            const firstArg = args[0].toLowerCase();
            if (index_js_1.ART_STYLES.includes(firstArg)) {
                style = firstArg;
                directorsNote = args.slice(1).join(' ');
            }
            else {
                directorsNote = args.join(' ');
            }
        }
        try {
            // Fetch last 60 messages from the channel
            const messages = [];
            const fetchedMessages = await message.channel.messages.fetch({ limit: 60 });
            for (const msg of fetchedMessages.values()) {
                if (!msg.author.bot && msg.content) {
                    messages.push({
                        author: msg.author.displayName,
                        content: msg.content,
                    });
                }
            }
            if (messages.length < 5) {
                await message.reply('❌ Not enough messages to generate a clip. Need at least 5 messages.');
                return;
            }
            // Generate AI summary (Groq)
            const summary = await (0, groq_js_1.generateClipSummary)(messages);
            if (!summary || !summary.title || !summary.summary) {
                await message.reply('❌ AI summarization failed. Please try again later.');
                return;
            }
            // Generate image (Hugging Face)
            const imageBuffer = await (0, huggingface_js_1.generateImage)(summary.summary, style);
            if (!imageBuffer) {
                await message.reply('❌ Artwork generation failed. Please try again later.');
                return;
            }
            // Create embed
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(summary.title)
                .setDescription(summary.summary)
                .setColor(0x7B61FF);
            if (directorsNote) {
                embed.addFields({ name: "Director's Note", value: directorsNote, inline: false });
            }
            embed.setFooter({ text: 'MI BOM3O Studios' });
            // Create attachment
            const attachment = new discord_js_1.AttachmentBuilder(imageBuffer, { name: 'bombo_times.png' });
            embed.setImage('attachment://bombo_times.png');
            // Send to Bombo Times channel
            const bomboTimesChannel = message.guild?.channels.cache.get(index_js_1.CHANNELS.BOMBO_TIMES);
            if (!bomboTimesChannel || !bomboTimesChannel.isTextBased()) {
                await message.reply('❌ Failed to find Bombo Times channel.');
                return;
            }
            await bomboTimesChannel.send({ embeds: [embed], files: [attachment] });
            await message.reply('✅ Bombo Times clip published!');
        }
        catch (error) {
            console.error('Error generating clip:', error);
            await message.reply('❌ Failed to generate clip. Please try again later.');
        }
    },
};
//# sourceMappingURL=clip.js.map