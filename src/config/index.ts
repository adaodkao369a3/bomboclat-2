import dotenv from 'dotenv';

dotenv.config();

// Discord Configuration
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
export const CLIENT_ID = process.env.CLIENT_ID || '';
export const DEV_GUILD_ID = process.env.DEV_GUILD_ID || '';
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
  // Progression Roles (17 milestone roles)
  CIVILIAN: '1545103370438578276',
  SIDEKICK: '1545103371776692395',
  HERO: '1545103372804432023',
  CHAMPION: '1545103373395828838',
  GUARDIAN: '1545103374842728468',
  SUPERHERO: '1545103376096960592',
  ANTI_HERO: '1545103377573216406',
  ROGUE: '1545103378730713258',
  RENEGADE: '1545103380177879172',
  OUTLAW: '1545103381042040899',
  VILLAIN: '1545103383088594954',
  MASTERMIND: '1545103384015802368',
  KINGPIN: '1545103385127165962',
  OVERLORD: '1544446101787119668',
  TYRANT: '1545103386834374776',
  EMPEROR: '1545103387874296018',
  SAINT: '1545103391779196999',
  
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
  MONEY: '<a:cash:1545126549035024524>',
  CROWN: '<:crown:1529443082406461521>',
  CROWN2: '<:crown1:1529443086193660084>',
  SUNGLASSES: '<:jolly:1545004994418446403>',
  ORANGE_HEART: '<a:orangeheartexclaim:1529443126328950785>',
  PINK_HEART: '<a:pinkheartexclaim:1529443130104090734>',
  TYPING: '<a:typing:1529443144901464205>',
};

// XP Configuration
export const XP_CONFIG = {
  MESSAGE_XP_MIN: 5,
  MESSAGE_XP_MAX: 15,
  MESSAGE_COOLDOWN_SECONDS: 0, // Removed cooldown - no XP cooldown
  DAILY_XP_CAP: 0, // Removed daily cap - no daily XP limit
  MIN_MESSAGE_LENGTH: 3,
  DUPLICATE_MESSAGE_THRESHOLD: 3,
  SPAM_DETECTION_WINDOW_SECONDS: 60,
  
  LEVEL_XP_REQUIREMENTS: generateLevelXPRequirements(150),
  
  ROLE_LEVEL_REQUIREMENTS: {
    civilian: 1,
    sidekick: 5,
    hero: 10,
    champion: 20,
    guardian: 30,
    superhero: 40,
    antiHero: 50,
    rogue: 60,
    renegade: 70,
    outlaw: 80,
    villain: 90,
    mastermind: 100,
    kingpin: 110,
    overlord: 120,
    tyrant: 130,
    emperor: 140,
    saint: 150,
  },
};

// Generate XP requirements for all 150 levels
// Uses deterministic quadratic interpolation between milestone values
function generateLevelXPRequirements(maxLevel: number): number[] {
  const requirements: number[] = [];
  
  // Milestone XP values (level -> XP)
  const milestones: Record<number, number> = {
    1: 50,
    2: 150,
    3: 300,
    4: 500,
    5: 750,
    6: 1050,
    7: 1400,
    8: 1800,
    9: 2700,
    10: 3600,
    11: 4600,
    12: 5700,
    13: 7300,
    14: 8350,
    15: 9500,
    16: 10750,
    17: 12100,
    18: 13550,
    19: 15100,
    20: 16750,
    21: 18500,
    22: 20350,
    23: 22300,
    24: 24350,
    25: 26500,
    26: 28800,
    27: 31200,
    28: 33700,
    29: 36300,
    30: 39300,
    31: 41900,
    32: 44600,
    33: 47400,
    34: 50300,
    35: 53300,
    36: 56400,
    37: 59600,
    38: 62900,
    39: 66300,
    40: 69800,
    41: 73400,
    42: 77100,
    43: 80800,
    44: 84600,
    45: 88500,
    46: 92500,
    47: 96600,
    48: 101800,
    49: 106100,
    50: 110500,
    60: 160000,
    70: 219500,
    80: 289000,
    90: 368500,
    100: 458000,
    110: 657000,
    120: 766500,
    130: 886000,
    140: 1015500,
    150: 1155000,
  };
  
  // Get sorted milestone levels
  const milestoneLevels = Object.keys(milestones).map(Number).sort((a, b) => a - b);
  
  // Interpolate between milestones
  for (let level = 1; level <= maxLevel; level++) {
    if (milestones[level]) {
      requirements.push(milestones[level]);
    } else {
      // Find the milestone levels that bracket this level
      let lowerMilestone = milestoneLevels[0];
      let upperMilestone = milestoneLevels[milestoneLevels.length - 1];
      
      for (let i = 0; i < milestoneLevels.length - 1; i++) {
        if (milestoneLevels[i] < level && milestoneLevels[i + 1] > level) {
          lowerMilestone = milestoneLevels[i];
          upperMilestone = milestoneLevels[i + 1];
          break;
        }
      }
      
      // Quadratic interpolation
      const lowerXP = milestones[lowerMilestone];
      const upperXP = milestones[upperMilestone];
      const lowerLevel = lowerMilestone;
      const upperLevel = upperMilestone;
      
      const t = (level - lowerLevel) / (upperLevel - lowerLevel);
      const interpolatedXP = lowerXP + (upperXP - lowerXP) * t * t; // Quadratic easing
      
      requirements.push(Math.floor(interpolatedXP));
    }
  }
  
  return requirements;
}

// GIF Configuration
export const GIF_CONFIG = {
  NORMAL_COOLDOWN_SECONDS: 10,
  TWO_TARGET_COOLDOWN_SECONDS: 120,
  THREE_TARGET_COOLDOWN_SECONDS: 180,
  MAX_TARGETS: 3,
};

// GIF Commands
export const GIF_COMMANDS = {
  rizz: 'rizz anime',
  larp: 'larp anime',
  blush: 'anime blush',
  cooked: 'cooked anime',
  fumble: 'fumble anime',
  cope: 'cope anime',
  grass: 'touch grass anime',
  aura: 'aura anime',
  huh: 'huh anime',
  cry: 'crying anime',
};

// GIF Captions
export const GIF_CAPTIONS: Record<string, string> = {
  rizz: 'hi lol <:smirk:1529450331371733003>',
  larp: 'erp mode on <:zamn:1541974903438446702>',
  blush: 'shy uwu <a:scuffledflustered:1541974799742673067>',
  cooked: 'ts cooked <:worriedbuttersstotch:1536398315086675978>',
  fumble: 'mad fumble <:yukogivesthel:1541974899952848936>',
  cope: 'keep coping buddy <:ttongue:1529450341643583588>',
  grass: 'touching grass <:duobbl:1541974831178711102>',
  aura: 'ts so aura <a:aura:1529443067529003108>',
  huh: 'i am confusion <:confusedbread:1536398345755435018>',
  cry: 'crine <:cryingsparkles:1529495144745930852>',
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
  'welcome anime',
  'anime welcome to',
  'welcome to',
  'excited welcome wave anime',
  'hooray celebration anime',
  'applause cheering anime',
];

// Guest Star (booster) shoutouts pull from guest star / red carpet themed GIFs
export const BOOST_GIF_QUERIES = [
  'red carpet',
  'red carpet celebrity',
  'vip red carpet',
  'guest star',
  'movie premiere',
  'star red carpet',
];

// Residuals gifted automatically when someone boosts (becomes Guest Star)
export const BOOST_RESIDUAL_GIFT = 40;

// Emoji Submission Configuration
export const EMOJI_XP_THRESHOLD = 3600;
export const EMOJI_REVIEW_CHANNEL_ID = '1545394590851276891';

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
  daily_bonus_paid BOOLEAN DEFAULT FALSE,
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
  image_url TEXT,
  role_id TEXT
);

-- Idempotent upgrade for existing shop_archetypes rows (pre-image_url deploys)
ALTER TABLE shop_archetypes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE shop_archetypes ADD COLUMN IF NOT EXISTS role_id TEXT;

-- Shop colors table
CREATE TABLE IF NOT EXISTS shop_colors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hex TEXT NOT NULL,
  price_band TEXT NOT NULL,
  role_id TEXT
);

-- Idempotent upgrade for existing shop_colors rows (role_id support)
ALTER TABLE shop_colors ADD COLUMN IF NOT EXISTS role_id TEXT;

-- User archetypes table
CREATE TABLE IF NOT EXISTS user_archetypes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  archetype_id INTEGER NOT NULL REFERENCES shop_archetypes(id),
  slot_index INTEGER NOT NULL,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  free_grant BOOLEAN DEFAULT FALSE
);

-- User colors table
CREATE TABLE IF NOT EXISTS user_colors (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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

-- Emoji submissions table
CREATE TABLE IF NOT EXISTS emoji_submissions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  emoji_name TEXT NOT NULL,
  image_buffer BYTEA NOT NULL,
  image_mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  rejection_reason TEXT,
  created_emoji_id TEXT,
  user_xp INTEGER
);

CREATE INDEX IF NOT EXISTS idx_emoji_submissions_user_id ON emoji_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_emoji_submissions_status ON emoji_submissions(status);
CREATE INDEX IF NOT EXISTS idx_emoji_submissions_guild_id ON emoji_submissions(guild_id);

-- Idempotent schema upgrades for existing databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Defensive column backfill: tables created from older schema versions may be
-- missing columns that were added later without a matching ALTER statement.
-- Each of these is a no-op if the column already exists.
-- NOTE: total_residuals_balance / lifetime_residuals_earned / lifetime_residuals_spent
-- are deliberately NOT backfilled here - the live table uses coin_balance /
-- lifetime_coins_earned / lifetime_coins_spent instead. That's a naming
-- mismatch between this code and the live schema, not a missing column, and
-- needs to be resolved deliberately (see conversation) rather than papered
-- over with a second, disconnected currency column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_progression_role TEXT DEFAULT 'audience';
ALTER TABLE users ADD COLUMN IF NOT EXISTS promotion_eligibility_percentage REAL DEFAULT 0.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_xp_timestamp TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_xp_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_xp_reset TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_promotion_timestamp TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Defensive: the restore migration relies on ON CONFLICT (user_id), which
-- requires a unique/primary key constraint on user_id. Add one if the live
-- table doesn't already have it, without assuming it does.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND contype IN ('p', 'u')
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'users'::regclass AND attname = 'user_id'
    )
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Migration: Add missing username column if it was dropped or table was created from old schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT 'Unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE users ADD COLUMN nickname TEXT;
  END IF;
END $$;

-- Migration: Convert user_id columns from BIGINT to TEXT for Discord ID compatibility
-- This is safe for existing databases and preserves all data
DO $$
BEGIN
  -- Migrate users.user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE users ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;

  -- Migrate xp_transactions.user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xp_transactions' AND column_name = 'user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE xp_transactions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;

  -- Migrate admin_xp_changes.admin_user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_xp_changes' AND column_name = 'admin_user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE admin_xp_changes ALTER COLUMN admin_user_id TYPE TEXT USING admin_user_id::TEXT;
  END IF;

  -- Migrate admin_xp_changes.target_user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_xp_changes' AND column_name = 'target_user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE admin_xp_changes ALTER COLUMN target_user_id TYPE TEXT USING target_user_id::TEXT;
  END IF;

  -- Migrate residual_transactions.user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'residual_transactions' AND column_name = 'user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE residual_transactions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;

  -- Migrate residual_transactions.admin_user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'residual_transactions' AND column_name = 'admin_user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE residual_transactions ALTER COLUMN admin_user_id TYPE TEXT USING admin_user_id::TEXT;
  END IF;

  -- Migrate admin_residual_changes.admin_user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_residual_changes' AND column_name = 'admin_user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE admin_residual_changes ALTER COLUMN admin_user_id TYPE TEXT USING admin_user_id::TEXT;
  END IF;

  -- Migrate admin_residual_changes.target_user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_residual_changes' AND column_name = 'target_user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE admin_residual_changes ALTER COLUMN target_user_id TYPE TEXT USING target_user_id::TEXT;
  END IF;

  -- Migrate user_archetypes.user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_archetypes' AND column_name = 'user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE user_archetypes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;

  -- Migrate user_colors.user_id if it's still BIGINT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_colors' AND column_name = 'user_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE user_colors ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

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
