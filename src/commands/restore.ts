import { AttachmentBuilder } from 'discord.js';
import { ROLES, XP_CONFIG } from '../config/index.js';
import { PROGRESSION_ROLE_KEYS } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { getOrCreateUser } from '../database/client.js';
import { Command } from './index.js';

interface MigrationResult {
  userId: string;
  username: string;
  displayName: string;
  oldRole: string;
  restoredXP: number;
  calculatedLevel: number;
  databaseStatus: 'inserted' | 'updated' | 'error';
  xpSource: 'historical' | 'estimated';
}

// Historical XP from level-up messages - exact values to preserve
const HISTORICAL_XP: Record<string, number> = {
  '1320436656263921782': 16252, // masak_43 | Lead Cast
  '1486425285657100419': 9505,  // .__mhm | Principal Cast
  '1408843623897763930': 4555,  // heaven_or_las_v3gas | Supporting Cast
  '797874751367676004': 4550,   // twinkrailer. | Supporting Cast
  '1320999493545758744': 1808,  // menoxis | Featured Extra
  '785482941312270346': 507,    // hyphxenated | Extra
  '927938391578931250': 514,    // _zsm_ | Extra
  '775648864753418280': 509,    // callmepooks | Extra
  '1100881140438532116': 501,  // llv_slobe | Extra
  '482977288728608808': 513,    // xravvx | Extra
  '992312778029289473': 1057,   // killualechinois | Extra
  '739599791255978076': 512,    // _.menace__. | Extra
  '746468454424510554': 22,     // me.a.h. | Audience
  '889055760099704842': 41,     // efisko | Audience
  '1394073597210792006': 57,    // supercoolgangsterfromthehood | Audience
};

// Audience users without historical XP - will get estimated XP (0-499 range)
const AUDIENCE_USERS: string[] = [
  '936978686836633621',  // __azurezure._
  '1384899424517361725', // z3llieri
  '773128263337771018',  // aquaop_
  '443911008579223573',  // diaaliciouss
  '1132338393813110855', // ishowchad
  '1507093269790593025', // jade00z
  '228271931143618560',  // draethful
  '1466894939781726289', // ieatbreadforbreakfast
  '1152956700664541254', // nse99
  '1448243031588212836', // histopathologygod
  '1283190433039519895', // _dtxmari
  '400871221119680512',  // mar.io0
  '1407143212384125019', // badwyd
  '1207473328475082803', // nyaisss
  '932078798155960350',  // h.eli.copter
  '1110239151632171058', // xxliaxx152715
  '793355426225324033',  // toodledum
  '1148702932020252753', // babyhipp
  '1289446751425794139', // lighthouse12345
  '1452795397163581531', // 47idu
  '1346808771246034985', // ogcorosino
  '1380967897735893032', // xrs.na
  '873888077570015242',  // fentastyy
  '1535781372462108774', // c00lkidd0716
  '856143981557186600',  // 74kay.
  '879944477794508810',  // .ace_17
  '1041141477599887391', // im.kras
  '309492476572336130',  // rom1894
  '766705681188257822',  // kevwithabevv
  '1399052354740945069', // ar_cane05
  '1235438119226966127', // pookieboy.i
  '685925536928759865',  // eagle_ea
  '1437078669750308885', // sfaway
  '417419330108522507',  // inspired_cookie
  '1423670184140476498', // nizzoo0854
  '1164907857460871228', // rsr.sv
  '1121616065726795916', // ghost_989.
  '767948714639360002',  // wsiren.zo
  '1521573693677899957', // zoyalovesasaprocky
  '1427532053280325735', // fuyu._.no
  '200841206941351947',  // daviid
  '1117753896924872808', // aestavo
];

// Calculate level from XP using the new threshold system
function calculateLevelFromXP(xp: number): number {
  for (let i = XP_CONFIG.LEVEL_XP_REQUIREMENTS.length - 1; i >= 0; i--) {
    if (xp >= XP_CONFIG.LEVEL_XP_REQUIREMENTS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// Estimate XP for Audience users with natural spread (0-499 range)
function estimateAudienceXP(userId: string): number {
  // Use hash of user ID to create deterministic but varied distribution
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const normalizedHash = (hash % 100) / 100; // 0 to 1
  
  // Spread through 0-499 range (avoid edges)
  const min = 50;  // 10% padding from bottom
  const max = 449; // 10% padding from top
  const range = max - min;
  
  return Math.floor(min + (normalizedHash * range));
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

    await message.reply('� Starting database migration... This may take a moment.');

    const members = await message.guild.members.fetch();
    const migrationResults: MigrationResult[] = [];
    let historicalCount = 0;
    let estimatedCount = 0;
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    let botCount = 0;
    let missingFromGuild: string[] = [];

    // Determine role order for finding highest role
    const roleOrder = new Map<string, number>();
    PROGRESSION_ROLE_KEYS.forEach((role, index) => {
      roleOrder.set(role, index);
    });

    // Check which historical users are in the guild
    const guildMemberIds = new Set(members.keys());
    for (const userId of Object.keys(HISTORICAL_XP)) {
      if (!guildMemberIds.has(userId)) {
        missingFromGuild.push(userId);
      }
    }

    // Check which audience users are in the guild
    for (const userId of AUDIENCE_USERS) {
      if (!guildMemberIds.has(userId)) {
        missingFromGuild.push(userId);
      }
    }

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

      // Determine XP value
      let restoredXP: number;
      let xpSource: 'historical' | 'estimated';

      if (HISTORICAL_XP[member.user.id]) {
        restoredXP = HISTORICAL_XP[member.user.id];
        xpSource = 'historical';
        historicalCount++;
      } else if (AUDIENCE_USERS.includes(member.user.id)) {
        restoredXP = estimateAudienceXP(member.user.id);
        xpSource = 'estimated';
        estimatedCount++;
      } else {
        // User not in our lists - skip them
        continue;
      }

      // Calculate level from XP
      const calculatedLevel = calculateLevelFromXP(restoredXP);

      // Upsert to database
      let databaseStatus: 'inserted' | 'updated' | 'error' = 'error';
      try {
        const user = await getOrCreateUser(
          member.user.id,
          member.user.username,
          member.displayName
        );

        // Check if this is an insert or update based on current XP
        if (user.current_xp === 0) {
          insertCount++;
          databaseStatus = 'inserted';
        } else {
          updateCount++;
          databaseStatus = 'updated';
        }

        // Set XP directly in database (bypass normal XP award to avoid rewards/announcements)
        const client = await (await import('../database/client.js')).getClient();
        try {
          await client.query(
            `UPDATE users 
             SET current_xp = $1, current_level = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $3`,
            [restoredXP, calculatedLevel, member.user.id]
          );
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
          xpSource,
        });
      } catch (error) {
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
          xpSource,
        });
      }
    }

    // Sort by restored XP (highest first)
    migrationResults.sort((a, b) => b.restoredXP - a.restoredXP);

    // Generate CSV content
    const headers = ['User ID', 'Username', 'Display Name', 'Old Role', 'Restored XP', 'Calculated Level', 'DB Status', 'XP Source'];
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
        result.xpSource,
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
      `- Historical XP used: ${historicalCount}\n` +
      `- Estimated XP used: ${estimatedCount}\n` +
      `- Database inserts: ${insertCount}\n` +
      `- Database updates: ${updateCount}\n` +
      `- Bots excluded: ${botCount}\n` +
      `- Errors: ${errorCount}\n` +
      `- IDs missing from guild: ${missingFromGuild.length}\n\n` +
      `📊 Full report attached as migration_report.csv`;

    if (missingFromGuild.length > 0) {
      console.warn('IDs missing from guild:', missingFromGuild);
    }

    await message.reply({
      content: summary,
      files: [attachment],
    });
  },
};
