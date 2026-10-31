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
 * Background gradients for image generation by tier
 * Each tier has [lighterShade, darkerShade] for left-to-right gradient
 */
export const COLOR_TIER_BACKGROUNDS: Record<string, [string, string]> = {
  [COLOR_TIERS.STUDIO_CLASSICS]: ['#E8F8F3', '#C1E2ED'], // Ocean Pearl gradient (lighter to darker)
  [COLOR_TIERS.MIDNIGHT_CINEMA]: ['#54263C', '#292832'], // Burgundy + Charcoal gradient (lighter to darker)
  [COLOR_TIERS.NEON_LIGHTS]: ['#FFB5D2', '#FFB078'], // Hot Pink + Orange gradient (lighter to darker)
  [COLOR_TIERS.AWARD_SEASON]: ['#FFFFFF', '#C7D0DA'], // Pearl White + Silver gradient (lighter to darker)
};

/**
 * All 21 colors with their configuration
 */
export const COLORS_CONFIG: ColorConfig[] = [
  // Tier 1: Studio Classics (Level 20) - Soft Pastel Dreams palette
  {
    name: 'Pastel Green',
    hex: '#B7E4C7',
    price: 100,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 1,
  },
  {
    name: 'Powder Blue',
    hex: '#BDE0FE',
    price: 100,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 2,
  },
  {
    name: 'Peach Sorbet',
    hex: '#FFD6C0',
    price: 100,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 3,
  },
  {
    name: 'Butter Yellow',
    hex: '#FFF1A8',
    price: 150,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 4,
  },
  {
    name: 'Pastel Rose',
    hex: '#F4ACB7',
    price: 200,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 5,
  },
  {
    name: 'Lavender Mist',
    hex: '#D7C6F5',
    price: 250,
    tier: COLOR_TIERS.STUDIO_CLASSICS,
    minLevel: 20,
    sortOrder: 6,
  },
  // Tier 2: Midnight Cinema (Level 40) - Dark, dramatic, cinematic theme
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
    sortOrder: 9,
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
    name: 'Bright Yellow',
    hex: '#FFFF00',
    price: 600,
    tier: COLOR_TIERS.MIDNIGHT_CINEMA,
    minLevel: 40,
    sortOrder: 12,
  },

  // Tier 3: Neon Lights (Level 40) - Vibrant, energetic neon theme
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
    name: 'Laser Blue',
    hex: '#245BFF',
    price: 700,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 17,
  },
  {
    name: 'Acid Yellow',
    hex: '#EAFF00',
    price: 850,
    tier: COLOR_TIERS.NEON_LIGHTS,
    minLevel: 40,
    sortOrder: 18,
  },
  // Tier 4: Award Season (Level 60) - Premium tier with 3 colors only
  {
    name: 'Ruby Red',
    hex: '#9B111E',
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
    sortOrder: 20,
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
  'Forest Green',
  'Dusty Blue',
  'Slate Grey',
  'Golden Yellow',
  'Cherry Red',
  'Lavender Haze',
  'Turquoise',
  'Sunset Orange',
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
  'Pearl Lilac',
];

/**
 * Tier symbols for embed display (not for role names)
 */
export const TIER_SYMBOLS: Record<string, string> = {
  [COLOR_TIERS.STUDIO_CLASSICS]: '<:sparkles:1558594196921909278>',
  [COLOR_TIERS.MIDNIGHT_CINEMA]: '<:moon:1565486441054609428>',
  [COLOR_TIERS.NEON_LIGHTS]: '<:fire:1558430020010246286>',
  [COLOR_TIERS.AWARD_SEASON]: '<a:dcrown:1545829074956591234>',
};
