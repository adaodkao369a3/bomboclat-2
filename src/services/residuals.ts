import { addResiduals, setResiduals, getResiduals, getResidualHistory as getResidualHistoryFromDB } from '../database/client.js';
import type { ResidualTransaction } from '../database/client.js';

export interface ResidualOptions {
  reason?: string;
  adminUserId?: string;
  description?: string;
}

export interface ResidualHistoryOptions {
  limit?: number;
}

export class ResidualsService {
  static async awardResiduals(
    userId: string,
    amount: number,
    source: string,
    reason?: string,
    adminUserId?: string,
    description?: string
  ): Promise<number | null> {
    if (amount <= 0) {
      console.error(`awardResiduals called with non-positive amount: ${amount}`);
      return null;
    }
    
    console.log(`Awarding ${amount} Residuals to user ${userId} from source: ${source}`);
    
    return await addResiduals(userId, amount, source, reason, adminUserId, description);
  }
  
  static async removeResiduals(
    userId: string,
    amount: number,
    source: string,
    reason?: string,
    adminUserId?: string,
    description?: string
  ): Promise<number | null> {
    if (amount <= 0) {
      console.error(`removeResiduals called with non-positive amount: ${amount}`);
      return null;
    }
    
    console.log(`Removing ${amount} Residuals from user ${userId} for: ${source}`);
    
    // Use negative amount for removal
    return await addResiduals(userId, -amount, source, reason, adminUserId, description);
  }
  
  static async setResiduals(
    userId: string,
    amount: number,
    adminUserId: string,
    reason?: string
  ): Promise<number | null> {
    console.log(`Setting user ${userId} Residuals to ${amount} by admin ${adminUserId}`);
    
    return await setResiduals(userId, amount, adminUserId, reason);
  }
  
  static async getResiduals(userId: string): Promise<{ balance: number; lifetime_earned: number; lifetime_spent: number } | null> {
    return await getResiduals(userId);
  }
  
  static async getResidualHistory(userId: string, limit: number = 20): Promise<ResidualTransaction[] | null> {
    return await getResidualHistoryFromDB(userId, limit);
  }
}

// Convenience functions
export async function awardResiduals(
  userId: string,
  amount: number,
  source: string,
  options?: ResidualOptions
): Promise<number | null> {
  return await ResidualsService.awardResiduals(
    userId,
    amount,
    source,
    options?.reason,
    options?.adminUserId,
    options?.description
  );
}

export async function removeResiduals(
  userId: string,
  amount: number,
  source: string,
  options?: ResidualOptions
): Promise<number | null> {
  return await ResidualsService.removeResiduals(
    userId,
    amount,
    source,
    options?.reason,
    options?.adminUserId,
    options?.description
  );
}

export async function getResidualsInfo(userId: string): Promise<{ balance: number; lifetime_earned: number; lifetime_spent: number } | null> {
  return await ResidualsService.getResiduals(userId);
}

export async function getResidualHistory(
  userId: string,
  options?: ResidualHistoryOptions
): Promise<ResidualTransaction[] | null> {
  return await ResidualsService.getResidualHistory(userId, options?.limit ?? 20);
}
