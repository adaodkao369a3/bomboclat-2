import { XP_CONFIG, ROLES } from '../config/index.js';
import { GuildMember } from 'discord.js';
import { 
  getOrCreateUser, 
  getUser, 
  addUserXP, 
  setUserLevel, 
  setUserProgressionRole, 
  updatePromotionEligibility, 
  setDailyBonusPaid, 
  resetDailyXP 
} from '../database/client.js';
import { ResidualsService } from './residuals.js';

export const PROGRESSION_ROLE_KEYS = [
  // CAST ARC
  'audience',
  'extra',
  'featured_extra',
  'supporting_cast',
  'principal_cast',
  'lead_cast',
  // ANTI-HERO ARC
  'rogue',
  'mercenary',
  'vigilante',
  'renegade',
  // VILLAIN ARC
  'villain',
  'nemesis',
  'mastermind',
  'overlord',
] as const;

// Arc definitions for cleanup logic
export const ARCS: Record<string, ProgressionRoleName[]> = {
  CAST: ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'],
  ANTI_HERO: ['rogue', 'mercenary', 'vigilante', 'renegade'],
  VILLAIN: ['villain', 'nemesis', 'mastermind', 'overlord'],
};

// Arc thresholds - which role marks the start of each arc
export const ARC_START_ROLES = {
  CAST: 'audience',
  ANTI_HERO: 'rogue',
  VILLAIN: 'villain',
} as const;

export type ArcName = keyof typeof ARCS;
export type ProgressionRoleName = (typeof PROGRESSION_ROLE_KEYS)[number];

// Calculate residuals awarded on level-up (10-100 range, scaling with level)
// Increased max to 100 to accommodate the extended 60-level progression
export function calculateLevelUpResiduals(newLevel: number): number {
  const maxLevel = XP_CONFIG.LEVEL_XP_REQUIREMENTS.length;
  const normalizedLevel = Math.min(newLevel, maxLevel) / maxLevel;
  const minResiduals = 10;
  const maxResiduals = 100;
  return Math.floor(minResiduals + (maxResiduals - minResiduals) * normalizedLevel);
}

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

// Helper function to determine which arc a role belongs to
export function getArcForRole(roleName: string): ArcName | null {
  for (const [arcName, roles] of Object.entries(ARCS)) {
    if (roles.includes(roleName as ProgressionRoleName)) {
      return arcName as ArcName;
    }
  }
  return null;
}

// Helper function to get all roles in an arc up to and including a target role
export function getRolesInArcUpTo(arcName: ArcName, targetRole: ProgressionRoleName): ProgressionRoleName[] {
  const arcRoles = ARCS[arcName];
  const targetIndex = arcRoles.indexOf(targetRole);
  if (targetIndex === -1) return [];
  return arcRoles.slice(0, targetIndex + 1);
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
  const targetArc = getArcForRole(targetRole);
  
  // Determine expected roles based on arc logic
  let expectedRoles: ProgressionRoleName[];
  
  if (targetArc === 'CAST') {
    // In Cast arc: keep Audience + all Cast roles up to target
    expectedRoles = getRolesInArcUpTo('CAST', targetRole);
  } else if (targetArc === 'ANTI_HERO') {
    // In Anti-Hero arc: keep Audience + all Anti-Hero roles up to target
    const antiHeroRoles = getRolesInArcUpTo('ANTI_HERO', targetRole);
    expectedRoles = ['audience', ...antiHeroRoles];
  } else if (targetArc === 'VILLAIN') {
    // In Villain arc: keep Audience + all Villain roles up to target
    const villainRoles = getRolesInArcUpTo('VILLAIN', targetRole);
    expectedRoles = ['audience', ...villainRoles];
  } else {
    // Fallback to original logic
    const targetIndex = PROGRESSION_ROLE_KEYS.indexOf(targetRole);
    expectedRoles = PROGRESSION_ROLE_KEYS.slice(0, targetIndex + 1);
  }
  
  const missingRoles = expectedRoles.filter(role => !assignedRoles.has(role));
  
  // Outdated roles are those assigned but not in expected roles
  // This handles arc cleanup by removing previous arc roles
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

export interface XPAwardResult {
  success: boolean;
  newXP: number | null;
  oldLevel: number;
  newLevel: number;
  levelUpOccurred: boolean;
  roleChanged: boolean;
  newRole: string | null;
  levelsCrossed: number[];
  levelUpResiduals: number;
}

export async function awardXP(
  userId: string,
  username: string,
  displayName: string,
  baseXP: number,
  source: string,
  reason: string,
  hasBooster: boolean,
  member: GuildMember | null
): Promise<XPAwardResult> {
  try {
    // Ensure user exists
    await getOrCreateUser(userId, username, displayName);

    // Get current user data
    const userData = await getUser(userId);
    if (!userData) {
      return {
        success: false,
        newXP: null,
        oldLevel: 0,
        newLevel: 0,
        levelUpOccurred: false,
        roleChanged: false,
        newRole: null,
        levelsCrossed: [],
        levelUpResiduals: 0,
      };
    }

    const oldLevel = userData.current_level;
    // Check if daily XP needs to be reset (new day)
    const now = new Date();
    const lastReset = userData.last_daily_xp_reset ? new Date(userData.last_daily_xp_reset) : null;
    const needsReset = !lastReset || 
      (now.getDate() !== lastReset.getDate() || 
       now.getMonth() !== lastReset.getMonth() || 
       now.getFullYear() !== lastReset.getFullYear());
    
    if (needsReset) {
      await resetDailyXP(userId);
      // Reload user data after reset
      const refreshedUser = await getUser(userId);
      if (refreshedUser) {
        Object.assign(userData, refreshedUser);
      }
    }

    // Apply booster XP multiplier (+25%)
    let xpToAward = baseXP;
    if (hasBooster) {
      xpToAward = Math.floor(baseXP * 1.25);
    }

    // Update user XP
    const newXP = await addUserXP(userId, xpToAward, source, reason);
    if (newXP === null) {
      return {
        success: false,
        newXP: null,
        oldLevel,
        newLevel: oldLevel,
        levelUpOccurred: false,
        roleChanged: false,
        newRole: null,
        levelsCrossed: [],
        levelUpResiduals: 0,
      };
    }

    // Calculate new level
    const newLevel = calculateLevelFromXP(newXP);
    const levelUpOccurred = newLevel !== oldLevel;

    // Track all levels crossed for multi-level jumps
    const levelsCrossed: number[] = [];
    if (levelUpOccurred) {
      for (let level = oldLevel + 1; level <= newLevel; level++) {
        levelsCrossed.push(level);
      }
      await setUserLevel(userId, newLevel);
    }

    // Award level-up residuals for EACH level crossed.
    let totalLevelUpResiduals = 0;
    for (const level of levelsCrossed) {
      const levelUpResiduals = calculateLevelUpResiduals(level);
      totalLevelUpResiduals += levelUpResiduals;
      await ResidualsService.awardResiduals(
        userId,
        levelUpResiduals,
        'level_up',
        `Level up to ${level}`
      );
    }

    // Check for daily XP bonus (first time crossing 400 XP in a day)
    // Increased from 200 to 400 to match the increased daily cap (500->1000)
    const DAILY_BONUS_THRESHOLD = 400;
    const DAILY_BONUS_AMOUNT = 50; // Increased from 30 to 50 for higher progression
    const dailyXPBeforeAward = userData.daily_xp_earned;
    const dailyXPAfterAward = dailyXPBeforeAward + xpToAward;
    
    if (!userData.daily_bonus_paid && dailyXPBeforeAward < DAILY_BONUS_THRESHOLD && dailyXPAfterAward >= DAILY_BONUS_THRESHOLD) {
      await ResidualsService.awardResiduals(
        userId,
        DAILY_BONUS_AMOUNT,
        'daily_bonus',
        'Daily XP threshold bonus'
      );
      await setDailyBonusPaid(userId);
    }

    // Update promotion eligibility
    const currentRole = getRoleFromLevel(newLevel);
    const eligibility = calculatePromotionEligibility(newXP, newLevel, currentRole);
    await updatePromotionEligibility(userId, eligibility);

    // Check for role promotions if member is available
    let roleChanged = false;
    let newRole: string | null = null;

    if (member) {
      try {
        const syncResult = await synchronizeProgressionRoles(member, newLevel);
        if (syncResult.success) {
          const oldRole = userData.current_progression_role;
          if (oldRole !== currentRole) {
            await setUserProgressionRole(userId, currentRole);
            roleChanged = true;
            newRole = currentRole;
          }
        }
      } catch (error) {
        console.error('Error during role progression check:', error);
      }
    }

    return {
      success: true,
      newXP,
      oldLevel,
      newLevel,
      levelUpOccurred,
      roleChanged,
      newRole,
      levelsCrossed,
      levelUpResiduals: totalLevelUpResiduals,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return {
      success: false,
      newXP: null,
      oldLevel: 0,
      newLevel: 0,
      levelUpOccurred: false,
      roleChanged: false,
      newRole: null,
      levelsCrossed: [],
      levelUpResiduals: 0,
    };
  }
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

  isMessageEligible(userId: string, messageContent: string, _currentDailyXP: number): { eligible: boolean; reason: string } {
    const now = Date.now();

    // Reset daily tracking if needed
    if (now - this.lastDailyReset >= 86400000) { // 24 hours
      this.userMessageHistory.clear();
      this.userLastXPTime.clear();
      this.lastDailyReset = now;
    }

    // Periodic cleanup
    this.cleanupOldEntries();

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
