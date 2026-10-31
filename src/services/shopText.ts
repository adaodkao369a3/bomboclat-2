/**
 * Shared shop wording so $shop, $updateshop and the buy buttons always say the
 * same thing. Everything about levels and prices is built from the config, so
 * the shop text can never go stale when a number changes.
 */
import { EMOJIS } from '../config/index.js';
import { COLORS_CONFIG, COLOR_TIERS } from '../config/colors.js';
import { PERSONAS_CONFIG, PERSONA_TIERS, PERSONA_TIER_ORDER } from '../config/archetypes.js';

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

/** 1500 -> "1,500" */
export function formatAmount(n: number): string {
  return n.toLocaleString('en-US');
}

/** [100, 250, 400] -> "100-400", [900, 900] -> "900" */
export function priceRange(prices: number[]): string {
  if (prices.length === 0) return '';
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? formatAmount(low) : `${formatAmount(low)}-${formatAmount(high)}`;
}

/** The lowest unlock level in a group, plus any item that needs more. */
function levelText(items: { name?: string; min_level: number }[]): string {
  const base = Math.min(...items.map(i => i.min_level));
  const higher = items.filter(i => i.min_level > base && i.name);
  const extra = higher.map(i => `${i.name!.toLowerCase()} at level ${i.min_level}`).join(', ');
  return `Level ${base}${extra ? `, ${extra}` : ''}`;
}

// ---------------------------------------------------------------------------
// Colors shop (film-set voice)
// ---------------------------------------------------------------------------

/** One-line vibe per color tier. Add a line here when a new tier is created. */
export const COLOR_TIER_VIBES: Record<string, string> = {
  [COLOR_TIERS.STUDIO_CLASSICS]: 'Soft pastels, easy on the eyes',
  [COLOR_TIERS.MIDNIGHT_CINEMA]: 'Dark, moody, a little dangerous',
  [COLOR_TIERS.NEON_LIGHTS]: 'Loud, glowing, impossible to miss',
  [COLOR_TIERS.AWARD_SEASON]: 'Gold-star prestige, the top shelf',
};

export const COLORS_INTRO_TITLE = `${EMOJIS.PALETTE} NOW CASTING: COLORS ${EMOJIS.SPARKLES}`;
/** Title the intro used before the film-set rewrite, so the old post is found and edited instead of duplicated. */
export const COLORS_INTRO_OLD_TITLE = '<:palette:1545852130517319812> Colors Shop';

/** Intro description. Levels and price ranges come straight from COLORS_CONFIG. */
export function colorsIntroDescription(): string {
  const lines: string[] = [];
  for (const tier of Object.values(COLOR_TIERS)) {
    const items = COLORS_CONFIG.filter(c => c.tier === tier);
    if (items.length === 0) continue;
    const level = Math.min(...items.map(i => i.minLevel));
    const vibe = COLOR_TIER_VIBES[tier];
    lines.push(
      `${EMOJIS.RIGHT_ARROW} **${tier.toUpperCase()}** · **Level ${level}**\n` +
        `-# ${vibe ? `${vibe} · ` : ''}${EMOJIS.MONEY} **${priceRange(items.map(i => i.price))}**`,
    );
  }

  return (
    'Every star needs a signature look. Collect colors and wear them on your name.\n\n' +
    `${lines.join('\n')}\n\n` +
    `-# ${EMOJIS.PUSH_PIN} Pick a tier below to see the lineup.`
  );
}

/** Shared layout of a tier post: vibe, unlock level and price, then what to do. */
function tierDescription(
  vibe: string | undefined,
  items: { name: string; price: number; min_level: number }[],
  pickText: string,
): string {
  const prices = items.map(i => i.price);
  const priceText = new Set(prices).size === 1 ? `${formatAmount(prices[0])} each` : priceRange(prices);
  return (
    (vibe ? `${vibe}.\n` : '') +
    `-# ${EMOJIS.LOCK} Unlocks at **${levelText(items).toLowerCase()}** · ${EMOJIS.MONEY} **${priceText}**\n` +
    `-# ${EMOJIS.RIGHT_ARROW} ${pickText}`
  );
}

/** Description for one color tier post. */
export function colorTierDescription(
  tier: string,
  items: { name: string; price: number; min_level: number }[],
): string {
  return tierDescription(COLOR_TIER_VIBES[tier], items, 'Pick a color below to buy or equip.');
}

// ---------------------------------------------------------------------------
// Persona shop (film-set voice)
// ---------------------------------------------------------------------------

/** One-line vibe per persona tier. */
export const PERSONA_TIER_VIBES: Record<string, string> = {
  [PERSONA_TIERS.HIGH_STATUS]: 'Known around the lot',
  [PERSONA_TIERS.ELITE]: 'Serious power, serious squads',
  [PERSONA_TIERS.LEGENDARY]: 'Names people whisper',
  [PERSONA_TIERS.TRANSCENDENT]: 'Beyond the call sheet',
  [PERSONA_TIERS.SPECIAL]: 'Handpicked, one of a kind',
};

export const PERSONAS_INTRO_TITLE = `${EMOJIS.THEATRE} NOW CASTING: PERSONAS ${EMOJIS.SPARKLES}`;
/** Title the intro used before the film-set rewrite, so the old post is found and edited instead of duplicated. */
export const PERSONAS_INTRO_OLD_TITLE = '<:theatre:1558592490662138017> Persona Roles Shop';

/** Intro description. Tiers are listed low to high; levels and price ranges come straight from PERSONAS_CONFIG. */
export function personasIntroDescription(): string {
  const lines: string[] = [];
  for (const tier of PERSONA_TIER_ORDER) {
    const items = PERSONAS_CONFIG.filter(p => p.tier === tier);
    if (items.length === 0) continue;
    const level = Math.min(...items.map(i => i.minLevel));
    const vibe = PERSONA_TIER_VIBES[tier];
    lines.push(
      `${EMOJIS.RIGHT_ARROW} **${tier.toUpperCase()}** · **Level ${level}**\n` +
        `-# ${vibe ? `${vibe} · ` : ''}${EMOJIS.MONEY} **${priceRange(items.map(i => i.price))}**`,
    );
  }

  return (
    'Every star needs an identity. Pick a persona and make it yours.\n\n' +
    `${lines.join('\n')}\n\n` +
    `-# ${EMOJIS.PUSH_PIN} Pick a tier below to see the lineup.`
  );
}

/** Description for one persona tier post. */
export function personaTierDescription(
  tier: string,
  items: { name: string; price: number; min_level: number }[],
): string {
  return tierDescription(PERSONA_TIER_VIBES[tier], items, 'Pick a persona below to buy.');
}

// ---------------------------------------------------------------------------
// Shared lines (colors and personas)
// ---------------------------------------------------------------------------

/** Shown when someone is below the level for an item. */
export function levelTooLow(itemName: string, minLevel: number, currentLevel?: number): string {
  const you = currentLevel !== undefined ? `, and you're level **${currentLevel}**` : '';
  return `**Not on your call sheet yet.** **${itemName}** unlocks at level **${minLevel}**${you}.`;
}

/** Shown when someone can't afford an item. */
export function shortOnFunds(need: number, have: number): string {
  return `**Short on funds.** You need ${EMOJIS.MONEY} **${formatAmount(need)}** and you have ${EMOJIS.MONEY} **${formatAmount(have)}**.`;
}

/** Small line under a purchase confirmation. */
export function balanceLine(balance: number, tip: string): string {
  return `-# ${EMOJIS.MONEY} Balance **${formatAmount(balance)}** · ${EMOJIS.RIGHT_ARROW} ${tip}`;
}
