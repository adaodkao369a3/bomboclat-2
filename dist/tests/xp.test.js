"use strict";
// Unit tests for XP calculation business logic
// These tests can run without Discord API credentials
Object.defineProperty(exports, "__esModule", { value: true });
const xp_1 = require("../src/services/xp");
const index_js_1 = require("../src/config/index.js");
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}
function assertApproximate(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: Expected ${expected} ± ${tolerance}, got ${actual}`);
    }
}
console.log('Running XP calculation tests...');
assertEqual((0, xp_1.calculateLevelFromXP)(0), 0, '0 XP should give level 0');
assertEqual((0, xp_1.calculateLevelFromXP)(-1), 0, 'Negative XP should give level 0');
assertEqual((0, xp_1.calculateLevelFromXP)(Number.NaN), 0, 'NaN XP should give level 0');
assertEqual((0, xp_1.calculateLevelFromXP)(Number.POSITIVE_INFINITY), 25, 'Infinite XP should reach the maximum configured level');
for (const [index, threshold] of index_js_1.XP_CONFIG.LEVEL_XP_REQUIREMENTS.entries()) {
    assertEqual((0, xp_1.calculateLevelFromXP)(threshold), index + 1, `XP at level ${index + 1} threshold should give that level`);
    if (index > 0) {
        assertEqual((0, xp_1.calculateLevelFromXP)(threshold - 1), index, `XP immediately below level ${index + 1} threshold should remain at level ${index}`);
    }
}
assertEqual((0, xp_1.calculateLevelFromXP)(200), 2, 'XP between levels 2 and 3 should remain level 2');
assertEqual((0, xp_1.calculateLevelFromXP)(20000), 25, 'XP above the maximum threshold should remain at level 25');
// XP remaining calculation
const currentXP = 275;
const currentLevel = (0, xp_1.calculateLevelFromXP)(currentXP);
const remaining = (0, xp_1.calculateXPRemaining)(currentXP, currentLevel);
assertEqual(remaining, 25, '275 XP at level 3 should have 25 XP remaining to next level');
const percentage = (0, xp_1.calculateProgressPercentage)(currentXP, currentLevel);
assertApproximate(percentage, 83.33, 0.1, '275 XP at level 3 should be ~83.33% progress');
const xpForLevel10 = (0, xp_1.calculateXPForLevel)(10);
assertEqual(xpForLevel10, 2750, 'Level 10 should require 2750 XP');
const xpForLevel30 = (0, xp_1.calculateXPForLevel)(30);
const lastXP = 16250; // Level 25 threshold
const expected30 = lastXP + (30 - 25) * Math.floor(lastXP * 0.5);
assertApproximate(xpForLevel30, expected30, 1, 'Level 30 should extrapolate correctly');
const demotionPlan = (0, xp_1.getProgressionRolePlan)(4, new Set([
    'audience',
    'extra',
    'featured_extra',
    'supporting_cast',
    'principal_cast',
]));
assertEqual(demotionPlan.expectedRoles.join(','), 'audience,extra', 'Demotion should keep only the expected stacked progression roles');
assertEqual(demotionPlan.outdatedRoles.join(','), 'featured_extra,supporting_cast,principal_cast', 'Demotion should identify every outdated progression role');
assertEqual((0, xp_1.getProgressionRolePlan)(13, new Set(['audience', 'extra', 'featured_extra'])).missingRoles.join(','), 'supporting_cast', 'Synchronization should repair a missing lower progression role');
console.log('✓ All XP calculation tests passed!');
//# sourceMappingURL=xp.test.js.map