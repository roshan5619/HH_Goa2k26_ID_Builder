/**
 * The card compositor.
 *
 * The card is a *builder passport* rather than a badge: an event people travel
 * to gets a travel document. The photo sits in a passport-photo panel, the
 * fields read as printed data rows, the four event days appear as entry
 * clearance stamps, and a machine-readable zone runs along the bottom.
 *
 * Drawn at a fixed 1080x1620 and deliberately synchronous: everything it needs
 * (fonts, the decoded bitmap, the QR matrix) is prepared by the caller, so a
 * re-render costs a few milliseconds and the preview can follow keystrokes.
 *
 * Layout constants are fractions of the card, so the design scales cleanly if
 * the export size ever changes.
 */

import { CARD, COLORS, EVENT, FONTS } from '../brand/tokens';
import { coverRect, type Transform } from './geometry';
import { palmTree, postageStamp, scooter, sunsetScene, surfboard } from './decor';
import {
  CLEARANCE_DAYS,
  clearanceStamp,
  dataRow,
  inkedStamp,
  machineReadableZone,
  mrzLines,
  photoClip,
  photoPanel,
} from './document';
import {
  dashedLine,
  drawText,
  drawTextFitted,
  fillRoundRect,
  roundRectPath,
  star,
  strokeRoundRect,
  type Ctx,
} from './primitives';

export interface CardData {
  name: string;
  role: string;
  shipping: string;
  builderClass: string;
  builderId: string;
}

export interface RenderOptions {
  data: CardData;
  /** Decoded photo; when absent a placeholder panel is drawn instead. */
  photo?: ImageBitmap | null;
  transform: Transform;
  /** QR modules as a square boolean matrix, or null to omit the QR block. */
  qr?: boolean[][] | null;
}

const W = CARD.width;
const H = CARD.height;

/** Vertical rhythm, as fractions of card height. */
const Y = {
  kicker: 0.042,
  wordmark: 0.098,
  typeRow: 0.163,
  body: 0.213,
  clearance: 0.632,
  mrz: 0.745,
  sunset: 0.838,
  footer: 0.924,
} as const;

/** The passport photo panel. 3:4, as photo booths and passports use. */
const PHOTO = {
  x: W * 0.072,
  y: H * Y.body,
  width: W * 0.315,
  height: H * 0.24,
  radius: W * 0.022,
};

export function renderCard(ctx: Ctx, options: RenderOptions): void {
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  drawPage(ctx);
  drawHeader(ctx, options.data);
  drawScenery(ctx);
  drawPhoto(ctx, options.photo ?? null, options.transform);
  drawFields(ctx, options.data);
  drawQrBlock(ctx, options.qr ?? null);
  drawClearance(ctx);
  drawFooter(ctx, options.data);

  ctx.restore();
}

/** Deep green cover with the cream data page it holds. */
function drawPage(ctx: Ctx): void {
  fillRoundRect(ctx, { x: 0, y: 0, width: W, height: H }, W * 0.05, COLORS.green);

  const inset = W * 0.024;
  fillRoundRect(
    ctx,
    { x: inset, y: inset, width: W - inset * 2, height: H - inset * 2 },
    W * 0.034,
    COLORS.cream,
  );

  // Guilloche-style hairlines: the fine repeating pattern printed across a real
  // document page. Kept very low contrast so it reads as security printing
  // rather than as decoration competing with the data.
  ctx.save();
  ctx.beginPath();
  roundRectPath(
    ctx,
    { x: inset, y: inset, width: W - inset * 2, height: H - inset * 2 },
    W * 0.034,
  );
  ctx.clip();
  ctx.strokeStyle = 'rgba(4,44,18,0.055)';
  ctx.lineWidth = 1.1;
  for (let i = -H; i < W + H; i += 13) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  const keyline = inset + W * 0.013;
  strokeRoundRect(
    ctx,
    { x: keyline, y: keyline, width: W - keyline * 2, height: H - keyline * 2 },
    W * 0.026,
    'rgba(4,44,18,0.2)',
    2,
  );
}

/** Kicker, wordmark, and the document type row. */
function drawHeader(ctx: Ctx, data: CardData): void {
  drawText(ctx, 'REPUBLIC OF BUILDERS', W * 0.5, H * Y.kicker, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.022,
    color: COLORS.pink,
    tracking: 5,
  });

  // HACKER गोवा HOUSE lockup. Bodoni Moda squeezed horizontally approximates
  // the condensed Didone of the event wordmark rather than substituting a
  // different face.
  const display = {
    family: FONTS.display,
    weight: 900,
    size: W * 0.116,
    color: COLORS.green,
    squeeze: 0.76,
    align: 'center' as const,
  };
  drawTextFitted(ctx, 'HACKER', W * 0.268, H * Y.wordmark, W * 0.33, display, W * 0.07);
  drawTextFitted(ctx, 'HOUSE', W * 0.735, H * Y.wordmark, W * 0.33, display, W * 0.07);

  ctx.save();
  ctx.translate(W * 0.513, H * (Y.wordmark + 0.001));
  ctx.rotate(-0.1);
  const sticker = { x: -W * 0.073, y: -H * 0.026, width: W * 0.146, height: H * 0.052 };
  fillRoundRect(ctx, sticker, sticker.height * 0.4, COLORS.pink);
  strokeRoundRect(ctx, sticker, sticker.height * 0.4, COLORS.yellow, 4.5);
  drawText(ctx, 'गोवा', 0, H * 0.002, {
    family: FONTS.devanagari,
    weight: 800,
    size: W * 0.058,
    color: COLORS.yellow,
  });
  ctx.restore();

  // Double rule under the wordmark, as on a document header.
  const ruleY = H * 0.134;
  ctx.strokeStyle = 'rgba(4,44,18,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.072, ruleY);
  ctx.lineTo(W * 0.928, ruleY);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(W * 0.072, ruleY + H * 0.005);
  ctx.lineTo(W * 0.928, ruleY + H * 0.005);
  ctx.stroke();

  postageStamp(ctx, W * 0.782, H * 0.1485, W * 0.14, H * 0.058);

  // Type / code / number, the way a passport heads its data page.
  const cells: Array<[string, string, number]> = [
    ['TYPE', 'B', 0.072],
    ['CODE', 'GOA', 0.2],
    ['PASSPORT No.', data.builderId, 0.42],
  ];
  for (const [label, value, x] of cells) {
    drawText(ctx, label, W * x, H * Y.typeRow, {
      family: FONTS.mono,
      weight: 700,
      size: W * 0.018,
      color: COLORS.pink,
      tracking: 1.2,
      align: 'left',
    });
    drawTextFitted(
      ctx,
      value,
      W * x,
      H * (Y.typeRow + 0.026),
      W * 0.34,
      {
        family: FONTS.mono,
        weight: 700,
        size: W * 0.031,
        color: COLORS.green,
        tracking: 1,
        align: 'left',
      },
      W * 0.019,
    );
  }
}

/** Marginal scenery, kept light so the card still reads as a document. */
function drawScenery(ctx: Ctx): void {
  palmTree(ctx, W * 0.945, H * 0.315, (H * 0.055) / 100, -1);
  palmTree(ctx, W * 0.055, H * 0.62, (H * 0.042) / 100);

  surfboard(ctx, W * 0.945, H * 0.60, (H * 0.07) / 192, 0.22, COLORS.pink, COLORS.cream);
  scooter(ctx, W * 0.7, H * 0.585, (H * 0.03) / 45);

  star(ctx, W * 0.947, H * 0.20, W * 0.012, COLORS.yellowDeep);
  star(ctx, W * 0.055, H * 0.19, W * 0.01, COLORS.pink);
}

/** The passport photo panel. */
function drawPhoto(ctx: Ctx, photo: ImageBitmap | null, transform: Transform): void {
  photoPanel(ctx, PHOTO, PHOTO.radius);
  const { rect, radius } = photoClip(PHOTO, PHOTO.radius);

  ctx.save();
  roundRectPath(ctx, rect, radius);
  ctx.clip();

  if (photo) {
    // The crop maths works against a square frame; using the panel's longer
    // edge guarantees cover on both axes, and the clip trims the overhang.
    const frame = Math.max(rect.width, rect.height);
    const box = coverRect({ width: photo.width, height: photo.height }, frame, transform);
    ctx.drawImage(
      photo,
      rect.x + (rect.width - frame) / 2 + box.x,
      rect.y + (rect.height - frame) / 2 + box.y,
      box.width,
      box.height,
    );
  } else {
    ctx.fillStyle = COLORS.creamDim;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    // Photo-booth silhouette, so an empty panel still looks intentional.
    ctx.fillStyle = 'rgba(4,44,18,0.28)';
    ctx.beginPath();
    ctx.arc(rect.x + rect.width / 2, rect.y + rect.height * 0.4, rect.width * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      rect.x + rect.width / 2,
      rect.y + rect.height * 1.02,
      rect.width * 0.36,
      rect.height * 0.34,
      0,
      Math.PI,
      Math.PI * 2,
    );
    ctx.fill();
    drawText(ctx, 'PHOTO', rect.x + rect.width / 2, rect.y + rect.height * 0.86, {
      family: FONTS.mono,
      weight: 700,
      size: rect.width * 0.11,
      color: 'rgba(4,44,18,0.5)',
      tracking: 3,
    });
  }

  ctx.restore();

  ctx.save();
  roundRectPath(ctx, rect, radius);
  ctx.strokeStyle = 'rgba(4,44,18,0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

/** The printed data rows beside the photo. */
function drawFields(ctx: Ctx, data: CardData): void {
  const x = W * 0.435;
  const maxWidth = W * 0.5;
  const style = {
    labelSize: W * 0.018,
    valueSize: W * 0.038,
    minValueSize: W * 0.019,
  };

  const rows: Array<[string, string, string?]> = [
    ['NAME / नाम', data.name.trim().toUpperCase() || 'YOUR NAME'],
    ['STACK / ROLE', data.role.trim().toUpperCase() || 'BUILDER'],
    ['BUILDER CLASS', data.builderClass, COLORS.pink],
    ['NOW SHIPPING', data.shipping.trim().toUpperCase() || 'SOMETHING NEW'],
  ];

  rows.forEach(([label, value, color], index) => {
    dataRow(ctx, x, H * (Y.body + 0.012) + index * H * 0.072, maxWidth, label, value, {
      ...style,
      valueColor: color,
    });
  });

  // Validity and issuing authority sit under the photo, across the full width.
  const footY = H * 0.505;
  dataRow(ctx, W * 0.435, footY, W * 0.22, 'VALID', EVENT.dates, {
    labelSize: W * 0.018,
    valueSize: W * 0.026,
    minValueSize: W * 0.016,
  });
  dataRow(ctx, W * 0.7, footY, W * 0.23, 'AUTHORITY', EVENT.organiser, {
    labelSize: W * 0.018,
    valueSize: W * 0.026,
    minValueSize: W * 0.016,
  });

  // The stamp is pressed across the lower corner of the photo, the way a real
  // document is franked over its portrait, and stops short of the data column
  // so no field is ever obscured.
  inkedStamp(ctx, W * 0.305, H * 0.424, W * 0.103, -0.28, COLORS.red);
}

/** QR block under the photo. */
function drawQrBlock(ctx: Ctx, qr: boolean[][] | null): void {
  const size = W * 0.115;
  const x = PHOTO.x;
  const y = H * 0.474;

  if (qr && qr.length > 0) {
    const modules = qr.length;
    const quiet = 2;
    const cell = size / (modules + quiet * 2);

    ctx.save();
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = COLORS.green;
    for (let row = 0; row < modules; row += 1) {
      for (let column = 0; column < modules; column += 1) {
        if (!qr[row][column]) continue;
        // Slight overdraw closes hairline seams between adjacent modules.
        ctx.fillRect(x + (column + quiet) * cell, y + (row + quiet) * cell, cell + 0.5, cell + 0.5);
      }
    }
    ctx.restore();
  }

  drawText(ctx, 'SCAN TO ISSUE', x + size + W * 0.018, y + H * 0.018, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.017,
    color: COLORS.green,
    tracking: 1,
    align: 'left',
  });
  drawText(ctx, 'YOUR OWN', x + size + W * 0.018, y + H * 0.037, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.017,
    color: COLORS.green,
    tracking: 1,
    align: 'left',
  });
}

/** The four event days, stamped as entry clearance. */
function drawClearance(ctx: Ctx): void {
  const top = H * Y.clearance;

  dashedLine(ctx, W * 0.072, top - H * 0.012, W * 0.928, top - H * 0.012, 'rgba(4,44,18,0.4)', 2, [
    5, 7,
  ]);

  drawText(ctx, 'ENTRY CLEARANCE', W * 0.072, top + H * 0.012, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.019,
    color: COLORS.pink,
    tracking: 2,
    align: 'left',
  });
  drawText(ctx, '4 DAYS · ONE RHYTHM', W * 0.928, top + H * 0.012, {
    family: FONTS.mono,
    weight: 400,
    size: W * 0.019,
    color: 'rgba(4,44,18,0.6)',
    tracking: 1,
    align: 'right',
  });

  const colors = [COLORS.yellowDeep, COLORS.pink, COLORS.red, COLORS.greenLight];
  const rotations = [-0.035, 0.028, -0.02, 0.038];
  const gap = W * 0.018;
  const width = (W * 0.856 - gap * 3) / 4;
  const height = H * 0.062;

  CLEARANCE_DAYS.forEach((entry, index) => {
    clearanceStamp(
      ctx,
      { x: W * 0.072 + index * (width + gap), y: top + H * 0.026, width, height },
      entry.day,
      entry.name,
      colors[index],
      rotations[index],
    );
  });
}

/** Machine-readable zone, sunset band and the hashtag footer. */
function drawFooter(ctx: Ctx, data: CardData): void {
  machineReadableZone(
    ctx,
    { x: W * 0.072, y: H * Y.mrz, width: W * 0.856, height: H * 0.072 },
    mrzLines(data.name, data.role, data.builderId),
  );

  const scene = { x: W * 0.072, y: H * Y.sunset, width: W * 0.856, height: H * 0.062 };
  ctx.save();
  roundRectPath(ctx, scene, W * 0.018);
  ctx.clip();
  sunsetScene(ctx, scene);
  ctx.restore();

  const banner = { x: W * 0.245, y: H * Y.footer, width: W * 0.51, height: H * 0.038 };
  fillRoundRect(ctx, banner, banner.height * 0.5, COLORS.pink);
  strokeRoundRect(ctx, banner, banner.height * 0.5, COLORS.cream, 3.5);
  drawTextFitted(ctx, EVENT.hashtag, W * 0.5, banner.y + banner.height * 0.54, banner.width * 0.86, {
    family: FONTS.sans,
    weight: 800,
    size: W * 0.033,
    color: COLORS.cream,
    tracking: 2.6,
  });
}

/**
 * Waits until the brand fonts are loaded and measurable.
 *
 * The compositor must not run before this resolves: canvas would silently
 * substitute a fallback face and every measured width would be wrong, which
 * shows up as misaligned rows rather than an obvious error.
 */
export async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`900 ${W * 0.116}px "Bodoni Moda"`),
      document.fonts.load(`800 ${W * 0.058}px "Baloo 2"`, 'गोवा'),
      document.fonts.load(`700 ${W * 0.031}px "Space Mono"`),
      document.fonts.load(`400 ${W * 0.019}px "Space Mono"`),
      document.fonts.load(`800 ${W * 0.038}px "Archivo"`),
    ]);
    await document.fonts.ready;
  } catch {
    // A font failure must not block the card; the fallbacks in FONTS apply.
  }
}
