// Simple in-memory cooldown tracker
const cooldowns = new Map<string, number>();

export function getRemaining(userId: string): number {
  const endTime = cooldowns.get(userId);
  if (!endTime) return 0;
  
  const remaining = endTime - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function setCooldown(userId: string, seconds: number): void {
  const endTime = Date.now() + (seconds * 1000);
  cooldowns.set(userId, endTime);
}

export function clearCooldown(userId: string): void {
  cooldowns.delete(userId);
}
