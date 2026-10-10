import { VoiceState, Guild, VoiceChannel } from 'discord.js';
import { awardXP } from './xp.js';
import { sendLevelUpNotification } from './levelUpNotification.js';
import { ROLES } from '../config/index.js';

// Voice timer tracking: guild_user_id -> accumulated seconds
const voiceTimers = new Map<string, number>();

// Track last activity time for each user: guild_user_id -> timestamp
const voiceLastActivity = new Map<string, number>();

// Tick interval: 30 seconds
const VOICE_TICK_INTERVAL_MS = 30 * 1000;

// Payout threshold: 180 seconds
const VOICE_PAYOUT_THRESHOLD_SECONDS = 180;

// XP range: 5-15
const VOICE_XP_MIN = 5;
const VOICE_XP_MAX = 15;

// Prevent overlapping ticks
let isTickRunning = false;

// Track last tick time for accurate elapsed calculation
let lastTickTime: number | null = null;

// Cleanup inactive timers after 24 hours
const VOICE_INACTIVE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Get timer key for a user in a guild
 */
export function getTimerKey(guildId: string, userId: string): string {
  return `${guildId}_${userId}`;
}

/**
 * Check if a voice state is eligible for voice XP
 */
export function isEligibleForVoiceXP(state: VoiceState): boolean {
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

/**
 * Count eligible members in a voice channel
 */
export function countEligibleMembers(channel: VoiceChannel): number {
  let count = 0;
  for (const member of channel.members.values()) {
    if (member.user.bot) continue; // Skip bots

    const voiceState = member.voice;
    if (!voiceState) continue;

    if (isEligibleForVoiceXP(voiceState)) {
      count++;
    }
  }
  return count;
}

/**
 * Tick function: process all guilds and award voice XP
 */
export async function tickVoiceSessions(): Promise<void> {
  // Prevent overlapping ticks
  if (isTickRunning) {
    console.log('[voice] Tick already running, skipping');
    return;
  }

  isTickRunning = true;
  const now = Date.now();

  try {
    // Calculate elapsed time since last tick
    let elapsedSeconds = 0;
    if (lastTickTime !== null) {
      elapsedSeconds = (now - lastTickTime) / 1000;
      // Cap at 60 seconds in case process stalled
      elapsedSeconds = Math.min(elapsedSeconds, 60);
    }
    lastTickTime = now;

    // Process each guild
    for (const [guildId, guild] of guildMap) {
      try {
        await processGuild(guild, elapsedSeconds);
      } catch (error) {
        console.error(`[voice] Error processing guild ${guildId}:`, error);
        // Continue to next guild
      }
    }

    console.log(`[voice] Tick complete (${elapsedSeconds.toFixed(1)}s elapsed)`);
  } finally {
    isTickRunning = false;
  }
}

/**
 * Process a single guild's voice channels
 */
async function processGuild(guild: Guild, elapsedSeconds: number): Promise<void> {
  // Get all voice channels with members
  const voiceChannels = guild.channels.cache.filter(
    (channel): channel is VoiceChannel => channel.isVoiceBased() && channel.members.size > 0
  );

  // Collect eligible members from all qualifying channels
  const eligibleMembers = new Map<string, { member: any; channel: VoiceChannel }>();

  for (const [_, channel] of voiceChannels) {
    // Skip AFK channel
    if (channel.id === guild.afkChannelId) continue;

    // Count eligible members in this channel
    const eligibleCount = countEligibleMembers(channel);

    // Channel needs 2+ eligible members to earn
    if (eligibleCount < 2) continue;

    // Add all eligible members from this channel
    for (const [_, member] of channel.members) {
      if (member.user.bot) continue;

      const voiceState = member.voice;
      if (!voiceState) continue;

      if (isEligibleForVoiceXP(voiceState)) {
        const timerKey = getTimerKey(guild.id, member.id);
        eligibleMembers.set(timerKey, { member, channel });
      }
    }
  }

  // Update timers for eligible members
  for (const [_, { member, channel }] of eligibleMembers) {
    try {
      await updateTimer(member, channel, guild, elapsedSeconds);
    } catch (error) {
      console.error(`[voice] Error updating timer for ${member.id}:`, error);
      // Continue to next member
    }
  }

  // Clean up timers for members who left the guild or are no longer in voice
  cleanupTimers(guild, eligibleMembers);
}

/**
 * Update a member's voice timer and award XP if threshold reached
 */
async function updateTimer(
  member: any,
  channel: VoiceChannel,
  guild: Guild,
  elapsedSeconds: number
): Promise<void> {
  const timerKey = getTimerKey(guild.id, member.id);
  const currentTimer = voiceTimers.get(timerKey) || 0;

  // Update last activity time
  voiceLastActivity.set(timerKey, Date.now());

  // Add elapsed seconds
  const newTimer = currentTimer + elapsedSeconds;
  voiceTimers.set(timerKey, newTimer);

  // Check if threshold reached
  if (newTimer >= VOICE_PAYOUT_THRESHOLD_SECONDS) {
    // Award XP
    await awardVoiceXP(member, channel, guild);

    // Subtract threshold and keep remainder
    const remainder = newTimer - VOICE_PAYOUT_THRESHOLD_SECONDS;
    voiceTimers.set(timerKey, remainder);
  }
}

/**
 * Award voice XP to a member
 */
async function awardVoiceXP(member: any, channel: VoiceChannel, guild: Guild): Promise<void> {
  try {
    const userId = member.id;
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
      `Voice activity in channel ${channel.name}`,
      hasBooster,
      member
    );

    if (!result.success || result.newXP === null) {
      console.error(`[voice] Failed to award voice XP to user ${userId}`);
      return;
    }

    // Use the same level-up notification path as message XP
    if (result.levelUpOccurred) {
      await sendLevelUpNotification(
        guild,
        member.id,
        member.displayName,
        member.user.displayAvatarURL(),
        result
      );
    }

    console.log(`[voice] Awarded ${baseXP} base XP to ${username} (voice: ${channel.name})`);
  } catch (error) {
    console.error(`[voice] Error awarding voice XP to ${member.id}:`, error);
  }
}

/**
 * Clean up timers for members who left guild or have been inactive for 24 hours
 */
function cleanupTimers(guild: Guild, eligibleMembers: Map<string, any>): void {
  const now = Date.now();
  const currentMemberIds = new Set(eligibleMembers.keys());

  // Remove timers for members who left guild or are inactive
  for (const [timerKey] of voiceTimers) {
    if (!timerKey.startsWith(`${guild.id}_`)) continue;

    const lastActivity = voiceLastActivity.get(timerKey);

    // Delete if not in guild (not in eligible set and no recent activity)
    // OR if inactive for 24+ hours
    if (!currentMemberIds.has(timerKey) && (!lastActivity || (now - lastActivity) > VOICE_INACTIVE_TIMEOUT_MS)) {
      voiceTimers.delete(timerKey);
      voiceLastActivity.delete(timerKey);
    }
  }
}

// Guild map for tick processing
const guildMap = new Map<string, Guild>();

/**
 * Register a guild for voice tick processing
 */
export function registerGuild(guild: Guild): void {
  guildMap.set(guild.id, guild);
}

/**
 * Unregister a guild (e.g., when bot leaves)
 */
export function unregisterGuild(guildId: string): void {
  guildMap.delete(guildId);
  // Clean up timers for this guild
  for (const [timerKey] of voiceTimers) {
    if (timerKey.startsWith(`${guildId}_`)) {
      voiceTimers.delete(timerKey);
      voiceLastActivity.delete(timerKey);
    }
  }
}

/**
 * Remove timer for a specific member when they leave the guild
 */
export function removeMemberTimer(guildId: string, userId: string): void {
  const timerKey = getTimerKey(guildId, userId);
  voiceTimers.delete(timerKey);
  voiceLastActivity.delete(timerKey);
}

/**
 * Start the voice ticker (30-second interval)
 */
let voiceTickerInterval: NodeJS.Timeout | null = null;

export function startVoiceTicker(): void {
  if (voiceTickerInterval) return;

  voiceTickerInterval = setInterval(() => {
    tickVoiceSessions();
  }, VOICE_TICK_INTERVAL_MS);

  console.log('[voice] Voice ticker started (30s interval)');
}

/**
 * Stop the voice ticker
 */
export function stopVoiceTicker(): void {
  if (voiceTickerInterval) {
    clearInterval(voiceTickerInterval);
    voiceTickerInterval = null;
    console.log('[voice] Voice ticker stopped');
  }
}
