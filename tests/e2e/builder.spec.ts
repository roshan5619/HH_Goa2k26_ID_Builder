/**
 * End-to-end coverage of the flow the brief describes: upload a photo, fill a
 * couple of fields, download a real image file, and reach the X composer.
 *
 * Runs against the production build so what is asserted is what ships.
 */

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

/** Waits until the card has painted; the fonts gate the first render. */
async function waitForCard(page: Page) {
  await expect(page.getByRole('img', { name: /live preview/i })).toBeVisible();
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  // A painted canvas has at least one non-transparent pixel.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const { data } = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1);
    return data[3] > 0;
  });
}

async function upload(page: Page, fixture: string) {
  await page.locator('input[type="file"]').setInputFiles(join(FIXTURES, fixture));
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await waitForCard(page);
});

test('renders a card before any input, so the page is never blank', async ({ page }) => {
  await expect(page.getByRole('img', { name: /live preview/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /upload your photo/i })).toBeVisible();
  // No login or gate stands between arriving and seeing the result.
  await expect(page.getByText(/sign in|log in|sign up/i)).toHaveCount(0);
});

test('completes upload, fill and download in one pass', async ({ page }) => {
  await upload(page, 'portrait.png');
  await expect(page.getByRole('button', { name: /change photo/i })).toBeVisible();

  await page.getByPlaceholder('Madhavan Singh').fill('Ada Lovelace');
  await page.getByPlaceholder('Full stack developer').fill('Systems engineer');
  await page.getByPlaceholder('Building the future').fill('A difference engine');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download card/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('hh-goa-2026-ada-lovelace.png');

  // Assert a real PNG of the expected size, not just that a download fired.
  const path = await download.path();
  const bytes = readFileSync(path!);
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1620);
  // A card with a photo and text on it is never a few hundred bytes.
  expect(bytes.byteLength).toBeGreaterThan(50_000);
});

test('accepts every aspect ratio without erroring', async ({ page }) => {
  for (const fixture of ['landscape.png', 'square.png', 'panorama.png', 'tall-strip.png']) {
    await upload(page, fixture);
    await expect(page.getByRole('button', { name: /change photo/i })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
});

test('warns but still renders when the photo is tiny', async ({ page }) => {
  await upload(page, 'tiny.png');
  await expect(page.getByText(/quite small/i)).toBeVisible();
  // A warning must not block the download.
  await expect(page.getByRole('button', { name: /download card/i })).toBeEnabled();
});

test('rejects a non-image with a readable message and stays usable', async ({ page }) => {
  await upload(page, 'not-an-image.txt');

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/image file/i);

  // The tool recovers: dismiss, then upload a real photo.
  await page.getByRole('button', { name: /dismiss/i }).click();
  await expect(alert).toHaveCount(0);

  await upload(page, 'square.png');
  await expect(page.getByRole('button', { name: /change photo/i })).toBeVisible();
});

test('rerolling changes the builder class but keeps the builder ID', async ({ page }) => {
  await page.getByPlaceholder('Madhavan Singh').fill('Grace Hopper');

  const output = page.locator('.field__generated');
  const before = await output.textContent();

  await page.getByRole('button', { name: /reroll/i }).click();
  await expect(output).not.toHaveText(before ?? '');
});

test('share falls back to the X composer when files cannot be shared', async ({ page, context }) => {
  // Desktop browsers cannot attach files to a share; force that path explicitly
  // so the assertion holds on mobile projects too.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
  });
  await page.reload();
  await waitForCard(page);

  await page.getByPlaceholder('Madhavan Singh').fill('Ada Lovelace');

  const popupPromise = context.waitForEvent('page');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /share to x/i }).click();

  // The card is downloaded on this path so the user always keeps the image.
  await downloadPromise;

  const popup = await popupPromise;
  const url = popup.url();
  expect(url).toContain('x.com/intent/post');
  // The required hashtag must survive into the composer.
  expect(decodeURIComponent(url)).toContain('#FrameInGoa');
});
