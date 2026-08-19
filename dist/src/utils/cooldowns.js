"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemaining = getRemaining;
exports.setCooldown = setCooldown;
exports.clearCooldown = clearCooldown;
// Simple in-memory cooldown tracker
const cooldowns = new Map();
function getRemaining(userId) {
    const endTime = cooldowns.get(userId);
    if (!endTime)
        return 0;
    const remaining = endTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
}
function setCooldown(userId, seconds) {
    const endTime = Date.now() + (seconds * 1000);
    cooldowns.set(userId, endTime);
}
function clearCooldown(userId) {
    cooldowns.delete(userId);
}
//# sourceMappingURL=cooldowns.js.map