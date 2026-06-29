const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;
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

async function generate() {
  await sharp(Buffer.from(makeSvg(256))).png().toFile(path.join(imagesDir, 'icon.png'));
  console.log('icon.png を生成しました');

  // 各サイズの PNG をベクター(SVG)から個別にレンダリングし、
  // png-to-ico で「サイズ情報が正しい」マルチ解像度 ICO を作る。
  // （手書きの ICO 生成だとディレクトリの幅/高さを誤って 256 固定にしてしまい、
  //   Windows が小さい画像を引き伸ばしてぼやける原因になっていた）
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(size => sharp(Buffer.from(makeSvg(size))).png().toBuffer())
  );

  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(imagesDir, 'icon.ico'), ico);
  console.log('icon.ico を生成しました（' + sizes.join(', ') + ' px）');
}

generate().catch(console.error);
