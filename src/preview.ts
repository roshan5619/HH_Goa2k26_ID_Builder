/**
 * Development-only render harness.
 *
 * Draws the card straight to a canvas with fixed sample data so the design can
 * be screenshotted headlessly and compared against the reference artwork,
 * without going through the upload flow. Not part of the production bundle
 * beyond its own entry point.
 */

import './brand/fonts.css';
import { renderCard, waitForFonts } from './card/renderCard';
import { IDENTITY_TRANSFORM } from './card/geometry';
import { qrMatrix } from './card/qr';
import { deriveBuilderClass, mintBuilderId } from './card/builderClass';

/** Generates a stand-in portrait so the frame is not empty during layout work. */
async function samplePhoto(width: number, height: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#7EC8E3');
  sky.addColorStop(1, '#F2C879');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // A simple figure, off-centre and low in frame, so the crop logic is exercised.
  const cx = width * 0.42;
  const cy = height * 0.44;
  const head = Math.min(width, height) * 0.18;
  ctx.fillStyle = '#C98A5E';
  ctx.beginPath();
  ctx.arc(cx, cy, head, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6C3FB5';
  ctx.beginPath();
  ctx.moveTo(cx - head * 1.7, height);
  ctx.quadraticCurveTo(cx, cy + head * 0.9, cx + head * 1.7, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2B1D14';
  ctx.beginPath();
  ctx.arc(cx, cy - head * 0.35, head * 0.95, Math.PI, Math.PI * 2);
  ctx.fill();

  return createImageBitmap(canvas);
}

async function main() {
  const canvas = document.getElementById('card') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  await waitForFonts();
  const photo = await samplePhoto(1200, 1600);
  const identity = {
    builderClass: deriveBuilderClass('Madhavan Singh'),
    builderId: mintBuilderId(),
  };

  renderCard(ctx, {
    data: {
      name: 'MADHAVAN SINGH',
      role: 'Full Stack Developer',
      shipping: 'Building the future',
      ...identity,
    },
    photo,
    transform: IDENTITY_TRANSFORM,
    qr: qrMatrix('https://roshan5619.github.io/HH_Goa2k26_ID_Builder/'),
  });

  // Signals to the screenshot script that painting is complete.
  document.body.dataset.rendered = 'true';
}

void main();
