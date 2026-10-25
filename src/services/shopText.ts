/**
 * Shared shop wording so $shop and $updateshop always say the same thing.
 */

/**
 * "Unlocks at level 30, unknown entity at level 100. Pick one below to buy it."
 * The base level is the lowest one in the group; any item that needs more is
 * named separately so the embed never gives a wrong level.
 */
export function unlockLine(items: { name: string; min_level: number }[], action: string): string {
  const base = Math.min(...items.map(i => i.min_level));
  const higher = items.filter(i => i.min_level > base);
  const extra = higher.map(i => `${i.name.toLowerCase()} at level ${i.min_level}`).join(', ');
  return `Unlocks at level ${base}${extra ? `, ${extra}` : ''}. Pick one below to ${action}.`;
}

/** Message shown when someone is below the level for an item. */
export function levelTooLow(minLevel: number): string {
  return `You need to be level ${minLevel} to buy this.`;
}
