import { getClient } from '../database/client.js';

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd" */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Count one more use of a GIF command on a user (the person being targeted,
 * or the sender when nobody is tagged). Returns the new total.
 */
export async function recordGifUse(userId: string, command: string): Promise<number> {
  const client = await getClient();
  try {
    const result = await client.query<{ use_count: number }>(
      `INSERT INTO gif_usage (user_id, command, use_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, command)
       DO UPDATE SET use_count = gif_usage.use_count + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING use_count`,
      [userId, command]
    );
    return result.rows[0].use_count;
  } finally {
    client.release();
  }
}
