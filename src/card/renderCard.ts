/**
 * The card compositor.
 *
 * Draws the complete Hacker House Goa 2026 builder badge at a fixed 1080x1620
 * and is deliberately synchronous: everything it needs (fonts, the decoded
 * bitmap, the QR matrix) is prepared by the caller, so a re-render costs a few
 * milliseconds and the preview can follow keystrokes without debouncing tricks.
 *
 * Layout constants are fractions of the card, measured from the event's
 * reference artwork (brand/SampleOutput1.png) rather than estimated, so the
 * proportions match the printed badge and the design scales cleanly if the
 * export size ever changes.
 */

import { CARD, COLORS, EVENT, FONTS } from '../brand/tokens';
import { coverRect, type Transform } from './geometry';
import {
  circularStamp,
  goanHouse,
  palmTree,
  postageStamp,
  scooter,
  speechBubble,
  sunsetScene,
  surfboard,
} from './decor';
import {
  dashedLine,
  drawText,
  drawTextFitted,
  fillRoundRect,
  star,
  strokeRoundRect,
  type Ctx,
} from './primitives';

export interface CardData {
  name: string;
  role: string;
  shipping: string;
  beachBag: string[];
  builderClass: string;
  builderId: string;
}

export interface RenderOptions {
  data: CardData;
  /** Decoded photo; when absent a placeholder frame is drawn instead. */
  photo?: ImageBitmap | null;
  transform: Transform;
  /** QR modules as a square boolean matrix, or null to omit the QR block. */
  qr?: boolean[][] | null;
}

const W = CARD.width;
const H = CARD.height;

/**
 * Vertical rhythm, as fractions of card height. Named so the relationships
 * between bands stay legible when one of them needs to move.
 */
const Y = {
  stamps: 0.052,
  wordmark: 0.185,
  photoCentre: 0.4235,
  nameBanner: 0.606,
  roleBanner: 0.674,
  stripTop: 0.720,
  stripBottom: 0.842,
  qr: 0.849,
  sunset: 0.896,
  footerBanner: 0.934,
} as const;

/** Photo frame geometry. The ring radius is measured from the reference art. */
const PHOTO = {
  cx: W * 0.5,
  cy: H * Y.photoCentre,
  /** Outer edge of the red ring. */
  outerRadius: W * 0.2324,
};
/** Radius of the visible photo, inside both rings. */
const PHOTO_RADIUS = PHOTO.outerRadius * 0.885;

export function renderCard(ctx: Ctx, options: RenderOptions): void {
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  drawCardBase(ctx);
  drawTopFurniture(ctx);
  drawWordmark(ctx);
  drawSideRails(ctx);
  drawScenery(ctx);
  drawPhoto(ctx, options.photo ?? null, options.transform);
  drawPhotoAdornments(ctx);
  drawBanners(ctx, options.data);
  drawInfoStrip(ctx, options.data);
  drawFooter(ctx, options.data, options.qr ?? null);

  ctx.restore();
}

/** Deep green border with the cream interior it frames. */
function drawCardBase(ctx: Ctx): void {
  fillRoundRect(ctx, { x: 0, y: 0, width: W, height: H }, W * 0.052, COLORS.green);

  const inset = W * 0.023;
  fillRoundRect(
    ctx,
    { x: inset, y: inset, width: W - inset * 2, height: H - inset * 2 },
    W * 0.036,
    COLORS.cream,
  );

  // Hairline keyline just inside the cream, which gives the badge its printed feel.
  const keyline = inset + W * 0.013;
  strokeRoundRect(
    ctx,
    { x: keyline, y: keyline, width: W - keyline * 2, height: H - keyline * 2 },
    W * 0.028,
    'rgba(4,44,18,0.18)',
    2,
  );
}

/** Top tag, postage stamp and rubber stamp. */
function drawTopFurniture(ctx: Ctx): void {
  // "HH GOA 2026" tag straddling the top border.
  const tag = { width: W * 0.145, height: H * 0.062 };
  const tagRect = { x: (W - tag.width) / 2, y: H * 0.005, width: tag.width, height: tag.height };
  fillRoundRect(ctx, tagRect, W * 0.016, COLORS.pink);
  strokeRoundRect(ctx, tagRect, W * 0.016, COLORS.cream, 3);

  const tagCx = W / 2;
  drawText(ctx, 'HH', tagCx, tagRect.y + tag.height * 0.26, {
    family: FONTS.sans,
    weight: 800,
    size: W * 0.031,
    color: COLORS.cream,
    tracking: 1,
  });
  drawText(ctx, 'GOA', tagCx, tagRect.y + tag.height * 0.53, {
    family: FONTS.sans,
    weight: 800,
    size: W * 0.031,
    color: COLORS.cream,
    tracking: 1,
  });
  drawText(ctx, EVENT.year, tagCx, tagRect.y + tag.height * 0.79, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.024,
    color: COLORS.yellow,
    tracking: 1,
  });

  postageStamp(ctx, W * 0.062, H * Y.stamps, W * 0.16, H * 0.072);
  circularStamp(ctx, W * 0.845, H * (Y.stamps + 0.036), W * 0.082);
}

/** HACKER गोवा HOUSE lockup — the wordmark spans nearly the full card width. */
function drawWordmark(ctx: Ctx): void {
  const baseline = H * Y.wordmark;

  // The event wordmark is a condensed Didone; Bodoni Moda is squeezed
  // horizontally to approximate that cut rather than substituting another face.
  const display = {
    family: FONTS.display,
    weight: 900,
    size: W * 0.132,
    color: COLORS.green,
    squeeze: 0.76,
    align: 'center' as const,
  };

  // The two words sit either side of centre so the गोवा sticker can overlap the
  // join, exactly as in the event artwork. Each is fitted to its half of the
  // card so the lockup can never run past the cream into the border.
  const halfWidth = W * 0.4;
  drawTextFitted(ctx, 'HACKER', W * 0.253, baseline, halfWidth, display, W * 0.09);
  drawTextFitted(ctx, 'HOUSE', W * 0.752, baseline, halfWidth, display, W * 0.09);

  // गोवा sticker: rotated lozenge with yellow Devanagari on pink. It straddles
  // the gap between the two words, clipping the R only slightly, as in the art.
  ctx.save();
  ctx.translate(W * 0.523, baseline + H * 0.001);
  ctx.rotate(-0.1);
  const sticker = { x: -W * 0.082, y: -H * 0.029, width: W * 0.164, height: H * 0.058 };
  fillRoundRect(ctx, sticker, sticker.height * 0.4, COLORS.pink);
  strokeRoundRect(ctx, sticker, sticker.height * 0.4, COLORS.yellow, 5);
  drawText(ctx, 'गोवा', 0, H * 0.002, {
    family: FONTS.devanagari,
    weight: 800,
    size: W * 0.068,
    color: COLORS.yellow,
  });
  ctx.restore();
}

/** Rotated date and location rails down the card's left and right edges. */
function drawSideRails(ctx: Ctx): void {
  const rail = {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.025,
    color: COLORS.green,
    tracking: 2.6,
  } as const;

  // Pushed tight to the card edge so the badges and scenery clear them.
  ctx.save();
  ctx.translate(W * 0.047, H * 0.40);
  ctx.rotate(-Math.PI / 2);
  drawText(ctx, EVENT.dates, 0, 0, rail);
  ctx.restore();

  ctx.save();
  ctx.translate(W * 0.953, H * 0.40);
  ctx.rotate(Math.PI / 2);
  drawText(ctx, EVENT.city, 0, 0, rail);
  ctx.restore();
}

/** Foliage, props and sparkles filling the space around the portrait. */
function drawScenery(ctx: Ctx): void {
  // Palms tucked into the upper corners, leaning away from the card edge.
  palmTree(ctx, W * 0.125, H * 0.318, (H * 0.082) / 100);
  palmTree(ctx, W * 0.885, H * 0.303, (H * 0.072) / 100, -1);

  star(ctx, W * 0.20, H * 0.248, W * 0.015, COLORS.pink);
  star(ctx, W * 0.822, H * 0.238, W * 0.012, COLORS.yellowDeep);
  star(ctx, W * 0.222, H * 0.545, W * 0.013, COLORS.yellowDeep);
  star(ctx, W * 0.90, H * 0.565, W * 0.011, COLORS.pink);

  // Surfboards leaning together on the left, house and scooter on the right.
  surfboard(ctx, W * 0.098, H * 0.545, (H * 0.135) / 192, -0.22, COLORS.pink, COLORS.cream);
  surfboard(ctx, W * 0.163, H * 0.554, (H * 0.118) / 192, 0.17, COLORS.yellow, COLORS.terracotta);

  goanHouse(ctx, W * 0.835, H * 0.502, (H * 0.098) / 108);
  scooter(ctx, W * 0.735, H * 0.552, (H * 0.034) / 45);
}

/** The circular portrait with its red and yellow rings. */
function drawPhoto(ctx: Ctx, photo: ImageBitmap | null, transform: Transform): void {
  const { cx, cy, outerRadius } = PHOTO;

  // Rings drawn outward from the image so the strokes never overlap it.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.red;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius * 0.945, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.yellow;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, PHOTO_RADIUS, 0, Math.PI * 2);
  ctx.clip();

  if (photo) {
    const frame = PHOTO_RADIUS * 2;
    const rect = coverRect({ width: photo.width, height: photo.height }, frame, transform);
    ctx.drawImage(
      photo,
      cx - PHOTO_RADIUS + rect.x,
      cy - PHOTO_RADIUS + rect.y,
      rect.width,
      rect.height,
    );
  } else {
    // Placeholder: a beach vignette, so an empty card still looks composed.
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(cx - PHOTO_RADIUS, cy - PHOTO_RADIUS, PHOTO_RADIUS * 2, PHOTO_RADIUS * 2);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(cx - PHOTO_RADIUS, cy + PHOTO_RADIUS * 0.28, PHOTO_RADIUS * 2, PHOTO_RADIUS * 0.72);
    ctx.fillStyle = COLORS.yellow;
    ctx.beginPath();
    ctx.arc(cx + PHOTO_RADIUS * 0.34, cy - PHOTO_RADIUS * 0.32, PHOTO_RADIUS * 0.2, 0, Math.PI * 2);
    ctx.fill();
    palmTree(ctx, cx - PHOTO_RADIUS * 0.3, cy + PHOTO_RADIUS * 0.32, PHOTO_RADIUS * 0.007);
    drawText(ctx, 'YOUR PHOTO', cx, cy + PHOTO_RADIUS * 0.66, {
      family: FONTS.mono,
      weight: 700,
      size: PHOTO_RADIUS * 0.12,
      color: COLORS.green,
      tracking: 3,
    });
  }

  ctx.restore();

  // Inner hairline tidies the clip edge against the yellow ring.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, PHOTO_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(4,44,18,0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/** BUILD / SHIP / REPEAT badges and the LET'S BUILD! callout. */
function drawPhotoAdornments(ctx: Ctx): void {
  const words = ['BUILD', 'SHIP', 'REPEAT'];
  const fills = [COLORS.yellow, COLORS.pink, COLORS.cream];
  const inks = [COLORS.green, COLORS.cream, COLORS.green];

  words.forEach((word, index) => {
    const rect = {
      x: W * 0.082,
      y: H * (0.398 + index * 0.045),
      width: W * 0.155,
      height: H * 0.034,
    };
    ctx.save();
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.rotate(-0.05);
    const local = {
      x: -rect.width / 2,
      y: -rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
    fillRoundRect(ctx, local, rect.height * 0.34, fills[index]);
    strokeRoundRect(ctx, local, rect.height * 0.34, COLORS.green, 3.4);
    drawTextFitted(ctx, word, 0, 0, rect.width * 0.8, {
      family: FONTS.sans,
      weight: 800,
      size: W * 0.029,
      color: inks[index],
      tracking: 1.4,
    });
    ctx.restore();
  });

  const bubble = { x: W * 0.735, y: H * 0.345, width: W * 0.195, height: H * 0.042 };
  speechBubble(ctx, bubble, COLORS.yellow, 'left');
  drawTextFitted(
    ctx,
    "LET'S BUILD!",
    bubble.x + bubble.width / 2,
    bubble.y + bubble.height / 2,
    bubble.width * 0.82,
    {
      family: FONTS.sans,
      weight: 800,
      size: W * 0.029,
      color: COLORS.green,
    },
  );
}

/** Name and role banners. */
function drawBanners(ctx: Ctx, data: CardData): void {
  const nameRect = { x: W * 0.105, y: H * Y.nameBanner, width: W * 0.79, height: H * 0.05 };
  fillRoundRect(ctx, nameRect, nameRect.height * 0.32, COLORS.green);
  strokeRoundRect(ctx, nameRect, nameRect.height * 0.32, COLORS.cream, 3.5);
  drawTextFitted(
    ctx,
    data.name.trim().toUpperCase() || 'YOUR NAME',
    W * 0.5,
    nameRect.y + nameRect.height * 0.54,
    nameRect.width * 0.87,
    {
      family: FONTS.sans,
      weight: 800,
      size: W * 0.05,
      color: COLORS.cream,
      tracking: 1.6,
    },
    W * 0.024,
  );

  const roleRect = { x: W * 0.16, y: H * Y.roleBanner, width: W * 0.68, height: H * 0.036 };
  fillRoundRect(ctx, roleRect, roleRect.height * 0.4, COLORS.cream);
  strokeRoundRect(ctx, roleRect, roleRect.height * 0.4, COLORS.yellowDeep, 4);

  // A small bolt sits before the role, matching the event artwork.
  drawBolt(ctx, roleRect.x + roleRect.width * 0.08, roleRect.y + roleRect.height * 0.5, W * 0.022);

  drawTextFitted(
    ctx,
    (data.role.trim() || 'BUILDER').toUpperCase(),
    W * 0.53,
    roleRect.y + roleRect.height * 0.54,
    roleRect.width * 0.72,
    {
      family: FONTS.mono,
      weight: 700,
      size: W * 0.027,
      color: COLORS.green,
      tracking: 1.8,
    },
    W * 0.015,
  );
}

function drawBolt(ctx: Ctx, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = COLORS.yellowDeep;
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(size * 0.15, -size * 0.6);
  ctx.lineTo(-size * 0.45, size * 0.1);
  ctx.lineTo(-size * 0.05, size * 0.1);
  ctx.lineTo(-size * 0.2, size * 0.6);
  ctx.lineTo(size * 0.45, -size * 0.15);
  ctx.lineTo(size * 0.05, -size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Three-column strip: builder class, beach bag, currently shipping. */
function drawInfoStrip(ctx: Ctx, data: CardData): void {
  const top = H * Y.stripTop;
  const bottom = H * Y.stripBottom;
  const left = W * 0.062;
  const right = W * 0.938;
  const columnWidth = (right - left) / 3;

  for (const index of [1, 2]) {
    const x = left + columnWidth * index;
    dashedLine(ctx, x, top + H * 0.004, x, bottom - H * 0.008, 'rgba(4,44,18,0.4)', 2, [5, 7]);
  }

  const heading = {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.0205,
    color: COLORS.pink,
    tracking: 1.2,
  } as const;

  const columns: Array<{ label: string; render: (cx: number, width: number) => void }> = [
    {
      label: 'BUILDER CLASS',
      render: (cx, width) => {
        data.builderClass.split(' ').forEach((word, index) => {
          drawTextFitted(
            ctx,
            word,
            cx,
            top + H * 0.05 + index * H * 0.028,
            width,
            {
              family: FONTS.sans,
              weight: 800,
              size: W * 0.032,
              color: COLORS.green,
              tracking: 0.5,
            },
            W * 0.016,
          );
        });
      },
    },
    {
      label: 'BEACH BAG',
      render: (cx, width) => {
        data.beachBag.slice(0, 3).forEach((item, index) => {
          const y = top + H * 0.046 + index * H * 0.030;
          drawBagIcon(ctx, cx - width * 0.36, y, W * 0.021, index);
          drawTextFitted(
            ctx,
            item.toUpperCase(),
            cx - width * 0.22,
            y,
            width * 0.6,
            {
              family: FONTS.mono,
              weight: 400,
              size: W * 0.0225,
              color: COLORS.green,
              tracking: 0.6,
              align: 'left',
            },
            W * 0.013,
          );
        });
      },
    },
    {
      label: 'CURRENTLY SHIPPING',
      render: (cx, width) => {
        const text = (data.shipping.trim() || 'SOMETHING NEW').toUpperCase();
        wrapWords(text, 2).forEach((line, index) => {
          drawTextFitted(
            ctx,
            line,
            cx,
            top + H * 0.05 + index * H * 0.028,
            width,
            {
              family: FONTS.sans,
              weight: 800,
              size: W * 0.03,
              color: COLORS.pink,
              tracking: 0.4,
            },
            W * 0.015,
          );
        });
      },
    },
  ];

  columns.forEach((column, index) => {
    const cx = left + columnWidth * index + columnWidth / 2;
    drawText(ctx, `+ ${column.label} +`, cx, top + H * 0.013, heading);
    column.render(cx, columnWidth * 0.88);
  });
}

/** Tiny glyphs beside each beach-bag entry, cycled by index. */
function drawBagIcon(ctx: Ctx, cx: number, cy: number, size: number, index: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 2;

  if (index % 3 === 0) {
    ctx.fillStyle = COLORS.greenLight;
    ctx.beginPath();
    ctx.arc(0, size * 0.15, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.1, -size * 0.2);
    ctx.lineTo(size * 0.5, -size * 0.8);
    ctx.stroke();
  } else if (index % 3 === 1) {
    ctx.fillStyle = COLORS.sky;
    ctx.beginPath();
    ctx.rect(-size * 0.5, -size * 0.45, size, size * 0.72);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.68, size * 0.42);
    ctx.lineTo(size * 0.68, size * 0.42);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, size * 0.05, size * 0.46, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = COLORS.pink;
    for (const dx of [-size * 0.46, size * 0.46]) {
      ctx.beginPath();
      ctx.rect(dx - size * 0.13, size * 0.02, size * 0.26, size * 0.42);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** QR block, builder ID, sunset band and the hashtag footer. */
function drawFooter(ctx: Ctx, data: CardData, qr: boolean[][] | null): void {
  const stripBottom = H * Y.stripBottom;
  dashedLine(ctx, W * 0.062, stripBottom, W * 0.938, stripBottom, 'rgba(4,44,18,0.4)', 2, [5, 7]);

  // QR sits left, builder ID right, sharing one band above the sunset.
  const qrSize = W * 0.085;
  const qrX = W * 0.075;
  const qrY = H * Y.qr;
  if (qr && qr.length > 0) drawQr(ctx, qr, qrX, qrY, qrSize);

  drawText(ctx, 'SCAN TO BUILD YOURS', qrX + qrSize + W * 0.02, qrY + H * 0.013, {
    family: FONTS.mono,
    weight: 400,
    size: W * 0.0155,
    color: 'rgba(4,44,18,0.6)',
    tracking: 0.6,
    align: 'left',
  });
  drawText(ctx, EVENT.organiser, qrX + qrSize + W * 0.02, qrY + H * 0.034, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.017,
    color: 'rgba(4,44,18,0.6)',
    tracking: 0.6,
    align: 'left',
  });

  drawText(ctx, 'BUILDER ID', W * 0.845, qrY + H * 0.012, {
    family: FONTS.mono,
    weight: 700,
    size: W * 0.02,
    color: COLORS.green,
    tracking: 1.6,
  });
  drawTextFitted(
    ctx,
    data.builderId,
    W * 0.845,
    qrY + H * 0.038,
    W * 0.24,
    {
      family: FONTS.mono,
      weight: 700,
      size: W * 0.027,
      color: COLORS.pink,
      tracking: 1,
    },
    W * 0.016,
  );

  // Sunset band, clipped to a rounded window.
  const scene = { x: W * 0.062, y: H * Y.sunset, width: W * 0.876, height: H * 0.062 };
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(scene.x, scene.y, scene.width, scene.height, W * 0.02);
  } else {
    ctx.rect(scene.x, scene.y, scene.width, scene.height);
  }
  ctx.clip();
  sunsetScene(ctx, scene);
  ctx.restore();

  // Hashtag banner overlapping the bottom of the sunset band.
  const banner = { x: W * 0.235, y: H * Y.footerBanner, width: W * 0.53, height: H * 0.038 };
  fillRoundRect(ctx, banner, banner.height * 0.5, COLORS.pink);
  strokeRoundRect(ctx, banner, banner.height * 0.5, COLORS.cream, 3.5);
  drawTextFitted(
    ctx,
    EVENT.hashtag,
    W * 0.5,
    banner.y + banner.height * 0.54,
    banner.width * 0.86,
    {
      family: FONTS.sans,
      weight: 800,
      size: W * 0.034,
      color: COLORS.cream,
      tracking: 2.6,
    },
  );
}

/** Renders a QR matrix as filled modules with a quiet zone. */
function drawQr(ctx: Ctx, matrix: boolean[][], x: number, y: number, size: number): void {
  const modules = matrix.length;
  // A quiet zone is required for reliable scanning.
  const quiet = 2;
  const cell = size / (modules + quiet * 2);

  ctx.save();
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = COLORS.green;
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (!matrix[row][col]) continue;
      // Slight overdraw closes hairline seams between adjacent modules.
      ctx.fillRect(x + (col + quiet) * cell, y + (row + quiet) * cell, cell + 0.5, cell + 0.5);
    }
  }
  ctx.restore();
}

/** Splits text into at most `maxLines` roughly balanced lines. */
function wrapWords(text: string, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words.length ? words : [text];

  const perLine = Math.ceil(words.length / maxLines);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(' '));
  }
  return lines.slice(0, maxLines);
}

/**
 * Waits until the brand fonts are loaded and measurable.
 *
 * The compositor must not run before this resolves: canvas would silently
 * substitute a fallback face and every measured width would be wrong, which
 * shows up as misaligned banners rather than an obvious error.
 */
export async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    // Load the exact faces the card uses; `ready` alone can resolve before a
    // face that has not yet been requested has been fetched.
    await Promise.all([
      document.fonts.load(`900 ${W * 0.15}px "Bodoni Moda"`),
      document.fonts.load(`800 ${W * 0.068}px "Baloo 2"`, 'गोवा'),
      document.fonts.load(`700 ${W * 0.027}px "Space Mono"`),
      document.fonts.load(`400 ${W * 0.0225}px "Space Mono"`),
      document.fonts.load(`800 ${W * 0.05}px "Archivo"`),
    ]);
    await document.fonts.ready;
  } catch {
    // A font failure must not block the card; the fallbacks in FONTS apply.
  }
}
