/**
 * Build-time harness that draws the default link-preview image.
 *
 * The preview *is* the card: rather than a composed banner that could drift
 * from the real output, this runs the production compositor and screenshots the
 * result, so what people see attached to a shared link is exactly what the tool
 * produces.
 *
 * Sample values are written as prompts ("YOUR NAME") so the preview reads as an
 * invitation to make one rather than as somebody else's finished document.
 */

import './brand/fonts.css';
import { CARD } from './brand/tokens';
import { renderCard, waitForFonts } from './card/renderCard';
import { IDENTITY_TRANSFORM } from './card/geometry';
import { deriveBuilderClass, mintBuilderId } from './card/builderClass';
import { qrMatrix } from './card/qr';

async function main() {
  const canvas = document.getElementById('og') as HTMLCanvasElement;
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext('2d')!;

  await waitForFonts();

  renderCard(ctx, {
    data: {
      name: 'YOUR NAME',
      role: 'YOUR STACK',
      shipping: 'SOMETHING NEW',
      builderClass: deriveBuilderClass('hacker house goa'),
      builderId: mintBuilderId(),
    },
    photo: null,
    transform: IDENTITY_TRANSFORM,
    qr: qrMatrix('https://roshan5619.github.io/HH_Goa2k26_ID_Builder/'),
  });

  // Signals to the screenshot script that painting is complete.
  document.body.dataset.rendered = 'true';
}

void main();
