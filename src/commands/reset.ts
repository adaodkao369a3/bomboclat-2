import { getClient } from '../database/client.js';
import { getShopArchetypes, getShopColors } from '../services/shop.js';
import { ROLES } from '../config/index.js';
import { Command } from './index.js';

export const resetCommand: Command = {
  name: 'reset',
  allowedPrefix: '$',
  async execute(message, args, _prefix) {
    // Check if user has Director role
    if (!message.member || !message.member.roles.cache.has(ROLES.DIRECTOR)) {
      await message.reply('❌ This command is restricted to the Director.');
      return;
    }

    const guild = message.guild;
    if (!guild) {
      await message.reply('❌ This command can only be used in a server.');
      return;
    }

    const confirmation = args[0]?.toLowerCase();

    if (confirmation === 'cancel') {
      await message.reply('❌ Reset cancelled.');
      return;
    }

    if (confirmation !== 'confirm') {
      await message.reply('⚠️ **CONFIRMATION REQUIRED**: This will remove ALL color and archetype roles from ALL users and clear ALL database entries. This action cannot be undone. Type `$reset confirm` to proceed or `$reset cancel` to abort.');
      return;
    }

    await message.reply('⚠️ Starting reset process... This will remove all color and archetype roles from all users and clear database entries. This may take a while.');

    try {
      const client = await getClient();
      
      try {
        // Get all shop roles
        const shopArchetypes = await getShopArchetypes();
        const shopColors = await getShopColors();
        
        const archetypeRoleIds = shopArchetypes
          .map(a => a.role_id)
          .filter((id): id is string => id !== null);
        
        const colorRoleIds = shopColors
          .map(c => c.role_id)
          .filter((id): id is string => id !== null);
        
        const allShopRoleIds = [...archetypeRoleIds, ...colorRoleIds];

        // Remove shop roles from all guild members
        await message.reply(`🔄 Removing shop roles from all guild members... (${allShopRoleIds.length} roles)`);
        
        let membersProcessed = 0;
        let rolesRemoved = 0;
        
        // Fetch all guild members
        const members = await guild.members.fetch();
        
        for (const [memberId, member] of members) {
          let memberRolesRemoved = 0;
          
          for (const roleId of allShopRoleIds) {
            if (member.roles.cache.has(roleId)) {
              try {
                await member.roles.remove(roleId, 'Shop reset');
                memberRolesRemoved++;
                rolesRemoved++;
              } catch (error) {
                console.error(`Failed to remove role ${roleId} from member ${memberId}:`, error);
              }
            }
          }
          
          if (memberRolesRemoved > 0) {
            membersProcessed++;
          }
          
          // Rate limiting - small delay between batches
          if (membersProcessed % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        await message.reply(`✅ Removed ${rolesRemoved} shop roles from ${membersProcessed} members.`);

        // Clear database entries
        await message.reply('🔄 Clearing database entries...');
        
        // Delete all user_colors entries
        const colorsResult = await client.query('DELETE FROM user_colors RETURNING COUNT(*)');
        const colorsDeleted = parseInt(colorsResult.rows[0].count);
        
        // Delete all user_archetypes entries
        const archetypesResult = await client.query('DELETE FROM user_archetypes RETURNING COUNT(*)');
        const archetypesDeleted = parseInt(archetypesResult.rows[0].count);

        await message.reply(`✅ Database cleared: ${colorsDeleted} color entries and ${archetypesDeleted} archetype entries deleted.`);

        await message.reply('🎉 Reset complete! All shop roles have been removed from users and database entries cleared.');

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error during reset:', error);
      await message.reply('❌ An error occurred during the reset process. Check the console for details.');
    }
  },
};