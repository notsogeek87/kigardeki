// Generates simple, dependency-free PNG app icons (a calendar glyph on a
// brand-blue rounded background) for the PWA manifest. Pure Node — no
// canvas/sharp/imagemagick dependency, since none is guaranteed available
// wherever this repo is built.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BRAND = [37, 99, 235]; // #2563eb
const WHITE = [255, 255, 255];
const RING = [30, 64, 175]; // #1e40af

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function roundedSquareMask(x, y, size, radius) {
  // Distance-based rounded-rect test.
  const half = size / 2;
  const dx = Math.max(Math.abs(x - half) - (half - radius), 0);
  const dy = Math.max(Math.abs(y - half) - (half - radius), 0);
  return dx * dx + dy * dy <= radius * radius;
}

function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };

  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (roundedSquareMask(x, y, size, radius)) set(x, y, BRAND);
    }
  }

  // White calendar card.
  const cardX = size * 0.2;
  const cardY = size * 0.24;
  const cardW = size * 0.6;
  const cardH = size * 0.54;
  const cardRadius = size * 0.06;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x - cardX;
      const ly = y - cardY;
      if (lx < 0 || ly < 0 || lx > cardW || ly > cardH) continue;
      const half = Math.min(cardW, cardH) / 2;
      const dx = Math.max(Math.abs(lx - cardW / 2) - (cardW / 2 - cardRadius), 0);
      const dy = Math.max(Math.abs(ly - cardH / 2) - (cardH / 2 - cardRadius), 0);
      if (dx * dx + dy * dy <= cardRadius * cardRadius || (lx > cardRadius && lx < cardW - cardRadius) || (ly > cardRadius && ly < cardH - cardRadius)) {
        set(x, y, WHITE);
      }
    }
  }

  // Top band (ring holes + header strip) in brand ring color.
  const bandH = cardH * 0.28;
  for (let y = cardY; y < cardY + bandH; y++) {
    for (let x = cardX; x < cardX + cardW; x++) {
      set(Math.round(x), Math.round(y), RING);
    }
  }
  // Two "rings" punched through.
  const ringR = size * 0.02;
  for (const fx of [0.35, 0.65]) {
    const rx = cardX + cardW * fx;
    const ry = cardY;
    for (let y = -ringR * 1.6; y <= ringR * 1.6; y++) {
      for (let x = -ringR; x <= ringR; x++) {
        if (x * x + y * y <= ringR * ringR) set(Math.round(rx + x), Math.round(ry + y), BRAND);
      }
    }
  }
  // Three dots representing days/events.
  const dotR = size * 0.035;
  const rows = [0.62, 0.78];
  const cols = [0.34, 0.5, 0.66];
  for (const fy of rows) {
    for (const fx of cols) {
      const cx = cardX + cardW * fx;
      const cy = cardY + cardH * fy;
      for (let y = -dotR; y <= dotR; y++) {
        for (let x = -dotR; x <= dotR; x++) {
          if (x * x + y * y <= dotR * dotR) set(Math.round(cx + x), Math.round(cy + y), BRAND);
        }
      }
    }
  }

  return px;
}

function encodePNG(size) {
  const px = drawIcon(size);
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(px.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, encodePNG(size));
  console.log(`wrote public/icons/icon-${size}.png`);
}
