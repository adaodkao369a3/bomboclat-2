import { Guild } from 'discord.js';

interface MemberCacheEntry {
  userId: string;
  inGuild: boolean;
  lastUpdated: number;
}

// In-memory cache of guild members
// Key: guildId, Value: Map of userId -> cache entry
const memberCache = new Map<string, Map<string, MemberCacheEntry>>();

const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Refresh the member cache for a guild
 */
export async function refreshMemberCache(guild: Guild): Promise<void> {
  try {
    const members = await guild.members.fetch();
    const guildCache = new Map<string, MemberCacheEntry>();

    members.forEach(member => {
      guildCache.set(member.user.id, {
        userId: member.user.id,
        inGuild: true,
        lastUpdated: Date.now(),
      });
    });

    memberCache.set(guild.id, guildCache);
    console.log(`[memberCache] Refreshed cache for guild ${guild.id}: ${guildCache.size} members`);
  } catch (error) {
    console.error(`[memberCache] Failed to refresh cache for guild ${guild.id}:`, error);
  }
}

/**
 * Check if a member is in the guild using the cache
 * Returns true if member is found in cache, false if not, null if cache is stale or unavailable
 */
export function isMemberInGuild(guildId: string, userId: string): boolean | null {
  const guildCache = memberCache.get(guildId);
  if (!guildCache) return null;

  const entry = guildCache.get(userId);
  if (!entry) return false;

  // Check if cache entry is stale (older than refresh interval)
  if (Date.now() - entry.lastUpdated > CACHE_REFRESH_INTERVAL) {
    return null; // Cache is stale
  }

  return entry.inGuild;
}

/**
 * Get the age of the cache in milliseconds
 */
export function getCacheAge(guildId: string): number | null {
  const guildCache = memberCache.get(guildId);
  if (!guildCache || guildCache.size === 0) return null;

  // Get the oldest entry's timestamp
  let oldestTimestamp = Date.now();
  for (const entry of guildCache.values()) {
    if (entry.lastUpdated < oldestTimestamp) {
      oldestTimestamp = entry.lastUpdated;
    }
  }

  return Date.now() - oldestTimestamp;
}

/**
 * Initialize member cache refresh interval
 */
export function startMemberCacheRefresh(guild: Guild): void {
  // Initial refresh
  refreshMemberCache(guild);

  // Refresh every 5 minutes
  setInterval(() => {
    refreshMemberCache(guild);
  }, CACHE_REFRESH_INTERVAL);

  console.log(`[memberCache] Started auto-refresh for guild ${guild.id}`);
}
