// Generates resources/icon.png — a simple app icon: 4 vertical stripes each
// fading top-to-bottom to a darker shade, echoing the textures this tool
// makes. Builds the PNG manually (raw pixels + zlib) so no image library is
// needed. The stripe positions come from the app's own layoutStripes() (a
// fixed 4-column x 1-row grid) rather than being computed by hand here, so
// the icon can't silently drift out of sync with how the real tool lays
// gradients out.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const CHANNELS = 3;
const GRID_X = 4;
const GRID_Y = 1;

const stripeColors = [
  [[255, 95, 77], [122, 29, 19]], // red
  [[255, 210, 63], [138, 107, 5]], // yellow
  [[61, 220, 132], [15, 92, 52]], // green
  [[77, 140, 255], [21, 46, 107]], // blue
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (~crc) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

async function main() {
  const { layoutStripes } = await import('../app/layout.js');
  const rects = layoutStripes(stripeColors.length, SIZE, GRID_X, GRID_Y);

  const raw = Buffer.alloc(SIZE * (1 + SIZE * CHANNELS));

  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (1 + SIZE * CHANNELS);
    raw[rowStart] = 0; // filter type: None
    for (let x = 0; x < SIZE; x++) {
      const rectIndex = rects.findIndex((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
      const rect = rects[rectIndex];
      const [top, bottom] = stripeColors[rectIndex];
      const t = (y - rect.y) / (rect.height - 1 || 1);
      const pixelStart = rowStart + 1 + x * CHANNELS;
      raw[pixelStart] = Math.round(lerp(top[0], bottom[0], t));
      raw[pixelStart + 1] = Math.round(lerp(top[1], bottom[1], t));
      raw[pixelStart + 2] = Math.round(lerp(top[2], bottom[2], t));
    }
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(SIZE, 0);
  ihdrData.writeUInt32BE(SIZE, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  const outPath = path.join(__dirname, 'resources', 'icon.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${png.length} bytes)`);
}

main();
