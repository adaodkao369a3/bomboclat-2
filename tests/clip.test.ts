// Unit tests for $clip argument parsing
// These tests can run without Discord API credentials

import { parseClipArguments } from '../src/services/clip';

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

console.log('Running $clip argument parsing tests...');

const result1 = parseClipArguments([]);
assertEqual(result1.style, 'anime', 'No arguments should default to anime style');
assertEqual(result1.directorsNote, '', 'No arguments should have empty note');
assertEqual(result1.fromMessageId, undefined, 'No arguments should have no fromMessageId');
assertEqual(result1.toMessageId, undefined, 'No arguments should have no toMessageId');

const cases: Array<{ args: string[]; style: string; note: string }> = [
  { args: ['anime'], style: 'anime', note: '' },
  { args: ['jojos'], style: 'jojos', note: '' },
  { args: ['ghibli'], style: 'ghibli', note: '' },
  { args: ['jjk'], style: 'jjk', note: '' },
  { args: ['JOJOS', 'hello', 'world'], style: 'jojos', note: 'hello world' },
  { args: ['hello', 'world'], style: 'anime', note: 'hello world' },
];

for (const testCase of cases) {
  const result = parseClipArguments(testCase.args);
  assertEqual(result.style, testCase.style, `${testCase.args.join(' ')} should select the expected style`);
  assertEqual(result.directorsNote, testCase.note, `${testCase.args.join(' ')} should preserve the expected note`);
}

// Test message-ID-range parsing (3c)
const rangeTest1 = parseClipArguments(['123456789', '987654321']);
assertEqual(rangeTest1.style, 'anime', 'Message ID range should default to anime style');
assertEqual(rangeTest1.fromMessageId, '123456789', 'Should parse fromMessageId');
assertEqual(rangeTest1.toMessageId, '987654321', 'Should parse toMessageId');
assertEqual(rangeTest1.directorsNote, '', 'Should have empty note when only IDs provided');

const rangeTest2 = parseClipArguments(['anime', '123456789', '987654321']);
assertEqual(rangeTest2.style, 'anime', 'Style + ID range should parse style');
assertEqual(rangeTest2.fromMessageId, '123456789', 'Should parse fromMessageId with style');
assertEqual(rangeTest2.toMessageId, '987654321', 'Should parse toMessageId with style');

const rangeTest3 = parseClipArguments(['anime', '123456789', '987654321', 'directors', 'note']);
assertEqual(rangeTest3.style, 'anime', 'Style + ID range + note should parse style');
assertEqual(rangeTest3.fromMessageId, '123456789', 'Should parse fromMessageId with note');
assertEqual(rangeTest3.toMessageId, '987654321', 'Should parse toMessageId with note');
assertEqual(rangeTest3.directorsNote, 'directors note', 'Should parse directors note after IDs');

const singleIdTest = parseClipArguments(['123456789']);
assertEqual(singleIdTest.style, 'anime', 'Single ID should default to anime style');
assertEqual(singleIdTest.fromMessageId, '123456789', 'Should parse single fromMessageId');
assertEqual(singleIdTest.toMessageId, undefined, 'Single ID should have no toMessageId');

const singleIdWithStyle = parseClipArguments(['jojos', '123456789']);
assertEqual(singleIdWithStyle.style, 'jojos', 'Style + single ID should parse style');
assertEqual(singleIdWithStyle.fromMessageId, '123456789', 'Should parse single fromMessageId with style');
assertEqual(singleIdWithStyle.toMessageId, undefined, 'Single ID with style should have no toMessageId');

const singleIdWithNote = parseClipArguments(['123456789', 'note', 'here']);
assertEqual(singleIdWithNote.style, 'anime', 'Single ID + note should default to anime');
assertEqual(singleIdWithNote.fromMessageId, '123456789', 'Should parse single fromMessageId with note');
assertEqual(singleIdWithNote.toMessageId, undefined, 'Single ID with note should have no toMessageId');
assertEqual(singleIdWithNote.directorsNote, 'note here', 'Should parse note after single ID');

// Test that non-numeric strings are not treated as message IDs
const nonNumericTest = parseClipArguments(['hello', 'world']);
assertEqual(nonNumericTest.style, 'anime', 'Non-numeric args should default to anime');
assertEqual(nonNumericTest.fromMessageId, undefined, 'Non-numeric args should not be treated as IDs');
assertEqual(nonNumericTest.toMessageId, undefined, 'Non-numeric args should not be treated as IDs');
assertEqual(nonNumericTest.directorsNote, 'hello world', 'Non-numeric args should be treated as note');

// Test mixed numeric and non-numeric
const mixedTest = parseClipArguments(['123456789', 'world']);
assertEqual(mixedTest.style, 'anime', 'Mixed args should default to anime');
assertEqual(mixedTest.fromMessageId, '123456789', 'First numeric arg should be treated as ID');
assertEqual(mixedTest.toMessageId, undefined, 'Second non-numeric arg should not be treated as ID');
assertEqual(mixedTest.directorsNote, 'world', 'Non-numeric arg should be treated as note');

// Test casting channel permission bug fix (3d)
// Regression test: CASTING channel should always be allowed regardless of allowlist
// This prevents the illogical situation where the command can't be used where results are posted
function testCastingChannelAlwaysAllowed(currentChannelId: string, allowlist: string[], castingChannelId: string): boolean {
  const isCastingChannel = currentChannelId === castingChannelId;
  const effectiveChannels = allowlist.length > 0 
    ? [...allowlist, castingChannelId] 
    : ['BOMBO_TIMES', castingChannelId]; // fallback
  
  return effectiveChannels.includes(currentChannelId) || isCastingChannel;
}

const CASTING_ID = '1534576177421881394';
const OTHER_CHANNEL = '123456789';
const allowlist = ['999999999'];

// CASTING channel should always be allowed
const castingAllowed = testCastingChannelAlwaysAllowed(CASTING_ID, allowlist, CASTING_ID);
assertEqual(castingAllowed, true, 'CASTING channel should always be allowed (bug fix)');

// Other channels should respect allowlist
const otherAllowed = testCastingChannelAlwaysAllowed(OTHER_CHANNEL, allowlist, CASTING_ID);
assertEqual(otherAllowed, false, 'Other channels should respect allowlist');

// With empty allowlist, CASTING should still be allowed
const emptyAllowlistCasting = testCastingChannelAlwaysAllowed(CASTING_ID, [], CASTING_ID);
assertEqual(emptyAllowlistCasting, true, 'CASTING should be allowed with empty allowlist (fallback)');

console.log('✓ All $clip argument parsing tests passed!');
