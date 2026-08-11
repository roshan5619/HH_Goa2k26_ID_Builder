/**
 * Turning the rendered canvas into a file the user actually owns.
 *
 * The download path is entirely local — the card never leaves the device unless
 * the user explicitly chooses the link-sharing option.
 */

import { CARD } from '../brand/tokens';

/** Converts a canvas to a PNG blob, rejecting rather than resolving null. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      // toBlob yields null when the canvas is tainted or memory is exhausted;
      // callers surface this as a retry rather than failing silently.
      else reject(new Error('The card image could not be created. Try again.'));
    }, 'image/png');
  });
}

/**
 * Filename for the downloaded card.
 *
 * Non-ASCII names are common here, so anything outside a safe set is stripped
 * rather than transliterated; if nothing usable remains we fall back to a
 * generic name instead of producing a file called "-.png".
 */
export function cardFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug ? `hh-goa-2026-${slug}.png` : 'hh-goa-2026-builder-id.png';
}

/** Triggers a browser download for `blob`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';

  // Safari ignores programmatic clicks on links that are not in the document.
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers; a short
  // delay is the pragmatic fix and the object is small enough to hold briefly.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** A File carrying the card, suitable for `navigator.share`. */
export function pngToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: 'image/png', lastModified: Date.now() });
}

/** Exported card dimensions, re-exported so UI copy can quote them. */
export const CARD_SIZE = `${CARD.width}x${CARD.height}`;
