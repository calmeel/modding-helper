const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', 'images');

const makeSvg = (size) => {
  const cx = size / 2;
  const cy = size / 2;
  const bgRadius = size * 0.2;
  const circleR = size * 0.33;
  const strokeW = size * 0.09;
  const checkStroke = size * 0.1;
  const s = size / 160;

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${bgRadius}" fill="#2e2e2e"/>
  <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="none" stroke="#808080" stroke-width="${strokeW}"/>
  <polyline points="${50*s},${80*s} ${70*s},${102*s} ${112*s},${58*s}" fill="none" stroke="#d0d0d0" stroke-width="${checkStroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
};

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + entrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = dataOffset;
  const entries = pngBuffers.map(buf => {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(0, 0);
    entry.writeUInt8(0, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function generate() {
  await sharp(Buffer.from(makeSvg(256))).png().toFile(path.join(imagesDir, 'icon.png'));
  console.log('icon.png を生成しました');

  const sizes = [16, 32, 48, 256];
  const pngBuffers = await Promise.all(
    sizes.map(size => sharp(Buffer.from(makeSvg(size))).png().toBuffer())
  );

  fs.writeFileSync(path.join(imagesDir, 'icon.ico'), buildIco(pngBuffers));
  console.log('icon.ico を生成しました');
}

generate().catch(console.error);
