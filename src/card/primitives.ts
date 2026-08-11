/**
 * Small canvas drawing helpers shared by the compositor and the decorations.
 *
 * These exist so `renderCard` reads as a description of the card rather than a
 * wall of path arithmetic, and so behaviour like "shrink the type until the name
 * fits" is defined once instead of at every call site.
 */

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rounded rectangle path. Uses the native helper where available. */
export function roundRectPath(ctx: Ctx, rect: Rect, radius: number): void {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
    return;
  }
  // Manual fallback keeps the card renderable on older Safari.
  const { x, y, width: w, height: h } = rect;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fillRoundRect(ctx: Ctx, rect: Rect, radius: number, fill: string): void {
  roundRectPath(ctx, rect, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRoundRect(
  ctx: Ctx,
  rect: Rect,
  radius: number,
  stroke: string,
  lineWidth: number,
): void {
  roundRectPath(ctx, rect, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export interface TextStyle {
  family: string;
  weight?: number | string;
  size: number;
  color: string;
  /** Extra spacing between glyphs, in pixels. */
  tracking?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** Horizontal squeeze, used to fake the condensed cut of the wordmark. */
  squeeze?: number;
}

export function applyFont(ctx: Ctx, style: TextStyle): void {
  ctx.font = `${style.weight ?? 400} ${style.size}px ${style.family}`;
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align ?? 'center';
  ctx.textBaseline = style.baseline ?? 'middle';
}

/**
 * Measures text including manual tracking.
 *
 * `ctx.letterSpacing` is not available in every target browser, so tracking is
 * applied by drawing glyph by glyph; the width must be computed the same way or
 * centred text would drift.
 */
export function measureTracked(ctx: Ctx, text: string, tracking: number): number {
  if (tracking === 0) return ctx.measureText(text).width;
  const glyphs = [...text];
  let width = 0;
  for (const glyph of glyphs) width += ctx.measureText(glyph).width + tracking;
  return width - tracking;
}

/**
 * Draws text with optional letter tracking and horizontal squeeze.
 *
 * Returns the drawn width so callers can size a surrounding pill to the text.
 */
export function drawText(ctx: Ctx, text: string, x: number, y: number, style: TextStyle): number {
  if (!text) return 0;
  ctx.save();
  applyFont(ctx, style);

  const tracking = style.tracking ?? 0;
  const squeeze = style.squeeze ?? 1;
  const width = measureTracked(ctx, text, tracking) * squeeze;

  // Squeeze is applied as a horizontal scale about the anchor point, so the
  // caller's x stays meaningful regardless of alignment.
  ctx.translate(x, y);
  if (squeeze !== 1) ctx.scale(squeeze, 1);

  if (tracking === 0) {
    ctx.fillText(text, 0, 0);
  } else {
    // Manual tracking: start from the left edge implied by the alignment.
    const unscaledWidth = width / squeeze;
    let cursor =
      style.align === 'right' ? -unscaledWidth : style.align === 'left' ? 0 : -unscaledWidth / 2;
    ctx.textAlign = 'left';
    for (const glyph of [...text]) {
      ctx.fillText(glyph, cursor, 0);
      cursor += ctx.measureText(glyph).width + tracking;
    }
  }

  ctx.restore();
  return width;
}

/**
 * Draws text shrunk to fit `maxWidth`, never below `minSize`.
 *
 * This is what stops a long name from overflowing its banner. Past the minimum
 * size the text is ellipsised instead, so the card degrades predictably rather
 * than becoming unreadable.
 */
export function drawTextFitted(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: TextStyle,
  minSize = 18,
): number {
  let size = style.size;
  let candidate = text;

  ctx.save();
  for (;;) {
    applyFont(ctx, { ...style, size });
    const width = measureTracked(ctx, candidate, style.tracking ?? 0) * (style.squeeze ?? 1);
    if (width <= maxWidth) break;

    if (size > minSize) {
      // Shrink proportionally to the overflow, which converges in a step or two
      // rather than crawling down one pixel at a time.
      size = Math.max(minSize, Math.floor(size * Math.min(0.94, maxWidth / width)));
      continue;
    }

    if (candidate.length <= 1) break;
    candidate = `${candidate.slice(0, -2).trimEnd()}…`;
  }
  ctx.restore();

  return drawText(ctx, candidate, x, y, { ...style, size });
}

/** Horizontal dashed rule, used between the card's info columns. */
export function dashedLine(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number,
  dash: number[] = [6, 8],
): void {
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Four-pointed sparkle, scattered around the card as filler. */
export function star(ctx: Ctx, cx: number, cy: number, radius: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  // Concave diamond: each arm tapers to a point via a control point at the centre.
  const waist = radius * 0.26;
  ctx.moveTo(cx, cy - radius);
  ctx.quadraticCurveTo(cx + waist, cy - waist, cx + radius, cy);
  ctx.quadraticCurveTo(cx + waist, cy + waist, cx, cy + radius);
  ctx.quadraticCurveTo(cx - waist, cy + waist, cx - radius, cy);
  ctx.quadraticCurveTo(cx - waist, cy - waist, cx, cy - radius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draws text around a circular arc — used by the rubber stamp. */
export function arcText(
  ctx: Ctx,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  style: TextStyle,
  options: { startAngle: number; sweep: number; flip?: boolean },
): void {
  ctx.save();
  applyFont(ctx, style);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const glyphs = [...text];
  const step = options.sweep / Math.max(1, glyphs.length - 1);

  glyphs.forEach((glyph, index) => {
    const angle = options.startAngle + step * index;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    // Upright along the arc; the bottom half is flipped so it reads left to right.
    ctx.rotate(angle + (options.flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}
