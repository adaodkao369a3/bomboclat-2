import { EmbedBuilder, GuildMember } from 'discord.js';
import { getUser } from '../database/client.js';
import { calculateProgressPercentage, PROGRESSION_ROLE_KEYS } from '../services/xp.js';
import { XP_CONFIG, EMOJIS } from '../config/index.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';

function formatRoleName(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const levelCommand: Command = {
  name: 'level',
  allowedPrefix: '.',
  async execute(message, args, _prefix) {

    // Cooldown check
    const remaining = getRemaining(message.author.id, 'level');
    if (remaining > 0) {
      await message.reply(`⏱️ Please wait ${remaining} seconds before using .level again.`);
      return;
    }
    setCooldown(message.author.id, 'level', 10);

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
    const xpProgress = calculateProgressPercentage(userData.current_xp, currentLevel);

    // Create progress bar
    const progressBars = Math.floor(xpProgress / 10);
    const progressBar = '<:glossystaremoji:1541974836861993101>'.repeat(progressBars) + '☆'.repeat(10 - progressBars);

    // Format role name
    const roleDisplay = formatRoleName(userData.current_progression_role);

    // Build the full role progression ladder - shows every role they'll unlock
    // down the line, marked with ✅ if already earned or ❌ if not yet, plus
    // the XP each one kicks in at.
    const roleLadder = PROGRESSION_ROLE_KEYS.map((roleKey) => {
      const requiredLevel = XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[roleKey];
      const achieved = currentLevel >= requiredLevel;
      const icon = achieved ? '<:greenglossytickcheckmark:1541974842398482472>' : '<:glossyredcancelx:1541974834370842654>';
      const isCurrent = roleKey === userData.current_progression_role;
      const marker = isCurrent ? ` ${EMOJIS.CROWN}` : '';
      return `${icon} **${formatRoleName(roleKey)}**${marker}`;
    }).join('\n');

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('<a:pinkarrowright:1542330072839749662> LEVEL PROGRESS')
      .setDescription(`**${target.displayName}**\n\`${roleDisplay}\` ${EMOJIS.CROWN}`)
      .setColor(0x4900ff)
      .setThumbnail(target.user.displayAvatarURL())
      .addFields([
        { name: 'XP Progress', value: `${progressBar} ${Math.floor(xpProgress)}%`, inline: false },
        { name: '<:crown:1529443082406461521> Role Progression', value: roleLadder, inline: false },
      ])
      .setFooter({ text: 'MI BOM3O Studios' });

    await message.reply({ embeds: [embed] });
  },
};
