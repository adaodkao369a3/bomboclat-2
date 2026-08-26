import { Client, Collection, Message } from 'discord.js';

import { helpCommand } from './help.js';
import { profileCommand } from './profile.js';
import { levelCommand } from './level.js';
import { resCommand } from './res.js';
import { leaderboardCommand } from './leaderboard.js';
import { gifCommands } from './gif.js';
import { customGifCommand } from './customGif.js';
import { clipCommand } from './clip.js';
import { xpCommand } from './xp.js';
import { residualsCommand } from './residuals.js';
import { syncRolesCommand } from './syncRoles.js';
import { adminHelpCommand } from './adminHelp.js';
import { rulesCommand } from './rules.js';
import { testWelcomeCommand } from './testWelcome.js';
import { testBoosterCommand } from './testBooster.js';
import { settingsCommand } from './settings.js';
import { shopCommand } from './shop.js';
import { roleorderCommand } from './roleorder.js';
import { manageCommand } from './manage.js';

export interface Command {
  name: string;
  allowedPrefix?: '.' | '$' | 'both';
  execute: (message: Message, args: string[], prefix: string) => Promise<void>;
}

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}

export async function registerCommands(client: Client): Promise<void> {
  const commands: Command[] = [
    helpCommand,
    profileCommand,
    levelCommand,
    resCommand,
    leaderboardCommand,
    ...gifCommands,
    customGifCommand,
    clipCommand,
    xpCommand,
    residualsCommand,
    syncRolesCommand,
    adminHelpCommand,
    rulesCommand,
    testWelcomeCommand,
    testBoosterCommand,
    settingsCommand,
    shopCommand,
    roleorderCommand,
    manageCommand,
  ];

  for (const command of commands) {
    // Use prefix-aware key to allow same command name with different prefixes
    const prefix = command.allowedPrefix === 'both' ? 'both' : command.allowedPrefix || '.';
    const key = `${prefix}:${command.name}`;
    client.commands.set(key, command);
  }

  console.log(`✓ Registered ${commands.length} commands`);
}
