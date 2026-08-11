/**
 * Build-time harness that draws the default link-preview banner.
 *
 * Renders a real card, then places it in a 1200x630 layout beside the event
 * lockup — so the preview a poster sees is the actual output of the tool rather
 * than a mock-up that could drift from it.
 */

import './brand/fonts.css';
import { COLORS, EVENT, FONTS } from './brand/tokens';
import { renderCard, waitForFonts } from './card/renderCard';
import { IDENTITY_TRANSFORM } from './card/geometry';
import { deriveBuilderClass, mintBuilderId } from './card/builderClass';
import { qrMatrix } from './card/qr';
import { drawText, palmSilhouetteBackdrop } from './ogBannerParts';

const W = 1200;
const H = 630;

async function main() {
  const canvas = document.getElementById('og') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  await waitForFonts();

  // Backdrop.
  ctx.fillStyle = COLORS.green;
  ctx.fillRect(0, 0, W, H);
  palmSilhouetteBackdrop(ctx, W, H);

  // Render a card offscreen, then place it on the left.
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = 1080;
  cardCanvas.height = 1620;
  const cardCtx = cardCanvas.getContext('2d')!;
  renderCard(cardCtx, {
    data: {
      name: 'YOUR NAME',
      role: 'Your stack',
      shipping: 'Something new',
      builderClass: deriveBuilderClass('hacker house goa'),
      builderId: mintBuilderId(),
    },
    photo: null,
    transform: IDENTITY_TRANSFORM,
    qr: qrMatrix('https://roshan5619.github.io/HH_Goa2k26_ID_Builder/'),
  });

  // The card is tilted slightly so the banner reads as an object on a surface
  // rather than a flat screenshot.
  const cardHeight = 560;
  const cardWidth = (cardHeight * 1080) / 1620;
  ctx.save();
  ctx.translate(250, H / 2);
  ctx.rotate(-0.045);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(cardCanvas, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
  ctx.restore();

  // Right-hand type block.
  const x = 545;
  drawText(ctx, 'HACKER', x, 178, {
    family: FONTS.display,
    weight: 900,
    size: 96,
    color: COLORS.yellow,
    align: 'left',
    squeeze: 0.8,
  });
  drawText(ctx, 'HOUSE', x, 268, {
    family: FONTS.display,
    weight: 900,
    size: 96,
    color: COLORS.yellow,
    align: 'left',
    squeeze: 0.8,
  });

  drawText(ctx, `GOA, INDIA · ${EVENT.dates}`, x, 330, {
    family: FONTS.mono,
    weight: 700,
    size: 25,
    color: COLORS.cream,
    align: 'left',
    tracking: 2,
  });

  ctx.strokeStyle = 'rgba(250,236,213,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 366);
  ctx.lineTo(1130, 366);
  ctx.stroke();

  drawText(ctx, 'YOUR BUILDER PASSPORT', x, 416, {
    family: FONTS.sans,
    weight: 800,
    size: 42,
    color: COLORS.cream,
    align: 'left',
    tracking: 0.5,
  });

  drawText(ctx, 'Upload a photo. Post it. No signup.', x, 466, {
    family: FONTS.mono,
    weight: 400,
    size: 24,
    color: 'rgba(250,236,213,0.75)',
    align: 'left',
  });

  // Hashtag pill.
  const pill = { x, y: 508, width: 268, height: 56 };
  ctx.fillStyle = COLORS.pink;
  ctx.beginPath();
  ctx.roundRect(pill.x, pill.y, pill.width, pill.height, 28);
  ctx.fill();
  drawText(ctx, EVENT.hashtag, pill.x + pill.width / 2, pill.y + pill.height / 2 + 2, {
    family: FONTS.sans,
    weight: 800,
    size: 28,
    color: COLORS.cream,
    tracking: 1.6,
  });

  document.body.dataset.rendered = 'true';
}

void main();
