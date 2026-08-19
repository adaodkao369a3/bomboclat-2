"use strict";
// Unit tests for $clip argument parsing
// These tests can run without Discord API credentials
const ART_STYLES = ['anime', 'jojos', 'ghibli', 'jjk'];
function parseClipArguments(args) {
    let style = 'anime';
    let directorsNote = '';
    if (args.length > 0) {
        const firstArg = args[0].toLowerCase();
        if (ART_STYLES.includes(firstArg)) {
            style = firstArg;
            directorsNote = args.slice(1).join(' ');
        }
        else {
            directorsNote = args.join(' ');
        }
    }
    return { style, directorsNote };
}
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}
console.log('Running $clip argument parsing tests...');
// Test 1: No arguments
const result1 = parseClipArguments([]);
assertEqual(result1.style, 'anime', 'No arguments should default to anime style');
assertEqual(result1.directorsNote, '', 'No arguments should have empty note');
// Test 2: Recognized style only
const result2 = parseClipArguments(['anime']);
assertEqual(result2.style, 'anime', 'anime should be recognized');
assertEqual(result2.directorsNote, '', 'Style only should have empty note');
// Test 3: Recognized style with note
const result3 = parseClipArguments(['jojos', 'some', 'director', 'note']);
assertEqual(result3.style, 'jojos', 'jojos should be recognized');
assertEqual(result3.directorsNote, 'some director note', 'Note should be everything after style');
// Test 4: Unrecognized first argument becomes note
const result4 = parseClipArguments(['arbitrary', 'note']);
assertEqual(result4.style, 'anime', 'Unrecognized first arg should default to anime');
assertEqual(result4.directorsNote, 'arbitrary note', 'Entire argument becomes note');
// Test 5: All four styles
for (const style of ART_STYLES) {
    const result = parseClipArguments([style]);
    assertEqual(result.style, style, `${style} should be recognized`);
}
console.log('✓ All $clip argument parsing tests passed!');
//# sourceMappingURL=clip.test.js.map