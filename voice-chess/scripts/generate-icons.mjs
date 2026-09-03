/**
 * Generates the app icons.
 *
 * Everything is drawn in plain JavaScript and encoded as PNG with Node's own
 * zlib, so the project carries no image toolchain and the icons can be
 * regenerated from source at any time:
 *
 *     node scripts/generate-icons.mjs
 *
 * The mark is a rook — the piece that reads most clearly at 48px — standing on
 * an accent plinth, over the same near-black the app uses as its background.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');

const INK = [247, 249, 252, 255];
const ACCENT = [124, 92, 255, 255];
const BACKDROP_TOP = [27, 20, 54, 255];
const BACKDROP_BOTTOM = [14, 17, 22, 255];
const CLEAR = [0, 0, 0, 0];

/** Rook silhouette, in a 0–1 box. Returns the colour at (u, v) or null. */
function rook(u, v) {
  const inX = (a, b) => u >= a && u <= b;

  // Crenellations
  if (v >= 0.14 && v < 0.28) {
    if (inX(0.2, 0.35) || inX(0.425, 0.575) || inX(0.65, 0.8)) return INK;
    return null;
  }
  // Collar
  if (v >= 0.28 && v < 0.37) return inX(0.185, 0.815) ? INK : null;
  // Tapering body
  if (v >= 0.37 && v < 0.7) {
    const t = (v - 0.37) / (0.7 - 0.37);
    const half = 0.275 - t * 0.075;
    return inX(0.5 - half, 0.5 + half) ? INK : null;
  }
  // Upper plinth
  if (v >= 0.7 && v < 0.78) return inX(0.175, 0.825) ? INK : null;
  // Accent base, with softened corners
  if (v >= 0.78 && v <= 0.88) {
    const r = 0.02;
    const x0 = 0.13;
    const x1 = 0.87;
    const y1 = 0.88;
    if (!inX(x0, x1)) return null;
    const cornerY = v > y1 - r ? v - (y1 - r) : 0;
    if (cornerY > 0) {
      const dx = Math.min(u - x0, x1 - u);
      if (dx < r && Math.hypot(r - dx, cornerY) > r) return null;
    }
    return ACCENT;
  }
  return null;
}

function blend(over, under) {
  const a = over[3] / 255;
  if (a === 0) return under;
  if (a === 1) return over;
  return [
    Math.round(over[0] * a + under[0] * (1 - a)),
    Math.round(over[1] * a + under[1] * (1 - a)),
    Math.round(over[2] * a + under[2] * (1 - a)),
    255,
  ];
}

/**
 * Renders one icon.
 *
 * `scale` shrinks the mark inside the canvas — Android adaptive icons crop
 * aggressively, so their foreground needs generous margins.
 */
function draw(size, { background, mark = true, scale = 0.72, monochrome = false }) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 3; // 3×3 supersampling keeps the diagonals clean.

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let base;
      if (background === 'gradient') {
        const t = y / (size - 1);
        base = [
          Math.round(BACKDROP_TOP[0] + (BACKDROP_BOTTOM[0] - BACKDROP_TOP[0]) * t),
          Math.round(BACKDROP_TOP[1] + (BACKDROP_BOTTOM[1] - BACKDROP_TOP[1]) * t),
          Math.round(BACKDROP_TOP[2] + (BACKDROP_BOTTOM[2] - BACKDROP_TOP[2]) * t),
          255,
        ];
      } else if (background === 'transparent') {
        base = CLEAR;
      } else {
        base = background;
      }

      let colour = base;

      if (mark) {
        let r = 0;
        let g = 0;
        let b = 0;
        let hits = 0;
        for (let sy = 0; sy < samples; sy += 1) {
          for (let sx = 0; sx < samples; sx += 1) {
            const px = (x + (sx + 0.5) / samples) / size;
            const py = (y + (sy + 0.5) / samples) / size;
            const u = (px - 0.5) / scale + 0.5;
            const v = (py - 0.5) / scale + 0.5;
            if (u < 0 || u > 1 || v < 0 || v > 1) continue;
            const hit = rook(u, v);
            if (!hit) continue;
            const shade = monochrome ? INK : hit;
            r += shade[0];
            g += shade[1];
            b += shade[2];
            hits += 1;
          }
        }
        if (hits > 0) {
          const coverage = hits / (samples * samples);
          colour = blend([r / hits, g / hits, b / hits, Math.round(coverage * 255)], base);
          if (background === 'transparent') {
            colour = [Math.round(r / hits), Math.round(g / hits), Math.round(b / hits), Math.round(coverage * 255)];
          }
        }
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
      pixels[offset + 3] = colour[3];
    }
  }

  return encodePng(size, size, pixels);
}

function encodePng(width, height, rgba) {
  // One filter byte (0 = none) per scanline, then the raw row.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

mkdirSync(assets, { recursive: true });

const outputs = [
  ['icon.png', draw(1024, { background: 'gradient', scale: 0.68 })],
  ['splash-icon.png', draw(512, { background: 'transparent', scale: 0.86 })],
  ['android-icon-foreground.png', draw(1024, { background: 'transparent', scale: 0.45 })],
  ['android-icon-background.png', draw(1024, { background: 'gradient', mark: false })],
  ['android-icon-monochrome.png', draw(1024, { background: 'transparent', scale: 0.45, monochrome: true })],
  ['favicon.png', draw(64, { background: 'gradient', scale: 0.72 })],
];

for (const [name, buffer] of outputs) {
  writeFileSync(join(assets, name), buffer);
  console.log(`wrote assets/${name} (${(buffer.length / 1024).toFixed(1)} KB)`);
}
