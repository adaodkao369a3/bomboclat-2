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
  accessValue?: number | string; // level number or role name
  aliases?: string[];
}

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
    description: 'Get information about your residuals',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'leaderboard',
    description: 'View the XP leaderboard',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'reslb',
    description: 'View the residuals leaderboard',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'help',
    description: 'Get help with commands',
    access: CommandAccess.EVERYONE,
  },
  // GIF commands
  {
    name: 'rizz',
    description: 'Send a rizz GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'larp',
    description: 'Send a larp GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'blush',
    description: 'Send a blush GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'cooked',
    description: 'Send a cooked GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'fumble',
    description: 'Send a fumble GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'cope',
    description: 'Send a cope GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'grass',
    description: 'Send a touch grass GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'aura',
    description: 'Send an aura GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'huh',
    description: 'Send a huh GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'cry',
    description: 'Send a crying GIF',
    access: CommandAccess.EVERYONE,
  },
  {
    name: 'leash',
    description: 'Send a leash GIF',
    access: CommandAccess.EVERYONE,
  },
  // Custom GIF (Hero+)
  {
    name: 'c',
    description: 'Custom GIF search (Hero+)',
    access: CommandAccess.LEVEL,
    accessValue: 10,
  },
  // Manage (Superhero+)
  {
    name: 'manage',
    description: 'Manage your colors and archetypes (Superhero+)',
    access: CommandAccess.LEVEL,
    accessValue: 40,
  },
];

/**
 * Get commands available to a user based on their level and roles
 */
export function getAvailableCommands(
  userLevel: number,
  userRoles: string[]
): CommandInfo[] {
  return PUBLIC_COMMANDS.filter(cmd => {
    if (cmd.access === CommandAccess.EVERYONE) return true;
    if (cmd.access === CommandAccess.STAFF) return false;

    if (cmd.access === CommandAccess.LEVEL) {
      return userLevel >= (cmd.accessValue as number);
    }

    if (cmd.access === CommandAccess.ROLE) {
      return userRoles.includes(cmd.accessValue as string);
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
