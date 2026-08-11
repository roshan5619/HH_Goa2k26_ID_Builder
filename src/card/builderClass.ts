/**
 * Deterministic "builder class" and builder ID generation.
 *
 * The same name always produces the same title and ID, so a builder who returns
 * to the tool rebuilds an identical card rather than getting a fresh identity
 * each visit. `variant` lets the UI offer a reroll without losing that property:
 * (name, variant) is still a pure input.
 */

/** FNV-1a: small, dependency-free, and well spread for short ASCII-ish strings. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    // The shift-and-add form of the FNV prime multiply, kept in 32-bit range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Titles are two words: an evocative qualifier plus a role noun. Combining two
 * lists gives 40 x 40 = 1600 possibilities from a list short enough to keep
 * every entry on-voice for the event.
 */
const QUALIFIERS = [
  'TERMINAL', 'MIDNIGHT', 'MONSOON', 'COASTAL', 'FERAL', 'QUIET', 'RELENTLESS',
  'CAFFEINE', 'LATENCY', 'SUNSET', 'BAREFOOT', 'ROGUE', 'NEON', 'TIDAL',
  'RECURSIVE', 'AMBIENT', 'KERNEL', 'SALTWATER', 'LUCID', 'PHANTOM',
  'TROPICAL', 'STATELESS', 'NOCTURNAL', 'VELVET', 'ATOMIC', 'DRIFTWOOD',
  'PARALLEL', 'MONOLITH', 'SANDBOX', 'ELASTIC', 'CHROME', 'SOLAR',
  'DEEP-END', 'OFF-GRID', 'HIGH-TIDE', 'ZERO-DAY', 'RAW', 'SILENT',
  'ETERNAL', 'PIXEL',
] as const;

const NOUNS = [
  'WIZARD', 'SHIPPER', 'ARCHITECT', 'ORACLE', 'NOMAD', 'ALCHEMIST', 'SMITH',
  'HUNTER', 'GARDENER', 'CARTOGRAPHER', 'MECHANIC', 'SHAMAN', 'PILOT',
  'CURATOR', 'TINKERER', 'SURGEON', 'PROPHET', 'RANGER', 'ARTISAN', 'DRIFTER',
  'ENGINEER', 'DIPLOMAT', 'SCOUT', 'MONK', 'BUILDER', 'BOTANIST', 'CAPTAIN',
  'LOCKSMITH', 'WATCHMAKER', 'NAVIGATOR', 'CUSTODIAN', 'FORAGER', 'WRANGLER',
  'LUTHIER', 'STEWARD', 'BLACKSMITH', 'SENTINEL', 'COMPOSER', 'MAVERICK',
  'DREAMER',
] as const;

export interface BuilderIdentity {
  /** Two-word title, e.g. "TERMINAL WIZARD". */
  builderClass: string;
  /** Printed on the card, e.g. "#HH-GOA-7757". */
  builderId: string;
}

/**
 * Derives the title and ID from a name.
 *
 * @param name    the builder's name; blank falls back to a stable placeholder
 * @param variant reroll counter — same name plus same variant is always equal
 */
export function deriveIdentity(name: string, variant = 0): BuilderIdentity {
  const seed = normalise(name) || 'anonymous builder';
  const hash = hashString(`${seed}#${variant}`);

  // Independent slices of the hash so the two words vary independently.
  const qualifier = QUALIFIERS[hash % QUALIFIERS.length];
  const noun = NOUNS[Math.floor(hash / QUALIFIERS.length) % NOUNS.length];

  // The ID is drawn from a separately salted hash: deriving it from the same
  // value would tie the number to the title and reduce the apparent variety.
  const idHash = hashString(`id:${seed}`);
  const builderId = `#HH-GOA-${String(idHash % 10000).padStart(4, '0')}`;

  return { builderClass: `${qualifier} ${noun}`, builderId };
}

/** Case- and whitespace-insensitive, so "Ada  LOVELACE " matches "ada lovelace". */
function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Total distinct titles, exposed for tests and for the reroll hint. */
export const TITLE_SPACE = QUALIFIERS.length * NOUNS.length;
