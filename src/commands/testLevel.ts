import { isAdmin } from '../utils/permissions.js';
import { sendLevelUpNotification } from '../services/levelUpNotification.js';
import { getRoleFromLevel, type XPAwardResult } from '../services/xp.js';
import { Command } from './index.js';

export const testLevelCommand: Command = {
  name: 'testlevel',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    // Parse level from args, default to 10 (Hero)
    const testLevel = parseInt(args[0]) || 10;
    const testXP = testLevel * 1000; // Mock XP value

    // Create a mock XPAwardResult
    const mockResult: XPAwardResult = {
      success: true,
      newXP: testXP,
      oldLevel: testLevel - 1,
      newLevel: testLevel,
      levelUpOccurred: true,
      roleChanged: true,
      newRole: getRoleFromLevel(testLevel),
      levelsCrossed: [testLevel],
      levelUpResiduals: Math.floor(testLevel * 0.5),
    };

    try {
      await sendLevelUpNotification(
        message.guild,
        message.author.id,
        message.member.displayName,
        message.author.displayAvatarURL({ size: 256 }),
        mockResult
      );
      await message.reply(`✅ Sent test level-up notification for level ${testLevel} (${mockResult.newRole}) to the casting channel.`);
    } catch (error) {
      console.error('Failed to send test level-up notification:', error);
      await message.reply('❌ Failed to send test level-up notification. Check the console for details.');
    }
  },
};
