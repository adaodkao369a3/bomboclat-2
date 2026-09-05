import { Client, GatewayIntentBits, Partials, Collection, ActivityType } from 'discord.js';
import { connect as connectDB, disconnect as disconnectDB } from './database/client';
import { DISCORD_TOKEN, PREFIX, ADMIN_PREFIX } from './config/index';
import { registerCommands } from './commands/index';
import { handleXPMessage } from './services/messageHandler';
import { sendWelcomeMessage, sendBoosterThankYou, giftBoosterResiduals, hasBoosterRole } from './services/welcome';
import { Command } from './commands/index';
import { handleVoiceStateUpdate, startVoiceTicker } from './services/voiceHandler';

// Extend Client to include commands
class ExtendedClient extends Client {
  commands: Collection<string, Command> = new Collection();
}

const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag} (ID: ${client.user?.id})`);
  
  // Set bot status to describe what it does
  if (client.user) {
    await client.user.setActivity('XP, shop & community', { type: ActivityType.Watching });
  }
  
  // Register legacy commands
  await registerCommands(client);
  
  // Start voice XP ticker
  startVoiceTicker();
  
  console.log('🤖 MI BOM3O is online!');
});

client.on('guildMemberAdd', async (member) => {
  try {
    await sendWelcomeMessage(member);
  } catch (error) {
    console.error('Unhandled error in guildMemberAdd handler:', error);
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Fire the thank-you message + residual gift the moment the Guest Star role is newly assigned
    if (!hasBoosterRole(oldMember) && hasBoosterRole(newMember)) {
      await sendBoosterThankYou(newMember);
      await giftBoosterResiduals(newMember);
    }
  } catch (error) {
    console.error('Unhandled error in guildMemberUpdate handler:', error);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    handleVoiceStateUpdate(oldState, newState);
  } catch (error) {
    console.error('Unhandled error in voiceStateUpdate handler:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { handleSlashCommand } = await import('./commands/slash/index');
      await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
      const { handleButtonInteraction } = await import('./commands/slash/index');
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      const { handleModalSubmit } = await import('./commands/slash/index');
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    console.error('Unhandled error in interactionCreate handler:', error);
    if (interaction.isRepliable()) {
      try {
        await interaction.reply({ content: '❌ An error occurred processing this interaction.', ephemeral: true });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }
});

client.on('messageCreate', async (message) => {
  try {
    // Handle XP for all messages first
    await handleXPMessage(message);

    // Ignore bot messages for commands
    if (message.author.bot) return;
    
    // Ignore DMs
    if (!message.guild) return;
    
    // Get content
    const content = message.content.trim();
    
    // Check if it's a command
    if (content.startsWith(PREFIX) || content.startsWith(ADMIN_PREFIX)) {
      const usedPrefix = content.startsWith(PREFIX) ? PREFIX : ADMIN_PREFIX;
      const args = content.slice(usedPrefix.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();
      
      if (!commandName) return;
      
      // Find and execute command using prefix-aware key
      const commandKey = `${usedPrefix}:${commandName}`;
      const command = client.commands.get(commandKey);
      
      // Also try 'both' prefix if specific prefix not found
      const fallbackCommand = !command ? client.commands.get(`both:${commandName}`) : null;
      
      const finalCommand = command || fallbackCommand;
      
      if (finalCommand) {
        try {
          await finalCommand.execute(message, args, usedPrefix);
        } catch (error) {
          console.error(`Error executing command ${commandName}:`, error);
          await message.reply('❌ An error occurred while executing this command.');
        }
      }
    }
  } catch (error) {
    console.error('Unhandled error in messageCreate handler:', error);
    // Don't crash the bot on message handling errors
  }
});

async function main() {
  if (!DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not set');
  }

  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  try {
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error('Failed to login to Discord:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await disconnectDB();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await disconnectDB();
  client.destroy();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
