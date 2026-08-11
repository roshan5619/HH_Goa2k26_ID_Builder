/**
 * Renders public/og-default.png, the link preview for the tool itself.
 *
 * Individual shared cards get their own Open Graph image from the share
 * service; this is the fallback shown when someone posts the builder's URL.
 * It is generated rather than hand-drawn so it stays in step with the brand
 * tokens and the vendored fonts.
 *
 * Usage: node scripts/make-og.mjs <dev-server-url>
 */
import { launch } from './browser.mjs';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:5199/HH_Goa2k26_ID_Builder/';
const out = 'public/og-default.png';

await mkdir('public', { recursive: true });

const browser = await launch();
// 1200x630 is the size X and most other crawlers scale their preview from.
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

await page.goto(new URL('og.html', base).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.body.dataset.rendered === 'true', null, {
  timeout: 20_000,
});

await page.screenshot({ path: out });
await browser.close();

console.log(`wrote ${out}`);
