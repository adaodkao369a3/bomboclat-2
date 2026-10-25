import { ROLE_GIF_COMMANDS } from '../src/config/roleGifCommands.js';
import { GIF_COMMANDS } from '../src/config/index.js';

console.log('Running role GIF command tests...');

// Test 1: Check for duplicate command names within role GIF commands
const roleGifNames = ROLE_GIF_COMMANDS.map(cmd => cmd.name);
const duplicateRoleGifNames = roleGifNames.filter((name, index) => roleGifNames.indexOf(name) !== index);

if (duplicateRoleGifNames.length > 0) {
  console.error(`❌ Test 1 failed: Duplicate role GIF command names found: ${duplicateRoleGifNames.join(', ')}`);
  process.exit(1);
} else {
  console.log('✓ Test 1 passed: No duplicate role GIF command names');
}

// Test 2: Check for clashes with existing GIF commands
const existingGifNames = Object.keys(GIF_COMMANDS);
const clashingNames = roleGifNames.filter(name => existingGifNames.includes(name));

if (clashingNames.length > 0) {
  console.error(`❌ Test 2 failed: Role GIF commands clash with existing GIF commands: ${clashingNames.join(', ')}`);
  process.exit(1);
} else {
  console.log('✓ Test 2 passed: No clashes with existing GIF commands');
}

// Test 3: Check that Unknown Entity has no commands (it has special powers in Part 6)
const unknownEntityCommands = ROLE_GIF_COMMANDS.filter(cmd => cmd.persona === 'unknown-entity');

if (unknownEntityCommands.length > 0) {
  console.error(`❌ Test 3 failed: Unknown Entity should have no GIF commands (it has special powers in Part 6)`);
  process.exit(1);
} else {
  console.log('✓ Test 3 passed: Unknown Entity has no GIF commands');
}

// Test 4: Check that each role has at most 5 commands
const commandsByRole: Record<string, number> = {};
for (const cmd of ROLE_GIF_COMMANDS) {
  commandsByRole[cmd.persona] = (commandsByRole[cmd.persona] || 0) + 1;
}

const rolesWithTooManyCommands = Object.entries(commandsByRole)
  .filter(([_, count]) => count > 5)
  .map(([role, count]) => `${role} (${count} commands)`);

if (rolesWithTooManyCommands.length > 0) {
  console.error(`❌ Test 4 failed: Roles with more than 5 commands: ${rolesWithTooManyCommands.join(', ')}`);
  process.exit(1);
} else {
  console.log('✓ Test 4 passed: All roles have at most 5 commands');
}

// Test 5: Verify all commands have required fields
const invalidCommands = ROLE_GIF_COMMANDS.filter(cmd => !cmd.persona || !cmd.name || !cmd.query || !cmd.caption);

if (invalidCommands.length > 0) {
  console.error(`❌ Test 5 failed: Commands missing required fields: ${invalidCommands.map(c => c.name).join(', ')}`);
  process.exit(1);
} else {
  console.log('✓ Test 5 passed: All commands have required fields');
}

// Test 6: Verify all queries are SFW (no explicit terms)
const explicitTerms = ['nsfw', 'porn', 'hentai', 'sex', 'nude', 'xxx'];
const explicitCommands = ROLE_GIF_COMMANDS.filter(cmd =>
  explicitTerms.some(term => cmd.query.toLowerCase().includes(term) || cmd.caption.toLowerCase().includes(term))
);

if (explicitCommands.length > 0) {
  console.error(`❌ Test 6 failed: Commands with potentially explicit terms: ${explicitCommands.map(c => c.name).join(', ')}`);
  process.exit(1);
} else {
  console.log('✓ Test 6 passed: All queries appear to be SFW');
}

// Test 7: CEO of Sex commands must be non-explicit meme-style
const ceoCommands = ROLE_GIF_COMMANDS.filter(cmd => cmd.persona === 'ceo-of-sex');
const memeTerms = ['boss', 'money', 'business', 'flex', 'deal', 'exec', 'contract'];
const nonMemeCeoCommands = ceoCommands.filter(cmd =>
  !memeTerms.some(term => cmd.query.toLowerCase().includes(term))
);

if (nonMemeCeoCommands.length > 0) {
  console.error(`❌ Test 7 failed: CEO of Sex commands that are not meme-style: ${nonMemeCeoCommands.map(c => c.name).join(', ')}`);
  process.exit(1);
} else {
  console.log('✓ Test 7 passed: CEO of Sex commands are meme-style');
}

console.log('\n✓ All role GIF command tests passed!');

// Test: every role GIF command belongs to a real persona, and each persona
// (except Unknown Entity) has exactly 5 commands
import { PERSONAS_CONFIG } from '../src/config/archetypes.js';
const personaNames = PERSONAS_CONFIG.map(p => p.key);
const orphaned = ROLE_GIF_COMMANDS.filter(c => !personaNames.includes(c.persona)).map(c => `${c.persona}:${c.name}`);
if (orphaned.length > 0) {
  console.error(`❌ Role GIF commands reference unknown personas: ${orphaned.join(', ')}`);
  process.exit(1);
}
const wrongCount = personaNames
  .filter(n => n !== 'unknown-entity')
  .filter(n => ROLE_GIF_COMMANDS.filter(c => c.persona === n).length !== 5);
if (wrongCount.length > 0) {
  console.error(`❌ Personas without exactly 5 GIF commands: ${wrongCount.join(', ')}`);
  process.exit(1);
}
console.log('✓ Every role GIF command maps to a real persona (5 each)');
