import { Message, GuildMember } from 'discord.js';
import { getUser } from '../database/client.js';
import { synchronizeProgressionRoles, PROGRESSION_ROLE_KEYS } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

// Global flag to prevent concurrent syncs
let syncInProgress = false;

export const syncRolesCommand: Command = {
  name: 'syncroles',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    // Check if a sync is already in progress
    if (syncInProgress) {
      await message.reply('❌ A role sync is already in progress. Please wait for it to complete.');
      return;
    }

    // Validate arguments
    if (args.length === 0) {
      await message.reply('Usage: `$syncroles @user | $syncroles @user @user | $syncroles all | $syncroles all dry`');
      return;
    }

    const isDryRun = args.includes('dry');
    const isAll = args.includes('all');
    const targetUsers = message.mentions.members;

    syncInProgress = true;

    try {
      if (isAll) {
        await syncAllMembers(message, isDryRun);
      } else if (targetUsers && targetUsers.size > 0) {
        await syncSpecificMembers(message, Array.from(targetUsers.values()), isDryRun);
      } else {
        await message.reply('❌ Please mention at least one user or use "all". Usage: `$syncroles @user | $syncroles all`');
      }
    } finally {
      syncInProgress = false;
    }
  },
};

async function syncSpecificMembers(
  message: Message,
  members: Array<GuildMember>,
  isDryRun: boolean
): Promise<void> {
  let totalAdded = 0;
  let totalRemoved = 0;
  let failures = 0;
  const failedUsers: string[] = [];

  for (const member of members) {
    if (member.user.bot) {
      continue; // Skip bots
    }

    try {
      const result = await syncMember(member, isDryRun);
      totalAdded += result.added;
      totalRemoved += result.removed;
      if (result.failed) {
        failures++;
        failedUsers.push(member.user.username);
      }
    } catch (error) {
      failures++;
      failedUsers.push(member.user.username);
      console.error(`Error syncing ${member.user.username}:`, error);
    }
  }

  if (isDryRun) {
    await message.reply(
      `🔍 Dry run complete: Would add ${totalAdded} roles, remove ${totalRemoved} roles` +
      (failures > 0 ? `\n⚠️ Failed for ${failures} users: ${failedUsers.join(', ')}` : '')
    );
  } else {
    await message.reply(
      `✅ Sync complete: ${totalAdded} roles added, ${totalRemoved} roles removed` +
      (failures > 0 ? `\n⚠️ Failed for ${failures} users: ${failedUsers.join(', ')}` : '')
    );
  }
}

async function syncAllMembers(message: Message, isDryRun: boolean): Promise<void> {
  if (!message.guild) {
    await message.reply('❌ This command can only be used in a server.');
    return;
  }

  // Fetch members with retry logic for rate limits
  let members;
  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
    try {
      members = await message.guild.members.fetch();
      break;
    } catch (error: any) {
      if (error.code === 50001 || error.name === 'GatewayRateLimitError') {
        const retryAfter = error.retry_after || 5;
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else {
        throw error;
      }
    }
  }

  if (!members) {
    await message.reply('❌ Failed to fetch guild members after multiple retries due to rate limits. Please try again later.');
    return;
  }

  const nonBotMembers = members.filter(m => !m.user.bot);

  let processed = 0;
  let totalAdded = 0;
  let totalRemoved = 0;
  let failures = 0;
  const failedUsers: string[] = [];

  const startMessage = await message.reply(
    `🔄 Starting ${isDryRun ? 'dry run ' : ''}sync for ${nonBotMembers.size} members...`
  );

  for (const member of nonBotMembers.values()) {
    try {
      const result = await syncMember(member, isDryRun);
      totalAdded += result.added;
      totalRemoved += result.removed;
      if (result.failed) {
        failures++;
        failedUsers.push(member.user.username);
      }

      processed++;

      // Progress message every 25 members
      if (processed % 25 === 0) {
        await startMessage.edit(
          `📊 Progress: ${processed}/${nonBotMembers.size} members processed (${totalAdded} added, ${totalRemoved} removed)`
        );
      }

      // ~100ms delay between members
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failures++;
      failedUsers.push(member.user.username);
      console.error(`Error syncing ${member.user.username}:`, error);
    }
  }

  const summary =
    `✅ ${isDryRun ? 'Dry run ' : ''}Sync complete:\n` +
    `• Members processed: ${processed}\n` +
    `• Roles ${isDryRun ? 'would be ' : ''}added: ${totalAdded}\n` +
    `• Roles ${isDryRun ? 'would be ' : ''}removed: ${totalRemoved}` +
    (failures > 0 ? `\n⚠️ Failures: ${failures} (${failedUsers.join(', ')})` : '');

  await startMessage.edit(summary);
}

async function syncMember(
  member: Parameters<typeof synchronizeProgressionRoles>[0],
  isDryRun: boolean
): Promise<{ added: number; removed: number; failed: boolean }> {
  // Get user data from database (use getUser for dry run to avoid creating rows)
  const userData = await getUser(member.user.id);
  const level = userData?.current_level ?? 0; // No row = level 0

  if (isDryRun) {
    // Calculate what would change without actually doing it
    const assignedRoles = new Set<string>();
    for (const roleName of PROGRESSION_ROLE_KEYS) {
      const roleId = await (await import('../services/managedRoles.js')).getRoleId(roleName);
      if (roleId && member.roles.cache.has(roleId)) {
        assignedRoles.add(roleName);
      }
    }

    const { getProgressionRolePlan } = await import('../services/xp.js');
    const plan = getProgressionRolePlan(level, assignedRoles);

    // Handle Spectator separately for dry run
    const spectatorRoleId = await (await import('../services/managedRoles.js')).getRoleId('spectator');
    const hasSpectator = spectatorRoleId && member.roles.cache.has(spectatorRoleId);
    const shouldBeSpectator = level < 1;

    let added = plan.missingRoles.length;
    let removed = plan.outdatedRoles.length;

    if (shouldBeSpectator && !hasSpectator) {
      added++;
    } else if (!shouldBeSpectator && hasSpectator) {
      removed++;
    }

    return { added, removed, failed: false };
  } else {
    // Actually sync roles
    const syncResult = await synchronizeProgressionRoles(member, level);
    return {
      added: syncResult.addedRoles.length,
      removed: syncResult.removedRoles.length,
      failed: !syncResult.success,
    };
  }
}
