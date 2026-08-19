import type { ResidualTransaction } from '../database/client.js';
export interface ResidualOptions {
    reason?: string;
    adminUserId?: string;
    description?: string;
}
export interface ResidualHistoryOptions {
    limit?: number;
}
export declare class ResidualsService {
    static awardResiduals(userId: string, amount: number, source: string, reason?: string, adminUserId?: string, description?: string): Promise<number | null>;
    static removeResiduals(userId: string, amount: number, source: string, reason?: string, adminUserId?: string, description?: string): Promise<number | null>;
    static setResiduals(userId: string, amount: number, adminUserId: string, reason?: string): Promise<number | null>;
    static getResiduals(userId: string): Promise<{
        balance: number;
        lifetime_earned: number;
        lifetime_spent: number;
    } | null>;
    static getResidualHistory(userId: string, limit?: number): Promise<ResidualTransaction[] | null>;
}
export declare function awardResiduals(userId: string, amount: number, source: string, options?: ResidualOptions): Promise<number | null>;
export declare function removeResiduals(userId: string, amount: number, source: string, options?: ResidualOptions): Promise<number | null>;
export declare function getResidualsInfo(userId: string): Promise<{
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
} | null>;
export declare function getResidualHistory(userId: string, options?: ResidualHistoryOptions): Promise<ResidualTransaction[] | null>;
//# sourceMappingURL=residuals.d.ts.map