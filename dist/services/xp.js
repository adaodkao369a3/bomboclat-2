"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiSpamValidator = void 0;
exports.calculateMessageXP = calculateMessageXP;
exports.calculateLevelFromXP = calculateLevelFromXP;
exports.calculateXPForLevel = calculateXPForLevel;
exports.calculatePromotionEligibility = calculatePromotionEligibility;
exports.getRoleFromLevel = getRoleFromLevel;
exports.calculateXPToNextLevel = calculateXPToNextLevel;
exports.calculateXPRemaining = calculateXPRemaining;
exports.calculateProgressPercentage = calculateProgressPercentage;
exports.getNextProgressionThreshold = getNextProgressionThreshold;
exports.addProgressionRole = addProgressionRole;
exports.verifyRoleAssignment = verifyRoleAssignment;
exports.rollbackRoles = rollbackRoles;
const index_js_1 = require("../config/index.js");
function calculateMessageXP() {
    const min = index_js_1.XP_CONFIG.MESSAGE_XP_MIN;
    const max = index_js_1.XP_CONFIG.MESSAGE_XP_MAX;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function calculateLevelFromXP(totalXP) {
    const requirements = index_js_1.XP_CONFIG.LEVEL_XP_REQUIREMENTS;
    let level = 0;
    for (let i = 0; i < requirements.length; i++) {
        if (totalXP >= requirements[i]) {
            level = i + 1;
        }
        else {
            break;
        }
    }
    return level;
}
function calculateXPForLevel(level) {
    const requirements = index_js_1.XP_CONFIG.LEVEL_XP_REQUIREMENTS;
    if (level <= 0)
        return 0;
    if (level > requirements.length) {
        // Extrapolate for levels beyond defined requirements
        const lastLevel = requirements.length;
        const lastXP = requirements[lastLevel - 1];
        const extrapolatedXP = lastXP + (level - lastLevel) * Math.floor(lastXP * 0.5);
        return extrapolatedXP;
    }
    return requirements[level - 1];
}
function calculatePromotionEligibility(_currentXP, currentLevel, currentRole) {
    const roleKeys = Object.keys(index_js_1.XP_CONFIG.ROLE_LEVEL_REQUIREMENTS);
    const currentIndex = roleKeys.indexOf(currentRole);
    if (currentIndex === -1 || currentIndex >= roleKeys.length - 1) {
        return 100.0; // Already at highest role
    }
    const nextRole = roleKeys[currentIndex + 1];
    const requiredLevel = index_js_1.XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[nextRole] || 999;
    if (currentLevel >= requiredLevel) {
        return 100.0;
    }
    const previousLevel = index_js_1.XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[currentRole] || 0;
    const levelGap = requiredLevel - previousLevel;
    const levelProgress = currentLevel - previousLevel;
    if (levelGap <= 0)
        return 100.0;
    const basePercentage = (levelProgress / levelGap) * 100;
    const obfuscated = Math.pow(basePercentage, 0.9);
    return Math.min(Math.max(obfuscated, 0.0), 100.0);
}
function getRoleFromLevel(level) {
    const rolesByLevel = Object.entries(index_js_1.XP_CONFIG.ROLE_LEVEL_REQUIREMENTS).map(([role, lvl]) => [lvl, role]);
    let highestRole = 'audience';
    for (const [roleLevel, roleName] of rolesByLevel) {
        if (level >= roleLevel) {
            highestRole = roleName;
        }
    }
    return highestRole;
}
function calculateXPToNextLevel(_currentXP, currentLevel) {
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    const currentLevelXP = calculateXPForLevel(currentLevel);
    return nextLevelXP - currentLevelXP;
}
function calculateXPRemaining(currentXP, currentLevel) {
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    return nextLevelXP - currentXP;
}
function calculateProgressPercentage(currentXP, currentLevel) {
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    const currentLevelXP = calculateXPForLevel(currentLevel);
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    if (xpNeededForNextLevel <= 0)
        return 100;
    return Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);
}
function getNextProgressionThreshold(currentRole) {
    const roleKeys = Object.keys(index_js_1.XP_CONFIG.ROLE_LEVEL_REQUIREMENTS);
    const currentIndex = roleKeys.indexOf(currentRole);
    if (currentIndex === -1 || currentIndex >= roleKeys.length - 1) {
        return 0; // Already at highest role
    }
    const nextRole = roleKeys[currentIndex + 1];
    return index_js_1.XP_CONFIG.ROLE_LEVEL_REQUIREMENTS[nextRole] || 0;
}
async function addProgressionRole(member, roleName) {
    if (!member.guild)
        return false;
    const roleId = index_js_1.ROLES[roleName.toUpperCase()];
    if (!roleId) {
        console.error(`Unknown progression role: ${roleName}`);
        return false;
    }
    const role = member.guild.roles.cache.get(roleId);
    if (!role) {
        console.error(`Role ${roleId} not found in guild`);
        return false;
    }
    try {
        await member.roles.add(role, 'XP progression system: role stacking');
        console.log(`Added role ${roleName} to user ${member.id}`);
        return true;
    }
    catch (error) {
        console.error(`Failed to add role ${roleName} to user ${member.id}:`, error);
        return false;
    }
}
async function verifyRoleAssignment(member, roleName) {
    if (!member.guild)
        return false;
    const roleId = index_js_1.ROLES[roleName.toUpperCase()];
    if (!roleId)
        return false;
    return member.roles.cache.has(roleId);
}
async function rollbackRoles(member, roleNames) {
    if (!member.guild || !roleNames.length)
        return;
    for (const roleName of roleNames) {
        const roleId = index_js_1.ROLES[roleName.toUpperCase()];
        if (!roleId)
            continue;
        const role = member.guild.roles.cache.get(roleId);
        if (role && member.roles.cache.has(roleId)) {
            try {
                await member.roles.remove(role, 'XP progression system: rollback');
                console.log(`Rolled back role ${roleName} from user ${member.id}`);
            }
            catch (error) {
                console.error(`Failed to rollback role ${roleName} from user ${member.id}:`, error);
            }
        }
    }
}
class AntiSpamValidator {
    userMessageHistory = new Map();
    userLastXPTime = new Map();
    lastDailyReset = Date.now();
    MAX_HISTORY_SIZE = 50;
    CLEANUP_INTERVAL_MS = 300000; // 5 minutes
    lastCleanup = Date.now();
    cleanupOldEntries() {
        const now = Date.now();
        if (now - this.lastCleanup < this.CLEANUP_INTERVAL_MS)
            return;
        this.lastCleanup = now;
        const cutoffTime = now - index_js_1.XP_CONFIG.SPAM_DETECTION_WINDOW_SECONDS * 1000;
        for (const [userId, history] of this.userMessageHistory.entries()) {
            const filtered = history.filter(entry => entry.timestamp > cutoffTime);
            if (filtered.length === 0) {
                this.userMessageHistory.delete(userId);
            }
            else {
                this.userMessageHistory.set(userId, filtered);
            }
        }
        // Clean up users who haven't been active recently
        for (const [userId, lastXPTime] of this.userLastXPTime.entries()) {
            if (now - lastXPTime > 86400000) { // 24 hours
                this.userLastXPTime.delete(userId);
            }
        }
    }
    isMessageEligible(userId, messageContent, currentDailyXP) {
        const now = Date.now();
        // Reset daily tracking if needed
        if (now - this.lastDailyReset >= 86400000) { // 24 hours
            this.userMessageHistory.clear();
            this.userLastXPTime.clear();
            this.lastDailyReset = now;
        }
        // Periodic cleanup
        this.cleanupOldEntries();
        // Check daily XP cap
        if (currentDailyXP >= index_js_1.XP_CONFIG.DAILY_XP_CAP) {
            return { eligible: false, reason: 'Daily XP cap reached' };
        }
        // Check message length
        if (messageContent.length < index_js_1.XP_CONFIG.MIN_MESSAGE_LENGTH) {
            return { eligible: false, reason: 'Message too short' };
        }
        // Check cooldown
        const lastXPTime = this.userLastXPTime.get(userId);
        if (lastXPTime) {
            const cooldownRemaining = (now - lastXPTime) / 1000;
            if (cooldownRemaining < index_js_1.XP_CONFIG.MESSAGE_COOLDOWN_SECONDS) {
                return { eligible: false, reason: 'Message cooldown active' };
            }
        }
        // Check for rapid spam (too many messages in short time)
        const history = this.userMessageHistory.get(userId) || [];
        const recentMessages = history.filter(entry => now - entry.timestamp < index_js_1.XP_CONFIG.SPAM_DETECTION_WINDOW_SECONDS * 1000);
        if (recentMessages.length > 10) {
            return { eligible: false, reason: 'Rapid message spam detected' };
        }
        // Check for duplicate spam
        const duplicateCount = recentMessages.filter(entry => entry.content === messageContent).length;
        if (duplicateCount >= index_js_1.XP_CONFIG.DUPLICATE_MESSAGE_THRESHOLD) {
            return { eligible: false, reason: 'Duplicate message limit reached' };
        }
        return { eligible: true, reason: 'Eligible' };
    }
    recordMessage(userId, messageContent, awardedXP) {
        const now = Date.now();
        // Add to message history
        if (!this.userMessageHistory.has(userId)) {
            this.userMessageHistory.set(userId, []);
        }
        const history = this.userMessageHistory.get(userId);
        history.push({ content: messageContent, timestamp: now });
        // Keep only recent messages for spam detection
        if (history.length > this.MAX_HISTORY_SIZE) {
            history.shift();
        }
        // Update last XP time if awarded
        if (awardedXP) {
            this.userLastXPTime.set(userId, now);
        }
    }
}
exports.AntiSpamValidator = AntiSpamValidator;
//# sourceMappingURL=xp.js.map