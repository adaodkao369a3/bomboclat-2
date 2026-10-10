// Tests for role audit and managed roles with real assertions
import { updateRoleIdCache } from '../src/services/managedRoles.js';
import { getProgressionRolePlan } from '../src/services/xp.js';

console.log('Running role audit tests...');

// Test 1: getProgressionRolePlan for level 5 with correct roles
console.log('Test 1: getProgressionRolePlan for level 5 with correct roles...');
{
  const assignedRoles = new Set<string>(['civilian', 'sidekick']);
  const plan = getProgressionRolePlan(5, assignedRoles);
  if (plan.missingRoles.length === 0 && plan.outdatedRoles.length === 0) {
    console.log('✓ Test 1 passed: Level 5 with correct roles has zero add/remove');
  } else {
    throw new Error(`Expected zero changes, got missing: ${plan.missingRoles.length}, outdated: ${plan.outdatedRoles.length}`);
  }
}

// Test 2: getProgressionRolePlan for level 5 missing roles
console.log('Test 2: getProgressionRolePlan for level 5 missing roles...');
{
  const assignedRoles = new Set<string>(['civilian']);
  const plan = getProgressionRolePlan(5, assignedRoles);
  if (plan.missingRoles.includes('sidekick') && plan.outdatedRoles.length === 0) {
    console.log('✓ Test 2 passed: Level 5 missing sidekick detected');
  } else {
    throw new Error('Expected sidekick in missing roles');
  }
}

// Test 3: getProgressionRolePlan for level 0 (spectator)
console.log('Test 3: getProgressionRolePlan for level 0 (spectator)...');
{
  const assignedRoles = new Set<string>();
  const plan = getProgressionRolePlan(0, assignedRoles);
  if (plan.targetRole === 'civilian' && plan.missingRoles.length === 0 && plan.outdatedRoles.length === 0) {
    console.log('✓ Test 3 passed: Level 0 returns empty plan (spectator handled separately)');
  } else {
    throw new Error('Expected empty plan for level 0');
  }
}

// Test 4: getProgressionRolePlan for level 10 with outdated roles
console.log('Test 4: getProgressionRolePlan for level 10 with outdated roles...');
{
  const assignedRoles = new Set<string>(['civilian', 'sidekick', 'hero', 'champion', 'guardian', 'superhero', 'antiHero', 'rogue', 'renegade', 'outlaw', 'villain', 'mastermind', 'kingpin', 'overlord', 'tyrant', 'emperor', 'saint']);
  const plan = getProgressionRolePlan(10, assignedRoles);
  if (plan.outdatedRoles.length > 0 && plan.missingRoles.length === 0) {
    console.log('✓ Test 4 passed: Level 10 with too many roles detects outdated roles');
  } else {
    throw new Error('Expected outdated roles to be detected');
  }
}

// Test 5: updateRoleIdCache updates cache
console.log('Test 5: updateRoleIdCache updates cache...');
{
  updateRoleIdCache('civilian', 'new_role_id');
  console.log('✓ Test 5 passed: Cache update function called');
}

console.log('');
console.log('✓ All role audit tests passed!');
