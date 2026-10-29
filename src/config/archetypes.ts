/**
 * Persona shop configuration
 * All tier unlock levels, prices, holder caps, and signature colors live here for easy editing
 */

export interface PersonaConfig {
  /** Permanent identifier. Never change it, even if the display name changes. */
  key: string;
  name: string;
  tier: string;
  price: number;
  minLevel: number;
  maxHolders: number | null;
  monthly: boolean;
  sortOrder: number;
  signatureColor: string;
}

/** Keys of personas that have special behaviour in code */
export const PERSONA_KEYS = {
  UNKNOWN_ENTITY: 'unknown-entity',
  THE_COMEDIAN: 'the-comedian',
} as const;

/** Low → high, the order tiers are shown in shop and help */
export const PERSONA_TIER_ORDER: string[] = ['High-status', 'Elite', 'Legendary', 'Transcendent', 'Special'];

export const PERSONA_TIERS = {
  TRANSCENDENT: 'Transcendent',
  LEGENDARY: 'Legendary',
  ELITE: 'Elite',
  HIGH_STATUS: 'High-status',
  SPECIAL: 'Special',
} as const;

export const PERSONA_TIER_SYMBOLS: Record<string, string> = {
  [PERSONA_TIERS.TRANSCENDENT]: '✨',
  [PERSONA_TIERS.LEGENDARY]: '👑',
  [PERSONA_TIERS.ELITE]: '⚔️',
  [PERSONA_TIERS.HIGH_STATUS]: '🛡️',
  [PERSONA_TIERS.SPECIAL]: '🎭',
};

/**
 * Background gradients for image generation by tier
 * Each tier has [lighterShade, darkerShade] for left-to-right gradient
 */
export const PERSONA_TIER_BACKGROUNDS: Record<string, [string, string]> = {
  [PERSONA_TIERS.SPECIAL]: ['#A8C4D0', '#4A6A7A'], // Soft Steel Blue gradient (lighter to darker)
  [PERSONA_TIERS.HIGH_STATUS]: ['#7AB8AB', '#2D6A5D'], // Jade Teal gradient (lighter to darker)
  [PERSONA_TIERS.ELITE]: ['#9D8FC7', '#4A3D7A'], // Royal Amethyst gradient (lighter to darker)
  [PERSONA_TIERS.LEGENDARY]: ['#E8C080', '#8B6A30'], // Champagne Gold gradient (lighter to darker)
  [PERSONA_TIERS.TRANSCENDENT]: ['#E0A2FF', '#6B2D7A'], // Cosmic Purple gradient (lighter to darker) - for S-Class Heroes & Espada
};

/**
 * Signature colors for each persona (for Discord role colors)
 */
export const PERSONA_SIGNATURE_COLORS: Record<string, string> = {
  'The Comedian': '#E63946',
  'CEO of Sex': '#FF4FA3',
  'Unknown Entity': '#FFF4D6',
  'Special Division 4': '#E85D3F',
  'The Jedi Council': '#597dbd',
  'Straw Hat Pirates': '#F2C14E',
  'Jobros': '#9B5DE5',
  'Egoists': '#5297f0',
  'Control Devil': '#A4161A',
  'The Hashira': '#B8A1E3',
  'The Wizard King': '#27864A',
  'The Seven Shadows': '#5D3FD3',
  'Soul Society': '#343A72',
  'Zoldyck Family': '#A7B0B8',
  'Viltrumites': '#d86556',
  'Lord of the Heian Era': '#C2185B',
  'The Angels': '#7FE7DC',
  'Witches of Sin': '#44213A',
  'S-Class Heroes': '#B5E61D',
  'The Espada': '#2F4F4F',
};

/**
 * All 20 personas with their configuration
 * Ordered by tier in descending order (Transcendent → Legendary → Elite → High-status → Special)
 */
export const PERSONAS_CONFIG: PersonaConfig[] = [
  // Transcendent Tier (Level 90) - 4500 residuals (Top tier: S-Class Heroes & Espada)
  {
    key: 's-class-heroes',
    name: 'S-Class Heroes',
    tier: PERSONA_TIERS.TRANSCENDENT,
    price: 4500,
    minLevel: 90,
    maxHolders: 5,
    monthly: false,
    sortOrder: 1,
    signatureColor: PERSONA_SIGNATURE_COLORS['S-Class Heroes'],
  },
  {
    key: 'the-espada',
    name: 'The Espada',
    tier: PERSONA_TIERS.TRANSCENDENT,
    price: 4500,
    minLevel: 90,
    maxHolders: 10,
    monthly: false,
    sortOrder: 2,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Espada'],
  },
  // Legendary Tier (Level 70) - 4000 residuals
  {
    key: 'lord-of-the-heian-era',
    name: 'Lord of the Heian Era',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 4000,
    minLevel: 70,
    maxHolders: 1,
    monthly: false,
    sortOrder: 3,
    signatureColor: PERSONA_SIGNATURE_COLORS['Lord of the Heian Era'],
  },
  {
    key: 'the-angels',
    name: 'The Angels',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 4000,
    minLevel: 70,
    maxHolders: 5,
    monthly: false,
    sortOrder: 4,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Angels'],
  },
  {
    key: 'witches-of-sin',
    name: 'Witches of Sin',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 4000,
    minLevel: 70,
    maxHolders: 7,
    monthly: false,
    sortOrder: 5,
    signatureColor: PERSONA_SIGNATURE_COLORS['Witches of Sin'],
  },
  // Elite Tier (Level 50) - 3000 residuals (6 items)
  {
    key: 'the-hashira',
    name: 'The Hashira',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 50,
    maxHolders: 9,
    monthly: false,
    sortOrder: 6,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Hashira'],
  },
  {
    key: 'the-wizard-king',
    name: 'The Wizard King',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 50,
    maxHolders: 1,
    monthly: false,
    sortOrder: 7,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Wizard King'],
  },
  {
    key: 'the-seven-shadows',
    name: 'The Seven Shadows',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 50,
    maxHolders: 7,
    monthly: false,
    sortOrder: 8,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Seven Shadows'],
  },
  {
    key: 'soul-society',
    name: 'Soul Society',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 50,
    maxHolders: 13,
    monthly: false,
    sortOrder: 9,
    signatureColor: PERSONA_SIGNATURE_COLORS['Soul Society'],
  },
  {
    key: 'zoldyck-family',
    name: 'Zoldyck Family',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 50,
    maxHolders: 7,
    monthly: false,
    sortOrder: 10,
    signatureColor: PERSONA_SIGNATURE_COLORS['Zoldyck Family'],
  },
  {
    key: 'viltrumites',
    name: 'Viltrumites',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 50,
    maxHolders: 1,
    monthly: false,
    sortOrder: 11,
    signatureColor: PERSONA_SIGNATURE_COLORS['Viltrumites'],
  },
  // High-status Tier (Level 30) - 2000 residuals (6 items with Control Devil moved here)
  {
    key: 'special-division-4',
    name: 'Special Division 4',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 30,
    maxHolders: 5,
    monthly: false,
    sortOrder: 12,
    signatureColor: PERSONA_SIGNATURE_COLORS['Special Division 4'],
  },
  {
    key: 'the-jedi-council',
    name: 'The Jedi Council',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 30,
    maxHolders: 12,
    monthly: false,
    sortOrder: 13,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Jedi Council'],
  },
  {
    key: 'straw-hat-pirates',
    name: 'Straw Hat Pirates',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 30,
    maxHolders: 10,
    monthly: false,
    sortOrder: 14,
    signatureColor: PERSONA_SIGNATURE_COLORS['Straw Hat Pirates'],
  },
  {
    key: 'jobros',
    name: 'Jobros',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 30,
    maxHolders: 5,
    monthly: false,
    sortOrder: 15,
    signatureColor: PERSONA_SIGNATURE_COLORS['Jobros'],
  },
  {
    key: 'egoists',
    name: 'Egoists',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 30,
    maxHolders: 11,
    monthly: false,
    sortOrder: 16,
    signatureColor: PERSONA_SIGNATURE_COLORS['Egoists'],
  },
  {
    key: 'control-devil',
    name: 'Control Devil',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 30,
    maxHolders: 1,
    monthly: false,
    sortOrder: 17,
    signatureColor: PERSONA_SIGNATURE_COLORS['Control Devil'],
  },
  // Special Tier (Level 100) - 5000 residuals (Unknown Entity also at level 100)
  {
    key: 'the-comedian',
    name: 'The Comedian',
    tier: PERSONA_TIERS.SPECIAL,
    price: 5000,
    minLevel: 100,
    maxHolders: 1,
    monthly: false,
    sortOrder: 18,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Comedian'],
  },
  {
    key: 'ceo-of-sex',
    name: 'CEO of Sex',
    tier: PERSONA_TIERS.SPECIAL,
    price: 5000,
    minLevel: 100,
    maxHolders: 3,
    monthly: false,
    sortOrder: 19,
    signatureColor: PERSONA_SIGNATURE_COLORS['CEO of Sex'],
  },
  {
    key: 'unknown-entity',
    name: 'Unknown Entity',
    tier: PERSONA_TIERS.SPECIAL,
    price: 5000,
    minLevel: 100,
    maxHolders: null, // unlimited
    monthly: true, // monthly subscription
    sortOrder: 20,
    signatureColor: PERSONA_SIGNATURE_COLORS['Unknown Entity'],
  },
];
