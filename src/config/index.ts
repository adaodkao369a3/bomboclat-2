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
  // CAST ARC Progression Roles
  AUDIENCE: '1526865658955038721',
  EXTRA: '1535285274832277514',
  FEATURED_EXTRA: '1535285299410771988',
  SUPPORTING_CAST: '1535285344952651829',
  PRINCIPAL_CAST: '1535285379283026050',
  LEAD_CAST: '1535285425697194045',
  
  // ANTI-HERO ARC Progression Roles
  // TODO: Replace these placeholder IDs with actual Discord role IDs after creating the roles
  ROGUE: 'PLACEHOLDER_ROGUE_ROLE_ID',
  MERCENARY: 'PLACEHOLDER_MERCENARY_ROLE_ID',
  VIGILANTE: 'PLACEHOLDER_VIGILANTE_ROLE_ID',
  RENEGADE: 'PLACEHOLDER_RENEGADE_ROLE_ID',
  
  // VILLAIN ARC Progression Roles
  // TODO: Replace these placeholder IDs with actual Discord role IDs after creating the roles
  VILLAIN: 'PLACEHOLDER_VILLAIN_ROLE_ID',
  NEMESIS: 'PLACEHOLDER_NEMESIS_ROLE_ID',
  MASTERMIND: 'PLACEHOLDER_MASTERMIND_ROLE_ID',
  OVERLORD: 'PLACEHOLDER_OVERLORD_ROLE_ID',
  
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
  DAILY_XP_CAP: 1000, // Increased from 500 to accommodate extended 60-level progression
  MIN_MESSAGE_LENGTH: 3,
  DUPLICATE_MESSAGE_THRESHOLD: 3,
  SPAM_DETECTION_WINDOW_SECONDS: 60,
  
  LEVEL_XP_REQUIREMENTS: [
    // CAST ARC - Normal progression
    50,     // Level 1
    150,    // Level 2
    300,    // Level 3
    500,    // Level 4 (Extra)
    750,    // Level 5
    1050,   // Level 6
    1400,   // Level 7
    1800,   // Level 8 (Featured Extra)
    // 2× harder transition to Supporting Cast
    2700,   // Level 9 (gap 900 vs 450)
    3600,   // Level 10 (gap 900 vs 500)
    4600,   // Level 11 (gap 1000 vs 600)
    5700,   // Level 12 (gap 1100 vs 700)
    7300,   // Level 13 (Supporting Cast, gap 1600 vs 850)
    // Normal progression resumes
    8350,   // Level 14 (gap 1050)
    9500,   // Level 15 (gap 1150)
    10750,  // Level 16 (gap 1250)
    12100,  // Level 17 (gap 1350)
    13550,  // Level 18 (gap 1450)
    15100,  // Level 19 (Principal Cast, gap 1550)
    16750,  // Level 20 (gap 1650)
    18500,  // Level 21 (gap 1750)
    20350,  // Level 22 (gap 1850)
    22300,  // Level 23 (gap 1950)
    24350,  // Level 24 (gap 2050)
    26500,  // Level 25 (Lead Cast, gap 2150)
    // ANTI-HERO ARC - 2× harder transition from Lead Cast
    28800,  // Level 26 (gap 2300 vs 2150)
    31200,  // Level 27 (gap 2400)
    33700,  // Level 28 (gap 2500)
    36300,  // Level 29 (gap 2600)
    39300,  // Level 30 (Rogue, gap 3000 vs 2700)
    // Normal progression resumes in Anti-Hero arc
    41900,  // Level 31 (gap 2600)
    44600,  // Level 32 (gap 2700)
    47400,  // Level 33 (gap 2800)
    50300,  // Level 34 (Mercenary, gap 2900)
    53300,  // Level 35 (gap 3000)
    56400,  // Level 36 (gap 3100)
    59600,  // Level 37 (gap 3200)
    62900,  // Level 38 (Vigilante, gap 3300)
    66300,  // Level 39 (gap 3400)
    69800,  // Level 40 (gap 3500)
    73400,  // Level 41 (gap 3600)
    77100,  // Level 42 (Renegade, gap 3700)
    // VILLAIN ARC - 2× harder transition from Renegade
    80800,  // Level 43 (gap 3700 vs 3700)
    84600,  // Level 44 (gap 3800)
    88500,  // Level 45 (gap 3900)
    92500,  // Level 46 (gap 4000)
    96600,  // Level 47 (gap 4100)
    101800, // Level 48 (Villain, gap 5200 vs 4100)
    // Normal progression resumes in Villain arc
    106100, // Level 49 (gap 4300)
    110500, // Level 50 (gap 4400)
    115000, // Level 51 (gap 4500)
    119600, // Level 52 (Nemesis, gap 4600)
    124300, // Level 53 (gap 4700)
    129100, // Level 54 (gap 4800)
    134000, // Level 55 (gap 4900)
    139000, // Level 56 (Mastermind, gap 5000)
    144100, // Level 57 (gap 5100)
    149300, // Level 58 (gap 5200)
    154600, // Level 59 (gap 5300)
    160000, // Level 60 (Overlord, gap 5400)
  ],
  
  ROLE_LEVEL_REQUIREMENTS: {
    // CAST ARC
    audience: 0,
    extra: 4,
    featured_extra: 8,
    supporting_cast: 13,
    principal_cast: 19,
    lead_cast: 25,
    // ANTI-HERO ARC
    rogue: 30,
    mercenary: 34,
    vigilante: 38,
    renegade: 42,
    // VILLAIN ARC
    villain: 48,
    nemesis: 52,
    mastermind: 56,
    overlord: 60,
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
