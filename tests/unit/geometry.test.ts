import { describe, expect, it } from 'vitest';
import {
  clampTransform,
  coverRect,
  downscaleFactor,
  IDENTITY_TRANSFORM,
  MAX_ZOOM,
  transformForFace,
} from '../../src/card/geometry';

const FRAME = 700;

/** Aspect ratios drawn from the photos people actually upload. */
const SHAPES = {
  portrait: { width: 3024, height: 4032 }, // iPhone portrait
  landscape: { width: 4032, height: 3024 },
  square: { width: 1080, height: 1080 },
  panorama: { width: 8000, height: 1200 },
  tallStrip: { width: 600, height: 2400 },
  tiny: { width: 120, height: 90 },
} as const;

describe('coverRect', () => {
  it('covers the frame for every aspect ratio without letterboxing', () => {
    for (const [name, size] of Object.entries(SHAPES)) {
      const rect = coverRect(size, FRAME, IDENTITY_TRANSFORM);
      expect(rect.width, `${name} width`).toBeGreaterThanOrEqual(FRAME - 0.001);
      expect(rect.height, `${name} height`).toBeGreaterThanOrEqual(FRAME - 0.001);
      // No gap on any edge, which is what letterboxing would look like.
      expect(rect.x, `${name} left`).toBeLessThanOrEqual(0.001);
      expect(rect.y, `${name} top`).toBeLessThanOrEqual(0.001);
      expect(rect.x + rect.width, `${name} right`).toBeGreaterThanOrEqual(FRAME - 0.001);
      expect(rect.y + rect.height, `${name} bottom`).toBeGreaterThanOrEqual(FRAME - 0.001);
    }
  });

  it('never distorts the source aspect ratio', () => {
    for (const [name, size] of Object.entries(SHAPES)) {
      const rect = coverRect(size, FRAME, IDENTITY_TRANSFORM);
      expect(rect.width / rect.height, `${name} ratio`).toBeCloseTo(size.width / size.height, 5);
    }
  });

  it('centres the crop when no pan is applied', () => {
    const rect = coverRect(SHAPES.panorama, FRAME, IDENTITY_TRANSFORM);
    // Equal overflow left and right means the centre of the photo is in frame.
    expect(rect.x).toBeCloseTo(FRAME - (rect.x + rect.width), 5);
  });

  it('upscales images smaller than the frame rather than leaving gaps', () => {
    const rect = coverRect(SHAPES.tiny, FRAME, IDENTITY_TRANSFORM);
    expect(rect.width).toBeGreaterThanOrEqual(FRAME);
    expect(rect.height).toBeGreaterThanOrEqual(FRAME);
  });

  it('clamps pan so the frame can never expose an edge', () => {
    // A pan far beyond the available overflow must still cover the frame.
    const rect = coverRect(SHAPES.portrait, FRAME, { zoom: 1, offsetX: 9999, offsetY: -9999 });
    expect(rect.x).toBeLessThanOrEqual(0.001);
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(FRAME - 0.001);
  });

  it('cannot pan a square photo at zoom 1, since there is no overflow', () => {
    const rect = coverRect(SHAPES.square, FRAME, { zoom: 1, offsetX: 500, offsetY: 500 });
    expect(rect.x).toBeCloseTo(0, 5);
    expect(rect.y).toBeCloseTo(0, 5);
  });

  it('zooming in enlarges the drawn image', () => {
    const base = coverRect(SHAPES.square, FRAME, IDENTITY_TRANSFORM);
    const zoomed = coverRect(SHAPES.square, FRAME, { zoom: 2, offsetX: 0, offsetY: 0 });
    expect(zoomed.width).toBeCloseTo(base.width * 2, 5);
  });

  it('survives degenerate sizes instead of producing NaN', () => {
    const rect = coverRect({ width: 0, height: 0 }, FRAME, IDENTITY_TRANSFORM);
    expect(Number.isFinite(rect.width)).toBe(true);
    expect(Number.isFinite(rect.x)).toBe(true);
    expect(rect.width).toBeGreaterThanOrEqual(FRAME);
  });

  it('ignores non-finite transform values', () => {
    const rect = coverRect(SHAPES.portrait, FRAME, {
      zoom: Number.NaN,
      offsetX: Number.POSITIVE_INFINITY,
      offsetY: Number.NaN,
    });
    expect(Number.isFinite(rect.x)).toBe(true);
    expect(Number.isFinite(rect.y)).toBe(true);
    expect(rect.width).toBeGreaterThanOrEqual(FRAME - 0.001);
  });
});

describe('clampTransform', () => {
  it('holds zoom within the supported range', () => {
    expect(clampTransform(SHAPES.square, FRAME, { zoom: 99, offsetX: 0, offsetY: 0 }).zoom).toBe(
      MAX_ZOOM,
    );
    expect(clampTransform(SHAPES.square, FRAME, { zoom: 0.1, offsetX: 0, offsetY: 0 }).zoom).toBe(1);
  });

  it('pulls the pan back in when the user zooms out after panning to an edge', () => {
    const panned = clampTransform(SHAPES.portrait, FRAME, { zoom: 3, offsetX: 0, offsetY: 600 });
    const zoomedOut = clampTransform(SHAPES.portrait, FRAME, { ...panned, zoom: 1 });
    const rect = coverRect(SHAPES.portrait, FRAME, zoomedOut);
    expect(rect.y).toBeLessThanOrEqual(0.001);
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(FRAME - 0.001);
  });

  it('is idempotent', () => {
    const once = clampTransform(SHAPES.landscape, FRAME, { zoom: 2, offsetX: 5000, offsetY: 20 });
    const twice = clampTransform(SHAPES.landscape, FRAME, once);
    expect(twice).toEqual(once);
  });
});

describe('transformForFace', () => {
  it('brings an off-centre face towards the middle of the frame', () => {
    const size = SHAPES.landscape;
    // A face in the far top-left quadrant.
    const face = { x: 300, y: 200, width: 500, height: 500 };
    const transform = transformForFace(size, FRAME, face);

    const rect = coverRect(size, FRAME, transform);
    const scale = rect.width / size.width;
    const faceCentreInFrame = {
      x: rect.x + (face.x + face.width / 2) * scale,
      y: rect.y + (face.y + face.height / 2) * scale,
    };

    // Without correction the face would sit near the left edge; assert it now
    // lands nearer the centre than the untransformed position does.
    const centred = coverRect(size, FRAME, IDENTITY_TRANSFORM);
    const centredScale = centred.width / size.width;
    const before = Math.abs(centred.x + (face.x + face.width / 2) * centredScale - FRAME / 2);
    const after = Math.abs(faceCentreInFrame.x - FRAME / 2);
    expect(after).toBeLessThan(before);
  });

  it('still produces a covering crop', () => {
    const rect = coverRect(
      SHAPES.portrait,
      FRAME,
      transformForFace(SHAPES.portrait, FRAME, { x: 0, y: 0, width: 200, height: 200 }),
    );
    expect(rect.width).toBeGreaterThanOrEqual(FRAME - 0.001);
    expect(rect.height).toBeGreaterThanOrEqual(FRAME - 0.001);
  });
});

describe('downscaleFactor', () => {
  it('leaves small images untouched so they are not needlessly resampled', () => {
    expect(downscaleFactor({ width: 800, height: 600 }, 1600)).toBe(1);
  });

  it('scales by the long edge', () => {
    expect(downscaleFactor({ width: 4000, height: 3000 }, 1600)).toBeCloseTo(0.4, 5);
    expect(downscaleFactor({ width: 3000, height: 4000 }, 1600)).toBeCloseTo(0.4, 5);
  });
});
