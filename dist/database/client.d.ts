import { PoolClient, type QueryResultRow } from 'pg';
export interface User extends QueryResultRow {
    user_id: string;
    username: string;
    nickname: string | null;
    current_xp: number;
    current_level: number;
    current_progression_role: string;
    promotion_eligibility_percentage: number;
    total_residuals_balance: number;
    lifetime_residuals_earned: number;
    lifetime_residuals_spent: number;
    last_xp_timestamp: Date | null;
    daily_xp_earned: number;
    last_daily_xp_reset: Date | null;
    last_promotion_timestamp: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface XPTransaction {
    id: number;
    user_id: string;
    amount: number;
    source: string;
    reason: string | null;
    created_at: Date;
}
export interface ResidualTransaction {
    id: number;
    user_id: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    transaction_type: string;
    source: string;
    reason: string | null;
    admin_user_id: string | null;
    description: string | null;
    created_at: Date;
}
export declare function connect(): Promise<void>;
export declare function disconnect(): Promise<void>;
export declare function getClient(): Promise<PoolClient>;
export declare function getOrCreateUser(userId: string, username: string, nickname: string): Promise<User>;
export declare function getUser(userId: string): Promise<User | null>;
export declare function addUserXP(userId: string, amount: number, source: string, reason?: string): Promise<number | null>;
export declare function setUserXP(userId: string, amount: number): Promise<number | null>;
export declare function setUserLevel(userId: string, level: number): Promise<void>;
export declare function setUserProgressionRole(userId: string, role: string): Promise<void>;
export declare function updatePromotionEligibility(userId: string, eligibility: number): Promise<void>;
export declare function resetDailyXP(userId: string): Promise<void>;
export declare function addResiduals(userId: string, amount: number, source: string, reason?: string, adminUserId?: string, description?: string): Promise<number | null>;
export declare function setResiduals(userId: string, amount: number, adminUserId: string, reason?: string): Promise<number | null>;
export declare function getResiduals(userId: string): Promise<{
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
} | null>;
export declare function getResidualHistory(userId: string, limit?: number): Promise<ResidualTransaction[]>;
export declare function getLeaderboard(limit?: number): Promise<Array<{
    user_id: string;
    username: string;
    current_xp: number;
    current_level: number;
}>>;
//# sourceMappingURL=client.d.ts.map