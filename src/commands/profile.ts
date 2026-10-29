import { EmbedBuilder, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUser } from '../database/client.js';
import { getUserArchetypes, getUserColors } from '../services/shop.js';
import { getResidualsInfo } from '../services/residuals.js';
import { getNextProgressionThreshold } from '../services/xp.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { cooldownMessage, setAuthorHeader, setStandardFooter } from '../ui/index.js';
import { getUnlockedPerks } from '../services/levelUpNotification.js';
import { EMOJIS } from '../config/index.js';
import { getAvailableCommands, CommandAccess } from './registry.js';
import { Command } from './index.js';
import { registerInteractionHandler, parseCustomId, isInteractionExpired } from '../interactions/index.js';

const PROFILE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Register interaction handler for profile namespace
registerInteractionHandler('profile', async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = parseCustomId(interaction.customId);
  if (parts.length < 4) {
    console.error('[Profile] Invalid customId format:', interaction.customId);
    return;
  }

  const action = parts[1];
  const ownerId = parts[2];
  const targetUserId = parts[3];

  // Verify ownership
  if (ownerId !== interaction.user.id) {
    await interaction.reply({ content: '❌ You cannot use this button.', flags: [1 << 6] });
    return;
  }

  // Check if message expired
  if (isInteractionExpired(interaction, PROFILE_TIMEOUT)) {
    await interaction.reply({
      content: '⏱️ This menu expired. Run `.profile` again.',
      ephemeral: true,
    });
    await interaction.message.edit({ components: [] }).catch(console.error);
    return;
  }

  // Fetch fresh data
  const userData = await getUser(targetUserId);
  if (!userData) {
    await interaction.reply({ content: '❌ User not found in database.', ephemeral: true });
    return;
  }

  const currentLevel = userData.current_level;
  const currentRole = userData.current_progression_role;
  const nextRoleThreshold = getNextProgressionThreshold(currentRole);
  const roleDisplay = currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const residualData = await getResidualsInfo(targetUserId);
  const residualsBalance = residualData?.balance || 0;

  const userArchetypes = await getUserArchetypes(targetUserId);
  const userColors = await getUserColors(targetUserId);

  const guild = interaction.guild;
  const targetMember = guild?.members.cache.get(targetUserId);

  if (action === 'commands') {
    // Show the commands the person pressing the button can use right now.
    // Personas come from the database purchase record (by persona key),
    // never from Discord role names.
    const viewerData = ownerId === targetUserId ? userData : await getUser(ownerId);
    const viewerLevel = viewerData?.current_level ?? 0;
    const viewerRole = viewerData?.current_progression_role ?? currentRole;
    const viewerPersonas = ownerId === targetUserId ? userArchetypes : await getUserArchetypes(ownerId);
    const ownedKeys = viewerPersonas.map(a => a.persona_key).filter((k): k is string => !!k);
    const availableCommands = getAvailableCommands(viewerLevel, ownedKeys);
    const perks = getUnlockedPerks(viewerRole);
    const viewerRoleDisplay = viewerRole.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    const generalLines = availableCommands
      .filter(cmd => cmd.access !== CommandAccess.ROLE)
      .map(cmd => `• .${cmd.name} - ${cmd.description}`);

    let personaText = '';
    for (const persona of viewerPersonas) {
      const lines = availableCommands
        .filter(cmd => cmd.access === CommandAccess.ROLE && cmd.accessValue === persona.persona_key)
        .map(cmd => `• .${cmd.name} - ${cmd.description.replace(/ \([^)]*\)$/, '')}`);
      if (lines.length > 0) {
        personaText += `\n\n__${persona.name}__\n${lines.join('\n')}`;
      }
    }

    const commandsEmbed = new EmbedBuilder()
      .setTitle('📋 Available Commands')
      .setDescription(`__Your Role:__ ${viewerRoleDisplay}\n\n__Commands:__\n${generalLines.join('\n')}${personaText}\n\n__Your Perks:__\n${perks.join('\n')}`)
      .setColor(0x4900ff);

    setStandardFooter(commandsEmbed);

    const backRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`profile:back:${ownerId}:${targetUserId}`)
          .setLabel('Back to Profile')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.update({ embeds: [commandsEmbed], components: [backRow] });
  } else if (action === 'back') {
    // Rebuild profile embed
    let description = `__${targetMember?.displayName || 'Unknown'}__\n-# ${roleDisplay}\n\n`;
    description += `__Level__\n-# ${currentLevel}\n\n`;
    description += `__${EMOJIS.CASH} Residuals__\n-# ${residualsBalance.toLocaleString()}\n\n`;

    if (nextRoleThreshold > 0) {
      const eligibility = userData.promotion_eligibility_percentage || 0;
      description += `__Promotion Eligibility__\n-# ${Math.floor(eligibility)}% (Level ${nextRoleThreshold})\n\n`;
    }

    if (userArchetypes.length > 0) {
      description += `__Persona Role__\n-# ${userArchetypes.map(a => a.name).join(' • ')}\n\n`;
    }

    if (userColors.length > 0) {
      const activeColor = userColors.find(c => c.active);
      if (activeColor) {
        description += `__Color Role__\n-# ${activeColor.name}\n\n`;
      }
    }

    const avatarUrl = targetMember?.user.displayAvatarURL();
    const profileEmbed = new EmbedBuilder()
      .setTitle(`${EMOJIS.PROFILE} STUDIO PROFILE`)
      .setDescription(description)
      .setColor(0x4900ff);

    if (avatarUrl) {
      profileEmbed.setThumbnail(avatarUrl);
    }

    setAuthorHeader(profileEmbed, targetMember?.displayName || 'Unknown', avatarUrl || null);
    setStandardFooter(profileEmbed);

    const commandsRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`profile:commands:${ownerId}:${targetUserId}`)
          .setLabel('Commands')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.update({ embeds: [profileEmbed], components: [commandsRow] });
  }
});

export const profileCommand: Command = {
  name: 'profile',
  allowedPrefix: '.',
  async execute(message, args, _prefix) {

    // Cooldown check
    const remaining = getRemaining(message.author.id, 'profile');
    if (remaining > 0) {
      await message.reply(cooldownMessage(remaining));
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

    // Get owned shop items
    const userArchetypes = await getUserArchetypes(target.user.id);
    const userColors = await getUserColors(target.user.id);

    // Format role name
    const roleDisplay = currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Build description
    let description = `__${target.displayName}__\n-# ${roleDisplay}\n\n`;
    description += `__Level__\n-# ${currentLevel}\n\n`;
    description += `__${EMOJIS.CASH} Residuals__\n-# ${residualsBalance.toLocaleString()}\n\n`;

    // Add promotion eligibility if not at max role
    if (nextRoleThreshold > 0) {
      const eligibility = userData.promotion_eligibility_percentage || 0;
      description += `__Promotion Eligibility__\n-# ${Math.floor(eligibility)}% (Level ${nextRoleThreshold})\n\n`;
    }

    // Add archetype role if owned
    if (userArchetypes.length > 0) {
      description += `__Persona Role__\n-# ${userArchetypes.map(a => a.name).join(' • ')}\n\n`;
    }

    // Add color role if owned
    if (userColors.length > 0) {
      const activeColor = userColors.find(c => c.active);
      if (activeColor) {
        description += `__Color Role__\n-# ${activeColor.name}\n\n`;
      }
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.PROFILE} STUDIO PROFILE`)
      .setDescription(description)
      .setColor(0x4900ff)
      .setThumbnail(target.user.displayAvatarURL());

    setAuthorHeader(embed, target.displayName, target.user.displayAvatarURL());
    setStandardFooter(embed);

    // Create button with per-owner customId
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`profile:commands:${message.author.id}:${target.user.id}`)
          .setLabel('Commands')
          .setStyle(ButtonStyle.Primary)
      );

    await message.reply({ embeds: [embed], components: [row] });
  },
};
