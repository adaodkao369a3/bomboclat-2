import { GuildMember } from 'discord.js';
export declare const PROGRESSION_ROLE_KEYS: readonly ["audience", "extra", "featured_extra", "supporting_cast", "principal_cast", "lead_cast"];
export type ProgressionRoleName = (typeof PROGRESSION_ROLE_KEYS)[number];
export declare function calculateMessageXP(): number;
export declare function calculateLevelFromXP(totalXP: number): number;
export declare function calculateXPForLevel(level: number): number;
export declare function calculatePromotionEligibility(_currentXP: number, currentLevel: number, currentRole: string): number;
export declare function getRoleFromLevel(level: number): string;
export interface ProgressionRolePlan {
    targetRole: ProgressionRoleName;
    expectedRoles: ProgressionRoleName[];
    missingRoles: ProgressionRoleName[];
    outdatedRoles: ProgressionRoleName[];
}
export declare function getProgressionRolePlan(level: number, assignedRoles: ReadonlySet<string>): ProgressionRolePlan;
export declare function calculateXPToNextLevel(_currentXP: number, currentLevel: number): number;
export declare function calculateXPRemaining(currentXP: number, currentLevel: number): number;
export declare function calculateProgressPercentage(currentXP: number, currentLevel: number): number;
export declare function getNextProgressionThreshold(currentRole: string): number;
export declare function addProgressionRole(member: GuildMember, roleName: string): Promise<boolean>;
export declare function verifyRoleAssignment(member: GuildMember, roleName: string): Promise<boolean>;
export declare function rollbackRoles(member: GuildMember, roleNames: string[]): Promise<void>;
export interface ProgressionRoleSyncResult {
    success: boolean;
    addedRoles: ProgressionRoleName[];
    removedRoles: ProgressionRoleName[];
}
export declare function synchronizeProgressionRoles(member: GuildMember, targetLevel: number): Promise<ProgressionRoleSyncResult>;
export declare class AntiSpamValidator {
    private userMessageHistory;
    private userLastXPTime;
    private lastDailyReset;
    private readonly MAX_HISTORY_SIZE;
    private readonly CLEANUP_INTERVAL_MS;
    private lastCleanup;
    private cleanupOldEntries;
    isMessageEligible(userId: string, messageContent: string, currentDailyXP: number): {
        eligible: boolean;
        reason: string;
    };
    recordMessage(userId: string, messageContent: string, awardedXP: boolean): void;
}
//# sourceMappingURL=xp.d.ts.map