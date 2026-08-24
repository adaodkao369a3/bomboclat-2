import { GuildMember } from 'discord.js';
import { sendBoosterThankYou } from '../services/welcome.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

export const testBoosterCommand: Command = {
  name: 'testbooster',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    // Sample only - does NOT gift residuals, this just previews the message/GIF
    await sendBoosterThankYou(message.member as GuildMember);
    await message.reply('✅ Sent a sample Guest Star message to the red carpet channel. (No residuals were gifted - this is a preview only.)');
  },
};
