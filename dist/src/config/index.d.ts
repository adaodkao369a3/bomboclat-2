export declare const DISCORD_TOKEN: string;
export declare const PREFIX: string;
export declare const ADMIN_PREFIX = "$";
export declare const DATABASE_URL: string;
export declare const KLIPY_KEY: string;
export declare const KLIPY_URL: string;
export declare const GROQ_API_KEY: string;
export declare const GROQ_MODEL: string;
export declare const HF_API_TOKEN: string;
export declare const ROLES: {
    AUDIENCE: string;
    EXTRA: string;
    FEATURED_EXTRA: string;
    SUPPORTING_CAST: string;
    PRINCIPAL_CAST: string;
    LEAD_CAST: string;
    HALL_OF_FAME: string;
    CASTING_DIRECTOR: string;
    PRODUCER: string;
    EXECUTIVE_PRODUCER: string;
    DIRECTOR: string;
};
export declare const XP_CONFIG: {
    MESSAGE_XP_MIN: number;
    MESSAGE_XP_MAX: number;
    MESSAGE_COOLDOWN_SECONDS: number;
    DAILY_XP_CAP: number;
    MIN_MESSAGE_LENGTH: number;
    DUPLICATE_MESSAGE_THRESHOLD: number;
    SPAM_DETECTION_WINDOW_SECONDS: number;
    LEVEL_XP_REQUIREMENTS: number[];
    ROLE_LEVEL_REQUIREMENTS: {
        audience: number;
        extra: number;
        featured_extra: number;
        supporting_cast: number;
        principal_cast: number;
        lead_cast: number;
    };
};
export declare const GIF_CONFIG: {
    NORMAL_COOLDOWN_SECONDS: number;
    TWO_TARGET_COOLDOWN_SECONDS: number;
    THREE_TARGET_COOLDOWN_SECONDS: number;
    MAX_TARGETS: number;
};
export declare const GIF_COMMANDS: {
    rizz: string;
    larp: string;
    blush: string;
    cooked: string;
    fumble: string;
    cope: string;
    grass: string;
    aura: string;
    huh: string;
    cry: string;
};
export declare const GIF_CAPTIONS: Record<string, string>;
export declare const ART_STYLES: string[];
export declare const CHANNELS: {
    BOMBO_TIMES: string;
    CASTING: string;
};
export declare const SCHEMA = "\n-- Users table\nCREATE TABLE IF NOT EXISTS users (\n  user_id TEXT PRIMARY KEY,\n  username TEXT NOT NULL,\n  nickname TEXT,\n  current_xp INTEGER DEFAULT 0,\n  current_level INTEGER DEFAULT 0,\n  current_progression_role TEXT DEFAULT 'audience',\n  promotion_eligibility_percentage REAL DEFAULT 0.0,\n  total_residuals_balance INTEGER DEFAULT 0,\n  lifetime_residuals_earned INTEGER DEFAULT 0,\n  lifetime_residuals_spent INTEGER DEFAULT 0,\n  last_xp_timestamp TIMESTAMP,\n  daily_xp_earned INTEGER DEFAULT 0,\n  last_daily_xp_reset TIMESTAMP,\n  last_promotion_timestamp TIMESTAMP,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- XP transactions log\nCREATE TABLE IF NOT EXISTS xp_transactions (\n  id SERIAL PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,\n  amount INTEGER NOT NULL,\n  source TEXT NOT NULL,\n  reason TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Admin XP changes log\nCREATE TABLE IF NOT EXISTS admin_xp_changes (\n  id SERIAL PRIMARY KEY,\n  admin_user_id TEXT NOT NULL,\n  target_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,\n  change_type TEXT NOT NULL,\n  old_value TEXT,\n  new_value TEXT,\n  reason TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Residuals transactions log\nCREATE TABLE IF NOT EXISTS residual_transactions (\n  id SERIAL PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,\n  amount INTEGER NOT NULL,\n  balance_before INTEGER NOT NULL,\n  balance_after INTEGER NOT NULL,\n  transaction_type TEXT NOT NULL,\n  source TEXT NOT NULL,\n  reason TEXT,\n  admin_user_id TEXT,\n  description TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Admin Residuals changes log\nCREATE TABLE IF NOT EXISTS admin_residual_changes (\n  id SERIAL PRIMARY KEY,\n  admin_user_id TEXT NOT NULL,\n  target_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,\n  change_type TEXT NOT NULL,\n  old_value INTEGER,\n  new_value INTEGER,\n  reason TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Indexes for performance\nCREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);\nCREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);\nCREATE INDEX IF NOT EXISTS idx_residual_transactions_user_id ON residual_transactions(user_id);\nCREATE INDEX IF NOT EXISTS idx_residual_transactions_created_at ON residual_transactions(created_at);\n";
//# sourceMappingURL=index.d.ts.map