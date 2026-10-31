import { GuildMember } from 'discord.js';
import { sendWelcomeMessage } from '../services/welcome.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
export const testWelcomeCommand: Command = {
  name: 'testwelcome',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.member || !isAdmin(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to admins.`);
      return;
    }

    await sendWelcomeMessage(message.member as GuildMember, message.channel);
    await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} Sent a sample welcome message.`);
  },
};
