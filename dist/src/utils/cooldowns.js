"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemaining = getRemaining;
exports.setCooldown = setCooldown;
exports.clearCooldown = clearCooldown;
// Simple in-memory cooldown tracker with cleanup
const cooldowns = new Map();
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
let lastCleanup = Date.now();
function cleanupOldEntries() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS)
        return;
    lastCleanup = now;
    for (const [userId, endTime] of cooldowns.entries()) {
        if (endTime < now) {
            cooldowns.delete(userId);
        }
    }
}
function getRemaining(userId) {
    cleanupOldEntries();
    const endTime = cooldowns.get(userId);
    if (!endTime)
        return 0;
    const remaining = endTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
}
function setCooldown(userId, seconds) {
    cleanupOldEntries();
    const endTime = Date.now() + (seconds * 1000);
    cooldowns.set(userId, endTime);
}
function clearCooldown(userId) {
    cooldowns.delete(userId);
}
//# sourceMappingURL=cooldowns.js.map