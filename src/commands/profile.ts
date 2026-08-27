import { EmbedBuilder, GuildMember } from 'discord.js';
import { getUser } from '../database/client.js';
import { getResidualsInfo } from '../services/residuals.js';
import { getNextProgressionThreshold } from '../services/xp.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';

export const profileCommand: Command = {
  name: 'profile',
  allowedPrefix: '.',
  async execute(message, args, _prefix) {

    // Cooldown check
    const remaining = getRemaining(message.author.id, 'profile');
    if (remaining > 0) {
      await message.reply(`⏱️ Please wait ${remaining} seconds before using .profile again.`);
      return;
    }
    setCooldown(message.author.id, 'profile', 15);

    // Get target user
    let target: GuildMember;
    if (args.length > 0 && message.mentions.members?.first()) {
      target = message.mentions.members.first()!;
    } else if (message.member) {
      target = message.member as GuildMember;
    } else {
      await message.reply('❌ Unable to determine target user.');
      return;
    }

    // Get user data
    const userData = await getUser(target.user.id);
    if (!userData) {
      await message.reply('❌ User not found in database.');
      return;
    }

    // Calculate XP progress using centralized functions
    const currentLevel = userData.current_level;
    const currentRole = userData.current_progression_role;
    const nextRoleThreshold = getNextProgressionThreshold(currentRole);

    // Get residuals
    const residualData = await getResidualsInfo(target.user.id);
    const residualsBalance = residualData?.balance || 0;

    // Format role name
    const roleDisplay = currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Build embed fields
    const fields = [
      { name: 'Level', value: currentLevel.toString(), inline: true },
      { name: '<a:doginaldollar:1541974906252828672> Residuals', value: `\`${residualsBalance.toLocaleString()}\``, inline: true },
    ];

    // Add promotion eligibility if not at max role
    if (nextRoleThreshold > 0) {
      const eligibility = userData.promotion_eligibility_percentage || 0;
      fields.push({ name: '<:glossystaremoji:1541974836861993101> Promotion Eligibility', value: `\`${Math.floor(eligibility)}%\` (Level ${nextRoleThreshold})`, inline: true });
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('<a:happystar:1541974913781338273> STUDIO PROFILE')
      .setDescription(`**${target.displayName}**\n\`${roleDisplay}\``)
      .setColor(0x4900ff)
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(fields)
      .setFooter({ text: 'MI BOM3O Studios' });

    await message.reply({ embeds: [embed] });
  },
};
