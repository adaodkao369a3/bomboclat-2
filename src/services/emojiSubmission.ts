import { getClient } from '../database/client.js';
import { getUser } from '../database/client.js';

export interface EmojiSubmission {
  id: number;
  user_id: string;
  guild_id: string;
  emoji_name: string;
  image_buffer: Buffer | null;
  image_mime_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_emoji_id: string | null;
  user_xp?: number;
}

export interface SubmissionResult {
  success: boolean;
  submission?: EmojiSubmission;
  error?: string;
}

export async function createEmojiSubmission(
  userId: string,
  guildId: string,
  emojiName: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<EmojiSubmission> {
  const client = await getClient();
  try {
    // Get user XP for record
    let userXP: number | undefined;
    try {
      const user = await getUser(userId);
      userXP = user?.current_xp;
    } catch (error) {
      // Ignore XP fetch errors
    }

    const result = await client.query<EmojiSubmission>(
      `INSERT INTO emoji_submissions 
       (user_id, guild_id, emoji_name, image_buffer, image_mime_type, status, user_xp)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [userId, guildId, emojiName, imageBuffer, mimeType, userXP]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getEmojiSubmission(id: number): Promise<EmojiSubmission | null> {
  const client = await getClient();
  try {
    const result = await client.query<EmojiSubmission>(
      'SELECT * FROM emoji_submissions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function approveEmojiSubmission(
  id: number,
  reviewedBy: string
): Promise<SubmissionResult> {
  const client = await getClient();
  try {
    // DB-level guard: only update if status is pending
    const result = await client.query<EmojiSubmission>(
      `UPDATE emoji_submissions 
       SET status = 'approved', 
           reviewed_at = CURRENT_TIMESTAMP, 
           reviewed_by = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, reviewedBy]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Submission not found or already reviewed' };
    }

    return { success: true, submission: result.rows[0] };
  } finally {
    client.release();
  }
}

export async function updateEmojiSubmissionWithCreatedId(
  id: number,
  createdEmojiId: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      'UPDATE emoji_submissions SET created_emoji_id = $1 WHERE id = $2',
      [createdEmojiId, id]
    );
  } finally {
    client.release();
  }
}

export async function rejectEmojiSubmission(
  id: number,
  reviewedBy: string,
  reason: string | null
): Promise<SubmissionResult> {
  const client = await getClient();
  try {
    // DB-level guard: only update if status is pending
    const result = await client.query<EmojiSubmission>(
      `UPDATE emoji_submissions 
       SET status = 'rejected', 
           reviewed_at = CURRENT_TIMESTAMP, 
           reviewed_by = $2,
           rejection_reason = $3
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, reviewedBy, reason]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Submission not found or already reviewed' };
    }

    return { success: true, submission: result.rows[0] };
  } finally {
    client.release();
  }
}
