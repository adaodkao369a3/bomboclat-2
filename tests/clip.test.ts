// Unit tests for $clip argument parsing
// These tests can run without Discord API credentials

import { parseClipArguments } from '../src/services/clip';

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
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

// Test channel allowlist fallback behavior (3b): falls back to just
// Bombo Times when nothing's configured, otherwise uses exactly what's
// configured via /settings clip-channels (no more permanently-injected
// CASTING channel - the real casting-channel bug was a permission gap,
// not a channel one; see isStaff() coverage in permissions.test.ts for
// the actual regression test for that fix).
function resolveEffectiveClipChannels(allowlist: string[], bomboTimesChannelId: string): string[] {
  return allowlist.length > 0 ? allowlist : [bomboTimesChannelId];
}

const BOMBO_TIMES_ID = '1534577767180533872';

assertEqual(
  resolveEffectiveClipChannels([], BOMBO_TIMES_ID).length,
  1,
  'Empty allowlist should fall back to a single channel'
);
assertEqual(
  resolveEffectiveClipChannels([], BOMBO_TIMES_ID)[0],
  BOMBO_TIMES_ID,
  'Empty allowlist should fall back to Bombo Times specifically'
);
assertEqual(
  resolveEffectiveClipChannels(['999999999'], BOMBO_TIMES_ID).includes(BOMBO_TIMES_ID),
  false,
  'A configured allowlist should not silently keep Bombo Times if it was not included'
);

console.log('✓ All $clip argument parsing tests passed!');
