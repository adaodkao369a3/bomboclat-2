import { Message, GuildMember } from 'discord.js';
import { getUser } from '../database/client.js';
import { synchronizeProgressionRoles, PROGRESSION_ROLE_KEYS } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
// Global flag to prevent concurrent syncs
let syncInProgress = false;

export const syncRolesCommand: Command = {
  name: 'syncroles',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to admins.`);
      return;
    }

    // Check if a sync is already in progress
    if (syncInProgress) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} A role sync is already in progress. Please wait for it to complete.`);
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
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Please mention at least one user or use "all". Usage: \`$syncroles @user | $syncroles all\``);
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
  const addedByRole: Record<string, number> = {};
  const removedByRole: Record<string, number> = {};

  for (const member of members) {
    if (member.user.bot) {
      continue; // Skip bots
    }

    try {
      const result = await syncMember(member, isDryRun);
      totalAdded += result.added;
      totalRemoved += result.removed;

      // Track per-role breakdown
      for (const role of result.addedRoles) {
        addedByRole[role] = (addedByRole[role] || 0) + 1;
      }
      for (const role of result.removedRoles) {
        removedByRole[role] = (removedByRole[role] || 0) + 1;
      }

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

  const checkedCount = members.filter(m => !m.user.bot).length;
  const wouldChange = totalAdded > 0 || totalRemoved > 0 ? checkedCount - failures : 0;
  const alreadyCorrect = checkedCount - failures - wouldChange;

  if (isDryRun) {
    const addedBreakdown = Object.entries(addedByRole)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ');
    const removedBreakdown = Object.entries(removedByRole)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ');

    await message.reply(
      `${EMOJIS.PUSH_PIN} Dry run complete:\n` +
      `Members checked: ${members.filter(m => !m.user.bot).length} | would change: ${wouldChange} | already correct: ${alreadyCorrect}\n` +
      (addedBreakdown ? `Would ADD: ${addedBreakdown}\n` : '') +
      (removedBreakdown ? `Would REMOVE: ${removedBreakdown}` : '') +
      (failures > 0 ? `\n${EMOJIS.WARNING} Failed for ${failures} users: ${failedUsers.join(', ')}` : '')
    );
  } else {
    const addedBreakdown = Object.entries(addedByRole)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ');
    const removedBreakdown = Object.entries(removedByRole)
      .map(([role, count]) => `${role}: ${count}`)
      .join(', ');

    await message.reply(
      `${EMOJIS.GREEN_GLOSSY_TICK} Sync complete:\n` +
      `Members checked: ${members.filter(m => !m.user.bot).length} | changed: ${wouldChange} | already correct: ${alreadyCorrect}\n` +
      (addedBreakdown ? `Added: ${addedBreakdown}\n` : '') +
      (removedBreakdown ? `Removed: ${removedBreakdown}` : '') +
      (failures > 0 ? `\n${EMOJIS.WARNING} Failed for ${failures} users: ${failedUsers.join(', ')}` : '')
    );
  }
}

async function syncAllMembers(message: Message, isDryRun: boolean): Promise<void> {
  if (!message.guild) {
    await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command can only be used in a server.`);
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
    await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Failed to fetch guild members after multiple retries due to rate limits. Please try again later.`);
    return;
  }

  const nonBotMembers = members.filter(m => !m.user.bot);

  let processed = 0;
  let totalAdded = 0;
  let totalRemoved = 0;
  let failures = 0;
  const failedUsers: string[] = [];
  const addedByRole: Record<string, number> = {};
  const removedByRole: Record<string, number> = {};

  const startMessage = await message.reply(
    `${EMOJIS.TYPING} Starting ${isDryRun ? 'dry run ' : ''}sync for ${nonBotMembers.size} members...`
  );

  for (const member of nonBotMembers.values()) {
    try {
      const result = await syncMember(member, isDryRun);
      totalAdded += result.added;
      totalRemoved += result.removed;

      // Track per-role breakdown
      for (const role of result.addedRoles) {
        addedByRole[role] = (addedByRole[role] || 0) + 1;
      }
      for (const role of result.removedRoles) {
        removedByRole[role] = (removedByRole[role] || 0) + 1;
      }

      if (result.failed) {
        failures++;
        failedUsers.push(member.user.username);
      }

      processed++;

      // Progress message every 25 members
      if (processed % 25 === 0) {
        await startMessage.edit(
          `${EMOJIS.LADDER} Progress: ${processed}/${nonBotMembers.size} members processed (${totalAdded} added, ${totalRemoved} removed)`
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

  const wouldChange = totalAdded > 0 || totalRemoved > 0 ? processed - failures : 0;
  const alreadyCorrect = processed - failures - wouldChange;

  const addedBreakdown = Object.entries(addedByRole)
    .map(([role, count]) => `${role}: ${count}`)
    .join(', ');
  const removedBreakdown = Object.entries(removedByRole)
    .map(([role, count]) => `${role}: ${count}`)
    .join(', ');

  const summary =
    `${EMOJIS.GREEN_GLOSSY_TICK} ${isDryRun ? 'Dry run ' : ''}Sync complete:\n` +
    `Members checked: ${processed} | ${isDryRun ? 'would change' : 'changed'}: ${wouldChange} | already correct: ${alreadyCorrect}\n` +
    (addedBreakdown ? `${isDryRun ? 'Would ADD' : 'Added'}: ${addedBreakdown}\n` : '') +
    (removedBreakdown ? `${isDryRun ? 'Would REMOVE' : 'Removed'}: ${removedBreakdown}` : '') +
    (failures > 0 ? `\n${EMOJIS.WARNING} Failures: ${failures} (${failedUsers.join(', ')})` : '');

  await startMessage.edit(summary);
}

async function syncMember(
  member: Parameters<typeof synchronizeProgressionRoles>[0],
  isDryRun: boolean
): Promise<{ added: number; removed: number; addedRoles: string[]; removedRoles: string[]; failed: boolean }> {
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

    // Spectator is permanent - always add if missing, never remove
    const spectatorRoleId = await (await import('../services/managedRoles.js')).getRoleId('spectator');
    const hasSpectator = spectatorRoleId && member.roles.cache.has(spectatorRoleId);

    const addedRoles: string[] = [...plan.missingRoles];
    const removedRoles: string[] = [...plan.outdatedRoles];

    if (!hasSpectator) {
      addedRoles.push('spectator');
    }

    return { added: addedRoles.length, removed: removedRoles.length, addedRoles, removedRoles, failed: false };
  } else {
    // Actually sync roles
    const syncResult = await synchronizeProgressionRoles(member, level);
    return {
      added: syncResult.addedRoles.length,
      removed: syncResult.removedRoles.length,
      addedRoles: syncResult.addedRoles,
      removedRoles: syncResult.removedRoles,
      failed: !syncResult.success,
    };
  }
}
