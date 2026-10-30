import { EmbedBuilder, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUser, type User } from '../database/client.js';
import { getUserArchetypes, getUserColors } from '../services/shop.js';
import { getResidualsInfo } from '../services/residuals.js';
import { getNextProgressionThreshold } from '../services/xp.js';
import { getRemaining, setCooldown } from '../utils/cooldowns.js';
import { cooldownMessage, setAuthorHeader, setStandardFooter } from '../ui/index.js';
import { getUnlockedPerks } from '../services/levelUpNotification.js';
import { EMOJIS, GIF_COMMANDS, GIF_TIERS, GIF_TIER_LEVELS } from '../config/index.js';
import { getAvailableCommands, CommandAccess } from './registry.js';
import { Command } from './index.js';
import { registerInteractionHandler, parseCustomId, isInteractionExpired } from '../interactions/index.js';

const PROFILE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const PROFILE_COLOR = 0x4900ff;

// Emojis for the tier buttons (already in the project), low -> high level
const TIER_EMOJIS = [EMOJIS.CIVILIAN, EMOJIS.HERO, EMOJIS.SUPERHERO, EMOJIS.RENEGADE, EMOJIS.KINGPIN];

function formatRole(role: string): string {
  return role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}

/** The profile card shown by .profile and by "Back to Profile" */
async function buildProfileEmbed(
  userData: User,
  targetUserId: string,
  displayName: string,
  avatarUrl: string | null | undefined,
): Promise<EmbedBuilder> {
  const currentLevel = userData.current_level;
  const currentRole = userData.current_progression_role;
  const nextRoleThreshold = getNextProgressionThreshold(currentRole);

  const residualData = await getResidualsInfo(targetUserId);
  const residualsBalance = residualData?.balance || 0;
  const userArchetypes = await getUserArchetypes(targetUserId);
  const userColors = await getUserColors(targetUserId);

  let description = `__${displayName}__\n-# ${formatRole(currentRole)}\n\n`;
  description += `__Level__\n-# ${currentLevel}\n\n`;
  description += `__${EMOJIS.CASH} Residuals__\n-# ${residualsBalance.toLocaleString()}\n\n`;

  // Promotion eligibility if not at max role
  if (nextRoleThreshold > 0) {
    const eligibility = userData.promotion_eligibility_percentage || 0;
    description += `__Promotion Eligibility__\n-# ${Math.floor(eligibility)}% (Level ${nextRoleThreshold})\n\n`;
  }

  if (userArchetypes.length > 0) {
    description += `__Persona Role__\n-# ${userArchetypes.map(a => a.name).join(' • ')}\n\n`;
  }

  const activeColor = userColors.find(c => c.active);
  if (activeColor) {
    description += `__Color Role__\n-# ${activeColor.name}\n\n`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.PROFILE} STUDIO PROFILE`)
    .setDescription(description)
    .setColor(PROFILE_COLOR);

  if (avatarUrl) embed.setThumbnail(avatarUrl);
  setAuthorHeader(embed, displayName, avatarUrl || null);
  setStandardFooter(embed);
  return embed;
}

function profileButtonRow(ownerId: string, targetUserId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile:commands:${ownerId}:${targetUserId}`)
      .setLabel('Commands')
      .setEmoji(EMOJIS.SETTINGS)
      .setStyle(ButtonStyle.Primary)
  );
}

interface CommandsNav {
  ownerId: string;
  targetUserId: string;
  viewerLevel: number;
  hasPersonaCommands: boolean;
  active: string; // action of the page being shown
}

/**
 * Buttons under the commands pages: Commands, Leaderboards, one per unlocked
 * GIF tier, Persona (only if you own one with commands), and Back to Profile.
 * The page you're on is highlighted.
 */
function buildCommandsNav(nav: CommandsNav): ActionRowBuilder<ButtonBuilder>[] {
  const id = (action: string) => `profile:${action}:${nav.ownerId}:${nav.targetUserId}`;
  const style = (action: string) => (nav.active === action ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const buttons: ButtonBuilder[] = [
    new ButtonBuilder().setCustomId(id('commands')).setLabel('Commands').setEmoji(EMOJIS.SETTINGS).setStyle(style('commands')),
    new ButtonBuilder().setCustomId(id('lb')).setLabel('Leaderboards').setEmoji(EMOJIS.STARICON).setStyle(style('lb')),
  ];

  GIF_TIER_LEVELS.forEach((level, i) => {
    if (nav.viewerLevel < level) return; // only show tiers you've unlocked
    const action = `gif${level}`;
    buttons.push(
      new ButtonBuilder().setCustomId(id(action)).setLabel(`Level ${level} GIFs`).setEmoji(TIER_EMOJIS[i]).setStyle(style(action))
    );
  });

  if (nav.hasPersonaCommands) {
    buttons.push(
      new ButtonBuilder().setCustomId(id('persona')).setLabel('Persona').setEmoji(EMOJIS.CROWN2).setStyle(style('persona'))
    );
  }

  buttons.push(
    new ButtonBuilder().setCustomId(id('back')).setLabel('Back to Profile').setEmoji(EMOJIS.PROFILE).setStyle(ButtonStyle.Secondary)
  );

  // Discord allows 5 buttons per row
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

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

  // Back to the profile card
  if (action === 'back') {
    const userData = await getUser(targetUserId);
    if (!userData) {
      await interaction.reply({ content: '❌ User not found in database.', ephemeral: true });
      return;
    }
    const targetMember = interaction.guild?.members.cache.get(targetUserId);
    const avatarUrl = targetMember?.user.displayAvatarURL();
    const profileEmbed = await buildProfileEmbed(userData, targetUserId, targetMember?.displayName || 'Unknown', avatarUrl);
    await interaction.update({ embeds: [profileEmbed], components: [profileButtonRow(ownerId, targetUserId)] });
    return;
  }

  // Everything else is a commands page - it shows what the person pressing the
  // button can use right now. Personas come from the database purchase record
  // (by persona key), never from Discord role names.
  const viewerData = await getUser(ownerId);
  if (!viewerData) {
    await interaction.reply({ content: '❌ User not found in database.', ephemeral: true });
    return;
  }
  const viewerLevel = viewerData.current_level ?? 0;
  const viewerPersonas = await getUserArchetypes(ownerId);
  const ownedKeys = viewerPersonas.map(a => a.persona_key).filter((k): k is string => !!k);
  const availableCommands = getAvailableCommands(viewerLevel, ownedKeys);

  // Persona command lines, grouped per owned persona
  let personaText = '';
  for (const persona of viewerPersonas) {
    const lines = availableCommands
      .filter(cmd => cmd.access === CommandAccess.ROLE && cmd.accessValue === persona.persona_key)
      .map(cmd => `• \`.${cmd.name}\` - ${cmd.description.replace(/ \([^)]*\)$/, '')}`);
    if (lines.length > 0) {
      personaText += `${personaText ? '\n\n' : ''}__${persona.name}__\n${lines.join('\n')}`;
    }
  }

  const nav = (active: string): ActionRowBuilder<ButtonBuilder>[] =>
    buildCommandsNav({ ownerId, targetUserId, viewerLevel, hasPersonaCommands: personaText.length > 0, active });

  const embed = new EmbedBuilder().setColor(PROFILE_COLOR);
  setStandardFooter(embed);

  if (action === 'commands') {
    const generalLines = availableCommands
      .filter(cmd =>
        cmd.access !== CommandAccess.ROLE &&
        !(cmd.name in GIF_COMMANDS) &&
        !['leaderboard', 'reslb'].includes(cmd.name)
      )
      .map(cmd => `• \`.${cmd.name}\` - ${cmd.description}`);

    let description = `__Your Role:__ ${formatRole(viewerData.current_progression_role)}\n\n${generalLines.join('\n')}`;

    const perks = getUnlockedPerks(viewerData.current_progression_role);
    if (perks.length > 0) {
      description += `\n\n__Your Perks:__\n${perks.join('\n')}`;
    }

    const nextTierIndex = GIF_TIER_LEVELS.findIndex(l => l > viewerLevel);
    if (nextTierIndex !== -1) {
      description += `\n\n-# Next GIF unlock: Level ${GIF_TIER_LEVELS[nextTierIndex]}`;
    }
    description += '\n\n-# Use the buttons below for leaderboards and GIF commands.';

    embed.setTitle(`${EMOJIS.SETTINGS} Commands`).setDescription(description);
    await interaction.update({ embeds: [embed], components: nav('commands') });
    return;
  }

  if (action === 'lb') {
    const lbLines = availableCommands
      .filter(cmd => ['leaderboard', 'reslb'].includes(cmd.name))
      .map(cmd => `• \`.${cmd.name}\` - ${cmd.description}`);
    embed.setTitle(`${EMOJIS.STARICON} Leaderboards`).setDescription(`See how you rank against others.\n\n${lbLines.join('\n')}`);
    await interaction.update({ embeds: [embed], components: nav('lb') });
    return;
  }

  if (action === 'persona') {
    if (personaText.length === 0) {
      await interaction.reply({ content: '❌ You have no persona commands.', ephemeral: true });
      return;
    }
    embed.setTitle(`${EMOJIS.CROWN2} Persona Commands`).setDescription(personaText);
    await interaction.update({ embeds: [embed], components: nav('persona') });
    return;
  }

  if (action.startsWith('gif')) {
    const tierLevel = parseInt(action.slice(3), 10);
    const tierIndex = GIF_TIER_LEVELS.indexOf(tierLevel);
    if (tierIndex === -1) return;
    if (viewerLevel < tierLevel) {
      await interaction.reply({ content: `🔒 Level ${tierLevel} GIFs unlock at level ${tierLevel}.`, ephemeral: true });
      return;
    }
    const lines = GIF_TIERS[tierIndex].map(name => `• \`.${name}\``);
    embed
      .setTitle(`${EMOJIS.GLOSSY_STAR} Level ${tierLevel} GIFs`)
      .setDescription(
        `${lines.join('\n')}\n\n` +
        '-# Use `.command` on yourself or `.command @user` (up to 3 people). Tagging 2-3 people has a longer cooldown.'
      );
    await interaction.update({ embeds: [embed], components: nav(action) });
    return;
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

    const embed = await buildProfileEmbed(userData, target.user.id, target.displayName, target.user.displayAvatarURL());
    const row = profileButtonRow(message.author.id, target.user.id);

    await message.reply({ embeds: [embed], components: [row] });
  },
};