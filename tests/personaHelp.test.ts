import assert from 'assert';
import { PERSONAS_CONFIG, PERSONA_KEYS } from '../src/config/archetypes.js';
import { EMOJIS } from '../src/config/index.js';
import { getAvailableCommands, getPersonaCommandGroups } from '../src/commands/registry.js';
import { buildPersonaPage, getPersonaPageCount, clampPersonaPage } from '../src/commands/help.js';

console.log('Running persona help tests...');

// Keys are permanent, unique, and every persona has one
const keys = PERSONAS_CONFIG.map(p => p.key);
assert.strictEqual(new Set(keys).size, keys.length, 'persona keys must be unique');
assert.ok(keys.every(k => /^[a-z0-9-]+$/.test(k)), 'persona keys must be lowercase slugs');
console.log('✓ Persona keys are unique slugs');

// Groups: low → high tier, all 20 personas present
const groups = getPersonaCommandGroups();
assert.strictEqual(groups.length, PERSONAS_CONFIG.length);
assert.strictEqual(groups[0].tier, 'High-status');
assert.strictEqual(groups[groups.length - 1].tier, 'Special');
console.log('✓ Persona help is ordered low → high tier');

// Pagination: every persona appears on exactly one page, pages fit in an embed
const pageCount = getPersonaPageCount();
assert.strictEqual(pageCount, Math.ceil(PERSONAS_CONFIG.length / 4));
const seen: string[] = [];
for (let p = 0; p < pageCount; p++) {
  const { embed, rows } = buildPersonaPage(p, [], '123');
  const description = embed.data.description ?? '';
  assert.ok(description.length < 4000, `page ${p} too long (${description.length})`);
  assert.ok(!description.includes('`'), 'no backticks in persona help');
  for (const g of groups) if (description.includes(`__${g.name}__`)) seen.push(g.key);
  assert.strictEqual(rows.length, 2);
}
assert.strictEqual(seen.length, groups.length, 'each persona on exactly one page');
assert.strictEqual(new Set(seen).size, groups.length);
console.log(`✓ ${pageCount} persona pages, each persona on exactly one page`);

// Page boundaries
assert.strictEqual(clampPersonaPage(-3, pageCount), 0);
assert.strictEqual(clampPersonaPage(999, pageCount), pageCount - 1);
assert.strictEqual(clampPersonaPage(NaN, pageCount), 0);
const first = buildPersonaPage(0, [], '1').rows[0].components.map((c: any) => c.data.disabled);
const last = buildPersonaPage(pageCount - 1, [], '1').rows[0].components.map((c: any) => c.data.disabled);
assert.deepStrictEqual(first, [true, true, true, false, false]);
assert.deepStrictEqual(last, [false, false, true, true, true]);
console.log('✓ Pagination boundaries (first/last page buttons disabled)');

// Ownership shown
const owned = buildPersonaPage(0, [groups[0].key], '1').embed.data.description ?? '';
assert.ok(owned.includes(`${EMOJIS.GREEN_GLOSSY_TICK} owned`));
console.log('✓ Owned personas are marked');

// Commands available by persona key (profile Commands button uses this)
const viltrumCmds = getAvailableCommands(10, ['viltrumites']).map(c => c.name);
assert.ok(viltrumCmds.includes('viltrum'));
assert.ok(!getAvailableCommands(10, []).map(c => c.name).includes('viltrum'));
assert.ok(!getAvailableCommands(10, ['the-comedian']).map(c => c.name).includes('viltrum'));
const ue = getAvailableCommands(100, [PERSONA_KEYS.UNKNOWN_ENTITY]).map(c => c.name);
assert.ok(ue.some(n => n.startsWith('perish')) && ue.some(n => n.startsWith('transform')));
console.log('✓ Persona commands appear only for owners (by persona key)');

console.log('✓ All persona help tests passed!');
