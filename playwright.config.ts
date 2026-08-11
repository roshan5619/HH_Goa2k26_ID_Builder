import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/HH_Goa2k26_ID_Builder/`;

export default defineConfig({
  testDir: './tests/e2e',
  // The flow is a single page; a failure is a real failure, not a flake to
  // paper over. One retry in CI only, to absorb cold-start timing.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,

  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // CI uses Playwright's own browser download. Locally we prefer an installed
  // Chrome, because endpoint security commonly blocks the bundled headless
  // shell and that should not stop anyone running the suite.
  projects: [
    // Mobile is the primary target, so it runs first.
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],

  // Tests run against the production build, so what is verified is what ships.
  // The build is a separate step (`npm run build`) rather than part of this
  // command: bundling and running the suite in one process is enough memory
  // pressure to exhaust the heap on a modest machine.
  webServer: {
    // --host is explicit: vite preview otherwise binds a hostname that can
    // resolve to IPv6 only, while Playwright polls 127.0.0.1 and waits forever.
    command: `npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
