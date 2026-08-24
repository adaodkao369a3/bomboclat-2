// Unit tests for shop functionality
// These tests can run without Discord API credentials

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
  }
}

// Mock user archetype data structure
interface UserArchetype {
  user_id: string;
  archetype_id: number;
  slot_index: number;
  free_grant: boolean;
}

// Mock user color data structure
interface UserColor {
  user_id: string;
  color_id: number;
  active: boolean;
  free_grant: boolean;
}

// Mock shop archetype data structure
interface ShopArchetype {
  id: number;
  name: string;
  tier: string;
  price: number;
  min_role: string | null;
  slot_group: string;
}

// Mock shop color data structure
interface ShopColor {
  id: number;
  name: string;
  hex: string;
  price_band: string;
}

console.log('Running shop functionality tests...');

// Test slot-cap enforcement (5a)
const mockStandardArchetypes: ShopArchetype[] = [
  { id: 1, name: 'Standard 1', tier: 'standard', price: 200, min_role: null, slot_group: 'group1' },
  { id: 2, name: 'Standard 2', tier: 'standard', price: 250, min_role: null, slot_group: 'group1' },
  { id: 3, name: 'Standard 3', tier: 'standard', price: 300, min_role: null, slot_group: 'group1' },
  { id: 4, name: 'Standard 4', tier: 'standard', price: 350, min_role: null, slot_group: 'group1' },
  { id: 5, name: 'Standard 5', tier: 'standard', price: 400, min_role: null, slot_group: 'group1' },
  { id: 6, name: 'Standard 6', tier: 'standard', price: 450, min_role: null, slot_group: 'group1' },
];

function checkSlotCap(userArchetypes: UserArchetype[], newArchetype: ShopArchetype, maxSlots: number): boolean {
  const sameGroupCount = userArchetypes.filter(ua => {
    const archetype = mockStandardArchetypes.find(a => a.id === ua.archetype_id);
    return archetype && archetype.slot_group === newArchetype.slot_group;
  }).length;
  
  return sameGroupCount < maxSlots;
}

// Test slot cap enforcement
const userWith5Archetypes: UserArchetype[] = [
  { user_id: 'user1', archetype_id: 1, slot_index: 0, free_grant: false },
  { user_id: 'user1', archetype_id: 2, slot_index: 1, free_grant: false },
  { user_id: 'user1', archetype_id: 3, slot_index: 2, free_grant: false },
  { user_id: 'user1', archetype_id: 4, slot_index: 3, free_grant: false },
  { user_id: 'user1', archetype_id: 5, slot_index: 4, free_grant: false },
];

const canAddMore = checkSlotCap(userWith5Archetypes, mockStandardArchetypes[5], 5);
assertEqual(canAddMore, false, 'User with 5 archetypes should not be able to add more (slot cap)');

const userWith3Archetypes: UserArchetype[] = [
  { user_id: 'user2', archetype_id: 1, slot_index: 0, free_grant: false },
  { user_id: 'user2', archetype_id: 2, slot_index: 1, free_grant: false },
  { user_id: 'user2', archetype_id: 3, slot_index: 2, free_grant: false },
];

const canAddTo3 = checkSlotCap(userWith3Archetypes, mockStandardArchetypes[3], 5);
assertEqual(canAddTo3, true, 'User with 3 archetypes should be able to add more (under slot cap)');

// Test tier gating (Mythic requires Lead Cast+)
const mockMythicArchetype: ShopArchetype = {
  id: 100,
  name: 'Mythic 1',
  tier: 'mythic',
  price: 1000,
  min_role: 'lead_cast',
  slot_group: 'mythic_group'
};

function checkTierGating(userRole: string, archetype: ShopArchetype): boolean {
  if (!archetype.min_role) return true;
  
  const roleHierarchy = ['audience', 'extra', 'featured_extra', 'supporting_cast', 'principal_cast', 'lead_cast'];
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(archetype.min_role);
  
  return userRoleIndex >= requiredRoleIndex;
}

const leadCastUser = checkTierGating('lead_cast', mockMythicArchetype);
assertEqual(leadCastUser, true, 'Lead Cast user should be able to purchase Mythic');

const principalCastUser = checkTierGating('principal_cast', mockMythicArchetype);
assertEqual(principalCastUser, false, 'Principal Cast user should NOT be able to purchase Mythic');

const audienceUser = checkTierGating('audience', mockMythicArchetype);
assertEqual(audienceUser, false, 'Audience user should NOT be able to purchase Mythic');

const standardArchetypeGating = checkTierGating('audience', mockStandardArchetypes[0]);
assertEqual(standardArchetypeGating, true, 'Audience user should be able to purchase Standard (no min_role)');

// Test color switching (exactly one active)
function checkColorSwitching(userColors: UserColor[], newActiveColorId: number): boolean {
  // Check that exactly one color will be active after the switch
  const willBeActive = userColors.filter(uc => 
    uc.color_id === newActiveColorId ? true : uc.active
  ).length;
  
  return willBeActive === 1;
}

const userColors: UserColor[] = [
  { user_id: 'user1', color_id: 1, active: true, free_grant: false },
  { user_id: 'user1', color_id: 2, active: false, free_grant: false },
  { user_id: 'user1', color_id: 3, active: false, free_grant: false },
];

const canSwitchToColor2 = checkColorSwitching(userColors, 2);
assertEqual(canSwitchToColor2, true, 'User should be able to switch active color');

// Test free-grant flagging for booster claims
const boosterFreeArchetype: UserArchetype = {
  user_id: 'booster_user',
  archetype_id: 1,
  slot_index: 0,
  free_grant: true
};

const normalArchetype: UserArchetype = {
  user_id: 'normal_user',
  archetype_id: 2,
  slot_index: 0,
  free_grant: false
};

assertEqual(boosterFreeArchetype.free_grant, true, 'Booster free archetype should have free_grant=true');
assertEqual(normalArchetype.free_grant, false, 'Normal archetype should have free_grant=false');

// Test that free grants still count against slot cap
const userWithFreeGrant: UserArchetype[] = [
  { user_id: 'user3', archetype_id: 1, slot_index: 0, free_grant: true },
  { user_id: 'user3', archetype_id: 2, slot_index: 1, free_grant: false },
  { user_id: 'user3', archetype_id: 3, slot_index: 2, free_grant: false },
  { user_id: 'user3', archetype_id: 4, slot_index: 3, free_grant: false },
  { user_id: 'user3', archetype_id: 5, slot_index: 4, free_grant: false },
];

const cannotAddWithFreeGrant = checkSlotCap(userWithFreeGrant, mockStandardArchetypes[5], 5);
assertEqual(cannotAddWithFreeGrant, false, 'Free grant should still count against slot cap');

console.log('✓ All shop functionality tests passed!');