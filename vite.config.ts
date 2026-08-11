import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

/** Short commit SHA, so any deployed build is traceable back to a commit. */
function commitSha(): string {
  // CI provides the SHA directly; locally we ask git, and tolerate its absence.
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  // GitHub Pages serves this project from a repository subpath.
  base: process.env.DEPLOY_BASE ?? '/HH_Goa2k26_ID_Builder/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commitSha()),
  },
  build: {
    target: 'es2020',
    // The HEIC decoder is a large wasm-backed chunk; keeping it separate means
    // it is only fetched by the users who actually upload a HEIC file.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('heic-to') || id.includes('libheif')) return 'heic';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
