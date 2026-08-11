/**
 * Downloads the brand webfonts into src/brand/fonts and writes the @font-face CSS.
 *
 * The fonts are vendored rather than linked from a CDN for two reasons: the
 * canvas compositor needs `document.fonts.ready` to be a reliable signal before
 * it draws, and GitHub Pages should not depend on a third-party host being up.
 *
 * Files land under src/ (not public/) so Vite fingerprints them and rewrites the
 * URLs against the deploy base — the app is served from a repository subpath, so
 * a root-absolute /fonts/... reference would 404 in production.
 *
 * Three of the four families are variable fonts: Google serves the *same* file
 * for every requested weight. We deduplicate by content hash and emit a single
 * @font-face carrying a weight range, which is both correct and much smaller.
 *
 * Run with: node scripts/fetch-fonts.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// A modern browser UA is required or the API serves legacy ttf instead of woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const FAMILIES = [
  { query: 'Bodoni+Moda:opsz,wght@6..96,700;6..96,800;6..96,900', name: 'Bodoni Moda' },
  { query: 'Baloo+2:wght@700;800', name: 'Baloo 2' },
  { query: 'Space+Mono:wght@400;700', name: 'Space Mono' },
  { query: 'Archivo:wght@600;700;800', name: 'Archivo' },
];

// Devanagari is required for the गोवा sticker; the rest of the card is Latin.
// Dropping every other subset keeps the vendored payload small.
const KEEP_SUBSETS = new Set(['latin', 'latin-ext', 'devanagari']);

const OUT_DIR = join(process.cwd(), 'src', 'brand', 'fonts');
const CSS_OUT = join(process.cwd(), 'src', 'brand', 'fonts.css');

/** Splits the API response into per-@font-face blocks tagged with their subset. */
function parseFaces(css) {
  const faces = [];
  let subset = 'latin';
  for (const chunk of css.split('/*')) {
    const label = chunk.match(/^\s*([a-z-]+)\s*\*\//);
    if (label) subset = label[1];
    const block = chunk.match(/@font-face\s*\{[^}]+\}/);
    if (block) faces.push({ subset, block: block[0] });
  }
  return faces;
}

const field = (block, key) => block.match(new RegExp(`${key}:\\s*([^;]+);`))?.[1]?.trim();
const slugify = (value) => value.toLowerCase().replace(/\s+/g, '-');

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  /** key -> { family, subset, weights[], unicodeRange, bytes } */
  const groups = new Map();

  for (const family of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${family.query}&display=swap`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${family.name}: ${res.status} ${res.statusText}`);
    const css = await res.text();

    for (const { subset, block } of parseFaces(css)) {
      if (!KEEP_SUBSETS.has(subset)) continue;

      const remote = field(block, 'src')?.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
      if (!remote) continue;

      const bin = await fetch(remote, { headers: { 'User-Agent': UA } });
      if (!bin.ok) throw new Error(`${family.name}/${subset}: ${bin.status}`);
      const bytes = Buffer.from(await bin.arrayBuffer());

      // Identical bytes across weights means one variable font covers them all.
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
      const key = `${family.name}|${subset}|${hash}`;
      const weight = Number(field(block, 'font-weight') ?? 400);

      const existing = groups.get(key);
      if (existing) {
        existing.weights.push(weight);
      } else {
        groups.set(key, {
          family: family.name,
          subset,
          weights: [weight],
          unicodeRange: field(block, 'unicode-range'),
          style: field(block, 'font-style') ?? 'normal',
          bytes,
        });
      }
    }
  }

  const cssParts = [
    '/* Brand webfonts, vendored by scripts/fetch-fonts.mjs. Do not edit by hand. */',
  ];

  for (const group of groups.values()) {
    // A single weight stays a scalar; a variable font declares its usable range.
    const min = Math.min(...group.weights);
    const max = Math.max(...group.weights);
    const weight = min === max ? `${min}` : `${min} ${max}`;

    // The weight belongs in the filename: static families such as Space Mono
    // ship a distinct file per weight, and keying on family+subset alone would
    // silently overwrite the bold with the regular.
    const file = `${slugify(group.family)}-${group.subset}-${min === max ? min : `${min}-${max}`}.woff2`;
    await writeFile(join(OUT_DIR, file), group.bytes);

    cssParts.push(
      [
        '@font-face {',
        `  font-family: '${group.family}';`,
        `  font-style: ${group.style};`,
        `  font-weight: ${weight};`,
        // `block`, not `swap`: a fallback face would change text metrics and the
        // canvas would compose the card with the wrong glyph widths.
        '  font-display: block;',
        `  src: url('./fonts/${file}') format('woff2');`,
        group.unicodeRange ? `  unicode-range: ${group.unicodeRange};` : null,
        '}',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  await writeFile(CSS_OUT, `${cssParts.join('\n\n')}\n`);
  console.log(`Vendored ${groups.size} font files -> src/brand/fonts, wrote ${CSS_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
