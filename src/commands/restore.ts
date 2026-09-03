import { AttachmentBuilder } from 'discord.js';
import { ROLES } from '../config/index.js';
import { PROGRESSION_ROLE_KEYS, calculateLevelFromXP, getRoleFromLevel, calculatePromotionEligibility } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { getClient } from '../database/client.js';
import { Command } from './index.js';

interface MigrationResult {
  userId: string;
  username: string;
  displayName: string;
  oldRole: string;
  restoredXP: number;
  calculatedLevel: number;
  newProgressionRole: string;
  databaseStatus: 'inserted' | 'updated' | 'error';
  errorMessage?: string;
  xpSource: 'historical' | 'estimated';
}

// Level, progression role, and promotion eligibility are all derived using
// the SAME live functions .level/.profile/$syncroles use (XP_CONFIG.LEVEL_XP_REQUIREMENTS,
// the current 60-level Cast/Anti-Hero/Villain table) - not a separate legacy
// table. Writing a level here that was computed against different thresholds
// than the ones live commands read against is exactly what produced Level 25
// on 17,060 XP (which only reaches Level 20 on the real table) and a
// hardcoded 'audience' role regardless of actual level.

export const restoreCommand: Command = {
  name: 'restore',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    await message.reply('🔄 Starting database migration... This may take a moment.');

    // Pull real, accumulated XP totals straight from the ledger instead of
    // relying on a hardcoded snapshot. This makes the command re-runnable
    // safely at any time: anyone's XP changes, `$restore` just re-syncs
    // `users` from the source of truth. A user with no rows here genuinely
    // has 0 XP - that's a correct answer, not a gap to estimate around.
    const ledgerTotals = new Map<string, number>();
    try {
      const client = await getClient();
      try {
        const result = await client.query<{ user_id: string; total_xp: string }>(
          `SELECT user_id, SUM(amount) AS total_xp
           FROM xp_transactions
           GROUP BY user_id`
        );
        for (const row of result.rows) {
          ledgerTotals.set(row.user_id, parseInt(row.total_xp, 10));
        }
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to load xp_transactions ledger:', error);
      await message.reply(`❌ Could not load XP ledger, aborting: ${errorMessage}`);
      return;
    }

    const members = await message.guild.members.fetch();
    const migrationResults: MigrationResult[] = [];
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    let botCount = 0;
    let zeroXpCount = 0;

    // Determine role order for finding highest role
    const roleOrder = new Map<string, number>();
    PROGRESSION_ROLE_KEYS.forEach((role, index) => {
      roleOrder.set(role, index);
    });

    // Ledger rows for people no longer in the guild (left the server, alt
    // account, etc.) - informational only, restore only ever touches
    // current members.
    const guildMemberIds = new Set(members.keys());
    const ledgerOnlyIds = [...ledgerTotals.keys()].filter(id => !guildMemberIds.has(id));

    for (const [_, member] of members) {
      // Skip bots
      if (member.user.bot) {
        botCount++;
        continue;
      }

      // Determine XP value
      let restoredXP: number;
      let xpSource: 'historical' | 'estimated';

      if (ledgerTotals.has(member.user.id)) {
        restoredXP = ledgerTotals.get(member.user.id) ?? 0;
        xpSource = 'historical';
      } else {
        // User not in our lists - skip them
        continue;
      }

      // Calculate level from XP
      const calculatedLevel = calculateLevelFromXP(restoredXP);

      // Determine milestone role from level
      const milestoneRole = getRoleFromLevel(calculatedLevel);

      // Upsert to database
      let databaseStatus: 'inserted' | 'updated' | 'error' = 'error';
      try {
        const client = await getClient();
        try {
          const result = await client.query<{ inserted: boolean }>(
            `INSERT INTO users (user_id, username, nickname, current_xp, current_level, current_progression_role, promotion_eligibility_percentage)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id) DO UPDATE
             SET username = EXCLUDED.username,
                 nickname = EXCLUDED.nickname,
                 current_xp = EXCLUDED.current_xp,
                 current_level = EXCLUDED.current_level,
                 current_progression_role = EXCLUDED.current_progression_role,
                 promotion_eligibility_percentage = EXCLUDED.promotion_eligibility_percentage,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING (xmax = 0) AS inserted`,
            [member.user.id, member.user.username, member.displayName, restoredXP, calculatedLevel, milestoneRole, calculatePromotionEligibility(restoredXP, calculatedLevel, milestoneRole)]
          );

          if (result.rows[0]?.inserted) {
            insertCount++;
            databaseStatus = 'inserted';
          } else {
            updateCount++;
            databaseStatus = 'updated';
          }
        } finally {
          client.release();
        }

        // Assign stacked progression roles (all roles up to target level)
        if (milestoneRole) {
          const targetIndex = PROGRESSION_ROLE_KEYS.indexOf(milestoneRole as any);
          const rolesToAdd = PROGRESSION_ROLE_KEYS.slice(0, targetIndex + 1);
          
          try {
            // Remove all progression roles beyond target
            for (const roleName of PROGRESSION_ROLE_KEYS.slice(targetIndex + 1)) {
              const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
              if (roleId && member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId, 'XP restoration - removing roles beyond target level');
              }
            }
            
            // Add all roles up to target (stacking)
            for (const roleName of rolesToAdd) {
              const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
              if (roleId && !roleId.startsWith('PLACEHOLDER_') && !member.roles.cache.has(roleId)) {
                await member.roles.add(roleId, 'XP restoration - assigning stacked progression role');
              }
            }
          } catch (roleError) {
            console.error(`Failed to assign roles for user ${member.user.id}:`, roleError);
          }
        }

        migrationResults.push({
          userId: member.user.id,
          username: member.user.username,
          displayName: member.displayName,
          oldRole: milestoneRole || 'none',
          restoredXP,
          calculatedLevel,
          newProgressionRole: milestoneRole,
          databaseStatus,
          xpSource,
        });
      } catch (error) {
        console.error(`Failed to restore user ${member.user.id}:`, error);
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        migrationResults.push({
          userId: member.user.id,
          username: member.user.username,
          displayName: member.displayName,
          oldRole: milestoneRole || 'none',
          restoredXP,
          calculatedLevel,
          newProgressionRole: milestoneRole,
          databaseStatus: 'error',
          errorMessage,
          xpSource: 'historical',
        });
      }
    }

    // Sort by restored XP (highest first)
    migrationResults.sort((a, b) => b.restoredXP - a.restoredXP);

    // Generate CSV content
    const headers = ['User ID', 'Username', 'Display Name', 'Old Role', 'Restored XP', 'Calculated Level', 'New Progression Role', 'DB Status', 'Error'];
    const csvRows = [headers.join(',')];

    for (const result of migrationResults) {
      const row = [
        result.userId,
        `"${result.username}"`,
        `"${result.displayName}"`,
        result.oldRole,
        result.restoredXP.toString(),
        result.calculatedLevel.toString(),
        result.newProgressionRole,
        result.databaseStatus,
        result.errorMessage ? `"${result.errorMessage.replace(/"/g, '""')}"` : '',
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: 'migration_report.csv' });

    // Send summary
    const summary = `✅ Migration Complete\n` +
      `- Total humans in guild: ${members.size - botCount}\n` +
      `- Users restored: ${migrationResults.length}\n` +
      `- Users with real ledger XP: ${migrationResults.length - zeroXpCount}\n` +
      `- Users at 0 XP (no ledger rows): ${zeroXpCount}\n` +
      `- Database inserts: ${insertCount}\n` +
      `- Database updates: ${updateCount}\n` +
      `- Bots excluded: ${botCount}\n` +
      `- Errors: ${errorCount}\n` +
      `- Ledger rows for users no longer in guild: ${ledgerOnlyIds.length}\n\n` +
      `📊 Full report attached as migration_report.csv\n\n` +
      `⚠️ This updates the database only. Run \`$syncroles\` next to apply the correct Discord role to everyone based on their restored level.`;

    let errorSample = '';
    if (errorCount > 0) {
      const firstError = migrationResults.find(r => r.databaseStatus === 'error');
      if (firstError?.errorMessage) {
        errorSample = `\n\n⚠️ Sample error (${firstError.username}): ${firstError.errorMessage}`;
      }
    }

    if (ledgerOnlyIds.length > 0) {
      console.warn('Ledger has XP for users no longer in guild:', ledgerOnlyIds);
    }

    await message.reply({
      content: summary + errorSample,
      files: [attachment],
    });
  },
};
