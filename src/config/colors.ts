/**
 * Color shop configuration
 * All tier unlock levels and prices live here for easy editing
 */

export interface ColorConfig {
  name: string;
  hex: string;
  price: number;
  tier: string;
  minLevel: number;
  sortOrder: number;
}

export const COLOR_TIERS = {
  STUDIO_CLASSICS: 'Studio Classics',
  MIDNIGHT_CINEMA: 'Midnight Cinema',
  NEON_LIGHTS: 'Neon Lights',
  AWARD_SEASON: 'Award Season',
} as const;

export const TIER_LEVELS: Record<string, number> = {
  [COLOR_TIERS.STUDIO_CLASSICS]: 20,
  [COLOR_TIERS.MIDNIGHT_CINEMA]: 40,
  [COLOR_TIERS.NEON_LIGHTS]: 40,
  [COLOR_TIERS.AWARD_SEASON]: 60,
};

/**
 * Background colors for image generation by tier
 */
export const COLOR_TIER_BACKGROUNDS: Record<string, string> = {
  [COLOR_TIERS.STUDIO_CLASSICS]: '#8BAA91', // Sage Green
  [COLOR_TIERS.MIDNIGHT_CINEMA]: '#668DAA', // Steel Blue
  [COLOR_TIERS.NEON_LIGHTS]: '#38BFD4', // Vibrant Cyan
  [COLOR_TIERS.AWARD_SEASON]: '#BFA36A', // Muted Gold
};

/**
 * All 21 colors with their configuration
 */
export const COLORS_CONFIG: ColorConfig[] = [
  // Tier 1: Studio Classics (Level 20)
  {
    name: 'Forest Green',
    hex: '#228B22',
    price: 100,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 1,
  },
  {
    name: 'Dusty Blue',
    hex: '#6B8BA4',
    price: 100,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 2,
  },
  {
    name: 'Slate Grey',
    hex: '#708090',
    price: 100,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 3,
  },
  {
    name: 'Golden Yellow',
    hex: '#FFD700',
    price: 150,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 4,
  },
  {
    name: 'Cherry Red',
    hex: '#D2042D',
    price: 200,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 5,
  },
  {
    name: 'Lavender Haze',
    hex: '#B7A6D9',
    price: 250,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 6,
  },
  // Tier 2: Midnight Cinema (Level 40)
  {
    name: 'Midnight Black',
    hex: '#0A0A0F',
    price: 300,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 7,
  },
  {
    name: 'Emerald',
    hex: '#50C878',
    price: 350,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 8,
  },
  {
    name: 'Glitch Magenta',
    hex: '#FF1CF7',
    price: 400,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 9, // Swapped with Sunset Orange
  },
  {
    name: 'Black Cherry',
    hex: '#6B0F2A',
    price: 450,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 10,
  },
  {
    name: 'Sapphire',
    hex: '#0F52BA',
    price: 500,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 11,
  },
  {
    name: 'Sunset Orange',
    hex: '#FF4500',
    price: 700,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 12, // Swapped with Glitch Magenta
  },
  // Tier 3: Neon Lights (Level 40)
  {
    name: 'Toxic Lime',
    hex: '#B6FF00',
    price: 500,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 13,
  },
  {
    name: 'Plasma Orange',
    hex: '#FF6A00',
    price: 550,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 14,
  },
  {
    name: 'Cyber Cyan',
    hex: '#00F0FF',
    price: 600,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 15,
  },
  {
    name: 'Laser Pink',
    hex: '#FF2E93',
    price: 650,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 16,
  },
  {
    name: 'Bright Yellow',
    hex: '#FFFF00',
    price: 800,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 17, // New color added
  },
  // Tier 4: Award Season (Level 60)
  {
    name: 'Turquoise',
    hex: '#40E0D0',
    price: 800,
    tier: COLOR_TIERS.AWARD_SEASON,
    minLevel: 60,
    sortOrder: 18,
  },
  {
    name: 'Pearl Lilac',
    hex: '#DCCBF2',
    price: 900,
    tier: COLOR_TIERS.AWARD_SEASON,
    minLevel: 60,
    sortOrder: 19,
  },
  {
    name: 'Champagne Gold',
    hex: '#E8C872',
    price: 1200,
    tier: COLOR_TIERS.AWARD_SEASON,
    minLevel: 60,
    sortOrder: 20, // Moved from Midnight Cinema to Award Season
  },
  {
    name: 'Diamond White',
    hex: '#F0F8FF',
    price: 1500,
    tier: COLOR_TIERS.AWARD_SEASON,
    minLevel: 60,
    sortOrder: 21,
  },
];

/**
 * Old colors that are being retired
 * These should be set to active = false
 */
export const RETIRED_COLORS = [
  'Crimson Red',
  'Ocean Blue',
  'Royal Purple',
  'Hot Pink',
  'Ruby',
  'Amethyst',
  'Topaz',
  'Aurora Green',
  'Platinum Silver',
  'Galaxy Purple',
];

/**
 * Tier symbols for embed display (not for role names)
 */
export const TIER_SYMBOLS: Record<string, string> = {
  [COLOR_TIERS.STUDIO_CLASSICS]: '🎬',
  [COLOR_TIERS.MIDNIGHT_CINEMA]: '🌙',
  [COLOR_TIERS.NEON_LIGHTS]: '⚡',
  [COLOR_TIERS.AWARD_SEASON]: '🏆',
};
