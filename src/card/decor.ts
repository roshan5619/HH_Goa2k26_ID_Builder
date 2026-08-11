/**
 * Vector decorations for the card.
 *
 * Everything here is drawn with paths rather than loaded as artwork, so the card
 * composes synchronously with no image fetches, scales to any export size, and
 * adds nothing to the initial payload.
 *
 * Each function draws in its own coordinate space and takes a position plus a
 * scale, so the compositor can place motifs without tracking path internals.
 */

import { COLORS, EVENT, FONTS } from '../brand/tokens';
import { arcText, drawText, star, type Ctx } from './primitives';

/** Coconut palm: curved trunk with a crown of drooping fronds. */
export function palmTree(ctx: Ctx, x: number, y: number, scale: number, lean = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * lean, scale);

  // Trunk — tapered, bending away from the card edge.
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-2, -46, 16, -88);
  ctx.lineTo(24, -84);
  ctx.quadraticCurveTo(8, -44, 6, 0);
  ctx.closePath();
  ctx.fillStyle = COLORS.greenMid;
  ctx.fill();

  // Trunk banding, the notched texture of a coconut palm.
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 1.6;
  for (let i = 1; i <= 6; i += 1) {
    const t = i / 7;
    const px = -6 + t * 24;
    const py = -t * 84;
    ctx.beginPath();
    ctx.moveTo(px - 3, py);
    ctx.lineTo(px + 7, py + 2);
    ctx.stroke();
  }

  // Crown: fronds radiating from the trunk top, each a tapered leaf with a spine.
  const crownX = 20;
  const crownY = -88;
  // Two rings of fronds: a darker back layer, then a lighter front layer offset
  // between them, which reads as a full crown rather than a flat fan.
  const backFronds = [-2.95, -2.45, -1.95, -1.45, -0.95, -0.45, 0.05, 0.5];
  const frontFronds = [-2.7, -2.2, -1.7, -1.2, -0.7, -0.2, 0.3];
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 1.4;

  for (const [fronds, fill, reach] of [
    [backFronds, COLORS.greenMid, 58],
    [frontFronds, COLORS.greenLight, 66],
  ] as const) {
    ctx.fillStyle = fill;
    for (const angle of fronds) {
      ctx.save();
      ctx.translate(crownX, crownY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // Droop: the tip falls below the line running out from the crown.
      ctx.quadraticCurveTo(reach * 0.5, -13, reach, 11);
      ctx.quadraticCurveTo(reach * 0.52, 4, 0, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Coconuts clustered at the crown.
  ctx.fillStyle = COLORS.terracotta;
  for (const [cx, cy] of [
    [14, -80],
    [24, -78],
    [19, -72],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Surfboard standing on its tail, with racing stripes down the deck. */
export function surfboard(
  ctx: Ctx,
  x: number,
  y: number,
  scale: number,
  tilt: number,
  body: string,
  stripe: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  // Outline: a pointed nose tapering to a rounded tail.
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.quadraticCurveTo(22, -46, 20, 32);
  ctx.quadraticCurveTo(18, 76, 0, 92);
  ctx.quadraticCurveTo(-18, 76, -20, 32);
  ctx.quadraticCurveTo(-22, -46, 0, -100);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Stripes are clipped to the board so they follow its silhouette.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = stripe;
  ctx.fillRect(-7, -100, 5, 200);
  ctx.fillRect(2, -100, 5, 200);
  ctx.restore();

  ctx.restore();
}

/** Goan house: tiled roof, shuttered windows, a veranda rail. */
export function goanHouse(ctx: Ctx, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const wall = '#F3E2C4';
  const outline = COLORS.green;
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;

  // Body.
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.rect(-52, -46, 104, 70);
  ctx.fill();
  ctx.stroke();

  // Main roof, overhanging on both sides.
  ctx.fillStyle = COLORS.terracotta;
  ctx.beginPath();
  ctx.moveTo(-64, -46);
  ctx.lineTo(0, -84);
  ctx.lineTo(64, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Roof tiling, drawn as ridges parallel to the eaves.
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i <= 3; i += 1) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(-64 + t * 64, -46 - t * 38);
    ctx.lineTo(64 - t * 64, -46 - t * 38);
    ctx.stroke();
  }

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;

  // Shuttered windows flanking a central door.
  for (const [wx, colour] of [
    [-34, COLORS.pink],
    [34, COLORS.yellow],
  ] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.rect(wx - 13, -34, 26, 24);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, -34);
    ctx.lineTo(wx, -10);
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.terracotta;
  ctx.beginPath();
  ctx.rect(-13, -8, 26, 32);
  ctx.fill();
  ctx.stroke();

  // Veranda rail along the front.
  ctx.beginPath();
  ctx.moveTo(-52, 24);
  ctx.lineTo(52, 24);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let i = -46; i <= 46; i += 11) {
    ctx.beginPath();
    ctx.moveTo(i, 10);
    ctx.lineTo(i, 24);
    ctx.stroke();
  }

  ctx.restore();
}

/** Scooter in side profile — the way most people actually get around Goa. */
export function scooter(ctx: Ctx, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.green;

  // Wheels.
  ctx.fillStyle = COLORS.green;
  for (const wx of [-26, 26]) {
    ctx.beginPath();
    ctx.arc(wx, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.creamDim;
    ctx.beginPath();
    ctx.arc(wx, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.green;
  }

  // Body: floorboard rising into the seat.
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.lineTo(6, -6);
  ctx.lineTo(14, -20);
  ctx.lineTo(30, -20);
  ctx.quadraticCurveTo(34, -8, 26, -6);
  ctx.lineTo(20, -6);
  ctx.quadraticCurveTo(4, 2, -26, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Handlebars and front column.
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.lineTo(-32, -30);
  ctx.lineTo(-44, -34);
  ctx.stroke();

  ctx.restore();
}

/** Circular rubber stamp: BUILD IN GOA / SHIP FROM PARADISE around a ring. */
export function circularStamp(ctx: Ctx, cx: number, cy: number, radius: number): void {
  ctx.save();
  ctx.strokeStyle = COLORS.green;

  ctx.lineWidth = radius * 0.055;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = radius * 0.03;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  const label = {
    family: FONTS.mono,
    weight: 700,
    size: radius * 0.155,
    color: COLORS.green,
  };

  // Top text runs across the upper arc, bottom text across the lower arc flipped
  // so both read left to right. The sweeps are proportional to the string
  // lengths, which keeps the glyph spacing even between the two labels.
  arcText(ctx, EVENT.stampTop, cx, cy, radius * 0.66, label, {
    startAngle: Math.PI * 1.28,
    sweep: Math.PI * 0.44,
  });
  arcText(ctx, EVENT.stampBottom, cx, cy, radius * 0.66, label, {
    startAngle: Math.PI * 0.82,
    sweep: -Math.PI * 0.64,
    flip: true,
  });

  // Centre mark: a small palm silhouette between two rules.
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = radius * 0.03;
  for (const dy of [-radius * 0.3, radius * 0.3]) {
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.3, cy + dy);
    ctx.lineTo(cx + radius * 0.3, cy + dy);
    ctx.stroke();
  }
  star(ctx, cx, cy, radius * 0.2, COLORS.green);

  ctx.restore();
}

/** Perforated postage stamp reading GOA / INDIA over a beach vignette. */
export function postageStamp(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();

  // Body of the stamp, with a green rule just inside the perforated edge.
  ctx.fillStyle = COLORS.creamDim;
  ctx.fillRect(x, y, w, h);

  // Perforations are punched by painting the surrounding cream back over the
  // edge, so the scalloped silhouette reads as cut paper rather than as a row
  // of outlined dots.
  ctx.fillStyle = COLORS.cream;
  const notch = Math.min(w, h) * 0.045;
  const stepX = w / Math.max(1, Math.round(w / (notch * 2.4)));
  const stepY = h / Math.max(1, Math.round(h / (notch * 2.4)));
  for (let px = x; px <= x + w + 0.1; px += stepX) {
    for (const py of [y, y + h]) {
      ctx.beginPath();
      ctx.arc(px, py, notch, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let py = y; py <= y + h + 0.1; py += stepY) {
    for (const px of [x, x + w]) {
      ctx.beginPath();
      ctx.arc(px, py, notch, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Inner picture: sea, sand and a palm.
  const pad = w * 0.13;
  const inner = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();

  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h * 0.62);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(inner.x, inner.y + inner.h * 0.62, inner.w, inner.h * 0.38);
  ctx.fillStyle = COLORS.yellow;
  ctx.beginPath();
  ctx.arc(inner.x + inner.w * 0.72, inner.y + inner.h * 0.26, inner.w * 0.13, 0, Math.PI * 2);
  ctx.fill();
  palmTree(ctx, inner.x + inner.w * 0.32, inner.y + inner.h * 0.78, inner.h / 150);
  ctx.restore();

  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);

  // Denomination text, as on a real stamp.
  drawText(ctx, 'GOA', x + w * 0.5, y + h * 0.14, {
    family: FONTS.mono,
    weight: 700,
    size: h * 0.13,
    color: COLORS.green,
    tracking: h * 0.02,
  });
  drawText(ctx, 'INDIA', x + w * 0.5, y + h * 0.88, {
    family: FONTS.mono,
    weight: 700,
    size: h * 0.11,
    color: COLORS.green,
    tracking: h * 0.02,
  });

  ctx.restore();
}

/**
 * Sunset band that sits above the footer: sun, banded sky, sea and a headland.
 * Drawn clipped to `rect` so it reads as a window cut into the card.
 */
export function sunsetScene(
  ctx: Ctx,
  rect: { x: number; y: number; width: number; height: number },
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  ctx.fillStyle = COLORS.green;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  const horizon = rect.y + rect.height * 0.62;
  const sunX = rect.x + rect.width * 0.5;

  // Sun as concentric bands, echoing the poster's pixel-sunset treatment.
  const bands = [COLORS.yellow, COLORS.yellowDeep, COLORS.terracotta, COLORS.pink];
  const sunRadius = rect.height * 0.46;
  bands.forEach((colour, index) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(sunX, horizon, sunRadius * (1 - index * 0.22), Math.PI, Math.PI * 2);
    ctx.fill();
  });

  // Sea: horizontal rules that thin out towards the horizon.
  ctx.strokeStyle = COLORS.yellow;
  for (let i = 0; i < 7; i += 1) {
    const t = i / 7;
    ctx.globalAlpha = 0.85 - t * 0.55;
    ctx.lineWidth = 1 + t * 2.6;
    const y = horizon + 4 + t * (rect.height * 0.36);
    const inset = rect.width * (0.06 + t * 0.1);
    ctx.beginPath();
    ctx.moveTo(rect.x + inset, y);
    ctx.lineTo(rect.x + rect.width - inset, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Headlands framing the bay.
  ctx.fillStyle = COLORS.green;
  ctx.beginPath();
  ctx.moveTo(rect.x, horizon + 2);
  ctx.quadraticCurveTo(rect.x + rect.width * 0.14, horizon - rect.height * 0.3, rect.x + rect.width * 0.3, horizon + 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * 0.72, horizon + 2);
  ctx.quadraticCurveTo(rect.x + rect.width * 0.86, horizon - rect.height * 0.34, rect.x + rect.width, horizon + 2);
  ctx.closePath();
  ctx.fill();

  palmTree(ctx, rect.x + rect.width * 0.12, horizon + 2, rect.height / 190);
  palmTree(ctx, rect.x + rect.width * 0.88, horizon + 2, rect.height / 210, -1);

  ctx.restore();
}

/** Speech bubble with a tail, used for the LET'S BUILD! callout. */
export function speechBubble(
  ctx: Ctx,
  rect: { x: number; y: number; width: number; height: number },
  fill: string,
  tailSide: 'left' | 'right',
): void {
  const r = rect.height * 0.32;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 3.4;

  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, r);
  ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, r);
  ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, r);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tail drawn as a separate triangle, then re-filled to hide the seam.
  const tailX = tailSide === 'left' ? rect.x + rect.width * 0.22 : rect.x + rect.width * 0.78;
  const dir = tailSide === 'left' ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(tailX, rect.y + rect.height - 2);
  ctx.lineTo(tailX + dir * rect.height * 0.34, rect.y + rect.height + rect.height * 0.42);
  ctx.lineTo(tailX + dir * rect.height * 0.05, rect.y + rect.height - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.rect(tailX - rect.height * 0.1, rect.y + rect.height - 4, rect.height * 0.5, 4);
  ctx.fill();

  ctx.restore();
}
