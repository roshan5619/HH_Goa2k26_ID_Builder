/**
 * Development screenshot helper.
 *
 * Renders the app at a given viewport and reports any horizontal overflow, which
 * is the failure mode that matters most on phones and the easiest one to miss
 * when developing on a desktop.
 *
 * Usage: node scripts/shoot.mjs <url> <out.png> [width] [height]
 */
import { launch } from './browser.mjs';

const [url, out, width = '390', height = '844'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shoot.mjs <url> <out.png> [width] [height]');
  process.exit(1);
}

const browser = await launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 2,
  isMobile: Number(width) < 700,
  hasTouch: Number(width) < 700,
});

const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(msg.text());
});
page.on('pageerror', (err) => problems.push(String(err)));

await page.goto(url, { waitUntil: 'networkidle' });
// The card only paints once the vendored fonts are measurable.
await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15_000 });
await page.waitForTimeout(400);

const metrics = await page.evaluate(() => {
  const doc = document.documentElement;
  // Identify which element is actually wider than the viewport, rather than
  // just reporting that something is.
  const offenders = [...document.querySelectorAll('*')]
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
    .slice(0, 6)
    .map((el) => `${el.tagName.toLowerCase()}.${el.className || '-'} @ ${Math.round(el.getBoundingClientRect().right)}px`);
  return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, offenders };
});

await page.screenshot({ path: out, fullPage: true });
await browser.close();

console.log(`viewport ${width}x${height}  scrollWidth ${metrics.scrollWidth} vs ${metrics.innerWidth}`);
if (metrics.scrollWidth > metrics.innerWidth + 1) {
  console.log('HORIZONTAL OVERFLOW from:');
  for (const offender of metrics.offenders) console.log('  ' + offender);
}
if (problems.length) {
  console.log('console errors:');
  for (const problem of problems) console.log('  ' + problem);
}
console.log(`wrote ${out}`);
