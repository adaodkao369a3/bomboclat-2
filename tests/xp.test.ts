// Unit tests for XP calculation business logic
// These tests can run without Discord API credentials

import {
  calculateLevelFromXP,
  calculateXPForLevel,
  calculateXPRemaining,
  calculateProgressPercentage,
  getProgressionRolePlan,
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

console.log('✓ All XP calculation tests passed!');
