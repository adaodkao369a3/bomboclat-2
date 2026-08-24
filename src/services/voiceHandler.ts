import { VoiceState, Guild, GuildMember } from 'discord.js';
import { getOrCreateUser, addUserXP, setUserLevel, updatePromotionEligibility, getUser, setUserProgressionRole } from '../database/client.js';
import {
  calculateLevelFromXP,
  calculatePromotionEligibility,
  getRoleFromLevel,
  calculateLevelUpResiduals,
  synchronizeProgressionRoles,
} from './xp.js';
import { ResidualsService } from './residuals.js';
import { CHANNELS, ROLES } from '../config/index.js';

// Track active voice sessions per user
interface VoiceSession {
  userId: string;
  guild: Guild;
  channelId: string;
  joinTime: number;
  lastTick: number;
}

const activeSessions = new Map<string, VoiceSession>();
const VOICE_TICK_INTERVAL_MS = 7 * 60 * 1000; // 7 minutes
const VOICE_XP_MIN = 5;
const VOICE_XP_MAX = 15;

export function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
  const member = newState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;
  const guild = newState.guild;
  const sessionKey = `${userId}_${guild.id}`;

  // Check if user joined a voice channel
  if (!oldState.channel && newState.channel && newState.channelId) {
    // User joined a voice channel
    if (isEligibleForVoiceXP(newState)) {
      const session: VoiceSession = {
        userId,
        guild,
        channelId: newState.channelId,
        joinTime: Date.now(),
        lastTick: Date.now(),
      };
      activeSessions.set(sessionKey, session);
      console.log(`[voice] User ${userId} joined eligible voice channel ${newState.channelId}`);
    }
  }
  // Check if user left a voice channel
  else if (oldState.channel && !newState.channel) {
    // User left a voice channel
    activeSessions.delete(sessionKey);
    console.log(`[voice] User ${userId} left voice channel`);
  }
  // Check if user moved channels or changed mute/deafen status
  else if (oldState.channel && newState.channel) {
    const session = activeSessions.get(sessionKey);
    if (session) {
      // Check if user became ineligible (muted, deafened, or moved to AFK)
      if (!isEligibleForVoiceXP(newState)) {
        activeSessions.delete(sessionKey);
        console.log(`[voice] User ${userId} became ineligible for voice XP`);
      }
      // Check if user moved to a different eligible channel
      else if (newState.channelId && oldState.channelId !== newState.channelId) {
        session.channelId = newState.channelId;
        session.joinTime = Date.now();
        session.lastTick = Date.now();
        console.log(`[voice] User ${userId} moved to voice channel ${newState.channelId}`);
      }
    }
    // Check if user became eligible after being ineligible
    else if (isEligibleForVoiceXP(newState) && newState.channelId) {
      const session: VoiceSession = {
        userId,
        guild,
        channelId: newState.channelId,
        joinTime: Date.now(),
        lastTick: Date.now(),
      };
      activeSessions.set(sessionKey, session);
      console.log(`[voice] User ${userId} became eligible for voice XP`);
    }
  }
}

function isEligibleForVoiceXP(state: VoiceState): boolean {
  // Must be in a voice channel
  if (!state.channel) return false;

  // Must not be muted
  if (state.mute || state.selfMute) return false;

  // Must not be deafened
  if (state.deaf || state.selfDeaf) return false;

  // Must not be in AFK channel
  if (state.channelId === state.guild.afkChannelId) return false;

  return true;
}

// Tick function to award XP for active voice sessions
export function tickVoiceSessions(): void {
  const now = Date.now();

  for (const session of activeSessions.values()) {
    const timeSinceLastTick = now - session.lastTick;

    if (timeSinceLastTick >= VOICE_TICK_INTERVAL_MS) {
      // Award XP
      awardVoiceXP(session.userId, session.channelId, session.guild);
      session.lastTick = now;
    }
  }
}

async function awardVoiceXP(userId: string, channelId: string, guild: Guild): Promise<void> {
  try {
    // Ensure user exists
    const member = await guild.members.fetch(userId).catch(() => null);
    const username = member?.user.username || 'Unknown';
    const displayName = member?.displayName || 'Unknown';
    await getOrCreateUser(userId, username, displayName);

    let xpToAward = Math.floor(Math.random() * (VOICE_XP_MAX - VOICE_XP_MIN + 1)) + VOICE_XP_MIN;

    // Apply booster XP multiplier (+25%)
    if (member && member.roles.cache.has(ROLES.BOOSTER)) {
      xpToAward = Math.floor(xpToAward * 1.25);
    }

    const newXP = await addUserXP(
      userId,
      xpToAward,
      'voice',
      `Voice activity in channel ${channelId}`
    );

    if (newXP === null) {
      console.error(`Failed to award voice XP to user ${userId}`);
      return;
    }

    // Calculate new level
    const newLevel = calculateLevelFromXP(newXP);

    // Update level in database if changed
    const userData = await getUser(userId);
    if (!userData) return;

    const oldLevel = userData.current_level;
    let roleChanged = false;
    let newRole = null;
    const levelChanged = newLevel !== oldLevel;
    
    if (levelChanged) {
      await setUserLevel(userId, newLevel);
      console.log(`User ${userId} leveled up to ${newLevel} (voice XP)`);

      // Award level-up residuals
      const levelUpResiduals = calculateLevelUpResiduals(newLevel);
      await ResidualsService.awardResiduals(
        userId,
        levelUpResiduals,
        'level_up',
        `Level up to ${newLevel}`
      );
    }

    // Update promotion eligibility
    const currentRole = getRoleFromLevel(newLevel);
    const eligibility = calculatePromotionEligibility(newXP, newLevel, currentRole);
    await updatePromotionEligibility(userId, eligibility);

    // Check for role promotions
    if (member) {
      try {
        const syncResult = await synchronizeProgressionRoles(member, newLevel);
        if (syncResult.success) {
          const oldRole = userData.current_progression_role;
          if (oldRole !== currentRole) {
            await setUserProgressionRole(userId, currentRole);
            roleChanged = true;
            newRole = currentRole;
          }
        }
      } catch (error) {
        console.error('Error during role progression check for voice XP:', error);
      }
    }

    // Send level-up notification on any level change
    if (levelChanged && member) {
      await sendVoiceLevelUpNotification(member, newRole || currentRole, newLevel, newXP, roleChanged);
    }

    console.log(`[voice] Awarded ${xpToAward} XP to user ${userId} (total: ${newXP})`);
  } catch (error) {
    console.error(`Error awarding voice XP to user ${userId}:`, error);
  }
}

async function sendVoiceLevelUpNotification(member: GuildMember, currentRole: string, newLevel: number, newXP: number, roleChanged: boolean): Promise<void> {
  try {
    // Calculate residuals earned from level-up
    const residualsEarned = calculateLevelUpResiduals(newLevel);

    // Build perks description based on role
    const perks: string[] = [];
    if (currentRole === 'featured_extra') {
      perks.push('✨ Custom GIF search unlocked');
    } else if (currentRole === 'supporting_cast') {
      perks.push('✨ Custom GIF search unlocked');
      perks.push('🎨 Additional media permissions');
    } else if (currentRole === 'principal_cast') {
      perks.push('✨ Custom GIF search unlocked');
      perks.push('🎨 Additional media permissions');
      perks.push('👑 Principal Cast privileges');
    } else if (currentRole === 'lead_cast') {
      perks.push('✨ Custom GIF search unlocked');
      perks.push('🎨 Additional media permissions');
      perks.push('👑 Lead Cast privileges');
      perks.push('💎 Mythic shop access');
    }

    const perksText = perks.length > 0 ? perks.join('\n') : 'Continue your journey to unlock more perks!';

    // Create an embed for the level up
    const embed = {
      title: roleChanged ? '🎬 PROMOTION ALERT!' : '📈 LEVEL UP!',
      description: roleChanged 
        ? `**${member.displayName}** has been promoted to **${currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}**!`
        : `**${member.displayName}** has reached level **${newLevel}**!`,
      color: 0x7B61FF,
      fields: [
        { name: 'New Level', value: newLevel.toString(), inline: true },
        { name: 'Total XP', value: newXP.toLocaleString(), inline: true },
        { name: 'Residuals Earned', value: `+${residualsEarned}`, inline: true },
        { name: 'Current Role', value: currentRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), inline: true },
        { name: 'Perks Unlocked', value: perksText, inline: false },
      ],
      footer: { text: 'MI BOM3O Studios' },
      thumbnail: { url: member.user.displayAvatarURL() },
    };

    // Find the casting channel
    const castingChannel = member.guild.channels.cache.get(CHANNELS.CASTING);
    if (!castingChannel || !castingChannel.isTextBased()) {
      return; // Don't send notification if casting channel is not available for voice XP
    }

    await castingChannel.send({
      content: member.user.toString(),
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to send voice level up notification:', error);
  }
}

// Start the voice session ticker
let voiceTickerInterval: NodeJS.Timeout | null = null;

export function startVoiceTicker(): void {
  if (voiceTickerInterval) return;

  voiceTickerInterval = setInterval(() => {
    tickVoiceSessions();
  }, 60000); // Check every minute

  console.log('[voice] Voice session ticker started');
}

export function stopVoiceTicker(): void {
  if (voiceTickerInterval) {
    clearInterval(voiceTickerInterval);
    voiceTickerInterval = null;
    console.log('[voice] Voice session ticker stopped');
  }
}
