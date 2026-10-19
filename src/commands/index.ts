import { Client, Collection, Message } from 'discord.js';

import { helpCommand } from './help';
import { profileCommand } from './profile';
import { levelCommand } from './level';
import { resCommand } from './res';
import { leaderboardCommand } from './leaderboard';
import { gifCommands } from './gif';
import { roleGifCommands } from './roleGif';
import { customGifCommand } from './customGif';
import { clipCommand } from './clip';
import { xpCommand } from './xp';
import { residualsCommand } from './residuals';
import { adminHelpCommand } from './adminHelp';
import { rulesCommand } from './rules';
import { rulesStudioCommand } from './rulesStudio';
import { rulesEndCommand } from './rulesEnd';
import { testWelcomeCommand } from './testWelcome';
import { testBoosterCommand } from './testBooster';
import { testLevelCommand } from './testLevel';
import { settingsCommand } from './settings';
import { shopCommand } from './shop';
import { manageCommand } from './manage';
import { resetCommand } from './reset';
import { residualsLeaderboardCommand } from './residualsLeaderboard';
import { syncRolesCommand } from './syncRoles';
import { channelsCommand } from './channels';
import { perishCommand } from './perish';
import { transformCommand } from './transform';

export interface Command {
  name: string;
  allowedPrefix?: '.' | '$' | 'both';
  aliases?: string[];
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
    residualsLeaderboardCommand,
    ...gifCommands,
    ...roleGifCommands,
    customGifCommand,
    clipCommand,
    xpCommand,
    residualsCommand,
    adminHelpCommand,
    rulesCommand,
    rulesStudioCommand,
    rulesEndCommand,
    testWelcomeCommand,
    testBoosterCommand,
    testLevelCommand,
    settingsCommand,
    shopCommand,
    manageCommand,
    resetCommand,
    syncRolesCommand,
    channelsCommand,
    perishCommand,
    transformCommand,
  ];

  for (const command of commands) {
    // Use prefix-aware key to allow same command name with different prefixes
    const prefix = command.allowedPrefix === 'both' ? 'both' : command.allowedPrefix || '.';
    const key = `${prefix}:${command.name}`;
    client.commands.set(key, command);

    // Register aliases with the same prefix
    if (command.aliases) {
      for (const alias of command.aliases) {
        const aliasKey = `${prefix}:${alias}`;
        client.commands.set(aliasKey, command);
      }
    }
  }

  console.log(`✓ Registered ${commands.length} commands`);
}
