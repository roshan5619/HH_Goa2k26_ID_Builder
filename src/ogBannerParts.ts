/**
 * Drawing helpers used only by the build-time OG banner harness.
 *
 * Kept separate from src/card so the production bundle carries none of it.
 */

import { COLORS } from './brand/tokens';
import { palmTree } from './card/decor';
import { drawText as drawCardText, type Ctx, type TextStyle } from './card/primitives';

export const drawText = (
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
): number => drawCardText(ctx, text, x, y, style);

/** Faint palm silhouettes and a weave, so the banner is not a flat green field. */
export function palmSilhouetteBackdrop(ctx: Ctx, width: number, height: number): void {
  ctx.save();

  // Diagonal weave matching the app's page background.
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 2;
  for (let offset = -height; offset < width + height; offset += 9) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + height, height);
    ctx.stroke();
  }

  // Palms pushed to the edges and dimmed so they never compete with the type.
  ctx.globalAlpha = 0.16;
  palmTree(ctx, width * 0.03, height * 0.99, 1.5);
  palmTree(ctx, width * 0.985, height * 0.92, 1.3, -1);
  palmTree(ctx, width * 0.93, height * 1.02, 1.7, -1);
  ctx.globalAlpha = 1;

  // Sand strip along the very bottom.
  ctx.fillStyle = 'rgba(245,196,25,0.10)';
  ctx.fillRect(0, height - 10, width, 10);

  ctx.restore();
}

export { COLORS };
