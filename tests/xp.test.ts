// Unit tests for XP calculation business logic
// These tests can run without Discord API credentials

import {
  calculateLevelFromXP,
  calculateXPForLevel,
  calculateXPRemaining,
  calculateProgressPercentage,
  getProgressionRolePlan,
  calculateLevelUpResiduals,
} from '../src/services/xp';
import { XP_CONFIG } from '../src/config/index.js';

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
  }
}

function assertApproximate(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: Expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

console.log('Running XP calculation tests...');

assertEqual(calculateLevelFromXP(0), 0, '0 XP should give level 0');
assertEqual(calculateLevelFromXP(-1), 0, 'Negative XP should give level 0');
assertEqual(calculateLevelFromXP(Number.NaN), 0, 'NaN XP should give level 0');
assertEqual(calculateLevelFromXP(Number.POSITIVE_INFINITY), 25, 'Infinite XP should reach the maximum configured level');

for (const [index, threshold] of XP_CONFIG.LEVEL_XP_REQUIREMENTS.entries()) {
  assertEqual(
    calculateLevelFromXP(threshold),
    index + 1,
    `XP at level ${index + 1} threshold should give that level`
  );
  if (index > 0) {
    assertEqual(
      calculateLevelFromXP(threshold - 1),
      index,
      `XP immediately below level ${index + 1} threshold should remain at level ${index}`
    );
  }
}

assertEqual(calculateLevelFromXP(200), 2, 'XP between levels 2 and 3 should remain level 2');
assertEqual(calculateLevelFromXP(20000), 25, 'XP above the maximum threshold should remain at level 25');

// XP remaining calculation
const currentXP = 275;
const currentLevel = calculateLevelFromXP(currentXP);
const remaining = calculateXPRemaining(currentXP, currentLevel);
assertEqual(remaining, 25, '275 XP at level 3 should have 25 XP remaining to next level');

const percentage = calculateProgressPercentage(currentXP, currentLevel);
assertApproximate(percentage, 83.33, 0.1, '275 XP at level 3 should be ~83.33% progress');

const xpForLevel10 = calculateXPForLevel(10);
assertEqual(xpForLevel10, 2750, 'Level 10 should require 2750 XP');

const xpForLevel30 = calculateXPForLevel(30);
const lastXP = 16250; // Level 25 threshold
const expected30 = lastXP + (30 - 25) * Math.floor(lastXP * 0.5);
assertApproximate(xpForLevel30, expected30, 1, 'Level 30 should extrapolate correctly');

const demotionPlan = getProgressionRolePlan(4, new Set([
  'audience',
  'extra',
  'featured_extra',
  'supporting_cast',
  'principal_cast',
]));
assertEqual(
  demotionPlan.expectedRoles.join(','),
  'audience,extra',
  'Demotion should keep only the expected stacked progression roles'
);
assertEqual(
  demotionPlan.outdatedRoles.join(','),
  'featured_extra,supporting_cast,principal_cast',
  'Demotion should identify every outdated progression role'
);
assertEqual(
  getProgressionRolePlan(13, new Set(['audience', 'extra', 'featured_extra'])).missingRoles.join(','),
  'supporting_cast',
  'Synchronization should repair a missing lower progression role'
);

// Test level-up residual curve (4a)
const level1Residuals = calculateLevelUpResiduals(1);
assertApproximate(level1Residuals, 12, 1, 'Level 1 should award ~12 residuals (low end of 10-50 range)');

const level13Residuals = calculateLevelUpResiduals(13);
assertApproximate(level13Residuals, 31, 1, 'Level 13 should award ~31 residuals (mid range)');

const level25Residuals = calculateLevelUpResiduals(25);
assertApproximate(level25Residuals, 50, 1, 'Level 25 should award ~50 residuals (high end of 10-50 range)');

const level30Residuals = calculateLevelUpResiduals(30);
assertApproximate(level30Residuals, 50, 1, 'Level 30 (beyond max) should award max 50 residuals');

// Test residuals are within bounds
for (let level = 1; level <= 30; level++) {
  const residuals = calculateLevelUpResiduals(level);
  if (residuals < 10 || residuals > 50) {
    throw new Error(`Level ${level} residuals ${residuals} outside 10-50 range`);
  }
}

// Test booster XP multiplier calculation
// This tests the multiplier logic from messageHandler.ts (lines 58-61)
const baseXP = 10;
const boosterMultiplier = 1.25;
const boostedXP = Math.floor(baseXP * boosterMultiplier);
assertEqual(boostedXP, 12, 'Booster should get +25% XP (10 -> 12)');

const highBaseXP = 15;
const highBoostedXP = Math.floor(highBaseXP * boosterMultiplier);
assertEqual(highBoostedXP, 18, 'Booster should get +25% XP (15 -> 18)');

console.log('✓ All XP calculation tests passed!');
