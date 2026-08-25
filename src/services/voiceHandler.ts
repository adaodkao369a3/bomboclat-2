import { VoiceState, Guild } from 'discord.js';
import { awardXP } from './xp.js';
import { sendLevelUpNotification } from './levelUpNotification.js';
import { ROLES } from '../config/index.js';

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
    if (!member) return;

    const username = member.user.username;
    const displayName = member.displayName;

    // Calculate base XP (5-15 range)
    const baseXP = Math.floor(Math.random() * (VOICE_XP_MAX - VOICE_XP_MIN + 1)) + VOICE_XP_MIN;

    // Check if user has booster role
    const hasBooster = member.roles.cache.has(ROLES.BOOSTER);

    // Use shared XP award path
    const result = await awardXP(
      userId,
      username,
      displayName,
      baseXP,
      'voice',
      `Voice activity in channel ${channelId}`,
      hasBooster,
      member
    );

    if (!result.success || result.newXP === null) {
      console.error(`Failed to award voice XP to user ${userId}`);
      return;
    }

    // Use the same level-up notification path as message XP.
    if (result.levelUpOccurred) {
      await sendLevelUpNotification(
        guild,
        member.id,
        member.displayName,
        member.user.displayAvatarURL(),
        result
      );
    }

    console.log(`[voice] Awarded ${baseXP} base XP to user ${userId} (total: ${result.newXP})`);

  } catch (error) {
    console.error(`Error awarding voice XP to user ${userId}:`, error);
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
