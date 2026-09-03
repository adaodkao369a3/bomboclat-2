import { AttachmentBuilder } from 'discord.js';
import { ROLES } from '../config/index.js';
import { getUser } from '../database/client.js';
import { PROGRESSION_ROLE_KEYS, getArcForRole } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

interface MemberProgressionData {
  userId: string;
  username: string;
  displayName: string;
  highestRole: string;
  arc: string | null;
  allRoles: string[];
  hasAudience: boolean;
  hasProgressionRole: boolean;
  currentXP: number | null;
  currentLevel: number | null;
  currentDBRole: string | null;
}

export const dataCommand: Command = {
  name: 'data',
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

    await message.reply('🔍 Fetching progression data for all members... This may take a moment.');

    const members = await message.guild.members.fetch();
    const memberData: MemberProgressionData[] = [];

    // Build a map of role IDs to role names for quick lookup
    const roleIdToName: Record<string, string> = {};
    for (const roleName of PROGRESSION_ROLE_KEYS) {
      const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
      if (roleId && roleId !== 'PLACEHOLDER_ROGUE_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_MERCENARY_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_VIGILANTE_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_RENEGADE_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_VILLAIN_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_NEMESIS_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_MASTERMIND_ROLE_ID' && 
          roleId !== 'PLACEHOLDER_OVERLORD_ROLE_ID') {
        roleIdToName[roleId] = roleName;
      }
    }

    // Determine role order for finding highest role
    const roleOrder = new Map<string, number>();
    PROGRESSION_ROLE_KEYS.forEach((role, index) => {
      roleOrder.set(role, index);
    });

    for (const [_, member] of members) {
      const userRoles: string[] = [];
      let highestRole = 'None';
      let highestRoleIndex = -1;

      // Check each progression role
      for (const roleName of PROGRESSION_ROLE_KEYS) {
        const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
        if (roleId && member.roles.cache.has(roleId)) {
          userRoles.push(roleName);
          const roleIndex = roleOrder.get(roleName) ?? -1;
          if (roleIndex > highestRoleIndex) {
            highestRole = roleName;
            highestRoleIndex = roleIndex;
          }
        }
      }

      const hasAudience = userRoles.includes('audience');
      const hasProgressionRole = userRoles.length > 0;
      const arc = highestRole !== 'None' ? getArcForRole(highestRole) : null;

      // Fetch database data if available
      let currentXP: number | null = null;
      let currentLevel: number | null = null;
      let currentDBRole: string | null = null;

      try {
        const userData = await getUser(member.user.id);
        if (userData) {
          currentXP = userData.current_xp;
          currentLevel = userData.current_level;
          currentDBRole = userData.current_progression_role;
        }
      } catch (error) {
        // If user not in database, leave as null
      }

      memberData.push({
        userId: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        highestRole,
        arc,
        allRoles: userRoles,
        hasAudience,
        hasProgressionRole,
        currentXP,
        currentLevel,
        currentDBRole,
      });
    }

    // Sort by highest role (highest progression first)
    memberData.sort((a, b) => {
      const aIndex = roleOrder.get(a.highestRole) ?? -1;
      const bIndex = roleOrder.get(b.highestRole) ?? -1;
      return bIndex - aIndex;
    });

    // Generate CSV content
    const headers = ['User ID', 'Username', 'Display Name', 'Highest Role', 'Arc', 'All Roles', 'Has Audience', 'Has Progression Role', 'Current XP', 'Current Level', 'DB Role'];
    const csvRows = [headers.join(',')];

    for (const data of memberData) {
      const row = [
        data.userId,
        `"${data.username}"`,
        `"${data.displayName}"`,
        data.highestRole,
        data.arc || 'N/A',
        `"${data.allRoles.join(', ')}"`,
        data.hasAudience ? 'Yes' : 'No',
        data.hasProgressionRole ? 'Yes' : 'No',
        data.currentXP?.toString() || 'N/A',
        data.currentLevel?.toString() || 'N/A',
        data.currentDBRole || 'N/A',
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: 'progression_data.csv' });

    // Send summary
    const summary = `✅ Fetched data for ${memberData.length} members\n` +
      `- Members with progression roles: ${memberData.filter(m => m.hasProgressionRole).length}\n` +
      `- Members with Audience: ${memberData.filter(m => m.hasAudience).length}\n` +
      `- Members in database: ${memberData.filter(m => m.currentXP !== null).length}`;

    await message.reply({
      content: summary,
      files: [attachment],
    });
  },
};
