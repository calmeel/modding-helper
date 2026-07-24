// スペクトログラム（音声の周波数成分の時間変化）を描くコア。
// exe 専用タブから使う。FFT もカラーマップも自前実装（外部ライブラリ非依存＝ライセンス問題なし）。
//
// モッディング用途の主眼は「高音がどこでカットされているか」の可視化。
// 低品質な MP3 の再エンコード（例: 128kbps で 16kHz 以上がバッサリ落ちる）を目で見つける。

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

// 0..1 の強度を色に変換する 256段の LUT。Spek のカラーマップに寄せた
// 黒→藍→紫→マゼンタ→赤→橙→黄。低エネルギー側の藍〜紫、中域のマゼンタが Spek の特徴。
const TAIKO_SPEC_LUT = (function () {
  // 制御点（位置, r, g, b）
  const stops = [
    [0.00,   0,   0,   0], [0.10,  30,   8,  60], [0.22,  60,  10, 110],
    [0.35, 105,  15, 130], [0.48, 150,  25, 120], [0.60, 195,  40,  95],
    [0.72, 228,  65,  60], [0.83, 245, 120,  30], [0.92, 250, 180,  45],
    [1.00, 255, 235, 130],
  ];
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
})();

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
      px[o]     = TAIKO_SPEC_LUT[li];
      px[o + 1] = TAIKO_SPEC_LUT[li + 1];
      px[o + 2] = TAIKO_SPEC_LUT[li + 2];
      px[o + 3] = 255;
    }
  }
  // createImageBitmap は同期で使えないので、一時キャンバス経由で拡大する
  const tmp = drawTaikoSpectrogram._tmp || (drawTaikoSpectrogram._tmp = document.createElement("canvas"));
  tmp.width = data.cols; tmp.height = topBin;
  tmp.getContext("2d").putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, data.cols, topBin, plot.left, plot.top, plot.width, plot.height);

  // 周波数の目盛り（横のうすい線＋「20 kHz」形式のラベル）
  ctx.font = "10px sans-serif";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  const stepHz = maxFreq > 12000 ? 5000 : (maxFreq > 4000 ? 2000 : 1000);
  for (let f = 0; f <= maxFreq + 1; f += stepHz) {
    const y = plot.top + plot.height * (1 - f / maxFreq);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(plot.left, Math.round(y) + 0.5);
    ctx.lineTo(plot.left + plot.width, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.fillStyle = "#b8b8c2";
    ctx.textAlign = "right";
    ctx.fillText((f / 1000) + " kHz", plot.left - 6, y);
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
    ctx.fillStyle = "rgb(" + TAIKO_SPEC_LUT[li] + "," + TAIKO_SPEC_LUT[li + 1] + "," + TAIKO_SPEC_LUT[li + 2] + ")";
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
  window.computeTaikoSpectrogram = computeTaikoSpectrogram;
  window.drawTaikoSpectrogram = drawTaikoSpectrogram;
}
