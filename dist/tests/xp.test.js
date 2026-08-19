"use strict";
// Unit tests for XP calculation business logic
// These tests can run without Discord API credentials
Object.defineProperty(exports, "__esModule", { value: true });
const xp_1 = require("../src/services/xp");
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
// Test 1: Level 0-1 threshold
const level0XP = 0;
const level1 = (0, xp_1.calculateLevelFromXP)(level0XP);
assertEqual(level1, 0, 'Level 0 XP should give level 0');
const level1XP = 50;
const level2 = (0, xp_1.calculateLevelFromXP)(level1XP);
assertEqual(level2, 1, '50 XP should give level 1');
const level2XP = 150;
const level3 = (0, xp_1.calculateLevelFromXP)(level2XP);
assertEqual(level3, 2, '150 XP should give level 2');
// Test 2: Level 4-5 threshold
const level4XP = 500;
const level5 = (0, xp_1.calculateLevelFromXP)(level4XP);
assertEqual(level5, 4, '500 XP should give level 4');
const level5XP = 750;
const level6 = (0, xp_1.calculateLevelFromXP)(level5XP);
assertEqual(level6, 5, '750 XP should give level 5');
// Test 3: Lead Cast threshold (Level 25)
const leadCastXP = 16250;
const level25 = (0, xp_1.calculateLevelFromXP)(leadCastXP);
assertEqual(level25, 25, '16250 XP should give level 25');
// Test 4: XP remaining calculation
const currentXP = 275;
const currentLevel = (0, xp_1.calculateLevelFromXP)(currentXP);
const remaining = (0, xp_1.calculateXPRemaining)(currentXP, currentLevel);
assertEqual(remaining, 25, '275 XP at level 3 should have 25 XP remaining to next level');
// Test 5: Progress percentage calculation
const percentage = (0, xp_1.calculateProgressPercentage)(currentXP, currentLevel);
assertApproximate(percentage, 83.33, 0.1, '275 XP at level 3 should be ~83.33% progress');
// Test 6: XP for level calculation
const xpForLevel10 = (0, xp_1.calculateXPForLevel)(10);
assertEqual(xpForLevel10, 2750, 'Level 10 should require 2750 XP');
// Test 7: Extrapolation beyond defined levels
const xpForLevel30 = (0, xp_1.calculateXPForLevel)(30);
const lastXP = 16250; // Level 25 threshold
const expected30 = lastXP + (30 - 25) * Math.floor(lastXP * 0.5);
assertApproximate(xpForLevel30, expected30, 1, 'Level 30 should extrapolate correctly');
// Test 8: Boundary values - just below threshold
const xpBelow1 = 49;
const levelBelow1 = (0, xp_1.calculateLevelFromXP)(xpBelow1);
assertEqual(levelBelow1, 0, '49 XP should give level 0');
const xpBelow2 = 149;
const levelBelow2 = (0, xp_1.calculateLevelFromXP)(xpBelow2);
assertEqual(levelBelow2, 1, '149 XP should give level 1');
// Test 9: Maximum configured threshold
const maxXP = 16250;
const maxLevel = (0, xp_1.calculateLevelFromXP)(maxXP);
assertEqual(maxLevel, 25, '16250 XP should give level 25');
const aboveMaxXP = 20000;
const aboveMaxLevel = (0, xp_1.calculateLevelFromXP)(aboveMaxXP);
assertEqual(aboveMaxLevel, 25, '20000 XP should still give level 25 (max configured)');
console.log('✓ All XP calculation tests passed!');
//# sourceMappingURL=xp.test.js.map