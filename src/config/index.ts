import dotenv from 'dotenv';

dotenv.config();

// Discord Configuration
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
export const PREFIX = process.env.PREFIX || '.';
export const ADMIN_PREFIX = '$';

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL || '';

// Klipy GIF API
export const KLIPY_KEY = process.env.KLIPY_KEY || '';
export const KLIPY_URL = process.env.KLIPY_URL || 'https://api.klipy.com/v2/search';

// AI Configuration
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
export const HF_API_TOKEN = process.env.HF_API_TOKEN || '';

// Role IDs (as strings for Discord.js compatibility)
export const ROLES = {
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

  // Booster Role ("Guest Star")
  BOOSTER: '1540782365893337100',
};

// Display label for the booster role
export const BOOSTER_ROLE_LABEL = 'Guest Star';

// Custom Emojis (server emojis only - keep these out of embed footers, Discord
// doesn't render custom emojis there)
export const EMOJIS = {
  MONEY: '<:money:1529443112127168623>',
  CROWN: '<:crown:1529443082406461521>',
  CROWN2: '<:crown1:1529443086193660084>',
  SUNGLASSES: '<:sunglas:1536398312448589884>',
  ORANGE_HEART: '<a:orangeheartexclaim:1529443126328950785>',
  PINK_HEART: '<a:pinkheartexclaim:1529443130104090734>',
  TYPING: '<a:typing:1529443144901464205>',
};

// XP Configuration
export const XP_CONFIG = {
  MESSAGE_XP_MIN: 5,
  MESSAGE_XP_MAX: 15,
  MESSAGE_COOLDOWN_SECONDS: 30,
  DAILY_XP_CAP: 500,
  MIN_MESSAGE_LENGTH: 3,
  DUPLICATE_MESSAGE_THRESHOLD: 3,
  SPAM_DETECTION_WINDOW_SECONDS: 60,
  
  LEVEL_XP_REQUIREMENTS: [
    50,     // Level 1
    150,    // Level 2
    300,    // Level 3
    500,    // Level 4
    750,    // Level 5
    1050,   // Level 6
    1400,   // Level 7
    1800,   // Level 8
    2250,   // Level 9
    2750,   // Level 10
    3300,   // Level 11
    3900,   // Level 12
    4550,   // Level 13
    5250,   // Level 14
    6000,   // Level 15
    6800,   // Level 16
    7650,   // Level 17
    8550,   // Level 18
    9500,   // Level 19
    10500,  // Level 20
    11550,  // Level 21
    12650,  // Level 22
    13800,  // Level 23
    15000,  // Level 24
    16250,  // Level 25 (Lead Cast threshold)
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
export const GIF_CONFIG = {
  NORMAL_COOLDOWN_SECONDS: 10,
  TWO_TARGET_COOLDOWN_SECONDS: 120,
  THREE_TARGET_COOLDOWN_SECONDS: 180,
  MAX_TARGETS: 3,
};

// GIF Commands
export const GIF_COMMANDS = {
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
export const GIF_CAPTIONS: Record<string, string> = {
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
export const ART_STYLES = ['anime', 'jojos', 'ghibli', 'jjk'];

// Human-readable descriptions of each $clip art style (shown in $help)
export const ART_STYLE_INFO: Record<string, string> = {
  anime: 'Vibrant anime style, dynamic composition, cinematic lighting',
  jojos: 'JoJo-style dramatic poses, bold colors, manga aesthetic',
  ghibli: 'Studio Ghibli style, soft colors, peaceful hand-drawn look',
  jjk: 'Jujutsu Kaisen style, dark atmosphere, intense modern anime',
};

// $clip Admin Restrictions
export const CLIP_CONFIG = {
  // Non-Director admins only get a summary (no artwork) and must wait between uses
  ADMIN_COOLDOWN_SECONDS: 1800, // 30 minutes
};

// Channel IDs (as strings for Discord.js compatibility)
export const CHANNELS = {
  BOMBO_TIMES: '1534577767180533872',
  CASTING: '1534576177421881394',

  // Booster shoutout channel
  BOOSTER_THANKYOU: '1540867037771993129',

  // Welcome channel - set WELCOME_CHANNEL_ID in your .env to override.
  // Falls back to the server's configured System Messages channel if left blank.
  WELCOME: process.env.WELCOME_CHANNEL_ID || '',

  // Shop channel - set SHOP_CHANNEL_ID in your .env to override.
  SHOP: process.env.SHOP_CHANNEL_ID || '',
};

// Randomized GIF search queries (via Klipy) - a different one is rolled every time
export const WELCOME_GIF_QUERIES = [
  'welcome',
  'welcome party',
  'red carpet welcome',
  'excited welcome wave',
  'hooray celebration',
  'applause cheering',
];

// Guest Star (booster) shoutouts pull from guest star / red carpet themed GIFs
export const BOOST_GIF_QUERIES = [
  'red carpet',
  'red carpet celebrity',
  'vip red carpet',
  'guest star',
  'movie premiere',
  'star studded celebration',
];

// Residuals gifted automatically when someone boosts (becomes Guest Star)
export const BOOST_RESIDUAL_GIFT = 40;

// Randomized welcome message lines. {user} = mention, {count} = member number.
export const WELCOME_MESSAGES: string[] = [
  '{user} just walked onto the set. Welcome to MI BOM3O Studios {typing} — introduce yourself and start the climb from Audience to Lead Cast.',
  'Say hi to {user}, the newest face at MI BOM3O Studios {sunglasses}. Your journey starts now.',
  '{user} has entered the building {pink} — welcome to the cast, grab a seat.',
  'Casting call complete — {user} is officially part of MI BOM3O Studios {orange}.',
  'New face on set: {user} {sunglasses} Welcome to MI BOM3O Studios.',
  '{user} just joined. Member #{count} {typing} — the cast just got bigger.',
  'Everyone welcome {user} to MI BOM3O Studios {pink}.',
  '{user} has arrived. MI BOM3O Studios welcomes its newest star {sunglasses}.',
  'The set just got one more cast member — welcome {user} {orange}.',
  '{user} is officially cast in MI BOM3O Studios {typing}. Can\'t wait to see where your story goes.',
];

// Randomized booster ("Guest Star") message lines, sent to the red carpet channel.
export const BOOST_MESSAGES: string[] = [
  '{user} just boosted MI BOM3O Studios {crown} Welcome to Guest Star — 40 residuals and custom gif access are on their way {money}.',
  'Red carpet\'s rolled out for {user} {crown2} thanks for boosting. Guest Star, 40 residuals, custom gifs — all unlocked.',
  '{user} boosted the server {crown} that\'s Guest Star status unlocked, plus a 40 residual gift {money}.',
  'Big thanks to {user} for boosting {pink} — Guest Star role, 40 residuals, and custom gifs, all yours now.',
  '{user} just stepped onto the red carpet {sunglasses} Guest Star status and 40 residuals are locked in.',
  'MI BOM3O Studios just got a boost from {user} {crown} enjoy your 40 residuals and custom gif access.',
  '{user} boosted the server {money} that\'s a 40 residual thank-you gift and Guest Star perks headed your way.',
  'Thank you {user} for the boost {crown2} you\'re Guest Star now, 40 residuals and custom gifs unlocked.',
  '{user} just gave MI BOM3O Studios a boost {orange} Guest Star role, 40 residuals, custom gif access — thank you.',
  'Red carpet moment: {user} boosted MI BOM3O Studios {crown} Guest Star unlocked, 40 residuals gifted.',
];

// Database Schema
export const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT PRIMARY KEY,
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
  daily_bonus_paid BOOLEAN DEFAULT FALSE,
  last_promotion_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- XP transactions log
CREATE TABLE IF NOT EXISTS xp_transactions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin XP changes log
CREATE TABLE IF NOT EXISTS admin_xp_changes (
  id SERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL,
  target_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Residuals transactions log
CREATE TABLE IF NOT EXISTS residual_transactions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  source TEXT NOT NULL,
  reason TEXT,
  admin_user_id BIGINT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Residuals changes log
CREATE TABLE IF NOT EXISTS admin_residual_changes (
  id SERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL,
  target_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_value INTEGER,
  new_value INTEGER,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table (key-value store for bot configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop archetypes table
CREATE TABLE IF NOT EXISTS shop_archetypes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL,
  price INTEGER NOT NULL,
  min_role TEXT,
  slot_group TEXT NOT NULL,
  image_url TEXT
);

-- Idempotent upgrade for existing shop_archetypes rows (pre-image_url deploys)
ALTER TABLE shop_archetypes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Shop colors table
CREATE TABLE IF NOT EXISTS shop_colors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hex TEXT NOT NULL,
  price_band TEXT NOT NULL
);

-- User archetypes table
CREATE TABLE IF NOT EXISTS user_archetypes (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  archetype_id INTEGER NOT NULL REFERENCES shop_archetypes(id),
  slot_index INTEGER NOT NULL,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  free_grant BOOLEAN DEFAULT FALSE
);

-- User colors table
CREATE TABLE IF NOT EXISTS user_colors (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  color_id INTEGER NOT NULL REFERENCES shop_colors(id),
  active BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  free_grant BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_residual_transactions_user_id ON residual_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_residual_transactions_created_at ON residual_transactions(created_at);

-- Idempotent schema upgrades for existing databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure unique constraints for shop tables (required for ON CONFLICT)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shop_archetypes_name_key'
  ) THEN
    ALTER TABLE shop_archetypes ADD CONSTRAINT shop_archetypes_name_key UNIQUE (name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shop_colors_name_key'
  ) THEN
    ALTER TABLE shop_colors ADD CONSTRAINT shop_colors_name_key UNIQUE (name);
  END IF;
END $$;
`;
