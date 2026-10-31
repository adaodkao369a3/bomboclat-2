import { getSetting, setSetting } from '../services/settings.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

import { EMOJIS } from '../config/index.js';
export const settingsCommand: Command = {
  name: 'settings',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check staff permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This command is restricted to staff.`);
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Usage: $settings <key> [get|set] [value] or $settings clip_channels <add|remove|list|clear> [#channel]`);
      return;
    }

    const key = subcommand;
    const action = args[1]?.toLowerCase();

    // Handle unknown_entity_powers subcommand
    if (key === 'unknown_entity_powers') {
      if (action === 'get' || !action) {
        const value = await getSetting('unknown_entity_powers');
        const isEnabled = value === 'true';
        await message.reply(`${EMOJIS.SETTINGS} Unknown Entity powers: ${isEnabled ? `${EMOJIS.GREEN_GLOSSY_TICK} ENABLED` : `${EMOJIS.GLOSSY_RED_CANCEL} DISABLED`}`);
        return;
      }

      if (action === 'set') {
        const newValue = args[2]?.toLowerCase();
        if (newValue !== 'true' && newValue !== 'false') {
          await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Please provide "true" or "false". Usage: $settings unknown_entity_powers set <true|false>`);
          return;
        }
        await setSetting('unknown_entity_powers', newValue, message.author.id);
        await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} Unknown Entity powers ${newValue === 'true' ? 'ENABLED' : 'DISABLED'}`);
        return;
      }

      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Usage: $settings unknown_entity_powers <get|set> [true|false]`);
      return;
    }

    // Handle clip_channels subcommand
    if (key === 'clip_channels') {
      const clipAction = action || 'list';

      if (clipAction === 'list') {
        const value = await getSetting('clip_channels');
        if (!value) {
          await message.reply(`${EMOJIS.SETTINGS} Clip channels allowlist is empty (defaulting to BOMBO_TIMES).`);
          return;
        }
        try {
          const channels = JSON.parse(value);
          const channelList = channels.map((id: string) => `<#${id}>`).join(', ') || 'None';
          await message.reply(`${EMOJIS.SETTINGS} Clip channels allowlist: ${channelList}`);
        } catch {
          await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Invalid clip_channels data in database.`);
        }
        return;
      }

      if (clipAction === 'clear') {
        await setSetting('clip_channels', JSON.stringify([]), message.author.id);
        await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} Clip channels allowlist cleared (defaulting to BOMBO_TIMES).`);
        return;
      }

      if (clipAction === 'add' || clipAction === 'remove') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Please mention a channel. Usage: $settings clip_channels <add|remove> #channel`);
          return;
        }

        const value = await getSetting('clip_channels');
        let channels: string[] = [];
        if (value) {
          try {
            channels = JSON.parse(value);
          } catch {
            channels = [];
          }
        }

        if (clipAction === 'add') {
          if (channels.includes(channel.id)) {
            await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} This channel is already in the allowlist.`);
            return;
          }
          channels.push(channel.id);
        } else {
          channels = channels.filter((id: string) => id !== channel.id);
        }

        await setSetting('clip_channels', JSON.stringify(channels), message.author.id);
        const channelList = channels.map((id: string) => `<#${id}>`).join(', ') || 'None';
        await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} Clip channels allowlist updated: ${channelList}`);
        return;
      }

      await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Usage: $settings clip_channels <add|remove|list|clear> [#channel]`);
      return;
    }

    // Handle generic key-value settings
    if (action === 'get' || !action) {
      const value = await getSetting(key);
      if (value === null) {
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Setting "${key}" not found.`);
        return;
      }
      await message.reply(`${EMOJIS.SETTINGS} ${key}: ${value}`);
      return;
    }

    if (action === 'set') {
      const newValue = args.slice(2).join(' ');
      if (!newValue) {
        await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Please provide a value. Usage: $settings <key> set <value>`);
        return;
      }
      await setSetting(key, newValue, message.author.id);
      await message.reply(`${EMOJIS.GREEN_GLOSSY_TICK} Setting "${key}" updated to: ${newValue}`);
      return;
    }

    await message.reply(`${EMOJIS.GLOSSY_RED_CANCEL} Usage: $settings <key> [get|set] [value] or $settings clip_channels <add|remove|list|clear> [#channel]`);
  },
};
