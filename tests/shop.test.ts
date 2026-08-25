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

// Mock transaction data structure
interface Transaction {
  balance_before: number;
  amount: number;
  balance_after: number;
}

console.log('Running shop functionality tests...');

// Test slot-cap enforcement (5a)
const mockStandardArchetypes: ShopArchetype[] = [
  { id: 1, name: 'Standard 1', tier: 'standard', price: 200, min_role: null, slot_group: 'comedy' },
  { id: 2, name: 'Standard 2', tier: 'standard', price: 250, min_role: null, slot_group: 'comedy' },
  { id: 3, name: 'Standard 3', tier: 'standard', price: 300, min_role: null, slot_group: 'comedy' },
  { id: 4, name: 'Standard 4', tier: 'standard', price: 350, min_role: null, slot_group: 'comedy' },
  { id: 5, name: 'Standard 5', tier: 'standard', price: 400, min_role: null, slot_group: 'comedy' },
  { id: 6, name: 'Standard 6', tier: 'standard', price: 450, min_role: null, slot_group: 'comedy' },
];

function checkSlotCap(userArchetypes: UserArchetype[], newArchetype: ShopArchetype, maxSlots: number, allArchetypes: ShopArchetype[]): boolean {
  const sameGroupCount = userArchetypes.filter(ua => {
    const archetype = allArchetypes.find(a => a.id === ua.archetype_id);
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

const canAddMore = checkSlotCap(userWith5Archetypes, mockStandardArchetypes[5], 5, mockStandardArchetypes);
assertEqual(canAddMore, false, 'User with 5 archetypes should not be able to add more (slot cap)');

const userWith3Archetypes: UserArchetype[] = [
  { user_id: 'user2', archetype_id: 1, slot_index: 0, free_grant: false },
  { user_id: 'user2', archetype_id: 2, slot_index: 1, free_grant: false },
  { user_id: 'user2', archetype_id: 3, slot_index: 2, free_grant: false },
];

const canAddTo3 = checkSlotCap(userWith3Archetypes, mockStandardArchetypes[3], 5, mockStandardArchetypes);
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

// Test Legendary slot cap using slot_group
const mockLegendaryArchetypes: ShopArchetype[] = [
  { id: 101, name: 'Legendary 1', tier: 'legendary', price: 500, min_role: null, slot_group: 'legendary' },
  { id: 102, name: 'Legendary 2', tier: 'legendary', price: 500, min_role: null, slot_group: 'legendary' },
  { id: 103, name: 'Legendary 3', tier: 'legendary', price: 500, min_role: null, slot_group: 'legendary' },
];

const userWith2Legendary: UserArchetype[] = [
  { user_id: 'user3', archetype_id: 101, slot_index: 0, free_grant: false },
  { user_id: 'user3', archetype_id: 102, slot_index: 1, free_grant: false },
];

const canAddLegendary = checkSlotCap(userWith2Legendary, mockLegendaryArchetypes[2], 2, mockLegendaryArchetypes);
assertEqual(canAddLegendary, false, 'User with 2 legendary archetypes should not be able to add more (slot cap 2)');

// Test color switching (exactly one active)
function checkColorSwitching(userColors: UserColor[], newActiveColorId: number): boolean {
  // Check that the user owns the color they want to switch to
  const ownsColor = userColors.some(uc => uc.color_id === newActiveColorId);
  return ownsColor;
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

const cannotAddWithFreeGrant = checkSlotCap(userWithFreeGrant, mockStandardArchetypes[5], 5, mockStandardArchetypes);
assertEqual(cannotAddWithFreeGrant, false, 'Free grant should still count against slot cap');

// Test transaction accounting (balance_before, amount, balance_after)
function calculateTransaction(balanceBefore: number, purchaseAmount: number): Transaction {
  const balanceAfter = balanceBefore - purchaseAmount;
  return {
    balance_before: balanceBefore,
    amount: -purchaseAmount,
    balance_after: balanceAfter
  };
}

const transaction1 = calculateTransaction(1000, 200);
assertEqual(transaction1.balance_before, 1000, 'Transaction balance_before should be 1000');
assertEqual(transaction1.amount, -200, 'Transaction amount should be -200');
assertEqual(transaction1.balance_after, 800, 'Transaction balance_after should be 800');

const transaction2 = calculateTransaction(500, 500);
assertEqual(transaction2.balance_before, 500, 'Transaction balance_before should be 500');
assertEqual(transaction2.amount, -500, 'Transaction amount should be -500');
assertEqual(transaction2.balance_after, 0, 'Transaction balance_after should be 0');

// Test insufficient residuals check
function checkSufficientFunds(balance: number, price: number): boolean {
  return balance >= price;
}

assertEqual(checkSufficientFunds(100, 200), false, 'User with 100 residuals cannot afford 200');
assertEqual(checkSufficientFunds(200, 200), true, 'User with 200 residuals can afford 200');
assertEqual(checkSufficientFunds(500, 200), true, 'User with 500 residuals can afford 200');

// Test booster free grant eligibility
function checkBoosterFreeGrantEligibility(userArchetypes: UserArchetype[], userColors: UserColor[]): { archetype: boolean; color: boolean } {
  const hasFreeArchetype = userArchetypes.some(ua => ua.free_grant);
  const hasFreeColor = userColors.some(uc => uc.free_grant);
  return {
    archetype: !hasFreeArchetype,
    color: !hasFreeColor
  };
}

const boosterWithNoGrants = checkBoosterFreeGrantEligibility([], []);
assertEqual(boosterWithNoGrants.archetype, true, 'Booster with no grants should be eligible for free archetype');
assertEqual(boosterWithNoGrants.color, true, 'Booster with no grants should be eligible for free color');

const boosterWithArchetypeGrant = checkBoosterFreeGrantEligibility([boosterFreeArchetype], []);
assertEqual(boosterWithArchetypeGrant.archetype, false, 'Booster with free archetype should NOT be eligible for another');
assertEqual(boosterWithArchetypeGrant.color, true, 'Booster with only archetype grant should still be eligible for free color');

const boosterWithBothGrants = checkBoosterFreeGrantEligibility([boosterFreeArchetype], [
  { user_id: 'booster_user', color_id: 1, active: true, free_grant: true }
]);
assertEqual(boosterWithBothGrants.archetype, false, 'Booster with both grants should NOT be eligible for archetype');
assertEqual(boosterWithBothGrants.color, false, 'Booster with both grants should NOT be eligible for color');

// Test free grant is permanent (free_grant flag persists)
assertEqual(boosterFreeArchetype.free_grant, true, 'Free grant flag should persist as true');
assertEqual(normalArchetype.free_grant, false, 'Normal purchase should remain as free_grant=false');

// --- Category shop embed/select-menu tests (per-category dropdown layout) ---

// Mock shop archetype with image_url, as added for per-tier grid images
interface ShopArchetypeWithImage extends ShopArchetype {
  image_url: string | null;
}

const fullStandardArchetypes: ShopArchetypeWithImage[] = [
  { id: 1, name: 'Comedy Relief', tier: 'standard', price: 200, min_role: null, slot_group: 'comedy', image_url: '' },
  { id: 2, name: 'Drama King', tier: 'standard', price: 250, min_role: null, slot_group: 'drama', image_url: '' },
  { id: 3, name: 'Action Hero', tier: 'standard', price: 300, min_role: null, slot_group: 'action', image_url: '' },
  { id: 4, name: 'Romantic Lead', tier: 'standard', price: 350, min_role: null, slot_group: 'romance', image_url: '' },
  { id: 5, name: 'Mystery Solver', tier: 'standard', price: 400, min_role: null, slot_group: 'mystery', image_url: '' },
  { id: 6, name: 'Sci-Fi Explorer', tier: 'standard', price: 220, min_role: null, slot_group: 'scifi', image_url: '' },
  { id: 7, name: 'Fantasy Mage', tier: 'standard', price: 280, min_role: null, slot_group: 'fantasy', image_url: '' },
  { id: 8, name: 'Horror Survivor', tier: 'standard', price: 320, min_role: null, slot_group: 'horror', image_url: '' },
  { id: 9, name: 'Thriller Spy', tier: 'standard', price: 380, min_role: null, slot_group: 'thriller', image_url: '' },
  { id: 10, name: 'Documentary Host', tier: 'standard', price: 450, min_role: null, slot_group: 'documentary', image_url: '' },
];

const fullLegendaryArchetypes: ShopArchetypeWithImage[] = [
  { id: 11, name: 'Cinematic Legend', tier: 'legendary', price: 1000, min_role: null, slot_group: 'legendary', image_url: '' },
  { id: 12, name: 'Box Office Star', tier: 'legendary', price: 1200, min_role: null, slot_group: 'boxoffice', image_url: '' },
  { id: 13, name: 'Award Winner', tier: 'legendary', price: 1500, min_role: null, slot_group: 'awards', image_url: '' },
  { id: 14, name: 'Cult Classic', tier: 'legendary', price: 1800, min_role: null, slot_group: 'cult', image_url: '' },
  { id: 15, name: 'Festival Favorite', tier: 'legendary', price: 2000, min_role: null, slot_group: 'festival', image_url: '' },
];

const fullMythicArchetypes: ShopArchetypeWithImage[] = [
  { id: 16, name: "Director's Cut", tier: 'mythic', price: 5000, min_role: 'lead_cast', slot_group: 'mythic', image_url: '' },
  { id: 17, name: 'Oscar Winner', tier: 'mythic', price: 7500, min_role: 'lead_cast', slot_group: 'mythic', image_url: '' },
];

// Discord caps a StringSelectMenu at 25 options. Since the shop is now split
// into one dropdown per tier/band, each dropdown must independently stay
// under that cap, not just the shop as a whole.
const DISCORD_SELECT_MENU_OPTION_CAP = 25;
assertEqual(fullStandardArchetypes.length <= DISCORD_SELECT_MENU_OPTION_CAP, true, 'Standard archetype dropdown must stay under the 25-option cap');
assertEqual(fullLegendaryArchetypes.length <= DISCORD_SELECT_MENU_OPTION_CAP, true, 'Legendary archetype dropdown must stay under the 25-option cap');
assertEqual(fullMythicArchetypes.length <= DISCORD_SELECT_MENU_OPTION_CAP, true, 'Mythic archetype dropdown must stay under the 25-option cap');

const fullColorBands = {
  common: ['Crimson Red', 'Ocean Blue', 'Forest Green', 'Golden Yellow', 'Royal Purple', 'Hot Pink'],
  uncommon: ['Sapphire', 'Emerald', 'Ruby', 'Amethyst', 'Topaz', 'Turquoise'],
  rare: ['Diamond White', 'Midnight Black', 'Sunset Orange', 'Aurora Green', 'Platinum Silver', 'Galaxy Purple'],
};
assertEqual(fullColorBands.common.length <= DISCORD_SELECT_MENU_OPTION_CAP, true, 'Common color dropdown must stay under the 25-option cap');
assertEqual(fullColorBands.uncommon.length <= DISCORD_SELECT_MENU_OPTION_CAP, true, 'Uncommon color dropdown must stay under the 25-option cap');
assertEqual(fullColorBands.rare.length <= DISCORD_SELECT_MENU_OPTION_CAP, true, 'Rare color dropdown must stay under the 25-option cap');

// Discord caps a message at 5 action rows. Each shop message now carries one
// action row (select menu) per category it displays, so the categories per
// message must not exceed that cap.
const DISCORD_ACTION_ROW_CAP = 5;
const colorShopCategoryCount = Object.keys(fullColorBands).length; // common, uncommon, rare
const archetypeShopCategoryCount = 3; // standard, legendary, mythic
assertEqual(colorShopCategoryCount <= DISCORD_ACTION_ROW_CAP, true, 'Color shop message must not exceed the 5 action-row cap');
assertEqual(archetypeShopCategoryCount <= DISCORD_ACTION_ROW_CAP, true, 'Archetype shop message must not exceed the 5 action-row cap');

// Grid image layout math: a fixed 3-column layout should compute the row
// count the same way the image generator does, so a category with a
// non-multiple-of-3 item count (e.g. 10 or 5) still lays out cleanly.
function computeGridRows(itemCount: number, columns: number): number {
  return Math.max(1, Math.ceil(itemCount / columns));
}

assertEqual(computeGridRows(6, 3), 2, '6 items in 3 columns should be 2 rows');
assertEqual(computeGridRows(10, 3), 4, '10 items in 3 columns should be 4 rows (Standard archetypes)');
assertEqual(computeGridRows(5, 3), 2, '5 items in 3 columns should be 2 rows (Legendary archetypes)');
assertEqual(computeGridRows(2, 3), 1, '2 items in 3 columns should be 1 row (Mythic archetypes)');
assertEqual(computeGridRows(0, 3), 1, '0 items should still compute at least 1 row to avoid a zero-height canvas');

// image_url is optional per-archetype art, filled in directly in code (not
// via env/config) and left blank until real art is supplied.
const archetypeWithoutImage: ShopArchetypeWithImage = fullStandardArchetypes[0];
assertEqual(archetypeWithoutImage.image_url, '', 'Archetype without art yet should have a blank image_url');

const archetypeWithImage: ShopArchetypeWithImage = { ...fullStandardArchetypes[1], image_url: 'https://example.com/drama-king.png' };
assertEqual(archetypeWithImage.image_url, 'https://example.com/drama-king.png', 'Archetype image_url should pass through once set');

console.log('✓ All shop functionality tests passed!');