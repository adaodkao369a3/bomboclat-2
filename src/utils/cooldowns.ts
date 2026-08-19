// Simple in-memory cooldown tracker with cleanup
const cooldowns = new Map<string, number>();
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
let lastCleanup = Date.now();

function cleanupOldEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [userId, endTime] of cooldowns.entries()) {
    if (endTime < now) {
      cooldowns.delete(userId);
    }
  }
}

export function getRemaining(userId: string): number {
  cleanupOldEntries();
  
  const endTime = cooldowns.get(userId);
  if (!endTime) return 0;
  
  const remaining = endTime - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function setCooldown(userId: string, seconds: number): void {
  cleanupOldEntries();
  
  const endTime = Date.now() + (seconds * 1000);
  cooldowns.set(userId, endTime);
}

export function clearCooldown(userId: string): void {
  cooldowns.delete(userId);
}
