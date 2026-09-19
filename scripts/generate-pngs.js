import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG encoder in pure Node.js
function createPNG(width, height, drawPixelFn) {
  const bytesPerPixel = 4; // RGBA
  const rowSize = 1 + width * bytesPerPixel; // 1 filter byte per row
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = chunk.subarray(4, 8 + len);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Drawing function for the UCNL PWA Icon
function drawUCNLIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / (w / 2); // -1 to 1
  const ny = (y - cy) / (h / 2); // -1 to 1

  // Background Gradient (Deep Royal Blue #1d4ed8 to Dark Navy #1e1b4b)
  const gradT = (nx + 1) * 0.3 + (ny + 1) * 0.5; // diagonal
  const bgR = Math.round(29 * (1 - gradT) + 30 * gradT);
  const bgG = Math.round(78 * (1 - gradT) + 27 * gradT);
  const bgB = Math.round(216 * (1 - gradT) + 75 * gradT);

  // Rounded rect radius for standard icon (or full bleed for maskable)
  if (!isMaskable) {
    const cornerRadius = 0.22;
    const absX = Math.abs(nx);
    const absY = Math.abs(ny);
    if (absX > 1 - cornerRadius && absY > 1 - cornerRadius) {
      const dist = Math.hypot(absX - (1 - cornerRadius), absY - (1 - cornerRadius));
      if (dist > cornerRadius) {
        return [0, 0, 0, 0]; // transparent outside rounded corner
      }
    }
  }

  // Draw Graduation Cap Rhombus (Top)
  // Center is at (0, -0.15)
  const capCY = -0.15;
  const capHalfW = 0.65;
  const capHalfH = 0.28;
  const dx = Math.abs(nx) / capHalfW;
  const dy = Math.abs(ny - capCY) / capHalfH;

  let r = bgR, g = bgG, b = bgB, a = 255;

  // Background subtle concentric rings
  const distCenter = Math.hypot(nx, ny);
  if (Math.abs(distCenter - 0.7) < 0.02 || Math.abs(distCenter - 0.5) < 0.02) {
    r = Math.min(255, r + 20);
    g = Math.min(255, g + 25);
    b = Math.min(255, b + 30);
  }

  // Cap top rhombus
  if (dx + dy <= 1.0) {
    // White diamond
    r = 255;
    g = 255;
    b = 255;
  }

  // Cap skull cap (bottom curve)
  if (ny > capCY && ny < capCY + 0.35 && Math.abs(nx) < 0.42) {
    const bottomCurve = capCY + 0.2 + (0.42 * 0.42 - nx * nx) * 0.6;
    if (ny < bottomCurve) {
      r = 226;
      g = 232;
      b = 240;
    }
  }

  // Gold Button & Tassel
  const distBtn = Math.hypot(nx, ny - capCY);
  if (distBtn < 0.05) {
    r = 251;
    g = 191;
    b = 36;
  }

  // Gold Tassel ribbon
  if (nx > 0.02 && nx < 0.52) {
    const tasselY = capCY + (nx * nx) * 1.3 + 0.02;
    if (Math.abs(ny - tasselY) < 0.03) {
      r = 245;
      g = 158;
      b = 11;
    }
  }

  // Tassel tip
  if (nx > 0.48 && nx < 0.56 && ny > 0.12 && ny < 0.32) {
    r = 251;
    g = 191;
    b = 36;
  }

  // Text "UCNL" Area (White block in lower half)
  if (ny > 0.52 && ny < 0.78) {
    // Render letters roughly: U, C, N, L
    const px = nx; // -0.7 to 0.7
    // U (-0.55 to -0.3)
    if (px >= -0.55 && px <= -0.32) {
      const uX = (px + 0.435) / 0.115;
      if (Math.abs(uX) > 0.45 || ny > 0.7) {
        r = 255; g = 255; b = 255;
      }
    }
    // C (-0.22 to 0.0)
    if (px >= -0.22 && px <= 0.02) {
      const cX = (px + 0.1) / 0.12;
      if (Math.abs(cX) > 0.45 && px < -0.1 || ny < 0.57 || ny > 0.73) {
        r = 255; g = 255; b = 255;
      }
    }
    // N (0.1 to 0.32)
    if (px >= 0.12 && px <= 0.34) {
      const nX = (px - 0.23) / 0.11;
      const diag = (ny - 0.52) / 0.26; // 0 to 1
      const nProg = (nX + 1) / 2;
      if (Math.abs(nX) > 0.5 || Math.abs(nProg - diag) < 0.2) {
        r = 255; g = 255; b = 255;
      }
    }
    // L (0.42 to 0.62)
    if (px >= 0.42 && px <= 0.62) {
      const lX = (px - 0.52) / 0.1;
      if (lX < -0.4 || ny > 0.7) {
        r = 255; g = 255; b = 255;
      }
    }
  }

  return [r, g, b, a];
}

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate 192x192
console.log('Generando icon-192.png...');
const icon192 = createPNG(192, 192, (x, y, w, h) => drawUCNLIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-192.png'), icon192);

// Generate 512x512
console.log('Generando icon-512.png...');
const icon512 = createPNG(512, 512, (x, y, w, h) => drawUCNLIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), icon512);

// Generate maskable 192x192
console.log('Generando icon-maskable-192.png...');
const maskable192 = createPNG(192, 192, (x, y, w, h) => drawUCNLIcon(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-maskable-192.png'), maskable192);

// Generate maskable 512x512
console.log('Generando icon-maskable-512.png...');
const maskable512 = createPNG(512, 512, (x, y, w, h) => drawUCNLIcon(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), maskable512);

// Also generate apple-touch-icon.png
fs.writeFileSync(path.join('public', 'apple-touch-icon.png'), icon192);

console.log('¡Todos los iconos generados exitosamente!');
