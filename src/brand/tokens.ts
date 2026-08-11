/**
 * Hacker House Goa 2026 brand tokens.
 *
 * Colours were sampled directly from the supplied event artwork (see brand/).
 * This module is the single source of truth: the canvas compositor reads these
 * values directly, and `cssVariables()` mirrors them into custom properties so
 * the surrounding UI can never drift from the card it is previewing.
 */

export const COLORS = {
  /**
   * Deep Goan forest green — card border, banners, page backdrop.
   * Sampled from brand/SampleOutput1.png rather than guessed: the event's green
   * is far darker than a typical "forest green", and getting it wrong is the
   * fastest way to make the card look like a generic badge.
   */
  green: '#042C12',
  /** Mid green for foliage and secondary fills. */
  greenMid: '#1F4C23',
  /** Lifted green used for the sea and lighter scenery. */
  greenLight: '#2F7A43',
  /** Warm paper cream — the card interior. */
  cream: '#FAECD5',
  creamDim: '#EADFC7',
  creamShade: '#D9CFB1',
  /** Wordmark yellow, and the deeper amber used for shadows and accents. */
  yellow: '#F5C419',
  yellowDeep: '#F1B112',
  /** गोवा sticker / footer banner. Closer to crimson than magenta. */
  pink: '#DD1B57',
  pinkDeep: '#B01244',
  /** Outer photo ring. */
  red: '#E4472B',
  redDeep: '#B8331C',
  /** Scenery. */
  sand: '#E8C98A',
  terracotta: '#D4602F',
  sky: '#4FA9DA',
  sea: '#2E86B8',
  ink: '#12160F',
  white: '#FFFFFF',
} as const;

export type ColorName = keyof typeof COLORS;

/**
 * Font families. Each is self-hosted (see brand/fonts.css) rather than linked
 * from a CDN, because the canvas compositor must be able to await
 * `document.fonts.ready` and get a deterministic result — a late-arriving webfont
 * would otherwise render the card in a fallback face.
 */
export const FONTS = {
  /** High-contrast Didone for the HACKER HOUSE wordmark. */
  display: '"Bodoni Moda", "Didot", "Times New Roman", serif',
  /** Rounded Devanagari for the गोवा sticker. */
  devanagari: '"Baloo 2", "Nirmala UI", sans-serif',
  /** Typewriter mono for dates, labels and the builder ID. */
  mono: '"Space Mono", "Courier New", monospace',
  /** Grotesque for the name and role banners. */
  sans: '"Archivo", "Helvetica Neue", Arial, sans-serif',
} as const;

/** Fixed event facts printed on every card. */
export const EVENT = {
  name: 'HACKER HOUSE',
  city: 'GOA, INDIA',
  dates: '28 - 31 OCT 2026',
  datesShort: '28-31 OCT 2026',
  year: '2026',
  organiser: '2:47 PM STUDIO',
  hashtag: '#FRAMEINGOA',
  stampTop: 'BUILD IN GOA',
  stampBottom: 'SHIP FROM PARADISE',
} as const;

/** Card output geometry. 2:3 portrait reads well in an X timeline. */
export const CARD = {
  width: 1080,
  height: 1620,
} as const;

/** Mirrors the palette into CSS custom properties for the surrounding UI. */
export function cssVariables(): string {
  const vars = Object.entries(COLORS)
    .map(([name, value]) => `  --hh-${kebab(name)}: ${value};`)
    .join('\n');
  const families = Object.entries(FONTS)
    .map(([name, value]) => `  --hh-font-${name}: ${value};`)
    .join('\n');
  return `:root {\n${vars}\n${families}\n}`;
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
