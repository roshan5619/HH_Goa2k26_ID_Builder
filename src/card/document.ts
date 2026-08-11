/**
 * Drawing pieces specific to the builder-passport layout.
 *
 * The card is styled as a travel document rather than a badge, which fits an
 * event people fly to: the photo sits in a passport-photo panel, the fields read
 * as data rows, entry clearance replaces a generic list, and a machine-readable
 * zone runs along the bottom.
 */

import { COLORS, EVENT, FONTS } from '../brand/tokens';
import { drawText, drawTextFitted, fillRoundRect, roundRectPath, type Ctx, type Rect } from './primitives';

/**
 * A rubber stamp pressed onto the page at an angle.
 *
 * Drawn with reduced alpha and a slightly ragged edge so it reads as ink on
 * paper rather than a crisp vector badge sitting on top of the artwork.
 */
export function inkedStamp(
  ctx: Ctx,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  ctx.lineWidth = radius * 0.07;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = radius * 0.035;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
  ctx.stroke();

  const label = { family: FONTS.mono, weight: 700, size: radius * 0.16, color };

  arcLabel(ctx, EVENT.stampTop, radius * 0.62, label, Math.PI * 1.3, Math.PI * 0.4);
  arcLabel(ctx, EVENT.stampBottom, radius * 0.62, label, Math.PI * 0.8, -Math.PI * 0.6, true);

  // Centre block: the event dates, framed by two rules.
  ctx.lineWidth = radius * 0.03;
  for (const dy of [-radius * 0.22, radius * 0.22]) {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.42, dy);
    ctx.lineTo(radius * 0.42, dy);
    ctx.stroke();
  }
  drawText(ctx, 'GOA', 0, -radius * 0.06, {
    family: FONTS.sans,
    weight: 800,
    size: radius * 0.3,
    color,
    tracking: 1,
  });
  drawText(ctx, EVENT.datesShort, 0, radius * 0.13, {
    family: FONTS.mono,
    weight: 700,
    size: radius * 0.12,
    color,
  });

  ctx.restore();
}

/** Places glyphs along an arc, used by the stamp's ring text. */
function arcLabel(
  ctx: Ctx,
  text: string,
  radius: number,
  style: { family: string; weight: number; size: number; color: string },
  startAngle: number,
  sweep: number,
  flip = false,
): void {
  ctx.save();
  ctx.font = `${style.weight} ${style.size}px ${style.family}`;
  ctx.fillStyle = style.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const glyphs = [...text];
  const step = sweep / Math.max(1, glyphs.length - 1);

  glyphs.forEach((glyph, index) => {
    const angle = startAngle + step * index;
    ctx.save();
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.rotate(angle + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

/**
 * A labelled data row, as printed on an identity document.
 *
 * The small caption above the value is what makes the layout read as an official
 * record rather than a form; the value is fitted so long entries shrink instead
 * of colliding with the next field.
 */
export function dataRow(
  ctx: Ctx,
  x: number,
  y: number,
  maxWidth: number,
  label: string,
  value: string,
  options: { labelSize: number; valueSize: number; valueColor?: string; minValueSize: number },
): void {
  drawText(ctx, label, x, y, {
    family: FONTS.mono,
    weight: 700,
    size: options.labelSize,
    color: COLORS.pink,
    tracking: 1.3,
    align: 'left',
  });

  drawTextFitted(
    ctx,
    value,
    x,
    y + options.valueSize * 0.95,
    maxWidth,
    {
      family: FONTS.sans,
      weight: 800,
      size: options.valueSize,
      color: options.valueColor ?? COLORS.green,
      tracking: 0.6,
      align: 'left',
    },
    options.minValueSize,
  );
}

/** The four event days, stamped as entry clearance. */
export const CLEARANCE_DAYS = [
  { day: '01', name: 'GENESIS' },
  { day: '02', name: 'TRIANGLE' },
  { day: '03', name: 'BUILD' },
  { day: '04', name: 'LAUNCH' },
] as const;

/**
 * A small dated entry stamp for one event day.
 *
 * Each is rotated a little differently so the row looks hand-stamped; a
 * perfectly aligned row would undo the effect the whole layout is going for.
 */
export function clearanceStamp(
  ctx: Ctx,
  rect: Rect,
  day: string,
  name: string,
  color: string,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.rotate(rotation);

  const local = {
    x: -rect.width / 2,
    y: -rect.height / 2,
    width: rect.width,
    height: rect.height,
  };

  // Dashed outline, like a perforated stamp impression.
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  roundRectPath(ctx, local, rect.height * 0.16);
  ctx.stroke();
  ctx.restore();

  drawText(ctx, `DAY ${day}`, 0, local.y + rect.height * 0.3, {
    family: FONTS.mono,
    weight: 700,
    size: rect.height * 0.19,
    color,
    tracking: 1,
  });

  drawTextFitted(ctx, name, 0, local.y + rect.height * 0.62, rect.width * 0.84, {
    family: FONTS.sans,
    weight: 800,
    size: rect.height * 0.24,
    color: COLORS.green,
    tracking: 0.4,
  });

  // Tick, marking the day as cleared.
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const ty = local.y + rect.height * 0.84;
  ctx.beginPath();
  ctx.moveTo(-rect.width * 0.08, ty);
  ctx.lineTo(-rect.width * 0.02, ty + rect.height * 0.07);
  ctx.lineTo(rect.width * 0.09, ty - rect.height * 0.08);
  ctx.stroke();

  ctx.restore();
}

/** Pads and uppercases a value into the chevron-filled MRZ convention. */
function mrzField(value: string, length: number): string {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '<')
    .replace(/^<+|<+$/g, '');
  return cleaned.slice(0, length).padEnd(length, '<');
}

/** Builds the two machine-readable lines printed along the bottom. */
export function mrzLines(name: string, role: string, builderId: string): [string, string] {
  const id = builderId.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Line 1: document type, issuing code, then the holder's name.
  const line1 = `PB<GOA${mrzField(name || 'BUILDER', 38)}`;
  // Line 2: document number, nationality, validity, then the holder's role.
  const line2 = `${mrzField(id, 12)}6IND2610284M${mrzField(role || 'BUILDER', 19)}`;

  return [line1.slice(0, 44), line2.slice(0, 44)];
}

/**
 * The machine-readable zone: two monospaced lines on a dark band.
 *
 * Glyphs are placed on a fixed pitch rather than drawn as a string, so the
 * columns line up exactly between the two rows the way a real MRZ does.
 */
export function machineReadableZone(ctx: Ctx, rect: Rect, lines: [string, string]): void {
  ctx.save();
  fillRoundRect(ctx, rect, rect.height * 0.12, COLORS.green);

  const columns = 44;
  const pitch = (rect.width * 0.94) / columns;
  const startX = rect.x + rect.width * 0.03 + pitch / 2;
  const size = pitch * 1.28;

  ctx.font = `700 ${size}px ${FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  lines.forEach((line, row) => {
    const y = rect.y + rect.height * (row === 0 ? 0.34 : 0.7);
    for (let column = 0; column < columns; column += 1) {
      const glyph = line[column] ?? '<';
      // Chevrons are filler; dimming them lets the actual data read first.
      ctx.fillStyle = glyph === '<' ? 'rgba(250,236,213,0.34)' : COLORS.cream;
      ctx.fillText(glyph, startX + column * pitch, y);
    }
  });

  ctx.restore();
}

/**
 * The passport photo panel: a rounded rectangle with the event's ring colours
 * applied as a keyline rather than as the concentric circles of a badge.
 */
export function photoPanel(ctx: Ctx, rect: Rect, radius: number): void {
  ctx.save();
  // Red plate, then a yellow inset, leaving a two-colour keyline around the photo.
  fillRoundRect(ctx, { ...rect }, radius, COLORS.red);
  fillRoundRect(
    ctx,
    {
      x: rect.x + rect.width * 0.022,
      y: rect.y + rect.height * 0.016,
      width: rect.width * 0.956,
      height: rect.height * 0.968,
    },
    radius * 0.85,
    COLORS.yellow,
  );
  ctx.restore();
}

/** Clip path for the photo itself, inset inside the keyline. */
export function photoClip(rect: Rect, radius: number): { rect: Rect; radius: number } {
  const inset = Math.min(rect.width, rect.height) * 0.045;
  return {
    rect: {
      x: rect.x + inset,
      y: rect.y + inset,
      width: rect.width - inset * 2,
      height: rect.height - inset * 2,
    },
    radius: radius * 0.7,
  };
}
