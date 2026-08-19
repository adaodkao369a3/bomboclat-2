import { EmbedBuilder } from 'discord.js';
import { getUser, setUserLevel, setUserProgressionRole, updatePromotionEligibility } from '../database/client.js';
import { calculateLevelFromXP, calculatePromotionEligibility, getRoleFromLevel, synchronizeProgressionRoles } from '../services/xp.js';
import { isAdmin } from '../utils/permissions.js';
import { Command } from './index.js';

export const syncRolesCommand: Command = {
  name: 'syncroles',
  allowedPrefix: '$',
  async execute(message, _args, _prefix) {

    // Check admin permissions
    if (!message.member || !isAdmin(message.member)) {
      await message.reply('❌ This command is restricted to admins.');
      return;
    }

    if (!message.guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    await message.reply('🔄 Starting role synchronization...');

    let checkedCount = 0;
    let changedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;

    for (const member of message.guild.members.cache.values()) {
      if (!member.user || member.user.bot) continue;

      checkedCount++;

      try {
        const userData = await getUser(member.user.id);
        if (!userData) continue;

        const expectedLevel = calculateLevelFromXP(userData.current_xp);
        const expectedRole = getRoleFromLevel(expectedLevel);
        const currentRole = userData.current_progression_role;
        const syncResult = await synchronizeProgressionRoles(member, expectedLevel);
        if (!syncResult.success) throw new Error('Failed to synchronize progression roles');

        if (userData.current_level !== expectedLevel) {
          await setUserLevel(member.user.id, expectedLevel);
        }
        if (currentRole !== expectedRole) {
          await setUserProgressionRole(member.user.id, expectedRole);
        }
        await updatePromotionEligibility(
          member.user.id,
          calculatePromotionEligibility(userData.current_xp, expectedLevel, expectedRole)
        );

        const changed = syncResult.addedRoles.length > 0 ||
          syncResult.removedRoles.length > 0 ||
          userData.current_level !== expectedLevel ||
          currentRole !== expectedRole;
        if (changed) {
          changedCount++;
        } else {
          alreadyCorrectCount++;
        }

      } catch (error) {
        console.error(`Error synchronizing roles for ${member.user.id}:`, error);
        errorCount++;
      }
    }

    const summaryEmbed = new EmbedBuilder()
      .setTitle('✅ Role Synchronization Complete')
      .setColor(0x7B61FF)
      .addFields([
        { name: 'Members Checked', value: checkedCount.toString(), inline: true },
        { name: 'Members Changed', value: changedCount.toString(), inline: true },
        { name: 'Already Correct', value: alreadyCorrectCount.toString(), inline: true },
        { name: 'Errors', value: errorCount.toString(), inline: true },
      ])
      .setFooter({ text: 'MI BOM3O Studios' });

    await message.reply({ embeds: [summaryEmbed] });
  },
};
