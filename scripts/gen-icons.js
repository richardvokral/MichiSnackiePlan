// Generates simple PWA icons (rounded purple tile, white plate, purple dot +
// leaf accent) as PNGs without any image dependencies.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT_DIR = process.argv[2];

// --- minimal PNG encoder (truecolor RGBA, filter 0) ---
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- drawing helpers (with 3x3 supersampling for smooth edges) ---
function roundedRectSDF(px, py, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(px - cx) - (halfW - r);
  const dy = Math.abs(py - cy) - (halfH - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}
function circleSDF(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const S = size;
  // Colors
  const bg = [124, 58, 237]; // purple-600-ish
  const bgDark = [109, 40, 217];
  const plate = [255, 255, 255];
  const inner = [243, 232, 255]; // purple-100
  const dot = [124, 58, 237];
  const leaf = [134, 197, 111];

  // Maskable icons need full-bleed background (safe zone = inner 80%).
  const tileHalf = maskable ? S / 2 : S * 0.46;
  const tileR = maskable ? 0.0001 : S * 0.21;
  const plateR = S * 0.30;
  const innerR = S * 0.19;
  const dotR = S * 0.075;
  const cx = S / 2;
  const cy = S / 2;

  const SS = 3; // supersample
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          let cr = 0, cg = 0, cb = 0, ca = 0;
          if (roundedRectSDF(px, py, cx, cy, tileHalf, tileHalf, tileR) <= 0) {
            // vertical gradient on the tile
            const t = py / S;
            cr = bg[0] + (bgDark[0] - bg[0]) * t;
            cg = bg[1] + (bgDark[1] - bg[1]) * t;
            cb = bg[2] + (bgDark[2] - bg[2]) * t;
            ca = 255;
            if (circleSDF(px, py, cx, cy, plateR) <= 0) {
              [cr, cg, cb] = plate;
            }
            if (circleSDF(px, py, cx, cy, innerR) <= 0) {
              [cr, cg, cb] = inner;
            }
            if (circleSDF(px, py, cx, cy, dotR) <= 0) {
              [cr, cg, cb] = dot;
            }
            // leaf accent: small circle top-right of plate
            if (circleSDF(px, py, cx + plateR * 0.75, cy - plateR * 0.85, S * 0.055) <= 0) {
              [cr, cg, cb] = leaf;
            }
          }
          r += cr; g += cg; b += cb; a += ca;
        }
      }
      const n = SS * SS;
      const i = (y * S + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(S, S, rgba);
}

fs.writeFileSync(path.join(OUT_DIR, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(OUT_DIR, 'icon-512.png'), drawIcon(512));
fs.writeFileSync(path.join(OUT_DIR, 'icon-512-maskable.png'), drawIcon(512, { maskable: true }));
fs.writeFileSync(path.join(OUT_DIR, 'apple-touch-icon.png'), drawIcon(180, { maskable: true }));
console.log('icons written to', OUT_DIR);
