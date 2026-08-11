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

/**
 * Derives the builder class from a name.
 *
 * @param name    the builder's name; blank falls back to a stable placeholder
 * @param variant reroll counter — same name plus same variant is always equal
 */
export function deriveBuilderClass(name: string, variant = 0): string {
  const seed = normalise(name) || 'anonymous builder';
  const hash = hashString(`${seed}#${variant}`);

  // Independent slices of the hash so the two words vary independently.
  const qualifier = QUALIFIERS[hash % QUALIFIERS.length];
  const noun = NOUNS[Math.floor(hash / QUALIFIERS.length) % NOUNS.length];

  return `${qualifier} ${noun}`;
}

/**
 * Crockford-style base32: no I, L, O or U, so an ID read off a screenshot is
 * never mistaken for a different one.
 */
const ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ID_LENGTH = 6;

/**
 * Mints a fresh, unique builder ID.
 *
 * Deliberately *not* derived from the name: every card issued is its own
 * document, so two builders with the same name — or the same builder returning
 * for a second card — each get a distinct number. 32^6 is about a billion
 * combinations, which makes a collision across an event's worth of cards
 * negligible without needing a server to hand out sequential numbers.
 */
export function mintBuilderId(): string {
  const bytes = new Uint8Array(ID_LENGTH);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // Environments without WebCrypto still need an id; uniqueness matters more
    // here than unpredictability, since the id is printed on the card anyway.
    for (let i = 0; i < ID_LENGTH; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  let id = '';
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `HH-GOA-${id}`;
}

/** Case- and whitespace-insensitive, so "Ada  LOVELACE " matches "ada lovelace". */
function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Total distinct titles, exposed for tests and for the reroll hint. */
export const TITLE_SPACE = QUALIFIERS.length * NOUNS.length;
