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

## [0.2.0] - 2026-08-11

### Added

- Photo intake pipeline: magic-byte format detection, HEIC conversion via a
  lazily imported decoder, EXIF orientation handling, and downscaling.
- Cover-fit crop geometry that never distorts or letterboxes, with pan clamping
  and optional face-centring where the browser supports detection.
- Unit tests covering crop maths across portrait, landscape, square, panorama
  and degenerate inputs.

## [0.3.0] - 2026-08-11

### Added

- Canvas compositor drawing the full badge at 1080x1620 from vector paths.
- Vector decorations: palms, surfboards, Goan house, scooter, postage and rubber
  stamps, sunset band.
- Headless render harness for comparing the composition against the reference.

## [0.4.0] - 2026-08-11

### Added

- Single-screen builder with a preview that repaints on every keystroke.
- Drag-to-pan and pinch-to-zoom photo repositioning via pointer events.
- Generated builder class and builder ID with a reroll that preserves the ID.

## [0.5.0] - 2026-08-11

### Added

- PNG download of the rendered card.
- Share to X preferring a native file attachment, falling back to the composer
  with the caption and `#FrameInGoa` pre-filled.

## [0.6.0] - 2026-08-11

### Added

- Serverless share service storing cards and serving pages with real `og:image`
  tags, so pasted links preview the actual graphic.
- Generated default Open Graph banner for the tool itself.

## [0.9.0] - 2026-08-11

### Added

- End-to-end suite covering upload, fill, download and share on mobile and
  desktop, running against the production build.
- Generated photo fixtures spanning the aspect ratios that break naive croppers.
- ESLint configuration, CI workflow, Pages deploy workflow, and Dependabot.

## [1.0.0] - 2026-08-11

### Added

- First public release, live on GitHub Pages.
- README documenting the flow, the photo pipeline, the share paths and the
  deployment of both the app and the share service.
