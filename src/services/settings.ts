import { getClient } from '../database/client.js';
import type { Guild } from 'discord.js';

export async function getSetting(key: string): Promise<string | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].value;
  } finally {
    client.release();
  }
}

export async function setSetting(key: string, value: string, adminUserId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE
       SET value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
      [key, value, adminUserId]
    );
  } finally {
    client.release();
  }
}

/**
 * Get the staff log channel ID
 */
export async function getStaffLogChannel(): Promise<string | null> {
  return await getSetting('staff_log_channel');
}

/**
 * Set the staff log channel ID
 */
export async function setStaffLogChannel(channelId: string, adminUserId: string): Promise<void> {
  await setSetting('staff_log_channel', channelId, adminUserId);
}

/**
 * Log a staff action to the staff log channel
 * No-ops if the channel is not set
 */
export async function logStaffAction(guild: Guild, text: string): Promise<void> {
  const channelId = await getStaffLogChannel();
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return;

  try {
    await channel.send(text);
  } catch (error) {
    console.error('Failed to log staff action:', error);
  }
}
