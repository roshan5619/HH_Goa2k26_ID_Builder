/**
 * Renders public/og-default.png, the link preview for the tool itself.
 *
 * The preview is the card itself, drawn by the production compositor, so it can
 * never drift from what the tool actually outputs. Individual shared cards get
 * their own Open Graph image from the share service; this is the fallback shown
 * when someone posts the builder's URL.
 *
 * Usage: node scripts/make-og.mjs <dev-server-url>
 */
import { launch } from './browser.mjs';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:5199/HH_Goa2k26_ID_Builder/';
const out = 'public/og-default.png';

await mkdir('public', { recursive: true });

const browser = await launch();
// The card's own 2:3 geometry. Portrait previews are shown whole by Slack,
// WhatsApp and LinkedIn; X crops them to a landscape band, which is the
// trade-off for the preview being the real card rather than a banner.
const page = await browser.newPage({ viewport: { width: 1080, height: 1620 } });

await page.goto(new URL('og.html', base).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.body.dataset.rendered === 'true', null, {
  timeout: 20_000,
});

await page.screenshot({ path: out });
await browser.close();

console.log(`wrote ${out}`);
