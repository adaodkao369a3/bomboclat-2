import { getSetting, setSetting } from '../services/settings.js';
import { isStaff } from '../utils/permissions.js';
import { Command } from './index.js';

export const settingsCommand: Command = {
  name: 'settings',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check staff permissions
    if (!message.member || !isStaff(message.member)) {
      await message.reply('❌ This command is restricted to staff.');
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      await message.reply('❌ Usage: $settings <key> [get|set] [value] or $settings clip_channels <add|remove|list> [#channel]');
      return;
    }

    const key = subcommand;
    const action = args[1]?.toLowerCase();

    // Handle clip_channels subcommand
    if (key === 'clip_channels') {
      const clipAction = action || 'list';

      if (clipAction === 'list') {
        const value = await getSetting('clip_channels');
        if (!value) {
          await message.reply('📝 Clip channels allowlist is empty (defaulting to BOMBO_TIMES).');
          return;
        }
        try {
          const channels = JSON.parse(value);
          const channelList = channels.map((id: string) => `<#${id}>`).join(', ') || 'None';
          await message.reply(`📝 Clip channels allowlist: ${channelList}`);
        } catch {
          await message.reply('❌ Invalid clip_channels data in database.');
        }
        return;
      }

      if (clipAction === 'add' || clipAction === 'remove') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await message.reply('❌ Please mention a channel. Usage: $settings clip_channels <add|remove> #channel');
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
            await message.reply('❌ This channel is already in the allowlist.');
            return;
          }
          channels.push(channel.id);
        } else {
          channels = channels.filter((id: string) => id !== channel.id);
        }

        await setSetting('clip_channels', JSON.stringify(channels), message.author.id);
        const channelList = channels.map((id: string) => `<#${id}>`).join(', ') || 'None';
        await message.reply(`✅ Clip channels allowlist updated: ${channelList}`);
        return;
      }

      await message.reply('❌ Usage: $settings clip_channels <add|remove|list> [#channel]');
      return;
    }

    // Handle generic key-value settings
    if (action === 'get' || !action) {
      const value = await getSetting(key);
      if (value === null) {
        await message.reply(`❌ Setting "${key}" not found.`);
        return;
      }
      await message.reply(`📝 ${key}: ${value}`);
      return;
    }

    if (action === 'set') {
      const newValue = args.slice(2).join(' ');
      if (!newValue) {
        await message.reply('❌ Please provide a value. Usage: $settings <key> set <value>');
        return;
      }
      await setSetting(key, newValue, message.author.id);
      await message.reply(`✅ Setting "${key}" updated to: ${newValue}`);
      return;
    }

    await message.reply('❌ Usage: $settings <key> [get|set] [value] or $settings clip_channels <add|remove|list> [#channel]');
  },
};
