"use strict";
// Unit tests for $clip argument parsing
// These tests can run without Discord API credentials
Object.defineProperty(exports, "__esModule", { value: true });
const clip_1 = require("../src/services/clip");
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}
console.log('Running $clip argument parsing tests...');
const result1 = (0, clip_1.parseClipArguments)([]);
assertEqual(result1.style, 'anime', 'No arguments should default to anime style');
assertEqual(result1.directorsNote, '', 'No arguments should have empty note');
const cases = [
    { args: ['anime'], style: 'anime', note: '' },
    { args: ['jojos'], style: 'jojos', note: '' },
    { args: ['ghibli'], style: 'ghibli', note: '' },
    { args: ['jjk'], style: 'jjk', note: '' },
    { args: ['JOJOS', 'hello', 'world'], style: 'jojos', note: 'hello world' },
    { args: ['hello', 'world'], style: 'anime', note: 'hello world' },
];
for (const testCase of cases) {
    const result = (0, clip_1.parseClipArguments)(testCase.args);
    assertEqual(result.style, testCase.style, `${testCase.args.join(' ')} should select the expected style`);
    assertEqual(result.directorsNote, testCase.note, `${testCase.args.join(' ')} should preserve the expected note`);
}
console.log('✓ All $clip argument parsing tests passed!');
//# sourceMappingURL=clip.test.js.map