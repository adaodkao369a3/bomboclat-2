import { getUserArchetypes } from '../services/shop.js';
import { getSetting, setSetting, logStaffAction } from '../services/settings.js';
import { ROLES } from '../config/index.js';
import { isStaff } from '../utils/permissions.js';
import { Command } from './index.js';

interface DailyUses {
  userId: string;
  uses: number;
  date: string;
}

// In-memory tracking for daily uses (resets on bot restart, acceptable for this use case)
const dailyUsesCache = new Map<string, DailyUses>();

export const perishCommand: Command = {
  name: 'perish',
  allowedPrefix: '.',
  async execute(message, _args, _prefix) {
    if (!message.guild) {
      await message.reply('❌ This command can only be used in servers.');
      return;
    }

    // Check if Unknown Entity powers are enabled
    const powersEnabled = await getSetting('unknown_entity_powers');
    if (powersEnabled === 'false') {
      await message.reply('❌ Unknown Entity powers are currently disabled by staff.');
      return;
    }

    // Check if user has Unknown Entity
    const userArchetypes = await getUserArchetypes(message.author.id);
    const hasUnknownEntity = userArchetypes.some(a => a.name === 'Unknown Entity');

    if (!hasUnknownEntity) {
      await message.reply('❌ Only Unknown Entity holders can use this command.');
      return;
    }

    // Get target user
    const target = message.mentions.users.first();
    if (!target) {
      await message.reply('❌ Please mention a user to target. Usage: .perish @user');
      return;
    }

    // Get target member
    const targetMember = await message.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await message.reply('❌ Could not find that user in this server.');
      return;
    }

    // Check target restrictions
    // Cannot target: staff/admins, server owner, bots, boosters, other Unknown Entity holders, or yourself
    if (target.id === message.author.id) {
      await message.reply('❌ You cannot target yourself.');
      return;
    }

    if (targetMember.user.bot) {
      await message.reply('❌ You cannot target bots.');
      return;
    }

    if (targetMember.id === message.guild.ownerId) {
      await message.reply('❌ You cannot target the server owner.');
      return;
    }

    if (isStaff(targetMember)) {
      await message.reply('❌ You cannot target staff members.');
      return;
    }

    if (targetMember.roles.cache.has(ROLES.BOOSTER)) {
      await message.reply('❌ You cannot target boosters.');
      return;
    }

    const targetArchetypes = await getUserArchetypes(target.id);
    const targetHasUnknownEntity = targetArchetypes.some(a => a.name === 'Unknown Entity');
    if (targetHasUnknownEntity) {
      await message.reply('❌ You cannot target other Unknown Entity holders.');
      return;
    }

    // Check daily uses (3 per day, shared with .transform)
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = message.author.id;
    const cached = dailyUsesCache.get(cacheKey);

    if (cached && cached.date === today && cached.uses >= 3) {
      await message.reply('❌ You have used all 3 of your Unknown Entity powers for today. They reset at midnight.');
      return;
    }

    // Check cooldown (1 hour)
    const cooldownKey = `perish_cooldown_${message.author.id}`;
    const cooldownData = await getSetting(cooldownKey);
    if (cooldownData) {
      const cooldownEnd = new Date(cooldownData);
      if (cooldownEnd > new Date()) {
        const remaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000 / 60);
        await message.reply(`❌ You are on cooldown. Please wait ${remaining} minutes.`);
        return;
      }
    }

    // Apply timeout (1 minute)
    try {
      await targetMember.timeout(60 * 1000, 'Used .perish by Unknown Entity holder');
    } catch (error) {
      console.error('Failed to timeout user:', error);
      await message.reply('❌ Failed to timeout the user. They may have permissions that prevent it.');
      return;
    }

    // Update daily uses
    const newUses = (cached?.date === today ? cached.uses : 0) + 1;
    dailyUsesCache.set(cacheKey, { userId: message.author.id, uses: newUses, date: today });

    // Set cooldown (1 hour from now)
    const cooldownEnd = new Date();
    cooldownEnd.setHours(cooldownEnd.getHours() + 1);
    await setSetting(cooldownKey, cooldownEnd.toISOString(), message.author.id);

    // Announce in channel
    if (message.channel.isTextBased()) {
      await (message.channel as any).send(
        `⚡ **${message.author.username}** used **.perish** on **${target.username}**! They are timed out for 1 minute.`
      );
    }

    // Log staff action
    await logStaffAction(
      message.guild,
      `🔹 **.perish used**\nUser: ${message.author} (${message.author.id})\nTarget: ${target} (${target.id})`
    );
  },
};
