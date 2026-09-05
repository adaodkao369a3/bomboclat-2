import { Client, Collection, Message } from 'discord.js';

import { helpCommand } from './help';
import { profileCommand } from './profile';
import { levelCommand } from './level';
import { resCommand } from './res';
import { leaderboardCommand } from './leaderboard';
import { gifCommands } from './gif';
import { customGifCommand } from './customGif';
import { clipCommand } from './clip';
import { xpCommand } from './xp';
import { residualsCommand } from './residuals';
import { adminHelpCommand } from './adminHelp';
import { rulesCommand } from './rules';
import { testWelcomeCommand } from './testWelcome';
import { testBoosterCommand } from './testBooster';
import { testLevelCommand } from './testLevel';
import { settingsCommand } from './settings';
import { shopCommand } from './shop';
import { manageCommand } from './manage';
import { resetCommand } from './reset';

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
    adminHelpCommand,
    rulesCommand,
    testWelcomeCommand,
    testBoosterCommand,
    testLevelCommand,
    settingsCommand,
    shopCommand,
    manageCommand,
    resetCommand,
  ];

  for (const command of commands) {
    // Use prefix-aware key to allow same command name with different prefixes
    const prefix = command.allowedPrefix === 'both' ? 'both' : command.allowedPrefix || '.';
    const key = `${prefix}:${command.name}`;
    client.commands.set(key, command);
  }

  console.log(`✓ Registered ${commands.length} commands`);
}
