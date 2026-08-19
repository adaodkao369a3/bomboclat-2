"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_js_1 = require("./database/client.js");
const index_js_1 = require("./config/index.js");
const index_js_2 = require("./commands/index.js");
const messageHandler_js_1 = require("./services/messageHandler.js");
// Extend Client to include commands
class ExtendedClient extends discord_js_1.Client {
    commands = new discord_js_1.Collection();
}
const client = new ExtendedClient({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMembers,
    ],
    partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.Message, discord_js_1.Partials.Reaction],
});
client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag} (ID: ${client.user?.id})`);
    // Register commands
    await (0, index_js_2.registerCommands)(client);
    console.log('MI BOM3O is online!');
});
client.on('messageCreate', async (message) => {
    // Handle XP for all messages first
    await (0, messageHandler_js_1.handleXPMessage)(message);
    // Ignore bot messages for commands
    if (message.author.bot)
        return;
    // Ignore DMs
    if (!message.guild)
        return;
    // Get content
    const content = message.content.trim();
    // Check if it's a command
    if (content.startsWith(index_js_1.PREFIX) || content.startsWith(index_js_1.ADMIN_PREFIX)) {
        const usedPrefix = content.startsWith(index_js_1.PREFIX) ? index_js_1.PREFIX : index_js_1.ADMIN_PREFIX;
        const args = content.slice(usedPrefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName)
            return;
        // Find and execute command
        const command = client.commands.get(commandName);
        if (command) {
            try {
                await command.execute(message, args, usedPrefix);
            }
            catch (error) {
                console.error(`Error executing command ${commandName}:`, error);
                await message.reply('❌ An error occurred while executing this command.');
            }
        }
    }
});
async function main() {
    if (!index_js_1.DISCORD_TOKEN) {
        throw new Error('DISCORD_TOKEN is not set');
    }
    try {
        await (0, client_js_1.connect)();
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        process.exit(1);
    }
    try {
        await client.login(index_js_1.DISCORD_TOKEN);
    }
    catch (error) {
        console.error('Failed to login to Discord:', error);
        await (0, client_js_1.disconnect)();
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await (0, client_js_1.disconnect)();
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await (0, client_js_1.disconnect)();
    client.destroy();
    process.exit(0);
});
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map