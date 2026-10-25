/**
 * Persistent shop/manage interactions: IDs must be stable, fit Discord's
 * 100-char limit, and no shop/manage code may use in-memory collectors.
 */
import * as fs from 'fs';
import * as path from 'path';

let failed = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}

const root = path.resolve(__dirname, '..', '..');
const read = (p: string): string => fs.readFileSync(path.join(root, p), 'utf8');

for (const file of ['src/commands/shop.ts', 'src/commands/updateShop.ts', 'src/commands/manage.ts', 'src/interactions/handlers/shop.ts', 'src/interactions/handlers/manage.ts']) {
  const src = read(file);
  check(`${file}: no in-memory collectors`, !/createMessageComponentCollector|awaitMessageComponent/.test(src));
}

check('shop.ts and updateShop.ts use the same pick IDs',
  ['src/commands/shop.ts', 'src/commands/updateShop.ts'].every(f => {
    const s = read(f);
    return s.includes('shop:pickcolor:') && s.includes('shop:pickpersona:') && !s.includes('shop_select');
  }));

check('commands import the handlers (so they register)',
  read('src/commands/shop.ts').includes("handlers/shop.js") && read('src/commands/manage.ts').includes("handlers/manage.js"));

// Longest IDs with a max-length (19 digit) Discord user ID
const uid = '1'.repeat(19);
const ids = [
  `shop:pickpersona:High-status:0`,
  `shop:buypersona:${uid}:99999`,
  `shop:equipcolor:${uid}:99999`,
  `manage:sellpersona:${uid}`,
];
check('fixed IDs fit in 100 chars', ids.every(i => i.length <= 100));

// The sell-confirm ID is capped by maxSellPerBatch's formula
const budget = 100 - `manage:sellconfirm:${uid}:`.length;
for (const width of [1, 2, 3, 4, 5]) {
  const n = Math.max(1, Math.min(25, Math.floor((budget + 1) / (width + 1))));
  const id = `manage:sellconfirm:${uid}:${Array(n).fill('9'.repeat(width)).join(',')}`;
  check(`sell-confirm ID fits for ${width}-digit color IDs (${n} per batch)`, id.length <= 100);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll persistent shop checks passed');
