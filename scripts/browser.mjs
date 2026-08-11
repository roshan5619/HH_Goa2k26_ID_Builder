/**
 * Shared browser launcher for the local tooling scripts.
 *
 * Playwright's bundled headless shell is not runnable on every machine (local
 * security software commonly blocks the freshly downloaded binary). Falling back
 * to an installed Chrome keeps the screenshot and OG tooling working without
 * requiring anyone to debug their endpoint protection.
 */
import { chromium } from '@playwright/test';

export async function launch() {
  const attempts = [
    // Preferred: whatever `npx playwright install chromium` provided.
    {},
    // Fallbacks: a Chrome or Edge already installed on the machine.
    { channel: 'chrome' },
    { channel: 'msedge' },
  ];

  const failures = [];
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      failures.push(`${options.channel ?? 'bundled'}: ${String(error).split('\n')[0]}`);
    }
  }

  throw new Error(`No usable browser could be launched.\n  ${failures.join('\n  ')}`);
}
