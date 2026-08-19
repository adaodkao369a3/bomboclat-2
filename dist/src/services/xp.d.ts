import { GuildMember } from 'discord.js';
export declare function calculateMessageXP(): number;
export declare function calculateLevelFromXP(totalXP: number): number;
export declare function calculateXPForLevel(level: number): number;
export declare function calculatePromotionEligibility(_currentXP: number, currentLevel: number, currentRole: string): number;
export declare function getRoleFromLevel(level: number): string;
export declare function calculateXPToNextLevel(_currentXP: number, currentLevel: number): number;
export declare function calculateXPRemaining(currentXP: number, currentLevel: number): number;
export declare function calculateProgressPercentage(currentXP: number, currentLevel: number): number;
export declare function getNextProgressionThreshold(currentRole: string): number;
export declare function addProgressionRole(member: GuildMember, roleName: string): Promise<boolean>;
export declare function verifyRoleAssignment(member: GuildMember, roleName: string): Promise<boolean>;
export declare function rollbackRoles(member: GuildMember, roleNames: string[]): Promise<void>;
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