/**
 * Archetype shop configuration
 * All tier unlock levels, prices, and holder caps live here for easy editing
 */

export interface ArchetypeConfig {
  name: string;
  tier: string;
  price: number;
  minLevel: number;
  maxHolders: number | null;
  monthly: boolean;
  sortOrder: number;
}

export const ARCHETYPE_TIERS = {
  SPECIAL: 'Special',
  HIGH_STATUS: 'High-status',
  ELITE: 'Elite',
  LEGENDARY: 'Legendary',
} as const;

export const ARCHETYPE_TIER_SYMBOLS: Record<string, string> = {
  [ARCHETYPE_TIERS.SPECIAL]: '⭐',
  [ARCHETYPE_TIERS.HIGH_STATUS]: '🌟',
  [ARCHETYPE_TIERS.ELITE]: '💎',
  [ARCHETYPE_TIERS.LEGENDARY]: '👑',
};

/**
 * All 20 archetypes with their configuration
 */
export const ARCHETYPES_CONFIG: ArchetypeConfig[] = [
  // Special Tier (Level 30+)
  {
    name: 'The Comedian',
    tier: ARCHETYPE_TIERS.SPECIAL,
    price: 600,
    minLevel: 30,
    maxHolders: 1,
    monthly: false,
    sortOrder: 1,
  },
  {
    name: 'CEO of Sex',
    tier: ARCHETYPE_TIERS.SPECIAL,
    price: 750,
    minLevel: 30,
    maxHolders: 3,
    monthly: false,
    sortOrder: 2,
  },
  {
    name: 'Unknown Entity',
    tier: ARCHETYPE_TIERS.SPECIAL,
    price: 1500,
    minLevel: 100,
    maxHolders: null, // unlimited
    monthly: true, // monthly subscription
    sortOrder: 3,
  },
  // High-status Tier (Level 50+)
  {
    name: 'Special Division 4',
    tier: ARCHETYPE_TIERS.HIGH_STATUS,
    price: 1000,
    minLevel: 50,
    maxHolders: 5,
    monthly: false,
    sortOrder: 4,
  },
  {
    name: 'The Jedi Council',
    tier: ARCHETYPE_TIERS.HIGH_STATUS,
    price: 1000,
    minLevel: 50,
    maxHolders: 12,
    monthly: false,
    sortOrder: 5,
  },
  {
    name: 'Straw Hat Pirates',
    tier: ARCHETYPE_TIERS.HIGH_STATUS,
    price: 1000,
    minLevel: 50,
    maxHolders: 10,
    monthly: false,
    sortOrder: 6,
  },
  {
    name: 'Jobros',
    tier: ARCHETYPE_TIERS.HIGH_STATUS,
    price: 1000,
    minLevel: 50,
    maxHolders: 5,
    monthly: false,
    sortOrder: 7,
  },
  {
    name: 'Egoists',
    tier: ARCHETYPE_TIERS.HIGH_STATUS,
    price: 1000,
    minLevel: 50,
    maxHolders: 11,
    monthly: false,
    sortOrder: 8,
  },
  // Elite Tier (Level 70+)
  {
    name: 'The Hashira',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 9,
    monthly: false,
    sortOrder: 9,
  },
  {
    name: 'The Wizard King',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 1,
    monthly: false,
    sortOrder: 10,
  },
  {
    name: 'The Seven Shadows',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 7,
    monthly: false,
    sortOrder: 11,
  },
  {
    name: 'Soul Society',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 13,
    monthly: false,
    sortOrder: 12,
  },
  {
    name: 'Control Devil',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 1,
    monthly: false,
    sortOrder: 13,
  },
  {
    name: 'Zoldyck Family',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 7,
    monthly: false,
    sortOrder: 14,
  },
  {
    name: 'The Immortal Dragon',
    tier: ARCHETYPE_TIERS.ELITE,
    price: 1800,
    minLevel: 70,
    maxHolders: 1,
    monthly: false,
    sortOrder: 15,
  },
  // Legendary Tier (Level 90+)
  {
    name: 'Lord of the Heian Era',
    tier: ARCHETYPE_TIERS.LEGENDARY,
    price: 3000,
    minLevel: 90,
    maxHolders: 1,
    monthly: false,
    sortOrder: 16,
  },
  {
    name: 'The Angels',
    tier: ARCHETYPE_TIERS.LEGENDARY,
    price: 3000,
    minLevel: 90,
    maxHolders: 5,
    monthly: false,
    sortOrder: 17,
  },
  {
    name: 'Witches of Sin',
    tier: ARCHETYPE_TIERS.LEGENDARY,
    price: 3000,
    minLevel: 90,
    maxHolders: 7,
    monthly: false,
    sortOrder: 18,
  },
  {
    name: 'S-Class Heroes',
    tier: ARCHETYPE_TIERS.LEGENDARY,
    price: 3000,
    minLevel: 90,
    maxHolders: 5,
    monthly: false,
    sortOrder: 19,
  },
  {
    name: 'The Espada',
    tier: ARCHETYPE_TIERS.LEGENDARY,
    price: 3000,
    minLevel: 90,
    maxHolders: 10,
    monthly: false,
    sortOrder: 20,
  },
];
