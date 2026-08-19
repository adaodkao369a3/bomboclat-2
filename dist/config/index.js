"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA = exports.CHANNELS = exports.ART_STYLES = exports.GIF_CAPTIONS = exports.GIF_COMMANDS = exports.GIF_CONFIG = exports.XP_CONFIG = exports.ROLES = exports.HF_API_TOKEN = exports.GROQ_MODEL = exports.GROQ_API_KEY = exports.KLIPY_URL = exports.KLIPY_KEY = exports.DATABASE_URL = exports.ADMIN_PREFIX = exports.PREFIX = exports.DISCORD_TOKEN = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Discord Configuration
exports.DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
exports.PREFIX = process.env.PREFIX || '.';
exports.ADMIN_PREFIX = '$';
// Database Configuration
exports.DATABASE_URL = process.env.DATABASE_URL || '';
// Klipy GIF API
exports.KLIPY_KEY = process.env.KLIPY_KEY || '';
exports.KLIPY_URL = process.env.KLIPY_URL || 'https://api.klipy.com/v2/search';
// AI Configuration
exports.GROQ_API_KEY = process.env.GROQ_API_KEY || '';
exports.GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
exports.HF_API_TOKEN = process.env.HF_API_TOKEN || '';
// Role IDs (as strings for Discord.js compatibility)
exports.ROLES = {
    // Progression Roles
    AUDIENCE: '1526865658955038721',
    EXTRA: '1535285274832277514',
    FEATURED_EXTRA: '1535285299410771988',
    SUPPORTING_CAST: '1535285344952651829',
    PRINCIPAL_CAST: '1535285379283026050',
    LEAD_CAST: '1535285425697194045',
    // Special Roles
    HALL_OF_FAME: '1535285223980531832',
    // Staff Roles
    CASTING_DIRECTOR: '1535285167529263165',
    PRODUCER: '1535285114618249246',
    EXECUTIVE_PRODUCER: '1535285775275655168',
    DIRECTOR: '1535285079658598460',
};
// XP Configuration
exports.XP_CONFIG = {
    MESSAGE_XP_MIN: 5,
    MESSAGE_XP_MAX: 15,
    MESSAGE_COOLDOWN_SECONDS: 30,
    DAILY_XP_CAP: 500,
    MIN_MESSAGE_LENGTH: 3,
    DUPLICATE_MESSAGE_THRESHOLD: 3,
    SPAM_DETECTION_WINDOW_SECONDS: 60,
    LEVEL_XP_REQUIREMENTS: [
        0, // Level 0 → 1
        50, // Level 1 → 2
        150, // Level 2 → 3
        300, // Level 3 → 4
        500, // Level 4 → 5
        750, // Level 5 → 6
        1050, // Level 6 → 7
        1400, // Level 7 → 8
        1800, // Level 8 → 9
        2250, // Level 9 → 10
        2750, // Level 10 → 11
        3300, // Level 11 → 12
        3900, // Level 12 → 13
        4550, // Level 13 → 14
        5250, // Level 14 → 15
        6000, // Level 15 → 16
        6800, // Level 16 → 17
        7650, // Level 17 → 18
        8550, // Level 18 → 19
        9500, // Level 19 → 20
        10500, // Level 20 → 21
        11550, // Level 21 → 22
        12650, // Level 22 → 23
        13800, // Level 23 → 24
        15000, // Level 24 → 25
        16250, // Level 25 → 26 (Lead Cast threshold)
    ],
    ROLE_LEVEL_REQUIREMENTS: {
        audience: 0,
        extra: 4,
        featured_extra: 8,
        supporting_cast: 13,
        principal_cast: 19,
        lead_cast: 25, // Explicit threshold
    },
};
// GIF Configuration
exports.GIF_CONFIG = {
    NORMAL_COOLDOWN_SECONDS: 10,
    TWO_TARGET_COOLDOWN_SECONDS: 120,
    THREE_TARGET_COOLDOWN_SECONDS: 180,
    MAX_TARGETS: 3,
};
// GIF Commands
exports.GIF_COMMANDS = {
    rizz: 'rizz',
    larp: 'larp',
    blush: 'anime blush',
    cooked: 'cooked meme',
    fumble: 'fumble meme',
    cope: 'cope meme',
    grass: 'touch grass',
    aura: 'aura meme',
    huh: 'huh meme',
    cry: 'crying meme',
};
// GIF Captions
exports.GIF_CAPTIONS = {
    rizz: 'has activated the rizz technique.',
    larp: 'has entered full roleplay mode.',
    blush: 'is feeling shy.',
    cooked: 'is completely cooked.',
    fumble: 'has fumbled the moment.',
    cope: 'has entered the cope zone.',
    grass: 'has been ordered to touch grass.',
    aura: 'has gained aura.',
    huh: 'is confused.',
    cry: 'is crying.',
};
// Art Styles for $clip
exports.ART_STYLES = ['anime', 'jojos', 'ghibli', 'jjk'];
// Channel IDs (as strings for Discord.js compatibility)
exports.CHANNELS = {
    BOMBO_TIMES: '1534577767180533872',
    CASTING: '1534576177421881394',
};
// Database Schema
exports.SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  nickname TEXT,
  current_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 0,
  current_progression_role TEXT DEFAULT 'audience',
  promotion_eligibility_percentage REAL DEFAULT 0.0,
  total_residuals_balance INTEGER DEFAULT 0,
  lifetime_residuals_earned INTEGER DEFAULT 0,
  lifetime_residuals_spent INTEGER DEFAULT 0,
  last_xp_timestamp TIMESTAMP,
  daily_xp_earned INTEGER DEFAULT 0,
  last_daily_xp_reset TIMESTAMP,
  last_promotion_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- XP transactions log
CREATE TABLE IF NOT EXISTS xp_transactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin XP changes log
CREATE TABLE IF NOT EXISTS admin_xp_changes (
  id SERIAL PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Residuals transactions log
CREATE TABLE IF NOT EXISTS residual_transactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  admin_user_id TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Residuals changes log
CREATE TABLE IF NOT EXISTS admin_residual_changes (
  id SERIAL PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_value INTEGER,
  new_value INTEGER,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_residual_transactions_user_id ON residual_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_residual_transactions_created_at ON residual_transactions(created_at);
`;
//# sourceMappingURL=index.js.map