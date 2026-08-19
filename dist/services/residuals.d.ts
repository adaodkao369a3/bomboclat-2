export declare class ResidualsService {
    static awardResiduals(userId: string, amount: number, source: string, reason?: string, adminUserId?: string, description?: string): Promise<number | null>;
    static removeResiduals(userId: string, amount: number, source: string, reason?: string, adminUserId?: string, description?: string): Promise<number | null>;
    static setResiduals(userId: string, amount: number, adminUserId: string, reason?: string): Promise<number | null>;
    static getResiduals(userId: string): Promise<{
        balance: number;
        lifetime_earned: number;
        lifetime_spent: number;
    } | null>;
    static getResidualHistory(userId: string, limit?: number): Promise<any[] | null>;
}
export declare function awardResiduals(userId: string, amount: number, source: string, kwargs?: any): Promise<number | null>;
export declare function removeResiduals(userId: string, amount: number, source: string, kwargs?: any): Promise<number | null>;
export declare function getResidualsInfo(userId: string): Promise<{
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
} | null>;
export declare function getResidualHistory(userId: string, kwargs?: any): Promise<any[] | null>;
//# sourceMappingURL=residuals.d.ts.map