// Reads/writes a custom tEXt chunk in a PNG so the gradient "recipe" (the
// exact settings needed to recreate a texture) can travel embedded inside
// the exported PNG itself, instead of as a separate sidecar file — one save
// action, one file, and the recipe can never end up separated from the
// image it describes. tEXt is a standard, well-known PNG chunk type, so any
// other viewer/tool just ignores it and displays the image normally.

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readUint32BE(bytes, offset) {
  return (
    (bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]
  ) >>> 0;
}

function writeUint32BE(value) {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function concatBytes(arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function buildChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const crcBytes = writeUint32BE(crc32(concatBytes([typeBytes, data])));
  return concatBytes([writeUint32BE(data.length), typeBytes, data, crcBytes]);
}

function checkSignature(bytes) {
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

// injectTextChunk(pngBlob, keyword, text) -> Blob
// Inserts a tEXt chunk right after IHDR (the required-first chunk) holding
// `keyword\0text`. keyword must be ASCII/Latin-1; text must not contain the
// PNG-forbidden two-byte "\r\n" sequence issue that iTXt/zTXt solve for
// binary text — plain JSON (ASCII only) is always safe here.
export async function injectTextChunk(pngBlob, keyword, text) {
  const bytes = new Uint8Array(await pngBlob.arrayBuffer());
  if (!checkSignature(bytes)) throw new Error('Not a PNG file');

  const ihdrLength = readUint32BE(bytes, 8);
  const ihdrEnd = 8 + 4 + 4 + ihdrLength + 4; // signature + (length+type+data+crc) of IHDR

  const chunkData = concatBytes([
    new TextEncoder().encode(keyword),
    new Uint8Array([0]),
    new TextEncoder().encode(text),
  ]);
  const newChunk = buildChunk('tEXt', chunkData);

  const result = concatBytes([bytes.subarray(0, ihdrEnd), newChunk, bytes.subarray(ihdrEnd)]);
  return new Blob([result], { type: 'image/png' });
}

// extractTextChunk(pngBlob, keyword) -> string | null
export async function extractTextChunk(pngBlob, keyword) {
  const bytes = new Uint8Array(await pngBlob.arrayBuffer());
  if (!checkSignature(bytes)) return null;

  const decoder = new TextDecoder('latin1');
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'tEXt') {
      const chunkData = bytes.subarray(dataStart, dataEnd);
      const nullIndex = chunkData.indexOf(0);
      if (nullIndex !== -1 && decoder.decode(chunkData.subarray(0, nullIndex)) === keyword) {
        return decoder.decode(chunkData.subarray(nullIndex + 1));
      }
    }
    if (type === 'IEND') break;
    offset = dataEnd + 4; // skip the trailing CRC
  }
  return null;
}
