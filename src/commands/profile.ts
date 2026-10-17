import { EmbedBuilder, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { getUser } from '../database/client.js';
import { getResidualsInfo } from '../services/residuals.js';
import { getNextProgressionThreshold } from '../services/xp.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { Command } from './index.js';
import { getUnlockedPerks } from '../services/levelUpNotification.js';

function getAvailableCommands(role: string): string[] {
  const commands: string[] = [];

  // Basic commands available to everyone
  commands.push('`.profile` - View your studio profile');
  commands.push('`.level` - Check your level and XP progress');
  commands.push('`.res` - Get information about residuals');
  commands.push('`.leaderboard` - View the XP leaderboard');
  commands.push('`.residuals` - View the residuals leaderboard');
  commands.push('`.help` - Get help with commands');
  commands.push('`.rules` - View the server rules');

  // Role-specific commands
  if (role === 'hero' || role === 'champion' || role === 'guardian' ||
      role === 'superhero' || role === 'anti_hero' || role === 'rogue' ||
      role === 'renegade' || role === 'outlaw' || role === 'villain' ||
      role === 'mastermind' || role === 'kingpin' || role === 'overlord' ||
      role === 'tyrant' || role === 'emperor' || role === 'saint') {
    commands.push('`.c <query>` - Custom GIF search (Hero+ perk)');
  }

  if (role === 'superhero' || role === 'anti_hero' || role === 'rogue' ||
      role === 'renegade' || role === 'outlaw' || role === 'villain' ||
      role === 'mastermind' || role === 'kingpin' || role === 'overlord' ||
      role === 'tyrant' || role === 'emperor' || role === 'saint') {
    commands.push('`.shop` - Access the rare shop (Superhero+ perk)');
    commands.push('`.manage` - Manage your colors and archetypes');
  }

  if (role === 'emperor' || role === 'saint') {
    commands.push('`.shop` - Access the mythic shop (Emperor/Saint perk)');
  }

  return commands;
}

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
      { name: '<a:cash:1545126549035024524> Residuals', value: `\`${residualsBalance.toLocaleString()}\``, inline: true },
    ];

    // Add promotion eligibility if not at max role
    if (nextRoleThreshold > 0) {
      const eligibility = userData.promotion_eligibility_percentage || 0;
      fields.push({ name: '<:ladder:1545126567145906246> Promotion Eligibility', value: `\`${Math.floor(eligibility)}%\` (Level ${nextRoleThreshold})`, inline: true });
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('<:star:1545002693368750193> STUDIO PROFILE')
      .setDescription(`**${target.displayName}**\n\`${roleDisplay}\``)
      .setColor(0x4900ff)
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(fields)
      .setFooter({ text: 'Bombo Studios' });

    // Create button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('toggle_commands')
          .setLabel('Commands')
          .setStyle(ButtonStyle.Primary)
      );

    const sentMessage = await message.reply({ embeds: [embed], components: [row] });

    // Create button collector
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 minutes
      filter: (i) => i.customId === 'toggle_commands' && i.user.id === message.author.id,
    });

    let showingCommands = false;

    collector.on('collect', async (interaction) => {
      if (!showingCommands) {
        // Show commands
        const availableCommands = getAvailableCommands(currentRole);
        const perks = getUnlockedPerks(currentRole);

        const commandsEmbed = new EmbedBuilder()
          .setTitle('📋 Available Commands')
          .setDescription(`**Your Role:** ${roleDisplay}\n\n**Commands:**\n${availableCommands.join('\n')}\n\n**Your Perks:**\n${perks.join('\n')}`)
          .setColor(0x4900ff)
          .setFooter({ text: 'Bombo Studios' });

        const backRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('toggle_commands')
              .setLabel('Back to Profile')
              .setStyle(ButtonStyle.Secondary)
          );

        await interaction.update({ embeds: [commandsEmbed], components: [backRow] });
        showingCommands = true;
      } else {
        // Show profile
        await interaction.update({ embeds: [embed], components: [row] });
        showingCommands = false;
      }
    });

    collector.on('end', (_collected, reason) => {
      if (reason === 'time') {
        sentMessage.edit({ components: [] }).catch(console.error);
      }
    });
  },
};
