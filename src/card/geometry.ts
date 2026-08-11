/**
 * Crop geometry for fitting an arbitrary photo into the card's circular frame.
 *
 * Kept free of DOM types so it can be unit tested directly. The rule throughout
 * is *cover*, never *contain*: the photo is scaled so it fully covers the frame
 * and the overflow is clipped. That is what stops panoramas from letterboxing
 * and tall selfies from being squashed — the aspect ratio is never altered.
 */

export interface Size {
  width: number;
  height: number;
}

/** User-adjustable placement of the photo inside the frame. */
export interface Transform {
  /** Multiplier on top of the cover scale. 1 = exactly covering, >1 = zoomed in. */
  zoom: number;
  /** Pan in frame pixels, from the centred position. */
  offsetX: number;
  offsetY: number;
}

export const IDENTITY_TRANSFORM: Transform = { zoom: 1, offsetX: 0, offsetY: 0 };

/** Zoom bounds offered by the UI slider and pinch gesture. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes where to draw `source` so it covers a square frame of `frameSize`.
 *
 * The returned rect is in frame coordinates with the frame's origin at (0, 0);
 * the caller clips to the circle and draws the image into this rect.
 */
export function coverRect(source: Size, frameSize: number, transform: Transform): DrawRect {
  const safeWidth = Math.max(1, source.width);
  const safeHeight = Math.max(1, source.height);

  // Cover: the larger of the two ratios guarantees both axes are filled.
  const base = Math.max(frameSize / safeWidth, frameSize / safeHeight);
  const scale = base * clampZoom(transform.zoom);

  const width = safeWidth * scale;
  const height = safeHeight * scale;

  // Centre first, then apply pan, then stop the pan from exposing an edge.
  const centredX = (frameSize - width) / 2;
  const centredY = (frameSize - height) / 2;
  const limitX = Math.max(0, (width - frameSize) / 2);
  const limitY = Math.max(0, (height - frameSize) / 2);

  return {
    x: centredX + clamp(transform.offsetX, -limitX, limitX),
    y: centredY + clamp(transform.offsetY, -limitY, limitY),
    width,
    height,
  };
}

/**
 * Clamps a transform so the frame can never show empty space.
 *
 * Applied after every pan and zoom gesture: without it, zooming out after
 * panning to an edge would slide the photo off the frame and reveal background.
 */
export function clampTransform(source: Size, frameSize: number, transform: Transform): Transform {
  const zoom = clampZoom(transform.zoom);
  const safeWidth = Math.max(1, source.width);
  const safeHeight = Math.max(1, source.height);
  const scale = Math.max(frameSize / safeWidth, frameSize / safeHeight) * zoom;

  const limitX = Math.max(0, (safeWidth * scale - frameSize) / 2);
  const limitY = Math.max(0, (safeHeight * scale - frameSize) / 2);

  return {
    zoom,
    offsetX: clamp(transform.offsetX, -limitX, limitX),
    offsetY: clamp(transform.offsetY, -limitY, limitY),
  };
}

/**
 * Converts a detected face box into a transform that centres it in the frame.
 *
 * Used only as a starting position when face detection is available; the user
 * can still pan and zoom afterwards.
 */
export function transformForFace(
  source: Size,
  frameSize: number,
  face: { x: number; y: number; width: number; height: number },
): Transform {
  const base = Math.max(frameSize / Math.max(1, source.width), frameSize / Math.max(1, source.height));

  // Zoom so the face occupies a comfortable share of the frame rather than
  // filling it — a head-and-shoulders crop reads better on a badge than a
  // tight face crop.
  const targetFaceShare = 0.62;
  const faceSpan = Math.max(face.width, face.height) * base;
  const desiredZoom = faceSpan > 0 ? (frameSize * targetFaceShare) / faceSpan : 1;
  const zoom = clampZoom(desiredZoom);
  const scale = base * zoom;

  // Offset that brings the face centre to the frame centre. Positive offsetX
  // moves the image right, so we negate the delta from centre.
  const faceCentreX = (face.x + face.width / 2) * scale;
  const faceCentreY = (face.y + face.height / 2) * scale;
  const imageWidth = source.width * scale;
  const imageHeight = source.height * scale;

  return clampTransform(source, frameSize, {
    zoom,
    offsetX: imageWidth / 2 - faceCentreX,
    offsetY: imageHeight / 2 - faceCentreY,
  });
}

/**
 * Scale factor to bring an image under `maxEdge` on its long side.
 *
 * Returns 1 for images already small enough — callers use that to skip the
 * resample entirely rather than needlessly rasterising.
 */
export function downscaleFactor(source: Size, maxEdge: number): number {
  const longEdge = Math.max(source.width, source.height);
  return longEdge > maxEdge ? maxEdge / longEdge : 1;
}

export function clampZoom(zoom: number): number {
  return clamp(Number.isFinite(zoom) ? zoom : 1, MIN_ZOOM, MAX_ZOOM);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, value));
}
