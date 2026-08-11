/**
 * Photo intake: validate -> decode (incl. HEIC) -> correct orientation -> downscale.
 *
 * Everything happens on the device; no photo is uploaded to produce a card.
 * The pipeline is deliberately forgiving because it receives whatever a phone's
 * photo picker hands over — including files with no MIME type at all.
 */

import { downscaleFactor, type Size } from './geometry';

/** Hard ceiling on the accepted file. Modern phone photos land far below this. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Long-edge cap applied before compositing. The circular frame is ~700px on the
 * exported card, so anything beyond this adds decode and draw cost for detail
 * that is thrown away by the downsample anyway.
 */
export const MAX_SOURCE_EDGE = 1600;

/** Below this the photo will look soft once it fills the frame; we warn but proceed. */
const LOW_RESOLUTION_EDGE = 400;

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'avif' | 'unknown';

export class PhotoError extends Error {
  constructor(
    message: string,
    /** Distinguishes expected, user-fixable problems from genuine faults. */
    readonly kind: 'too-large' | 'unsupported' | 'corrupt' | 'decode-failed',
  ) {
    super(message);
    this.name = 'PhotoError';
  }
}

export interface DecodedPhoto {
  /** Orientation-corrected, downscaled bitmap ready for the compositor. */
  bitmap: ImageBitmap;
  size: Size;
  /** Dimensions before downscaling, for diagnostics and the low-res warning. */
  naturalSize: Size;
  format: ImageFormat;
  /** Non-fatal notes to surface in the UI, e.g. a low-resolution warning. */
  warnings: string[];
}

/**
 * Identifies the format from the file's leading bytes.
 *
 * Sniffing rather than trusting `file.type` matters on iOS, where the photo
 * picker frequently supplies an empty type for HEIC files — the single most
 * common reason a naive uploader rejects a perfectly valid iPhone photo.
 */
export async function sniffFormat(file: Blob): Promise<ImageFormat> {
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (header.length < 12) return 'unknown';

  const magic = (...bytes: number[]) => bytes.every((b, i) => header[i] === b);

  if (magic(0xff, 0xd8, 0xff)) return 'jpeg';
  if (magic(0x89, 0x50, 0x4e, 0x47)) return 'png';
  if (magic(0x47, 0x49, 0x46, 0x38)) return 'gif';

  // RIFF....WEBP
  const tag = (offset: number, value: string) =>
    String.fromCharCode(...header.slice(offset, offset + value.length)) === value;
  if (tag(0, 'RIFF') && tag(8, 'WEBP')) return 'webp';

  // ISO base media: bytes 4-8 are 'ftyp', then a brand that names the codec.
  if (tag(4, 'ftyp')) {
    const brand = String.fromCharCode(...header.slice(8, 12));
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return 'heic';
    }
    if (brand.startsWith('avif') || brand === 'avis') return 'avif';
  }

  return 'unknown';
}

/**
 * Validates and decodes a user-supplied file into a bitmap for the compositor.
 *
 * Throws `PhotoError` for anything the user can act on; the UI shows the message
 * and leaves the previous photo in place.
 */
export async function decodePhoto(file: File | Blob): Promise<DecodedPhoto> {
  if (file.size === 0) {
    throw new PhotoError('That file is empty. Try picking the photo again.', 'corrupt');
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new PhotoError(
      `That photo is ${mb}MB — the limit is ${MAX_FILE_BYTES / (1024 * 1024)}MB. Try a smaller one.`,
      'too-large',
    );
  }

  const format = await sniffFormat(file);
  if (format === 'unknown') {
    throw new PhotoError(
      "That doesn't look like an image file. Use a JPG, PNG, HEIC or WebP.",
      'unsupported',
    );
  }

  // HEIC has no native decoder outside Safari, so it is converted to JPEG first.
  // The converter is imported lazily: it pulls in a wasm codec that would
  // otherwise weigh down first load for the majority who never upload HEIC.
  let source: Blob = file;
  if (format === 'heic' && !(await canDecodeNatively(file))) {
    source = await convertHeic(file);
  }

  const warnings: string[] = [];
  const bitmap = await decodeOriented(source);
  const naturalSize: Size = { width: bitmap.width, height: bitmap.height };

  if (Math.max(naturalSize.width, naturalSize.height) < LOW_RESOLUTION_EDGE) {
    warnings.push('That photo is quite small, so it may look soft on the card.');
  }

  const scale = downscaleFactor(naturalSize, MAX_SOURCE_EDGE);
  if (scale === 1) {
    return { bitmap, size: naturalSize, naturalSize, format, warnings };
  }

  const resized = await resample(bitmap, scale);
  // The original is no longer referenced; release its memory promptly rather
  // than waiting for GC, which matters on phones with several uploads a session.
  bitmap.close();

  return {
    bitmap: resized,
    size: { width: resized.width, height: resized.height },
    naturalSize,
    format,
    warnings,
  };
}

/**
 * Whether the browser can decode this blob without help.
 *
 * Safari decodes HEIC natively, so on iOS we skip the wasm conversion entirely
 * and save several hundred milliseconds plus the download.
 */
async function canDecodeNatively(file: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

async function convertHeic(file: Blob): Promise<Blob> {
  try {
    const { heicTo } = await import('heic-to');
    return await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
  } catch {
    throw new PhotoError(
      "That HEIC photo couldn't be read. On iPhone, try sharing it as JPEG.",
      'decode-failed',
    );
  }
}

/**
 * Decodes to a bitmap with EXIF orientation already applied.
 *
 * `imageOrientation: 'from-image'` is what keeps iPhone portraits upright.
 * Browsers that do not support the option fall back to an <img> element, which
 * applies orientation by default.
 */
async function decodeOriented(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    // Either the option is unsupported or the blob is not decodable; the element
    // path distinguishes the two by succeeding in the first case.
  }

  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('image element failed to load'));
      image.src = url;
    });
    return await createImageBitmap(image);
  } catch {
    throw new PhotoError(
      "That photo couldn't be opened. It may be damaged — try another one.",
      'decode-failed',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Resamples a bitmap by `scale` using the canvas' own smoothing. */
async function resample(bitmap: ImageBitmap, scale: number): Promise<ImageBitmap> {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return bitmap;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);

  return createImageBitmap(canvas as unknown as CanvasImageSource);
}

/** OffscreenCanvas where available, falling back to a detached element. */
function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Best-effort face box, in source pixel coordinates.
 *
 * Progressive enhancement: the Shape Detection API exists only in some Chromium
 * builds. Any absence or failure returns null and the caller centres the photo,
 * so behaviour is identical everywhere else.
 */
export async function detectFace(
  bitmap: ImageBitmap,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  if (typeof FaceDetector === 'undefined') return null;
  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    const faces = await detector.detect(bitmap);
    if (faces.length === 0) return null;

    // With several faces, the largest is almost always the card's subject.
    const largest = faces.reduce((best, face) =>
      face.boundingBox.width * face.boundingBox.height >
      best.boundingBox.width * best.boundingBox.height
        ? face
        : best,
    );
    const { x, y, width, height } = largest.boundingBox;
    return { x, y, width, height };
  } catch {
    return null;
  }
}
