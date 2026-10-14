import { getClient } from './src/database/client.js';

async function checkSettings() {
  const client = await getClient();
  try {
    const result = await client.query('SELECT key, value FROM settings WHERE key = $1', ['clip_channels']);
    console.log('clip_channels setting:', result.rows);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkSettings().catch(console.error);
