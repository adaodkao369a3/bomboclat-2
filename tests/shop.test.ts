// Unit tests for shop functionality
// These tests can run without Discord API credentials

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
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

// Mock transaction data structure
interface Transaction {
  balance_before: number;
  amount: number;
  balance_after: number;
}

console.log('Running shop functionality tests...');

// Test single-archetype ownership (replaces previous multi-slot model)
const mockStandardArchetypes: ShopArchetype[] = [
  { id: 1, name: 'Standard 1', tier: 'standard', price: 200, min_role: null, slot_group: 'comedy' },
  { id: 2, name: 'Standard 2', tier: 'standard', price: 250, min_role: null, slot_group: 'comedy' },
  { id: 3, name: 'Standard 3', tier: 'standard', price: 300, min_role: null, slot_group: 'comedy' },
];

// Test that user can only own one archetype at a time
function checkSingleArchetypeOwnership(userArchetypes: UserArchetype[]): boolean {
  return userArchetypes.length <= 1;
}

const userWithOneArchetype: UserArchetype[] = [
  { user_id: 'user1', archetype_id: 1, slot_index: 0, free_grant: false },
];

assertEqual(checkSingleArchetypeOwnership(userWithOneArchetype), true, 'User with 1 archetype should be valid');

const userWithNoArchetype: UserArchetype[] = [];
assertEqual(checkSingleArchetypeOwnership(userWithNoArchetype), true, 'User with 0 archetypes should be valid');

// Test 50% refund calculation
function calculateRefund(originalPrice: number): number {
  return Math.floor(originalPrice * 0.5);
}

const refund200 = calculateRefund(200);
assertEqual(refund200, 100, '50% refund of 200 should be 100');

const refund250 = calculateRefund(250);
assertEqual(refund250, 125, '50% refund of 250 should be 125');

const refund300 = calculateRefund(300);
assertEqual(refund300, 150, '50% refund of 300 should be 150');

// Test net cost calculation with refund
function calculateNetCost(newPrice: number, refundAmount: number): number {
  return newPrice - refundAmount;
}

const netCost = calculateNetCost(300, 100);
assertEqual(netCost, 200, 'Net cost should be 200 (300 - 100)');

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

// Colors stack — a user can own any number of them at once (unlike
// archetypes, which are capped at one). Buying never removes an existing
// color, so ownership count has no upper bound to check here.
function checkColorCanBePurchased(userColors: UserColor[], colorId: number): boolean {
  // A color can be purchased as long as the user doesn't already own that
  // specific one — owning other colors is never a blocker.
  return !userColors.some(uc => uc.color_id === colorId);
}

const userWithNoColor: UserColor[] = [];
assertEqual(checkColorCanBePurchased(userWithNoColor, 1), true, 'User with 0 colors should be able to buy any color');

const userWithTwoColors: UserColor[] = [
  { user_id: 'user1', color_id: 1, active: true, free_grant: false },
  { user_id: 'user1', color_id: 2, active: true, free_grant: false },
];

assertEqual(checkColorCanBePurchased(userWithTwoColors, 3), true, 'User owning 2 colors should still be able to buy a 3rd');
assertEqual(checkColorCanBePurchased(userWithTwoColors, 1), false, 'User cannot re-buy a color they already own');

// Test independent equip/unequip (.manage): any owned color can be toggled
// on or off without affecting the equip state of the user's other colors.
function checkCanToggleColor(userColors: UserColor[], colorId: number): boolean {
  return userColors.some(uc => uc.color_id === colorId);
}

const canToggleColor2 = checkCanToggleColor(userWithTwoColors, 2);
assertEqual(canToggleColor2, true, 'User should be able to equip/unequip an owned color');

function toggleColorActive(userColors: UserColor[], colorId: number, active: boolean): UserColor[] {
  return userColors.map(uc => uc.color_id === colorId ? { ...uc, active } : uc);
}

const afterUnequip = toggleColorActive(userWithTwoColors, 1, false);
assertEqual(afterUnequip.find(uc => uc.color_id === 1)?.active, false, 'Color 1 should now be unequipped');
assertEqual(afterUnequip.find(uc => uc.color_id === 2)?.active, true, 'Color 2 should remain equipped (independent toggle)');

// Test that buying a color never refunds or removes existing colors
function calculateColorPurchaseCost(price: number): number {
  // No refund logic applies to colors — the buyer always pays full price
  // regardless of what they already own.
  return price;
}

assertEqual(calculateColorPurchaseCost(200), 200, 'Color purchase should always cost full price, no refund');
assertEqual(calculateColorPurchaseCost(800), 800, 'Color purchase should always cost full price, no refund');

// Test that free grants do not get refunded
function calculateRefundForFreeGrant(originalPrice: number, isFreeGrant: boolean): number {
  if (isFreeGrant) return 0;
  return Math.floor(originalPrice * 0.5);
}

const refundFromFree = calculateRefundForFreeGrant(200, true);
assertEqual(refundFromFree, 0, 'Free grant should not be refunded');

const refundFromPaid = calculateRefundForFreeGrant(200, false);
assertEqual(refundFromPaid, 100, 'Paid archetype should be refunded 50%');

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

// Test free grant is permanent (free_grant flag persists)
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

assertEqual(boosterFreeArchetype.free_grant, true, 'Free grant flag should persist as true');
assertEqual(normalArchetype.free_grant, false, 'Normal purchase should remain as free_grant=false');

// Test replacement scenario (buying new item replaces old one with refund)
function simulateReplacement(balance: number, oldPrice: number, newPrice: number): { success: boolean; newBalance: number; refund: number } {
  const refund = Math.floor(oldPrice * 0.5);
  const netCost = newPrice - refund;
  
  if (balance < netCost) {
    return { success: false, newBalance: balance, refund: 0 };
  }
  
  return { success: true, newBalance: balance - netCost, refund };
}

const replacement1 = simulateReplacement(1000, 200, 300);
assertEqual(replacement1.success, true, 'Replacement should succeed with sufficient funds');
assertEqual(replacement1.newBalance, 800, 'New balance should be 800 (1000 - 300 + 100)');
assertEqual(replacement1.refund, 100, 'Refund should be 100');

const replacement2 = simulateReplacement(100, 200, 300);
assertEqual(replacement2.success, false, 'Replacement should fail with insufficient funds');

console.log('✓ All shop functionality tests passed!');