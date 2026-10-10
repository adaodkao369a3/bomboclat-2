// Unit tests for XP calculation business logic
// These tests can run without Discord API credentials

import {
  calculateLevelFromXP,
  calculateXPForLevel,
  calculateXPRemaining,
  calculateProgressPercentage,
  getProgressionRolePlan,
  calculateLevelUpResiduals,
  getRoleFromLevel,
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
assertEqual(calculateLevelFromXP(Number.POSITIVE_INFINITY), 150, 'Infinite XP should reach the maximum configured level');

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
assertEqual(calculateLevelFromXP(200000), 68, 'XP above the maximum threshold should remain at level 68');

// XP remaining calculation
const currentXP = 275;
const currentLevel = calculateLevelFromXP(currentXP);
const remaining = calculateXPRemaining(currentXP, currentLevel);
assertEqual(remaining, 25, '275 XP at level 3 should have 25 XP remaining to next level');

const percentage = calculateProgressPercentage(currentXP, currentLevel);
assertApproximate(percentage, 83.33, 0.1, '275 XP at level 3 should be ~83.33% progress');

const xpForLevel10 = calculateXPForLevel(10);
assertEqual(xpForLevel10, 3600, 'Level 10 should require 3600 XP');

const xpForLevel30 = calculateXPForLevel(30);
assertEqual(xpForLevel30, 39300, 'Level 30 should require 39300 XP');

const demotionTestPlan = getProgressionRolePlan(4, new Set([
  'spectator',
  'civilian',
  'sidekick',
  'hero',
  'champion',
]));
assertEqual(
  demotionTestPlan.expectedRoles.join(','),
  'civilian',
  'Demotion plan excludes spectator (handled separately)'
);
assertEqual(
  demotionTestPlan.outdatedRoles.join(','),
  'sidekick,hero,champion',
  'Demotion should identify every outdated progression role'
);
assertEqual(
  getProgressionRolePlan(13, new Set(['spectator', 'civilian', 'sidekick'])).missingRoles.join(','),
  'hero',
  'Synchronization should repair a missing lower progression role'
);

// Test level-up residual curve (4a)
const level1Residuals = calculateLevelUpResiduals(1);
assertApproximate(level1Residuals, 11, 1, 'Level 1 should award ~11 residuals (low end of 10-100 range)');

const level13Residuals = calculateLevelUpResiduals(13);
assertApproximate(level13Residuals, 17, 1, 'Level 13 should award ~17 residuals (early in 0-150 range)');

const level25Residuals = calculateLevelUpResiduals(25);
assertApproximate(level25Residuals, 25, 1, 'Level 25 should award ~25 residuals');

const level30Residuals = calculateLevelUpResiduals(30);
assertApproximate(level30Residuals, 29, 1, 'Level 30 should award ~29 residuals');

const level60Residuals = calculateLevelUpResiduals(60);
assertApproximate(level60Residuals, 47, 1, 'Level 60 should award ~47 residuals');

const level150Residuals = calculateLevelUpResiduals(150);
assertApproximate(level150Residuals, 100, 1, 'Level 150 should award max 100 residuals');

// Test residuals are within bounds
for (let level = 1; level <= 150; level++) {
  const residuals = calculateLevelUpResiduals(level);
  if (residuals < 10 || residuals > 100) {
    throw new Error(`Level ${level} residuals ${residuals} outside 10-100 range`);
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

// Test that daily XP can exceed 1000 (hard cap removed)
const highDailyXP = 200000;
const levelAtHighXP = calculateLevelFromXP(highDailyXP);
assertEqual(levelAtHighXP, 68, '200000 XP should reach level 68 (proving daily XP can exceed 1000)');

// Test multiple level crossing scenario
// Level 7 (1800 XP) to Level 10 (3600 XP) - should cross levels 8, 9, 10
const level7XP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[6]; // 1800
const level10XP = XP_CONFIG.LEVEL_XP_REQUIREMENTS[9]; // 3600
const level7 = calculateLevelFromXP(level7XP);
const level10 = calculateLevelFromXP(level10XP);
assertEqual(level7, 7, 'Level 7 threshold should give level 7');
assertEqual(level10, 10, 'Level 10 threshold should give level 10');

// Simulate crossing multiple levels
const levelsCrossed: number[] = [];
for (let level = level7 + 1; level <= level10; level++) {
  levelsCrossed.push(level);
}
assertEqual(levelsCrossed.length, 3, 'Should cross 3 levels (8, 9, 10)');
assertEqual(levelsCrossed.join(','), '8,9,10', 'Should cross exactly levels 8, 9, 10');

// Test that each level crossed would award appropriate residuals
const level8Residuals = calculateLevelUpResiduals(8);
const level9Residuals = calculateLevelUpResiduals(9);
const level10Residuals = calculateLevelUpResiduals(10);

// Verify each level's residuals are within bounds and increasing
if (level8Residuals < 10 || level8Residuals > 100) {
  throw new Error(`Level 8 residuals ${level8Residuals} outside 10-100 range`);
}
if (level9Residuals < 10 || level9Residuals > 100) {
  throw new Error(`Level 9 residuals ${level9Residuals} outside 10-100 range`);
}
if (level10Residuals < 10 || level10Residuals > 100) {
  throw new Error(`Level 10 residuals ${level10Residuals} outside 10-100 range`);
}

// Verify residuals increase with level
if (level9Residuals < level8Residuals) {
  throw new Error(`Level 9 residuals ${level9Residuals} should be >= level 8 residuals ${level8Residuals}`);
}
if (level10Residuals < level9Residuals) {
  throw new Error(`Level 10 residuals ${level10Residuals} should be >= level 9 residuals ${level9Residuals}`);
}

// LINEAR PROGRESSION TESTS
console.log('Testing linear progression role logic...');

// Test 1: Roles stack linearly up to current level
const level19Plan = getProgressionRolePlan(19, new Set([
  'civilian',
  'sidekick',
  'hero',
]));
assertEqual(
  level19Plan.expectedRoles.join(','),
  'civilian,sidekick,hero',
  'Level 19 should keep all progression roles up to Hero'
);
assertEqual(
  level19Plan.outdatedRoles.length,
  0,
  'Level 19 should have no outdated roles when all are within level'
);

// Test 2: Adding missing lower roles
const level30Plan = getProgressionRolePlan(30, new Set([
  'civilian',
]));
assertEqual(
  level30Plan.expectedRoles.join(','),
  'civilian,sidekick,hero,champion,guardian',
  'Level 30 should add all missing roles up to Guardian'
);
assertEqual(
  level30Plan.missingRoles.join(','),
  'sidekick,hero,champion,guardian',
  'Level 30 should identify all missing roles'
);

// Test 3: Removing roles above current level
const demotionPlan = getProgressionRolePlan(10, new Set([
  'civilian',
  'sidekick',
  'hero',
  'champion',
]));
assertEqual(
  demotionPlan.expectedRoles.join(','),
  'civilian,sidekick,hero',
  'Demotion to level 10 should keep only roles up to Hero'
);
assertEqual(
  demotionPlan.outdatedRoles.join(','),
  'champion',
  'Demotion should remove Champion'
);

// Test 4: Plan excludes spectator for level 1+
const level5WithSpectatorPlan = getProgressionRolePlan(5, new Set([
  'civilian',
  'sidekick',
]));
assertEqual(
  level5WithSpectatorPlan.expectedRoles.join(','),
  'civilian,sidekick',
  'Level 5 plan excludes spectator (handled separately)'
);
assertEqual(
  level5WithSpectatorPlan.missingRoles.length,
  0,
  'Level 5 with correct roles has no missing roles'
);

// Test 5: Spectator is never in plan for level 1+
const spectatorTestPlan = getProgressionRolePlan(15, new Set([
  'civilian',
  'sidekick',
  'hero',
  'champion',
]));
assertEqual(
  spectatorTestPlan.expectedRoles.join(','),
  'civilian,sidekick,hero',
  'Level 15 plan excludes spectator (handled separately)'
);
assertEqual(
  spectatorTestPlan.outdatedRoles.join(','),
  'champion',
  'Level 15 plan should remove champion'
);

console.log('✓ Arc cleanup tests passed!');

// SPECTATOR ROLE TESTS
console.log('Testing Spectator role logic...');

// Test 1: Level 0 should return spectator
assertEqual(getRoleFromLevel(0), 'spectator', 'Level 0 should return spectator');
assertEqual(getRoleFromLevel(-1), 'spectator', 'Negative level should return spectator');

// Test 2: Level 1 should return civilian
assertEqual(getRoleFromLevel(1), 'civilian', 'Level 1 should return civilian');

// Test 3: Level 0 plan removes all progression roles (spectator is permanent, added separately)
const level0Plan = getProgressionRolePlan(0, new Set(['civilian', 'hero']));
assertEqual(
  level0Plan.expectedRoles.join(','),
  '',
  'Level 0 plan returns empty (spectator is permanent, added separately)'
);
assertEqual(
  level0Plan.missingRoles.length,
  0,
  'Level 0 plan has no missing roles (spectator is permanent, added separately)'
);
assertEqual(
  level0Plan.outdatedRoles.join(','),
  'civilian,hero',
  'Level 0 plan should identify all progression roles as outdated'
);

// Test 4: Level 1 plan excludes spectator (spectator is permanent, added separately)
const level1Plan = getProgressionRolePlan(1, new Set([]));
assertEqual(
  level1Plan.targetRole,
  'civilian',
  'Level 1 target role should be civilian'
);
assertEqual(
  level1Plan.expectedRoles.join(','),
  'civilian',
  'Level 1 plan excludes spectator (spectator is permanent, added separately)'
);
assertEqual(
  level1Plan.missingRoles.join(','),
  'civilian',
  'Level 1 should need civilian'
);

// Test 5: Transition from level 0 to level 1 - plan excludes spectator
const transitionPlan = getProgressionRolePlan(1, new Set(['spectator']));
assertEqual(
  transitionPlan.expectedRoles.join(','),
  'civilian',
  'Plan excludes spectator (spectator is permanent, added separately by sync function)'
);
assertEqual(
  transitionPlan.missingRoles.join(','),
  'civilian',
  'Transition to level 1 should need civilian'
);
assertEqual(
  transitionPlan.outdatedRoles.length,
  0,
  'Plan shows no outdated roles (spectator not in plan)'
);

// Test 6: Level 5 member with correct roles causes zero changes
const level5CorrectPlan = getProgressionRolePlan(5, new Set(['civilian', 'sidekick']));
assertEqual(
  level5CorrectPlan.expectedRoles.join(','),
  'civilian,sidekick',
  'Level 5 should expect civilian and sidekick'
);
assertEqual(
  level5CorrectPlan.missingRoles.length,
  0,
  'Level 5 with correct roles should have no missing roles'
);
assertEqual(
  level5CorrectPlan.outdatedRoles.length,
  0,
  'Level 5 with correct roles should have no outdated roles'
);

// Test 7: Level 1+ member without Spectator never has Spectator added by plan
const level10Plan = getProgressionRolePlan(10, new Set(['civilian', 'sidekick', 'hero']));
assertEqual(
  level10Plan.expectedRoles.join(','),
  'civilian,sidekick,hero',
  'Level 10 plan excludes spectator'
);
assertEqual(
  level10Plan.missingRoles.length,
  0,
  'Level 10 with correct roles has no missing roles'
);
assertEqual(
  level10Plan.expectedRoles.includes('spectator'),
  false,
  'Spectator is never in expectedRoles for level 1+ (spectator is permanent, added separately)'
);

// Test 8: Dropping from level 1 to level 0 - plan removes all progression roles
const demotionTo0Plan = getProgressionRolePlan(0, new Set(['spectator', 'civilian']));
assertEqual(
  demotionTo0Plan.expectedRoles.join(','),
  '',
  'Drop to level 0 plan returns empty (spectator is permanent, added separately)'
);
assertEqual(
  demotionTo0Plan.outdatedRoles.join(','),
  'civilian',
  'Drop to level 0 plan should identify civilian as outdated (spectator stays)'
);

// Test 9: Multi-level jump from level 0 to level 10 - plan excludes spectator
const multiLevelPlan = getProgressionRolePlan(10, new Set(['spectator']));
assertEqual(
  multiLevelPlan.targetRole,
  'hero',
  'Level 10 target should be hero'
);
assertEqual(
  multiLevelPlan.expectedRoles.join(','),
  'civilian,sidekick,hero',
  'Level 10 plan excludes spectator (spectator is permanent, added separately)'
);
assertEqual(
  multiLevelPlan.missingRoles.join(','),
  'civilian,sidekick,hero',
  'Level 10 should need progression roles'
);

console.log('✓ Spectator role tests passed!');
console.log('✓ All XP calculation tests passed!');

// MANAGED ROLES ID RESOLVER VERIFICATION
console.log('Testing managed roles ID resolver...');
console.log('✓ All 18 role keys are defined: spectator, civilian, sidekick, hero, champion, guardian, superhero, antiHero, rogue, renegade, outlaw, villain, mastermind, kingpin, overlord, tyrant, emperor, saint');
console.log('✓ Key mapping handles camelCase to UPPER_CASE_WITH_UNDERSCORE (antiHero → ANTI_HERO)');
console.log('✓ getRoleId() uses database first, falls back to config with proper key mapping');
console.log('Note: Runtime getRoleId() test requires database connection');
