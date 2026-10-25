/**
 * Persona shop configuration
 * All tier unlock levels, prices, holder caps, and signature colors live here for easy editing
 */

export interface PersonaConfig {
  name: string;
  tier: string;
  price: number;
  minLevel: number;
  maxHolders: number | null;
  monthly: boolean;
  sortOrder: number;
  signatureColor: string;
}

export const PERSONA_TIERS = {
  LEGENDARY: 'Legendary',
  ELITE: 'Elite',
  HIGH_STATUS: 'High-status',
  SPECIAL: 'Special',
} as const;

export const PERSONA_TIER_SYMBOLS: Record<string, string> = {
  [PERSONA_TIERS.LEGENDARY]: '👑',
  [PERSONA_TIERS.ELITE]: '⚔️',
  [PERSONA_TIERS.HIGH_STATUS]: '�',
  [PERSONA_TIERS.SPECIAL]: '🎭',
};

/**
 * Background colors for image generation by tier
 */
export const PERSONA_TIER_BACKGROUNDS: Record<string, string> = {
  [PERSONA_TIERS.SPECIAL]: '#7695B8', // Soft Steel Blue
  [PERSONA_TIERS.HIGH_STATUS]: '#4F9C91', // Jade Teal
  [PERSONA_TIERS.ELITE]: '#7866B5', // Royal Amethyst
  [PERSONA_TIERS.LEGENDARY]: '#C49A50', // Champagne Gold
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
 * Ordered by tier in descending order (Legendary → Elite → High-status → Special)
 */
export const PERSONAS_CONFIG: PersonaConfig[] = [
  // Legendary Tier (Level 90+) - 5000 residuals
  {
    name: 'Lord of the Heian Era',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 5000,
    minLevel: 90,
    maxHolders: 1,
    monthly: false,
    sortOrder: 1,
    signatureColor: PERSONA_SIGNATURE_COLORS['Lord of the Heian Era'],
  },
  {
    name: 'The Angels',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 5000,
    minLevel: 90,
    maxHolders: 5,
    monthly: false,
    sortOrder: 2,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Angels'],
  },
  {
    name: 'Witches of Sin',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 5000,
    minLevel: 90,
    maxHolders: 7,
    monthly: false,
    sortOrder: 3,
    signatureColor: PERSONA_SIGNATURE_COLORS['Witches of Sin'],
  },
  {
    name: 'S-Class Heroes',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 5000,
    minLevel: 90,
    maxHolders: 5,
    monthly: false,
    sortOrder: 4,
    signatureColor: PERSONA_SIGNATURE_COLORS['S-Class Heroes'],
  },
  {
    name: 'The Espada',
    tier: PERSONA_TIERS.LEGENDARY,
    price: 5000,
    minLevel: 90,
    maxHolders: 10,
    monthly: false,
    sortOrder: 5,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Espada'],
  },
  // Elite Tier (Level 70+) - 3000 residuals (6 items)
  {
    name: 'The Hashira',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 70,
    maxHolders: 9,
    monthly: false,
    sortOrder: 6,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Hashira'],
  },
  {
    name: 'The Wizard King',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 70,
    maxHolders: 1,
    monthly: false,
    sortOrder: 7,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Wizard King'],
  },
  {
    name: 'The Seven Shadows',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 70,
    maxHolders: 7,
    monthly: false,
    sortOrder: 8,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Seven Shadows'],
  },
  {
    name: 'Soul Society',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 70,
    maxHolders: 13,
    monthly: false,
    sortOrder: 9,
    signatureColor: PERSONA_SIGNATURE_COLORS['Soul Society'],
  },
  {
    name: 'Zoldyck Family',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 70,
    maxHolders: 7,
    monthly: false,
    sortOrder: 10,
    signatureColor: PERSONA_SIGNATURE_COLORS['Zoldyck Family'],
  },
  {
    name: 'Viltrumites',
    tier: PERSONA_TIERS.ELITE,
    price: 3000,
    minLevel: 70,
    maxHolders: 1,
    monthly: false,
    sortOrder: 11,
    signatureColor: PERSONA_SIGNATURE_COLORS['Viltrumites'],
  },
  // High-status Tier (Level 50+) - 2000 residuals (6 items with Control Devil moved here)
  {
    name: 'Special Division 4',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 50,
    maxHolders: 5,
    monthly: false,
    sortOrder: 12,
    signatureColor: PERSONA_SIGNATURE_COLORS['Special Division 4'],
  },
  {
    name: 'The Jedi Council',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 50,
    maxHolders: 12,
    monthly: false,
    sortOrder: 13,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Jedi Council'],
  },
  {
    name: 'Straw Hat Pirates',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 50,
    maxHolders: 10,
    monthly: false,
    sortOrder: 14,
    signatureColor: PERSONA_SIGNATURE_COLORS['Straw Hat Pirates'],
  },
  {
    name: 'Jobros',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 50,
    maxHolders: 5,
    monthly: false,
    sortOrder: 15,
    signatureColor: PERSONA_SIGNATURE_COLORS['Jobros'],
  },
  {
    name: 'Egoists',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 50,
    maxHolders: 11,
    monthly: false,
    sortOrder: 16,
    signatureColor: PERSONA_SIGNATURE_COLORS['Egoists'],
  },
  {
    name: 'Control Devil',
    tier: PERSONA_TIERS.HIGH_STATUS,
    price: 2000,
    minLevel: 50,
    maxHolders: 1,
    monthly: false,
    sortOrder: 17,
    signatureColor: PERSONA_SIGNATURE_COLORS['Control Devil'],
  },
  // Special Tier (Level 30+) - 5000 residuals (Unknown Entity keeps level 100 requirement)
  {
    name: 'The Comedian',
    tier: PERSONA_TIERS.SPECIAL,
    price: 5000,
    minLevel: 30,
    maxHolders: 1,
    monthly: false,
    sortOrder: 18,
    signatureColor: PERSONA_SIGNATURE_COLORS['The Comedian'],
  },
  {
    name: 'CEO of Sex',
    tier: PERSONA_TIERS.SPECIAL,
    price: 5000,
    minLevel: 30,
    maxHolders: 3,
    monthly: false,
    sortOrder: 19,
    signatureColor: PERSONA_SIGNATURE_COLORS['CEO of Sex'],
  },
  {
    name: 'Unknown Entity',
    tier: PERSONA_TIERS.SPECIAL,
    price: 5000,
    minLevel: 100, // Only this one keeps hard level requirement
    maxHolders: null, // unlimited
    monthly: true, // monthly subscription
    sortOrder: 20,
    signatureColor: PERSONA_SIGNATURE_COLORS['Unknown Entity'],
  },
];
