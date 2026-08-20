// Simple in-memory cooldown tracker with cleanup (per-command per-user)
const cooldowns = new Map<string, number>();
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
let lastCleanup = Date.now();

function cleanupOldEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, endTime] of cooldowns.entries()) {
    if (endTime < now) {
      cooldowns.delete(key);
    }
  }
}

export function getRemaining(userId: string, commandName: string): number {
  cleanupOldEntries();
  
  const key = `${userId}:${commandName}`;
  const endTime = cooldowns.get(key);
  if (!endTime) return 0;
  
  const remaining = endTime - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function setCooldown(userId: string, commandName: string, seconds: number): void {
  cleanupOldEntries();
  
  const key = `${userId}:${commandName}`;
  const endTime = Date.now() + (seconds * 1000);
  cooldowns.set(key, endTime);
}

export function clearCooldown(userId: string, commandName: string): void {
  const key = `${userId}:${commandName}`;
  cooldowns.delete(key);
}
