import { Guild, GuildMember } from 'discord.js';
import { getUser, getOrCreateUser, getClient } from '../database/client.js';
import { synchronizeProgressionRoles, getProgressionRolePlan } from './xp.js';
import { getRoleId } from './managedRoles.js';

export interface AuditSummary {
  membersChecked: number;
  rolesAdded: number;
  rolesRemoved: number;
  rolesRecreated: number;
  failures: number;
  failedMembers: string[];
}

/**
 * Daily role audit - ensures all members have correct roles based on their database level
 */
export async function runRoleAudit(guild: Guild): Promise<AuditSummary> {
  const summary: AuditSummary = {
    membersChecked: 0,
    rolesAdded: 0,
    rolesRemoved: 0,
    rolesRecreated: 0,
    failures: 0,
    failedMembers: [],
  };

  try {
    // Check audit mode
    const mode = await getAuditMode();

    if (mode === 'log') {
      console.log('[roleAudit] Running in LOG mode - will not actually change roles');
    } else if (mode === 'off') {
      console.log('[roleAudit] Audit is disabled');
      return summary;
    }

    // Fetch all non-bot members
    const members = await guild.members.fetch();
    const nonBotMembers = members.filter(m => !m.user.bot);

    console.log(`[roleAudit] Starting audit for ${nonBotMembers.size} members (mode: ${mode})`);

    for (const member of nonBotMembers.values()) {
      try {
        // Get or create user (new members default to level 0)
        const userData = await getOrCreateUser(
          member.user.id,
          member.user.username,
          member.user.displayName
        );

        const level = userData.current_level;

        if (mode === 'log') {
          // In log mode, calculate what would change without actually doing it
          // Use getUser instead of getOrCreateUser to avoid creating database rows
          const userData = await getUser(member.user.id);
          if (!userData) {
            console.log(`[roleAudit] [LOG] ${member.user.username} has no database record - would be created as level 0`);
            summary.membersChecked++;
            continue;
          }

          const level = userData.current_level;

          // Calculate what roles would be added/removed
          const assignedRoles = new Set<string>();
          for (const roleName of ['spectator', 'civilian', 'sidekick', 'hero', 'champion', 'guardian', 'superhero', 'antiHero', 'rogue', 'renegade', 'outlaw', 'villain', 'mastermind', 'kingpin', 'overlord', 'tyrant', 'emperor', 'saint'] as const) {
            const roleId = await getRoleId(roleName);
            if (roleId && member.roles.cache.has(roleId)) {
              assignedRoles.add(roleName);
            }
          }

          const plan = getProgressionRolePlan(level, assignedRoles);

          // Spectator is permanent - always add if missing, never remove
          const spectatorRoleId = await getRoleId('spectator');
          const hasSpectator = spectatorRoleId && member.roles.cache.has(spectatorRoleId);

          const wouldAdd = [...plan.missingRoles];
          if (!hasSpectator) {
            wouldAdd.push('spectator');
          }

          if (wouldAdd.length > 0 || plan.outdatedRoles.length > 0) {
            console.log(`[roleAudit] [LOG] ${member.user.username} (level ${level}):`);
            if (wouldAdd.length > 0) {
              console.log(`  Would add: ${wouldAdd.join(', ')}`);
            }
            if (plan.outdatedRoles.length > 0) {
              console.log(`  Would remove: ${plan.outdatedRoles.join(', ')}`);
            }
          }

          summary.membersChecked++;
        } else {
          // Normal mode: actually sync roles
          const syncResult = await synchronizeProgressionRoles(member, level);

          summary.membersChecked++;
          summary.rolesAdded += syncResult.addedRoles.length;
          summary.rolesRemoved += syncResult.removedRoles.length;

          if (!syncResult.success) {
            summary.failures++;
            summary.failedMembers.push(member.user.username);
            console.error(`[roleAudit] Failed to sync roles for ${member.user.username}: ${syncResult.failedRoles.join(', ')}`);
          }
        }

        // Small delay between role changes to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        summary.failures++;
        summary.failedMembers.push(member.user.username);
        console.error(`[roleAudit] Error processing member ${member.user.username}:`, error);
      }
    }

    console.log(`[roleAudit] Audit complete: ${summary.membersChecked} checked, ${summary.rolesAdded} added, ${summary.rolesRemoved} removed, ${summary.failures} failures`);
  } catch (error) {
    console.error('[roleAudit] Fatal error during audit:', error);
  }

  return summary;
}

/**
 * Assign roles to a joining member based on their database level
 */
export async function assignRolesOnJoin(member: GuildMember): Promise<void> {
  try {
    // Get or create user (defaults to level 0 = spectator)
    const userData = await getOrCreateUser(
      member.user.id,
      member.user.username,
      member.user.displayName
    );

    const level = userData.current_level;
    const syncResult = await synchronizeProgressionRoles(member, level);

    if (!syncResult.success) {
      console.error(`[roleAudit] Failed to assign roles to joining member ${member.user.username}: ${syncResult.failedRoles.join(', ')}`);
    } else {
      console.log(`[roleAudit] Assigned roles to joining member ${member.user.username} (level ${level})`);
    }
  } catch (error) {
    console.error(`[roleAudit] Error assigning roles to joining member ${member.user.username}:`, error);
  }
}

/**
 * Lightweight startup check for members without progression roles or Spectator
 */
export async function startupRoleCheck(guild: Guild): Promise<void> {
  try {
    const members = await guild.members.fetch();
    const nonBotMembers = members.filter(m => !m.user.bot);

    const spectatorId = await getRoleId('spectator');
    if (!spectatorId) {
      console.error('[roleAudit] Spectator role ID not found');
      return;
    }

    let checked = 0;
    let fixed = 0;

    for (const member of nonBotMembers.values()) {
      try {
        // Check if member has no progression role and no Spectator
        const hasSpectator = member.roles.cache.has(spectatorId);

        // Check for progression roles by ID using getRoleId
        const progressionKeys = ['civilian', 'sidekick', 'hero', 'champion', 'guardian', 'superhero', 'antiHero', 'rogue', 'renegade', 'outlaw', 'villain', 'mastermind', 'kingpin', 'overlord', 'tyrant', 'emperor', 'saint'] as const;
        let hasProgressionRole = false;
        for (const key of progressionKeys) {
          const roleId = await getRoleId(key);
          if (roleId && member.roles.cache.has(roleId)) {
            hasProgressionRole = true;
            break;
          }
        }

        if (!hasSpectator && !hasProgressionRole) {
          // Assign roles based on database level
          await assignRolesOnJoin(member);
          fixed++;
        }

        checked++;
      } catch (error) {
        console.error(`[roleAudit] Error in startup check for ${member.user.username}:`, error);
      }
    }

    console.log(`[roleAudit] Startup check complete: ${checked} checked, ${fixed} fixed`);
  } catch (error) {
    console.error('[roleAudit] Error during startup role check:', error);
  }
}

/**
 * Get last run time from settings table
 */
export async function getLastAuditRun(): Promise<Date | null> {
  const { getClient } = await import('../database/client.js');
  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT value FROM public.settings WHERE key = 'last_role_audit_run'"
    );
    
    if (result.rows.length > 0) {
      return new Date(result.rows[0].value);
    }
    
    return null;
  } finally {
    client.release();
  }
}

/**
 * Set last run time in settings table
 */
export async function setLastAuditRun(date: Date): Promise<void> {
  const { getClient } = await import('../database/client.js');
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO public.settings (key, value, updated_at)
       VALUES ('last_role_audit_run', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = CURRENT_TIMESTAMP`,
      [date.toISOString()]
    );
  } finally {
    client.release();
  }
}

/**
 * Check if audit should run (04:00 America/New_York, once per day)
 */
export function shouldRunAudit(): boolean {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Target time: 04:00 AM
  const targetHour = 4;
  const targetMinute = 0;
  
  // Check if we're at or past the target time today
  const currentHour = nyTime.getHours();
  const currentMinute = nyTime.getMinutes();
  
  // Run if we're at 04:00 or later but haven't run yet today
  // This will be checked against the last run time in the scheduler
  return currentHour >= targetHour && currentMinute >= targetMinute;
}

/**
 * Get audit mode from settings (off / log / on)
 */
export async function getAuditMode(): Promise<'off' | 'log' | 'on'> {
  const client = await getClient();
  try {
    const result = await client.query('SELECT value FROM public.settings WHERE key = $1', ['role_audit_mode']);
    if (result.rows.length > 0) {
      const mode = result.rows[0].value;
      if (mode === 'off' || mode === 'log' || mode === 'on') {
        return mode;
      }
    }
    return 'off'; // Default to off
  } finally {
    client.release();
  }
}

/**
 * Check if audit is overdue (bot was down at scheduled time)
 */
export async function isAuditOverdue(): Promise<boolean> {
  // Check if audit is disabled or in log mode
  const mode = await getAuditMode();
  if (mode === 'off') {
    return false;
  }

  const lastRun = await getLastAuditRun();

  if (!lastRun) {
    return false; // Never run - wait for next scheduled 04:00
  }

  const now = new Date();
  const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nyLastRun = new Date(lastRun.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  // Check if last run was before today at 04:00
  const todayAt4AM = new Date(nyNow);
  todayAt4AM.setHours(4, 0, 0, 0);
  
  return nyLastRun < todayAt4AM && nyNow >= todayAt4AM;
}
