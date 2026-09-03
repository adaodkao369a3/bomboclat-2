import { AttachmentBuilder } from 'discord.js';
import { ROLES, XP_CONFIG } from '../config/index.js';
import { PROGRESSION_ROLE_KEYS } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

interface RoleXPRange {
  roleName: string;
  level: number;
  minXP: number;
  maxXP: number;
}

interface UserRestorationData {
  userId: string;
  username: string;
  displayName: string;
  highestRole: string;
  minXP: number;
  maxXP: number;
  suggestedXP: number;
  currentXP: number | null;
  currentLevel: number | null;
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

    await message.reply('🔍 Generating XP restoration table... This is read-only and will not modify any XP.');

    const members = await message.guild.members.fetch();
    const restorationData: UserRestorationData[] = [];

    // Calculate XP ranges for each role
    const roleXPRanges: Record<string, RoleXPRange> = {};
    
    for (const roleName of PROGRESSION_ROLE_KEYS) {
      const level = XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[roleName as keyof typeof XP_CONFIG.ROLE_LEVEL_REQUIREMENTS];
      if (level === undefined) continue;

      const minXP = level === 0 ? 0 : XP_CONFIG.LEVEL_XP_REQUIREMENTS[level - 1];
      
      // Find the next role's level to determine max XP
      const currentRoleIndex = PROGRESSION_ROLE_KEYS.indexOf(roleName);
      let maxXP: number;
      
      if (currentRoleIndex < PROGRESSION_ROLE_KEYS.length - 1) {
        const nextRoleName = PROGRESSION_ROLE_KEYS[currentRoleIndex + 1];
        const nextLevel = XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[nextRoleName as keyof typeof XP_CONFIG.ROLE_LEVEL_REQUIREMENTS];
        if (nextLevel !== undefined) {
          maxXP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[nextLevel - 1] - 1;
        } else {
          // If no next level defined, use a reasonable upper bound
          maxXP = minXP + 1000;
        }
      } else {
        // Highest role - use current level's XP as max (can be extended later)
        maxXP = minXP + 1000;
      }

      roleXPRanges[roleName] = { roleName, level, minXP, maxXP };
    }

    // Determine role order for finding highest role
    const roleOrder = new Map<string, number>();
    PROGRESSION_ROLE_KEYS.forEach((role, index) => {
      roleOrder.set(role, index);
    });

    for (const [_, member] of members) {
      // Skip bots
      if (member.user.bot) continue;

      let highestRole = 'audience';
      let highestRoleIndex = -1;

      // Check each progression role
      for (const roleName of PROGRESSION_ROLE_KEYS) {
        const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
        if (roleId && roleId !== 'PLACEHOLDER_ROGUE_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_MERCENARY_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_VIGILANTE_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_RENEGADE_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_VILLAIN_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_NEMESIS_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_MASTERMIND_ROLE_ID' && 
            roleId !== 'PLACEHOLDER_OVERLORD_ROLE_ID' &&
            member.roles.cache.has(roleId)) {
          const roleIndex = roleOrder.get(roleName) ?? -1;
          if (roleIndex > highestRoleIndex) {
            highestRole = roleName;
            highestRoleIndex = roleIndex;
          }
        }
      }

      const range = roleXPRanges[highestRole];
      if (!range) continue;

      // Suggested XP: midpoint of the range
      const suggestedXP = Math.floor((range.minXP + range.maxXP) / 2);

      restorationData.push({
        userId: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        highestRole,
        minXP: range.minXP,
        maxXP: range.maxXP,
        suggestedXP,
        currentXP: null, // Will be filled from DB if needed
        currentLevel: null,
      });
    }

    // Sort by highest role (highest progression first)
    restorationData.sort((a, b) => {
      const aIndex = roleOrder.get(a.highestRole) ?? -1;
      const bIndex = roleOrder.get(b.highestRole) ?? -1;
      return bIndex - aIndex;
    });

    // Generate CSV content
    const headers = ['User ID', 'Username', 'Display Name', 'Highest Role', 'XP Minimum', 'XP Maximum', 'Suggested Restoration XP'];
    const csvRows = [headers.join(',')];

    for (const data of restorationData) {
      const row = [
        data.userId,
        `"${data.username}"`,
        `"${data.displayName}"`,
        data.highestRole,
        data.minXP.toString(),
        data.maxXP.toString(),
        data.suggestedXP.toString(),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: 'xp_restoration_table.csv' });

    // Generate role XP ranges table
    const rangeHeaders = ['Role', 'Level', 'XP Minimum', 'XP Maximum'];
    const rangeRows = [rangeHeaders.join(',')];
    
    for (const roleName of PROGRESSION_ROLE_KEYS) {
      const range = roleXPRanges[roleName];
      if (range) {
        rangeRows.push(`${roleName},${range.level},${range.minXP},${range.maxXP}`);
      }
    }

    const rangeContent = rangeRows.join('\n');
    const rangeBuffer = Buffer.from(rangeContent, 'utf-8');
    const rangeAttachment = new AttachmentBuilder(rangeBuffer, { name: 'role_xp_ranges.csv' });

    // Send summary
    const summary = `✅ Generated restoration table for ${restorationData.length} members\n` +
      `- This is READ-ONLY - no XP has been modified\n` +
      `- Review the CSV files before proceeding with actual restoration`;

    await message.reply({
      content: summary,
      files: [attachment, rangeAttachment],
    });
  },
};
