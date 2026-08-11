# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-11

### Added

- Vite + React + TypeScript scaffold targeting GitHub Pages at the
  `/HH_Goa2k26_ID_Builder/` base path.
- Brand tokens (`src/brand/tokens.ts`) sampled directly from the event artwork,
  shared by the canvas compositor and the surrounding UI.
- Vendored brand webfonts (Bodoni Moda, Baloo 2, Space Mono, Archivo) with
  `scripts/fetch-fonts.mjs`, deduplicated by content hash and served from the
  bundle so the deploy base resolves correctly.
- Build version and commit SHA injected at build time for traceability.
