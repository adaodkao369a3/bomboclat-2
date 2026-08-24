import { GuildMember } from 'discord.js';
import { sendWelcomeMessage } from '../services/welcome.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

export const testWelcomeCommand: Command = {
  name: 'testwelcome',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    await sendWelcomeMessage(message.member as GuildMember);
    await message.reply('✅ Sent a sample welcome message.');
  },
};
