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

export interface Command {
  name: string;
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
  ];

  for (const command of commands) {
    client.commands.set(command.name, command);
  }

  console.log(`✓ Registered ${commands.length} commands`);
}
