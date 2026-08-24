import { getClient } from '../database/client.js';

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
