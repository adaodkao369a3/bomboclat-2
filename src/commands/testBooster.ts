import { GuildMember } from 'discord.js';
import { sendBoosterThankYou } from '../services/welcome.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
export const testBoosterCommand: Command = {
  name: 'testbooster',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {
    if (!message.member || !isAdmin(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to admins.`);
      return;
    }

    // Sample only - does NOT gift residuals, this just previews the message/GIF
    await sendBoosterThankYou(message.member as GuildMember, message.channel);
    await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} Sent a sample Guest Star message to this channel. (Nothing was gifted - this is a preview only.)`);
  },
};
