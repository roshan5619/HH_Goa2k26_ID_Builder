/**
 * Generates test photos covering the shapes real uploads arrive in.
 *
 * Written as raw PNGs with no image library, so the fixtures are reproducible
 * on any machine and CI needs no extra dependency. Each carries an obvious
 * off-centre subject, which makes a bad crop visible rather than subtle.
 *
 * Run with: node scripts/make-fixtures.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'tests', 'fixtures');

/** The aspect ratios that break naive croppers. */
const FIXTURES = [
  { name: 'portrait', width: 900, height: 1200 },
  { name: 'landscape', width: 1200, height: 900 },
  { name: 'square', width: 1000, height: 1000 },
  { name: 'panorama', width: 1600, height: 320 },
  { name: 'tall-strip', width: 320, height: 1400 },
  { name: 'tiny', width: 96, height: 72 },
];

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Draws a recognisable scene: sky gradient, sand, and an off-centre head. */
function pixels(width, height) {
  // One filter byte per scanline, then RGB triples.
  const raw = Buffer.alloc(height * (1 + width * 3));

  const headX = width * 0.34;
  const headY = height * 0.4;
  const headR = Math.min(width, height) * 0.19;
  const horizon = height * 0.68;

  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      let r;
      let g;
      let b;

      if (y > horizon) {
        [r, g, b] = [232, 201, 138];
      } else {
        const t = y / horizon;
        [r, g, b] = [126 + t * 116, 200 - t * 8, 227 - t * 106];
      }

      // Head, then shoulders below it.
      const dx = x - headX;
      const dy = y - headY;
      if (dx * dx + dy * dy < headR * headR) {
        [r, g, b] = [201, 138, 94];
      } else if (y > headY + headR * 0.7) {
        const spread = Math.abs(x - headX) / (headR * 2.1);
        if (spread < 1 && y > headY + headR * 0.7 + spread * headR) {
          [r, g, b] = [108, 63, 181];
        }
      }

      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  return raw;
}

function png(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels(width, height), { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir(OUT, { recursive: true });

for (const { name, width, height } of FIXTURES) {
  const file = join(OUT, `${name}.png`);
  await writeFile(file, png(width, height));
  console.log(`  ${name}.png  ${width}x${height}`);
}

// A file that is a valid upload target but not an image, to exercise rejection.
await writeFile(join(OUT, 'not-an-image.txt'), 'This is definitely not a photograph.\n');
console.log('  not-an-image.txt');

console.log(`\nWrote fixtures to ${OUT}`);
