/**
 * QR generation for the card's footer block.
 *
 * The QR points at the tool itself, so anyone who sees a posted card can scan it
 * and make their own. The matrix is produced once per URL and cached — it is
 * pure input-to-output and re-deriving it on every keystroke would be wasteful.
 */

import QRCode from 'qrcode';

const cache = new Map<string, boolean[][]>();

/** Builds a boolean module matrix for `text`, or null if generation fails. */
export function qrMatrix(text: string): boolean[][] | null {
  const cached = cache.get(text);
  if (cached) return cached;

  try {
    // Medium correction leaves the code readable from a phone screenshot while
    // keeping the module count low enough to stay crisp at the printed size.
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const { size, data } = qr.modules;

    const matrix: boolean[][] = [];
    for (let row = 0; row < size; row += 1) {
      const line: boolean[] = [];
      for (let col = 0; col < size; col += 1) line.push(Boolean(data[row * size + col]));
      matrix.push(line);
    }

    cache.set(text, matrix);
    return matrix;
  } catch {
    // A missing QR degrades the card gracefully; it is decoration, not content.
    return null;
  }
}
