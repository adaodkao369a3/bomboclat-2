import { AttachmentBuilder } from 'discord.js';
import { ROLES } from '../config/index.js';
import { PROGRESSION_ROLE_KEYS } from '../services/xp.js';
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
  databaseStatus: 'inserted' | 'updated' | 'error';
  errorMessage?: string;
}

// Legacy 25-level XP thresholds used only for restoring historical XP.
// This is intentionally separate from XP_CONFIG.LEVEL_XP_REQUIREMENTS, which
// now holds the new extended 60-level progression table (Anti-Hero/Villain
// arcs). That table is for the *new* progression roles we're rolling out
// later - it is not the table historical levels were calculated against.
const LEGACY_LEVEL_XP_REQUIREMENTS: number[] = [
  50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750,
  3300, 3900, 4550, 5250, 6000, 6800, 7650, 8550, 9500, 10500,
  11550, 12650, 13800, 15000, 16250,
];

// Calculate level from XP using the legacy 25-level threshold table.
// Level is the highest threshold reached; below the Level 1 threshold (50 XP)
// the user is Level 0.
function calculateLevelFromXP(xp: number): number {
  for (let i = LEGACY_LEVEL_XP_REQUIREMENTS.length - 1; i >= 0; i--) {
    if (xp >= LEGACY_LEVEL_XP_REQUIREMENTS[i]) {
      return i + 1;
    }
  }
  return 0;
}

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

      let oldRole = 'audience';
      let oldRoleIndex = -1;

      // Check each progression role (old Cast roles only)
      const oldRoles = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
      for (const roleName of oldRoles) {
        const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
        if (roleId && member.roles.cache.has(roleId)) {
          const roleIndex = roleOrder.get(roleName) ?? -1;
          if (roleIndex > oldRoleIndex) {
            oldRole = roleName;
            oldRoleIndex = roleIndex;
          }
        }
      }

      const restoredXP = ledgerTotals.get(member.user.id) ?? 0;
      if (restoredXP === 0) {
        zeroXpCount++;
      }
      const calculatedLevel = calculateLevelFromXP(restoredXP);

      // Upsert to database in a single atomic statement. This makes the
      // migration idempotent (safe to re-run): a user_id that already
      // exists gets its XP/level/username/nickname reset to the same
      // deterministic values instead of a duplicate row being created, and
      // `xmax = 0` tells us whether Postgres actually inserted or updated
      // the row, rather than guessing from a pre-fetched value.
      let databaseStatus: 'inserted' | 'updated' | 'error' = 'error';
      let errorMessage: string | undefined;
      try {
        const client = await getClient();
        try {
          const result = await client.query<{ inserted: boolean }>(
            `INSERT INTO users (user_id, username, nickname, current_xp, current_level, current_progression_role)
             VALUES ($1, $2, $3, $4, $5, 'audience')
             ON CONFLICT (user_id) DO UPDATE
             SET username = EXCLUDED.username,
                 nickname = EXCLUDED.nickname,
                 current_xp = EXCLUDED.current_xp,
                 current_level = EXCLUDED.current_level,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING (xmax = 0) AS inserted`,
            [member.user.id, member.user.username, member.displayName, restoredXP, calculatedLevel]
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

        migrationResults.push({
          userId: member.user.id,
          username: member.user.username,
          displayName: member.displayName,
          oldRole,
          restoredXP,
          calculatedLevel,
          databaseStatus,
        });
      } catch (error) {
        // Do not swallow the error - surface it in the report so it can
        // actually be diagnosed instead of just showing "error".
        errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to restore user ${member.user.id}:`, error);
        errorCount++;
        migrationResults.push({
          userId: member.user.id,
          username: member.user.username,
          displayName: member.displayName,
          oldRole,
          restoredXP,
          calculatedLevel,
          databaseStatus: 'error',
          errorMessage,
        });
      }
    }

    // Sort by restored XP (highest first)
    migrationResults.sort((a, b) => b.restoredXP - a.restoredXP);

    // Generate CSV content
    const headers = ['User ID', 'Username', 'Display Name', 'Old Role', 'Restored XP', 'Calculated Level', 'DB Status', 'Error'];
    const csvRows = [headers.join(',')];

    for (const result of migrationResults) {
      const row = [
        result.userId,
        `"${result.username}"`,
        `"${result.displayName}"`,
        result.oldRole,
        result.restoredXP.toString(),
        result.calculatedLevel.toString(),
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
      `📊 Full report attached as migration_report.csv`;

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
