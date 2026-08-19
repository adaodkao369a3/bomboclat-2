import { XP_CONFIG, ROLES } from '../config/index.js';
import { GuildMember } from 'discord.js';

export const PROGRESSION_ROLE_KEYS = [
  'audience',
  'extra',
  'featured_extra',
  'supporting_cast',
  'principal_cast',
  'lead_cast',
] as const;

export type ProgressionRoleName = (typeof PROGRESSION_ROLE_KEYS)[number];

export function calculateMessageXP(): number {
  const min = XP_CONFIG.MESSAGE_XP_MIN;
  const max = XP_CONFIG.MESSAGE_XP_MAX;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateLevelFromXP(totalXP: number): number {
  if (Number.isNaN(totalXP) || totalXP <= 0) return 0;

  const requirements = XP_CONFIG.LEVEL_XP_REQUIREMENTS;
  let level = 0;
  
  for (let i = 0; i < requirements.length; i++) {
    if (totalXP >= requirements[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  return level;
}

export function calculateXPForLevel(level: number): number {
  const requirements = XP_CONFIG.LEVEL_XP_REQUIREMENTS;
  if (level <= 0) return 0;
  if (level > requirements.length) {
    // Extrapolate for levels beyond defined requirements
    const lastLevel = requirements.length;
    const lastXP = requirements[lastLevel - 1];
    const extrapolatedXP = lastXP + (level - lastLevel) * Math.floor(lastXP * 0.5);
    return extrapolatedXP;
  }
  return requirements[level - 1];
}

export function calculatePromotionEligibility(
  _currentXP: number,
  currentLevel: number,
  currentRole: string
): number {
  const roleKeys = Object.keys(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS);
  const currentIndex = roleKeys.indexOf(currentRole);

  if (currentIndex === -1 || currentIndex >= roleKeys.length - 1) {
    return 100.0; // Already at highest role
  }

  const nextRole = roleKeys[currentIndex + 1];
  const requiredLevel = XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[nextRole as keyof typeof XP_CONFIG.ROLE_LEVEL_REQUIREMENTS] || 999;

  if (currentLevel >= requiredLevel) {
    return 100.0;
  }

  const previousLevel = XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[currentRole as keyof typeof XP_CONFIG.ROLE_LEVEL_REQUIREMENTS] || 0;
  const levelGap = requiredLevel - previousLevel;
  const levelProgress = currentLevel - previousLevel;

  if (levelGap <= 0) return 100.0;

  const basePercentage = (levelProgress / levelGap) * 100;
  const obfuscated = Math.pow(basePercentage, 0.9);

  return Math.min(Math.max(obfuscated, 0.0), 100.0);
}

export function getRoleFromLevel(level: number): string {
  const rolesByLevel = Object.entries(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS).map(([role, lvl]) => [lvl, role]);

  let highestRole = 'audience';
  for (const [roleLevel, roleName] of rolesByLevel) {
    if (level >= (roleLevel as number)) {
      highestRole = roleName as string;
    }
  }

  return highestRole;
}

export interface ProgressionRolePlan {
  targetRole: ProgressionRoleName;
  expectedRoles: ProgressionRoleName[];
  missingRoles: ProgressionRoleName[];
  outdatedRoles: ProgressionRoleName[];
}

export function getProgressionRolePlan(
  level: number,
  assignedRoles: ReadonlySet<string>
): ProgressionRolePlan {
  const targetRole = getRoleFromLevel(level) as ProgressionRoleName;
  const targetIndex = PROGRESSION_ROLE_KEYS.indexOf(targetRole);
  const expectedRoles = PROGRESSION_ROLE_KEYS.slice(0, targetIndex + 1);
  const missingRoles = expectedRoles.filter(role => !assignedRoles.has(role));
  const outdatedRoles = PROGRESSION_ROLE_KEYS.filter(
    role => assignedRoles.has(role) && !expectedRoles.includes(role)
  );

  return { targetRole, expectedRoles, missingRoles, outdatedRoles };
}

export function calculateXPToNextLevel(_currentXP: number, currentLevel: number): number {
  const nextLevelXP = calculateXPForLevel(currentLevel + 1);
  const currentLevelXP = calculateXPForLevel(currentLevel);
  return nextLevelXP - currentLevelXP;
}

export function calculateXPRemaining(currentXP: number, currentLevel: number): number {
  const nextLevelXP = calculateXPForLevel(currentLevel + 1);
  return nextLevelXP - currentXP;
}

export function calculateProgressPercentage(currentXP: number, currentLevel: number): number {
  const nextLevelXP = calculateXPForLevel(currentLevel + 1);
  const currentLevelXP = calculateXPForLevel(currentLevel);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;

  if (xpNeededForNextLevel <= 0) return 100;
  return Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);
}

export function getNextProgressionThreshold(currentRole: string): number {
  const roleKeys = Object.keys(XP_CONFIG.ROLE_LEVEL_REQUIREMENTS);
  const currentIndex = roleKeys.indexOf(currentRole);

  if (currentIndex === -1 || currentIndex >= roleKeys.length - 1) {
    return 0; // Already at highest role
  }

  const nextRole = roleKeys[currentIndex + 1];
  return XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[nextRole as keyof typeof XP_CONFIG.ROLE_LEVEL_REQUIREMENTS] || 0;
}

export async function addProgressionRole(member: GuildMember, roleName: string): Promise<boolean> {
  if (!member.guild) return false;
  
  const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
  if (!roleId) {
    console.error(`Unknown progression role: ${roleName}`);
    return false;
  }
  
  const role = member.guild.roles.cache.get(roleId);
  if (!role) {
    console.error(`Role ${roleId} not found in guild`);
    return false;
  }
  
  try {
    await member.roles.add(role, 'XP progression system: role stacking');
    console.log(`Added role ${roleName} to user ${member.id}`);
    return true;
  } catch (error) {
    console.error(`Failed to add role ${roleName} to user ${member.id}:`, error);
    return false;
  }
}

export async function verifyRoleAssignment(member: GuildMember, roleName: string): Promise<boolean> {
  if (!member.guild) return false;
  
  const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
  if (!roleId) return false;
  
  return member.roles.cache.has(roleId);
}

export async function rollbackRoles(member: GuildMember, roleNames: string[]): Promise<void> {
  if (!member.guild || !roleNames.length) return;
  
  for (const roleName of roleNames) {
    const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
    if (!roleId) continue;
    
    const role = member.guild.roles.cache.get(roleId);
    if (role && member.roles.cache.has(roleId)) {
      try {
        await member.roles.remove(role, 'XP progression system: rollback');
        console.log(`Rolled back role ${roleName} from user ${member.id}`);
      } catch (error) {
        console.error(`Failed to rollback role ${roleName} from user ${member.id}:`, error);
      }
    }
  }
}

export interface ProgressionRoleSyncResult {
  success: boolean;
  addedRoles: ProgressionRoleName[];
  removedRoles: ProgressionRoleName[];
}

export async function synchronizeProgressionRoles(
  member: GuildMember,
  targetLevel: number
): Promise<ProgressionRoleSyncResult> {
  const assignedRoles = new Set<string>();
  for (const roleName of PROGRESSION_ROLE_KEYS) {
    const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
    if (roleId && member.roles.cache.has(roleId)) {
      assignedRoles.add(roleName);
    }
  }

  const plan = getProgressionRolePlan(targetLevel, assignedRoles);
  const addedRoles: ProgressionRoleName[] = [];
  const removedRoles: ProgressionRoleName[] = [];

  for (const roleName of plan.missingRoles) {
    const success = await addProgressionRole(member, roleName);
    if (!success || !(await verifyRoleAssignment(member, roleName))) {
      await rollbackRoles(member, addedRoles);
      return { success: false, addedRoles: [], removedRoles: [] };
    }
    addedRoles.push(roleName);
  }

  for (const roleName of plan.outdatedRoles) {
    const roleId = ROLES[roleName.toUpperCase() as keyof typeof ROLES];
    const role = roleId ? member.guild?.roles.cache.get(roleId) : undefined;
    if (!role) {
      await rollbackRoles(member, addedRoles);
      return { success: false, addedRoles: [], removedRoles: [] };
    }

    try {
      await member.roles.remove(role, 'XP progression system: removing outdated role');
      if (await verifyRoleAssignment(member, roleName)) {
        throw new Error(`Role ${roleName} is still assigned after removal`);
      }
      removedRoles.push(roleName);
    } catch (error) {
      console.error(`Failed to remove progression role ${roleName}:`, error);
      await rollbackRoles(member, addedRoles);
      for (const restoredRoleName of removedRoles) {
        await addProgressionRole(member, restoredRoleName);
      }
      return { success: false, addedRoles: [], removedRoles: [] };
    }
  }

  return { success: true, addedRoles, removedRoles };
}

export class AntiSpamValidator {
  private userMessageHistory: Map<string, Array<{ content: string; timestamp: number }>> = new Map();
  private userLastXPTime: Map<string, number> = new Map();
  private lastDailyReset: number = Date.now();
  private readonly MAX_HISTORY_SIZE = 50;
  private readonly CLEANUP_INTERVAL_MS = 300000; // 5 minutes
  private lastCleanup: number = Date.now();

  private cleanupOldEntries(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL_MS) return;

    this.lastCleanup = now;
    const cutoffTime = now - XP_CONFIG.SPAM_DETECTION_WINDOW_SECONDS * 1000;

    for (const [userId, history] of this.userMessageHistory.entries()) {
      const filtered = history.filter(entry => entry.timestamp > cutoffTime);
      if (filtered.length === 0) {
        this.userMessageHistory.delete(userId);
      } else {
        this.userMessageHistory.set(userId, filtered);
      }
    }

    // Clean up users who haven't been active recently
    for (const [userId, lastXPTime] of this.userLastXPTime.entries()) {
      if (now - lastXPTime > 86400000) { // 24 hours
        this.userLastXPTime.delete(userId);
      }
    }
  }

  isMessageEligible(userId: string, messageContent: string, currentDailyXP: number): { eligible: boolean; reason: string } {
    const now = Date.now();

    // Reset daily tracking if needed
    if (now - this.lastDailyReset >= 86400000) { // 24 hours
      this.userMessageHistory.clear();
      this.userLastXPTime.clear();
      this.lastDailyReset = now;
    }

    // Periodic cleanup
    this.cleanupOldEntries();

    // Check daily XP cap
    if (currentDailyXP >= XP_CONFIG.DAILY_XP_CAP) {
      return { eligible: false, reason: 'Daily XP cap reached' };
    }

    // Check message length
    if (messageContent.length < XP_CONFIG.MIN_MESSAGE_LENGTH) {
      return { eligible: false, reason: 'Message too short' };
    }

    // Check cooldown
    const lastXPTime = this.userLastXPTime.get(userId);
    if (lastXPTime) {
      const cooldownRemaining = (now - lastXPTime) / 1000;
      if (cooldownRemaining < XP_CONFIG.MESSAGE_COOLDOWN_SECONDS) {
        return { eligible: false, reason: 'Message cooldown active' };
      }
    }

    // Check for rapid spam (too many messages in short time)
    const history = this.userMessageHistory.get(userId) || [];
    const recentMessages = history.filter(entry => now - entry.timestamp < XP_CONFIG.SPAM_DETECTION_WINDOW_SECONDS * 1000);
    if (recentMessages.length > 10) {
      return { eligible: false, reason: 'Rapid message spam detected' };
    }

    // Check for duplicate spam
    const duplicateCount = recentMessages.filter(entry => entry.content === messageContent).length;
    if (duplicateCount >= XP_CONFIG.DUPLICATE_MESSAGE_THRESHOLD) {
      return { eligible: false, reason: 'Duplicate message limit reached' };
    }

    return { eligible: true, reason: 'Eligible' };
  }

  recordMessage(userId: string, messageContent: string, awardedXP: boolean): void {
    const now = Date.now();

    // Add to message history
    if (!this.userMessageHistory.has(userId)) {
      this.userMessageHistory.set(userId, []);
    }

    const history = this.userMessageHistory.get(userId)!;
    history.push({ content: messageContent, timestamp: now });

    // Keep only recent messages for spam detection
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }

    // Update last XP time if awarded
    if (awardedXP) {
      this.userLastXPTime.set(userId, now);
    }
  }
}
