import { Client, GatewayIntentBits, Partials, Collection, ActivityType } from 'discord.js';
import { connect as connectDB, disconnect as disconnectDB } from './database/client';
import { DISCORD_TOKEN, PREFIX, ADMIN_PREFIX, DEV_GUILD_ID } from './config/index';
import { registerCommands } from './commands/index';
import { registerSlashCommands } from './commands/slash/index';
import { handleXPMessage } from './services/messageHandler';
import { sendWelcomeMessage, sendBoosterThankYou, giftBoosterResiduals, hasBoosterRole } from './services/welcome';
import { Command } from './commands/index';
import { startVoiceTicker, registerGuild } from './services/voiceHandler';
import { seedManagedRoles, ensureManagedRoles, loadRoleIdCache, refreshAllRoleTemplates } from './services/managedRoles';
import { startupRoleCheck, runRoleAudit, isAuditOverdue, setLastAuditRun } from './services/roleAudit';
import { routeInteraction } from './interactions/index';
import { getActiveTransform, applyTransform } from './services/transform.js';
import { checkExpiredRoles } from './services/shop.js';

import { EMOJIS } from './config/index.js';
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
  
  // Register slash commands (only in dev mode to avoid spamming Discord API)
  if (DEV_GUILD_ID) {
    console.log('Registering slash commands to dev guild...');
    await registerSlashCommands(DEV_GUILD_ID);
  }
  
  // Start voice XP ticker
  startVoiceTicker();

  // Initialize managed roles system
  await seedManagedRoles();
  await loadRoleIdCache();

  const guild = DEV_GUILD_ID ? client.guilds.cache.get(DEV_GUILD_ID) : client.guilds.cache.first();
  if (guild) {
    // Refresh templates from live roles before ensuring
    await refreshAllRoleTemplates(guild);

    // Register guild for voice tick processing
    registerGuild(guild);

    const roleResult = await ensureManagedRoles(guild);
    console.log(`[managedRoles] Ensured ${roleResult.success.length} roles, ${roleResult.failed.length} failed`);

    // Run startup role check for members without roles
    await startupRoleCheck(guild);
    
    // Check if audit is overdue (bot was down at scheduled time)
    if (await isAuditOverdue()) {
      console.log('[roleAudit] Audit overdue, running catch-up...');
      const auditSummary = await runRoleAudit(guild);
      await setLastAuditRun(new Date());
      console.log(`[roleAudit] Catch-up complete: ${JSON.stringify(auditSummary)}`);
    }
  }
  
  // Schedule daily audit at 04:00 America/New_York
  scheduleDailyAudit();

  // Schedule short interval check for expired roles (every 5 minutes)
  scheduleExpiredRoleCheck();

  console.log('🎬 Mi Bombo Studios is online.');
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
      const gifted = await giftBoosterResiduals(newMember);
      await sendBoosterThankYou(newMember, undefined, gifted);
    }
  } catch (error) {
    console.error('Unhandled error in guildMemberUpdate handler:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Route through the interaction router first
    await routeInteraction(interaction);

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const { handleSlashCommand } = await import('./commands/slash/index');
      await handleSlashCommand(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('emoji_')) {
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
        await interaction.reply({ content: `${EMOJIS.GLOSSY_RED_CANCEL} An error occurred processing this interaction.`, ephemeral: true });
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

    // Ignore bot messages for commands (but handle transform webhook messages)
    if (message.author.bot) {
      // Skip XP for webhook messages (they're reposts of transformed messages)
      if (message.webhookId) return;
      return;
    }

    // Ignore DMs
    if (!message.guild) return;

    // Check for active transform
    const activeTransform = getActiveTransform(message.author.id, message.channel.id);
    if (activeTransform) {
      // Ignore attachments (leave those messages alone)
      if (message.attachments.size > 0) return;

      // Delete original message
      await message.delete().catch(() => {});

      // Rewrite text
      const rewrittenText = applyTransform(message.content, activeTransform.style);

      // Post via webhook (no pings allowed)
      try {
        const webhook = await client.fetchWebhook(activeTransform.webhookId, activeTransform.webhookToken);
        await webhook.send({
          content: rewrittenText,
          username: `${message.member?.displayName || message.author.username} (transformed)`,
          avatarURL: message.author.displayAvatarURL({ size: 128 }),
          allowedMentions: { parse: [] },
        });
      } catch (error) {
        console.error('Failed to send transformed message via webhook:', error);
      }

      // Don't process commands from transformed messages
      return;
    }

    // Get content
    const content = message.content.trim();

    // Check if it's a command
    if (content.startsWith(PREFIX) || content.startsWith(ADMIN_PREFIX)) {
      const usedPrefix = content.startsWith(PREFIX) ? PREFIX : ADMIN_PREFIX;
      const args = content.slice(usedPrefix.length).trim().split(/\s+/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;

      // Try to find the command (check for multi-word commands)
      let finalCommand: Command | null = null;
      let remainingArgs = args;

      // First try exact match
      const commandKey = `${usedPrefix}:${commandName}`;
      finalCommand = client.commands.get(commandKey) || null;

      // If not found, try with additional args for multi-word commands (e.g., "rules studio")
      if (!finalCommand && args.length > 0) {
        for (let i = 1; i <= args.length; i++) {
          const multiWordName = [commandName, ...args.slice(0, i)].join(' ');
          const multiWordKey = `${usedPrefix}:${multiWordName}`;
          finalCommand = client.commands.get(multiWordKey) || null;
          if (finalCommand) {
            remainingArgs = args.slice(i);
            break;
          }
        }
      }

      // Also try 'both' prefix if specific prefix not found
      if (!finalCommand) {
        finalCommand = client.commands.get(`both:${commandName}`) || null;
      }

      if (finalCommand) {
        try {
          await finalCommand.execute(message, remainingArgs, usedPrefix);
        } catch (error) {
          console.error(`Error executing command ${commandName}:`, error);
          await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} An error occurred while executing this command.`);
        }
      }
    }
  } catch (error) {
    console.error('Unhandled error in messageCreate handler:', error);
    // Don't crash the bot on message handling errors
  }
});

function scheduleDailyAudit(): void {
  const checkAndRunAudit = async () => {
    try {
      const guild = DEV_GUILD_ID ? client.guilds.cache.get(DEV_GUILD_ID) : client.guilds.cache.first();
      if (!guild) return;

      if (await isAuditOverdue()) {
        console.log('[roleAudit] Running scheduled daily audit...');
        const auditSummary = await runRoleAudit(guild);
        await setLastAuditRun(new Date());
        console.log(`[roleAudit] Daily audit complete: ${JSON.stringify(auditSummary)}`);
      }
    } catch (error) {
      console.error('[roleAudit] Error in scheduled audit:', error);
    }
  };

  // Check every minute if it's time to run the audit
  setInterval(checkAndRunAudit, 60000);
  console.log('[roleAudit] Daily audit scheduler started (checks every minute)');
}

function scheduleExpiredRoleCheck(): void {
  const checkExpired = async () => {
    try {
      const guild = DEV_GUILD_ID ? client.guilds.cache.get(DEV_GUILD_ID) : client.guilds.cache.first();
      if (!guild) return;

      const expired = await checkExpiredRoles();
      if (expired.length > 0) {
        console.log(`[expiredRoles] Removing ${expired.length} expired archetype subscriptions`);
        for (const record of expired) {
          const member = await guild.members.fetch(record.userId).catch(() => null);
          if (member) {
            // Get the archetype role ID from shop_archetypes
            const { getClient } = await import('./database/client.js');
            const client = await getClient();
            const roleResult = await client.query(
              'SELECT role_id FROM shop_archetypes WHERE id = $1',
              [record.archetypeId]
            );
            if (roleResult.rows.length > 0 && roleResult.rows[0].role_id) {
              await member.roles.remove(roleResult.rows[0].role_id).catch(() => {});
              console.log(`  - Removed role from ${member.user.username}: ${record.archetypeName}`);
            }
            client.release();
          }
        }
      }
    } catch (error) {
      console.error('[expiredRoles] Error checking expired roles:', error);
    }
  };

  // Check every 5 minutes
  setInterval(checkExpired, 5 * 60 * 1000);
  console.log('[expiredRoles] Short interval check started (every 5 minutes)');
}

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