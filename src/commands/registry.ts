import { PERSONAS_CONFIG, PERSONA_KEYS, PERSONA_TIER_ORDER } from '../config/archetypes.js';
import { ROLE_GIF_COMMANDS } from '../config/roleGifCommands.js';
import { EMOJIS, GIF_COMMANDS, GIF_COMMAND_LEVELS, GIF_CONFIG } from '../config/index.js';

export enum CommandAccess {
  EVERYONE = 'everyone',
  LEVEL = 'level',
  ROLE = 'role',
  STAFF = 'staff',
}

export interface CommandInfo {
  name: string;
  description: string;
  access: CommandAccess;
  accessValue?: number | string; // level number, or persona key for ROLE access
  aliases?: string[];
}

/** Plain GIF commands, one entry each, unlocked at their tier's level */
const GIF_COMMAND_INFOS: CommandInfo[] = Object.keys(GIF_COMMANDS).map(name => ({
  name,
  description: `Send a ${name} GIF (Level ${GIF_COMMAND_LEVELS[name]}+)`,
  access: CommandAccess.LEVEL,
  accessValue: GIF_COMMAND_LEVELS[name],
}));

/**
 * Single source of truth for all public member commands
 * Staff-only commands are NOT included here
 */
export const PUBLIC_COMMANDS: CommandInfo[] = [
  {
    name: 'profile',
    description: 'View your studio profile',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'level',
    description: 'Check your level and XP progress',
    access: CommandAccess.EVERYONE,
    aliases: ['lvl'],
  },
  {
    name: 'res',
    description: `Check your ${EMOJIS.MONEY} balance`,
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'leaderboard',
    description: 'View the XP leaderboard',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'reslb',
    description: `View the ${EMOJIS.MONEY} leaderboard`,
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'help',
    description: 'Get help with commands',
    access: CommandAccess.EVERYONE,
  },
  // GIF commands (unlocked by level tier)
  ...GIF_COMMAND_INFOS,
  // Custom GIF (level-gated)
  {
    name: 'c',
    description: `Custom GIF search (Level ${GIF_CONFIG.CUSTOM_MIN_LEVEL}+)`,
    access: CommandAccess.LEVEL,
    accessValue: GIF_CONFIG.CUSTOM_MIN_LEVEL,
  },
  // Manage (Superhero+)
  {
    name: 'manage',
    description: 'Manage your colors and persona (Superhero+)',
    access: CommandAccess.LEVEL,
    accessValue: 40,
  },
];

// ---------------------------------------------------------------------------
// Persona commands (built from config, so they never go out of date)
// ---------------------------------------------------------------------------

export interface PersonaCommandGroup {
  key: string;
  name: string;
  tier: string;
  minLevel: number;
  maxHolders: number | null;
  monthly: boolean;
  commands: { name: string; description: string }[];
}

/** Commands tied to a persona that are not plain GIF commands */
const PERSONA_POWER_COMMANDS: Record<string, { name: string; description: string }[]> = {
  [PERSONA_KEYS.UNKNOWN_ENTITY]: [
    { name: 'perish @user', description: 'Time out someone for 1 minute (3 powers a day, shared with transform)' },
    { name: 'transform @user [uwu|tsundere]', description: 'Rewrite someone\'s messages for about 2 minutes' },
  ],
  [PERSONA_KEYS.THE_COMEDIAN]: [
    { name: 'transform @user [uwu|tsundere]', description: 'Rewrite someone\'s messages for about 2 minutes' },
  ],
};

/**
 * Every persona with all of its commands, ordered low → high tier
 * (same order as the shop).
 */
export function getPersonaCommandGroups(): PersonaCommandGroup[] {
  return [...PERSONAS_CONFIG]
    .sort((a, b) => {
      const t = PERSONA_TIER_ORDER.indexOf(a.tier) - PERSONA_TIER_ORDER.indexOf(b.tier);
      return t !== 0 ? t : a.sortOrder - b.sortOrder;
    })
    .map(p => ({
      key: p.key,
      name: p.name,
      tier: p.tier,
      minLevel: p.minLevel,
      maxHolders: p.maxHolders,
      monthly: p.monthly,
      commands: [
        ...ROLE_GIF_COMMANDS.filter(c => c.persona === p.key).map(c => ({
          name: c.name,
          description: `GIF: ${c.caption}`,
        })),
        ...(PERSONA_POWER_COMMANDS[p.key] ?? []),
      ],
    }));
}

/** Persona commands as registry entries (ROLE access, value = persona key) */
function personaCommandInfos(): CommandInfo[] {
  const infos: CommandInfo[] = [];
  const seen = new Set<string>();
  for (const group of getPersonaCommandGroups()) {
    for (const cmd of group.commands) {
      const dedupeKey = `${group.key}:${cmd.name}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      infos.push({
        name: cmd.name,
        description: `${cmd.description} (${group.name})`,
        access: CommandAccess.ROLE,
        accessValue: group.key,
      });
    }
  }
  return infos;
}

PUBLIC_COMMANDS.push(...personaCommandInfos());

/**
 * Get commands available to a user based on their level and roles
 */
export function getAvailableCommands(
  userLevel: number,
  ownedPersonaKeys: string[] = []
): CommandInfo[] {
  return PUBLIC_COMMANDS.filter(cmd => {
    if (cmd.access === CommandAccess.EVERYONE) return true;
    if (cmd.access === CommandAccess.STAFF) return false;

    if (cmd.access === CommandAccess.LEVEL) {
      return userLevel >= (cmd.accessValue as number);
    }

    if (cmd.access === CommandAccess.ROLE) {
      return ownedPersonaKeys.includes(cmd.accessValue as string);
    }

    return false;
  });
}

/**
 * Get command info by name
 */
export function getCommandInfo(name: string): CommandInfo | undefined {
  return PUBLIC_COMMANDS.find(cmd => cmd.name === name || cmd.aliases?.includes(name));
}
