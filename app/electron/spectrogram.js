// スペクトログラム（音声の周波数成分の時間変化）を描くコア。
// exe 専用タブから使う。FFT もカラーマップも自前実装（外部ライブラリ非依存＝ライセンス問題なし）。
//
// モッディング用途の主眼は「高音がどこでカットされているか」の可視化。
// 低品質な MP3 の再エンコード（例: 128kbps で 16kHz 以上がバッサリ落ちる）を目で見つける。

// 音声ファイルの「本来の」サンプリングレートをヘッダから読む（wav/mp3/ogg 対応）。
//   Web Audio の decodeAudioData は AudioContext のレートにリサンプルして返すため、
//   縦軸上限(ナイキスト)を正しく出すにはファイル本来のレートが要る（Spek は ffmpeg で読む）。
//   判別できなければ null。
function taikoSniffSampleRate(arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const le32 = (o) => (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0;

  // WAV: "RIFF"…"WAVE"… の "fmt " チャンクにサンプルレート
  if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {  // RIFF
    for (let i = 12; i < u8.length - 16; i++) {
      if (u8[i] === 0x66 && u8[i + 1] === 0x6d && u8[i + 2] === 0x74 && u8[i + 3] === 0x20) { // "fmt "
        const sr = le32(i + 12);                 // データ先頭(+8) の audioFormat(2)+channels(2) の後
        if (sr > 0) return sr;
      }
    }
  }

  // OGG(Vorbis): "OggS" … "\x01vorbis" の識別ヘッダ
  if (u8[0] === 0x4f && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) {  // OggS
    for (let i = 0; i < Math.min(u8.length - 20, 70000); i++) {
      if (u8[i] === 0x01 && u8[i + 1] === 0x76 && u8[i + 2] === 0x6f && u8[i + 3] === 0x72 &&
          u8[i + 4] === 0x62 && u8[i + 5] === 0x69 && u8[i + 6] === 0x73) {   // \x01vorbis
        const sr = le32(i + 12);                 // sig(7)+version(4)+channels(1)
        if (sr > 0) return sr;
      }
    }
  }

  // MP3: ID3v2 をスキップしてフレーム同期を探し、レート表から引く
  let off = 0;
  if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {                    // "ID3"
    off = 10 + (((u8[6] & 0x7f) << 21) | ((u8[7] & 0x7f) << 14) | ((u8[8] & 0x7f) << 7) | (u8[9] & 0x7f));
  }
  const table = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  for (let i = off; i < u8.length - 4 && i < off + 200000; i++) {
    if (u8[i] === 0xFF && (u8[i + 1] & 0xE0) === 0xE0) {
      const verBits = (u8[i + 1] >> 3) & 0x03;   // 11=MPEG1 / 10=MPEG2 / 00=MPEG2.5
      const layerBits = (u8[i + 1] >> 1) & 0x03;
      const srIndex = (u8[i + 2] >> 2) & 0x03;
      if (layerBits !== 0 && srIndex !== 3 && table[verBits]) return table[verBits][srIndex];
    }
  }
  return null;
}

// 実数配列に対する基数2の反復 FFT（in-place）。re/im は長さ N=2^k の Float32Array。
function taikoFFT(re, im) {
  const n = re.length;
  // ビット反転並べ替え
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr;        im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// スペクトログラムの dB 範囲（Spek に合わせた絶対 dBFS）。0 = フルスケール。
const TAIKO_SPEC_FLOOR_DB = -120;
const TAIKO_SPEC_CEIL_DB = 0;

// AudioBuffer からスペクトログラム行列を作る。
//   opts.fftSize    … FFT長（2のべき乗。既定 2048 → 周波数分解能 約21Hz@44.1k）
//   opts.targetCols … 目標の時間方向の列数（キャンバス幅より多め。既定 1600）
// 強度は **絶対 dBFS**（Spek と同じ）。フルスケール正弦波 ≒ 0dB。
// 戻り値: { cols, bins, mag (Float32Array cols*bins, 0..1 正規化済), sampleRate, duration, nyquist }
function computeTaikoSpectrogram(audioBuffer, opts) {
  opts = opts || {};
  const fftSize = opts.fftSize || 2048;
  const targetCols = opts.targetCols || 1600;
  const floorDb = TAIKO_SPEC_FLOOR_DB, ceilDb = TAIKO_SPEC_CEIL_DB;

  const sr = audioBuffer.sampleRate;
  const total = audioBuffer.length;
  // モノラル化（全チャンネル平均）
  const ch = audioBuffer.numberOfChannels;
  const mono = new Float32Array(total);
  for (let c = 0; c < ch; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < total; i++) mono[i] += data[i] / ch;
  }

  const bins = fftSize / 2;                       // 0〜ナイキストの有効ビン数
  const hop = Math.max(fftSize / 4, Math.floor((total - fftSize) / Math.max(1, targetCols)));
  const cols = Math.max(1, Math.floor((total - fftSize) / hop) + 1);

  // Hann窓（スペクトル漏れを抑える）
  const win = new Float32Array(fftSize);
  let winSum = 0;
  for (let i = 0; i < fftSize; i++) { win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1)); winSum += win[i]; }
  const norm = 2 / winSum;                        // 窓のゲインを打ち消す振幅正規化（→ dBFS）

  const re = new Float32Array(fftSize), im = new Float32Array(fftSize);
  const mag = new Float32Array(cols * bins);
  const range = ceilDb - floorDb;                 // 120

  for (let cidx = 0; cidx < cols; cidx++) {
    const start = cidx * hop;
    for (let i = 0; i < fftSize; i++) { re[i] = mono[start + i] * win[i]; im[i] = 0; }
    taikoFFT(re, im);
    const base = cidx * bins;
    for (let b = 0; b < bins; b++) {
      const amp = Math.hypot(re[b], im[b]) * norm;
      const db = 20 * Math.log10(amp + 1e-12);
      let v = (db - floorDb) / range;             // 絶対 dBFS を [0,1] へ
      mag[base + b] = v < 0 ? 0 : (v > 1 ? 1 : v);
    }
  }
  return { cols, bins, mag, sampleRate: sr, duration: total / sr, nyquist: sr / 2,
           floorDb, ceilDb };
}

// 制御点（位置,r,g,b の配列）から 256段の LUT を作る
function taikoBuildLut(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    lut[i * 3]     = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return lut;
}

// 選べる2つのカラーマップ（0..1 = 低エネルギー→高エネルギー）。
const TAIKO_SPEC_LUTS = {
  // spek: 黒→藍→紫→マゼンタ→赤→橙→黄（本家 Spek 風。低域の藍〜紫、中域マゼンタが特徴）
  spek: taikoBuildLut([
    [0.00,   0,   0,   0], [0.10,  30,   8,  60], [0.22,  60,  10, 110],
    [0.35, 105,  15, 130], [0.48, 150,  25, 120], [0.60, 195,  40,  95],
    [0.72, 228,  65,  60], [0.83, 245, 120,  30], [0.92, 250, 180,  45],
    [1.00, 255, 235, 130],
  ]),
  // alt: 紫→青→シアン→緑→黄→橙→赤（spek-alternative 風の jet 系）
  alt: taikoBuildLut([
    [0.00,  10,   0,  30], [0.10,  30,   0, 110], [0.22,  20,  40, 180],
    [0.35,   0, 120, 200], [0.47,   0, 190, 190], [0.58,  20, 200,  90],
    [0.68,  90, 215,  20], [0.78, 220, 225,   0], [0.88, 255, 150,   0],
    [1.00, 255,  20,  20],
  ]),
};

// スペクトログラムをキャンバスへ描く。X=時間 / Y=周波数（下が0Hz、上がナイキスト）。
//   data … computeTaikoSpectrogram の戻り値
//   opts.maxFreq … 表示する上限周波数[Hz]（既定はナイキスト）
function drawTaikoSpectrogram(canvas, data, opts) {
  opts = opts || {};
  const wrap = canvas.parentElement || canvas;
  const cssW = Math.max(320, canvas.clientWidth || wrap.clientWidth || 800);
  const cssH = Math.max(160, canvas.clientHeight || wrap.clientHeight || 340);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width  !== Math.round(cssW * dpr)) canvas.width  = Math.round(cssW * dpr);
  if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 58, padB = 24, padT = 8, padR = 82;  // 左=周波数 / 下=時間 / 右=dB凡例
  const plot = { left: padL, top: padT, width: cssW - padL - padR, height: cssH - padT - padB };
  ctx.fillStyle = "#000";
  ctx.fillRect(plot.left, plot.top, plot.width, plot.height);

  if (!data || !data.cols) {
    ctx.fillStyle = "#666"; ctx.font = "13px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(opts.emptyText || "No audio", cssW / 2, cssH / 2);
    return;
  }

  const lut = TAIKO_SPEC_LUTS[opts.colorMap] || TAIKO_SPEC_LUTS.spek;
  const maxFreq = data.nyquist;
  const topBin = Math.max(1, Math.round(maxFreq / data.nyquist * data.bins));

  // いったん cols × topBin のビットマップを作り、プロット領域へ拡大転写する。
  // Y は上が高周波になるよう反転（画像の行0＝最上段＝maxFreq）。
  const img = ctx.createImageData(data.cols, topBin);
  const px = img.data;
  for (let x = 0; x < data.cols; x++) {
    const base = x * data.bins;
    for (let b = 0; b < topBin; b++) {
      const v = data.mag[base + b];
      const li = (Math.min(255, Math.max(0, Math.round(v * 255)))) * 3;
      const row = topBin - 1 - b;               // 反転
      const o = (row * data.cols + x) * 4;
      px[o]     = lut[li];
      px[o + 1] = lut[li + 1];
      px[o + 2] = lut[li + 2];
      px[o + 3] = 255;
    }
  }
  // createImageBitmap は同期で使えないので、一時キャンバス経由で拡大する
  const tmp = drawTaikoSpectrogram._tmp || (drawTaikoSpectrogram._tmp = document.createElement("canvas"));
  tmp.width = data.cols; tmp.height = topBin;
  tmp.getContext("2d").putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, data.cols, topBin, plot.left, plot.top, plot.width, plot.height);

  // 周波数の目盛り（横のうすい線＋「20 kHz」形式のラベル）。
  // 最上端はナイキスト周波数（=表示上限。44.1k→22.05kHz / 48k→24kHz）を必ず打つ。
  ctx.font = "10px sans-serif";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  const stepHz = maxFreq > 12000 ? 5000 : (maxFreq > 4000 ? 2000 : 1000);
  const freqTicks = [];
  for (let f = 0; f < maxFreq - stepHz * 0.35; f += stepHz) freqTicks.push(f);
  freqTicks.push(maxFreq);                         // 最上端＝ナイキスト
  const fmtKHz = function (hz) {
    const k = hz / 1000;
    // 端数があるレート（22.05kHz 等）は小数1桁、割り切れるものは整数で
    return (Math.abs(k - Math.round(k)) < 0.05 ? String(Math.round(k)) : k.toFixed(2)) + " kHz";
  };
  for (let i = 0; i < freqTicks.length; i++) {
    const f = freqTicks[i];
    const y = plot.top + plot.height * (1 - f / maxFreq);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(plot.left, Math.round(y) + 0.5);
    ctx.lineTo(plot.left + plot.width, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.fillStyle = "#b8b8c2";
    ctx.textAlign = "right";
    ctx.fillText(fmtKHz(f), plot.left - 6, y);
  }

  // 時間の目盛り（縦ラベル）
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const dur = data.duration;
  const tStep = dur > 180 ? 30 : (dur > 60 ? 15 : (dur > 20 ? 5 : 2));
  const pad2 = function (n) { n = Math.floor(n); return (n < 10 ? "0" : "") + n; };
  for (let t = 0; t <= dur; t += tStep) {
    const x = plot.left + plot.width * (t / dur);
    ctx.fillStyle = "#b8b8c2";
    ctx.fillText(pad2(t / 60) + ":" + pad2(t % 60), x, plot.top + plot.height + 4);
  }

  // ── 右側の dB グラデーション凡例（Spek 風）──
  //   上=0dB（明るい）→ 下=floorDb（暗い）。実際のカラーマップと同じ LUT で塗る。
  const barX = plot.left + plot.width + 14, barW = 12;
  const barTop = plot.top, barH = plot.height;
  for (let i = 0; i < barH; i++) {
    const v = 1 - i / (barH - 1);                 // 上が 1（0dB）
    const li = Math.min(255, Math.max(0, Math.round(v * 255))) * 3;
    ctx.fillStyle = "rgb(" + lut[li] + "," + lut[li + 1] + "," + lut[li + 2] + ")";
    ctx.fillRect(barX, barTop + i, barW, 1);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barTop + 0.5, barW, barH);
  ctx.fillStyle = "#b8b8c2";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const dbStep = 20;
  for (let db = data.ceilDb; db >= data.floorDb - 1; db -= dbStep) {
    const y = barTop + barH * (data.ceilDb - db) / (data.ceilDb - data.floorDb);
    ctx.fillText(db + " dB", barX + barW + 4, y);
  }

  // 再生ヘッド用に、他グラフと同じジオメトリを残す（分離窓・追従バーが使える）
  canvas.__playheadGeom = { plot, viewStart: 0, viewEnd: dur * 1000 };
}

if (typeof window !== "undefined") {
  window.taikoSniffSampleRate = taikoSniffSampleRate;
  window.computeTaikoSpectrogram = computeTaikoSpectrogram;
  window.drawTaikoSpectrogram = drawTaikoSpectrogram;
}
