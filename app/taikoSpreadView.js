// 太鼓ノーツ解析 + スプレッド表示の描画（web/exe 共通。現状は exe のタブから利用）
// 参考: Alchyr/TaikoEditor 風の「右→左に流れる」ノーツ表示
//   - スプレッド表示は等速（SV無視）
//   - 判定ラインは中央
//   - スナップ分割のグリッド表示
//   - ズーム（pxPerMs）対応

// .osu テキストを太鼓ノーツ配列に変換
//   ドン: {time, kind:'don', big}
//   カツ: {time, kind:'kat', big}
//   連打: {time, endTime, kind:'drumroll', big}
//   風船: {time, endTime, kind:'denden'}
function parseTaikoNotes(text) {
  if (typeof parseHitObjects !== "function") return [];
  const objects = parseHitObjects(text);
  const redTP   = typeof parseTimingPoints === "function" ? parseTimingPoints(text) : [];
  const greenTP = typeof parseInheritedTimingPoints === "function" ? parseInheritedTimingPoints(text) : [];
  const sliderMult = typeof parseHitObjectEndSliderMultiplier === "function"
    ? parseHitObjectEndSliderMultiplier(text) : 1.4;

  const notes = [];
  for (const line of objects) {
    const parts = line.split(",");
    if (parts.length < 5) continue;
    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);
    const hs   = parseInt(parts[4], 10) || 0;
    if (!Number.isFinite(time) || !Number.isFinite(type)) continue;

    const kat = (hs & 2) !== 0 || (hs & 8) !== 0; // whistle or clap → カツ
    const big = (hs & 4) !== 0;                    // finish → 大音符

    if (type & 8) {                 // スピナー → 風船
      let endTime = parseInt(parts[5], 10);
      if (!Number.isFinite(endTime)) endTime = time;
      notes.push({ time, endTime, kind: "denden" });
    } else if (type & 2) {          // スライダー → 連打
      let endTime = time;
      if (typeof calculateHitObjectSliderEndTime === "function") {
        endTime = calculateHitObjectSliderEndTime(parts, time, redTP, greenTP, sliderMult);
      }
      if (!Number.isFinite(endTime) || endTime < time) endTime = time;
      notes.push({ time, endTime, kind: "drumroll", big });
    } else if (type & 1) {          // サークル → ドン/カツ
      notes.push({ time, kind: kat ? "kat" : "don", big });
    }
  }
  notes.sort((a, b) => a.time - b.time);
  return notes;
}

// 赤線(uninherited)を {time, beatLength, meter} で返す（グリッド用。meter が要るため独自実装）
function parseTaikoRedTiming(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const red = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[TimingPoints]") { inSection = true; continue; }
    if (!inSection) continue;
    if (trimmed.startsWith("[")) break;
    if (!trimmed || trimmed.startsWith("//")) continue;
    const parts = trimmed.split(",");
    if (parts.length < 7) continue;
    const time = parseFloat(parts[0]);
    const beatLength = parseFloat(parts[1]);
    const meter = parseInt(parts[2], 10);
    const uninherited = parseInt(parts[6], 10);
    if (uninherited === 1 && Number.isFinite(time) && Number.isFinite(beatLength) && beatLength > 0) {
      red.push({ time, beatLength, meter: Number.isFinite(meter) && meter > 0 ? meter : 4 });
    }
  }
  red.sort((a, b) => a.time - b.time);
  return red;
}

const TAIKO_COLORS = {
  don: "#f24b4b",
  kat: "#5b9bd5",
  roll: "rgba(245,180,0,0.92)",
};

function taikoTruncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

// カプセル（連打バー）。roundRect は Electron 13(Chromium91)に無いので arc で描く
function taikoCapsule(ctx, x1, x2, yMid, r) {
  const left = Math.min(x1, x2), right = Math.max(x1, x2);
  ctx.beginPath();
  ctx.arc(left, yMid, r, Math.PI / 2, Math.PI * 1.5);
  ctx.lineTo(right, yMid - r);
  ctx.arc(right, yMid, r, Math.PI * 1.5, Math.PI / 2);
  ctx.closePath();
}

function taikoGcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }

// ビート内の細分割位置に応じた色（osu!エディタ風のスナップ色）
function taikoTickColor(beatPos, snap) {
  if (beatPos === 0) return null;
  const g = taikoGcd(beatPos, snap) || 1;
  const den = snap / g;
  if (den === 2) return "rgba(237,80,80,0.45)";   // 1/2 赤
  if (den === 4) return "rgba(90,140,230,0.45)";   // 1/4 青
  if (den === 3) return "rgba(200,95,215,0.42)";   // 1/3 マゼンタ
  if (den === 6) return "rgba(150,95,215,0.42)";   // 1/6 紫
  if (den === 8) return "rgba(220,200,70,0.40)";   // 1/8 黄
  return "rgba(150,150,160,0.36)";                  // その他 灰
}

// 全レーン貫通のスナップグリッド
function drawTaikoGrid(ctx, red, currentTime, judgmentX, pxPerMs, x0, x1, y0, y1, snap) {
  if (!red || !red.length) return;
  const leftTime  = currentTime - (judgmentX - x0) / pxPerMs;
  const rightTime = currentTime + (x1 - judgmentX) / pxPerMs;
  for (let i = 0; i < red.length; i++) {
    const seg = red[i];
    const beat = seg.beatLength;
    if (!Number.isFinite(beat) || beat <= 0) continue;
    const meter = Number.isFinite(seg.meter) && seg.meter > 0 ? seg.meter : 4;
    const segStart = seg.time;
    const segEnd = i + 1 < red.length ? red[i + 1].time : rightTime + beat;
    if (segEnd < leftTime || segStart > rightTime) continue;

    const step = beat / snap;
    if (!(step > 0)) continue;
    const drawMinor = step * pxPerMs >= 5;   // 細かすぎる時はビート線のみ
    const drawBeat  = beat * pxPerMs >= 4;   // ビートも潰れる時は小節線のみ
    const lastT = Math.min(segEnd, rightTime);

    let j = Math.ceil((Math.max(segStart, leftTime) - segStart) / step - 1e-6);
    if (j < 0) j = 0;
    let guard = 0;
    for (; ; j++) {
      if (++guard > 6000) break;
      const t = segStart + j * step;
      if (t > lastT) break;
      const beatPos = ((j % snap) + snap) % snap;
      const isBeat = beatPos === 0;
      const beatsFromStart = Math.floor(j / snap);
      const isMeasure = isBeat && (((beatsFromStart % meter) + meter) % meter === 0);

      let color, w;
      if (isMeasure)      { color = "rgba(255,255,255,0.32)"; w = 1.5; }
      else if (isBeat)    { if (!drawBeat) continue;  color = "rgba(255,255,255,0.14)"; w = 1; }
      else                { if (!drawMinor) continue; color = taikoTickColor(beatPos, snap); w = 1; }

      const x = judgmentX + (t - currentTime) * pxPerMs;
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    }
  }
}

// diffs: [{name, notes, red}], currentTime: ms(or null)
// opts: {pxPerMs, snap, emptyText, idleText}
function drawTaikoSpread(canvas, diffs, currentTime, opts) {
  opts = opts || {};
  const wrap = canvas.parentElement || canvas;
  const cssW = Math.max(360, canvas.clientWidth || wrap.clientWidth || 800);
  const cssH = Math.max(120, canvas.clientHeight || wrap.clientHeight || 360);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width  !== Math.round(cssW * dpr)) canvas.width  = Math.round(cssW * dpr);
  if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#1a1a1f";
  ctx.fillRect(0, 0, cssW, cssH);

  const labelW = 112;                 // 左の難易度名カラム
  const playX0 = labelW;
  const playX1 = cssW;
  const judgmentX = playX0 + (playX1 - playX0) / 2; // 判定ライン＝中央
  const pxPerMs = opts.pxPerMs || 0.32;
  const snap = Number.isFinite(opts.snap) && opts.snap > 0 ? opts.snap : 4;
  const soundLane = Number.isFinite(opts.soundLane) ? opts.soundLane : -1; // 効果音を鳴らすレーン

  const n = diffs.length;
  if (n === 0) {
    ctx.fillStyle = "#666"; ctx.font = "13px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(opts.emptyText || "譜面が読み込まれていません", cssW / 2, cssH / 2);
    return;
  }

  const topPad = 4, botPad = 4;
  const laneH  = Math.max(26, Math.min(86, (cssH - topPad - botPad) / n));
  const radius = Math.max(7, Math.min(17, laneH * 0.26));
  const bigR   = radius * 1.45;
  const gridY1 = topPad + n * laneH;
  const playable = currentTime != null && Number.isFinite(currentTime);

  // レーン背景（交互）
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#202028" : "#1b1b22";
    ctx.fillRect(playX0, topPad + i * laneH, playX1 - playX0, laneH);
  }

  // グリッド + ノーツ（プレイフィールドにクリップ）
  ctx.save();
  ctx.beginPath();
  ctx.rect(playX0, 0, playX1 - playX0, cssH);
  ctx.clip();

  if (playable) {
    let refRed = null;
    for (let i = 0; i < n; i++) { if (diffs[i].red && diffs[i].red.length) { refRed = diffs[i].red; break; } }
    drawTaikoGrid(ctx, refRed, currentTime, judgmentX, pxPerMs, playX0, playX1, topPad, gridY1, snap);

    const futureMs = (playX1 - judgmentX) / pxPerMs;
    const pastMs   = (judgmentX - playX0) / pxPerMs;
    const marginMs = 40 / pxPerMs;

    for (let i = 0; i < n; i++) {
      const notes = diffs[i].notes;
      const yMid = topPad + i * laneH + laneH / 2;
      // 連打/風船を先に、円を後に（円が上に重なる）。
      // 各パス内は時刻の降順で描画し、時間的に先（左）のノーツが前面に来るようにする。
      for (let pass = 0; pass < 2; pass++) {
        for (let k = notes.length - 1; k >= 0; k--) {
          const note = notes[k];
          const dt = note.time - currentTime;
          if (dt > futureMs + marginMs) continue; // 未来側の視界外
          if (dt < -pastMs - marginMs) break;     // これ以降は過去
          const isRoll = note.kind === "drumroll" || note.kind === "denden";
          if (pass === 0 && !isRoll) continue;
          if (pass === 1 && isRoll) continue;
          const x = judgmentX + dt * pxPerMs;

          if (isRoll) {
            const x2 = judgmentX + ((note.endTime != null ? note.endTime : note.time) - currentTime) * pxPerMs;
            const r = note.kind === "denden" ? radius : (note.big ? bigR : radius);
            ctx.fillStyle = TAIKO_COLORS.roll;
            taikoCapsule(ctx, x, x2, yMid, r); ctx.fill();
            if (note.kind === "denden") {
              ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5;
              taikoCapsule(ctx, x, x2, yMid, r); ctx.stroke();
            }
          } else {
            const r = note.big ? bigR : radius;
            ctx.beginPath();
            ctx.fillStyle = note.kind === "kat" ? TAIKO_COLORS.kat : TAIKO_COLORS.don;
            ctx.arc(x, yMid, r, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
          }
        }
      }
    }
  }
  ctx.restore();

  // 判定ライン（中央・全高）
  ctx.strokeStyle = "#ff5a5a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(judgmentX, 0); ctx.lineTo(judgmentX, cssH); ctx.stroke();

  // レーン区切り線（全幅）
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    const y = topPad + i * laneH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke();
  }

  // 左の難易度名カラム（ノーツの上に被せる）
  ctx.fillStyle = "#16161b";
  ctx.fillRect(0, 0, labelW, cssH);
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(labelW, 0); ctx.lineTo(labelW, cssH); ctx.stroke();
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const yTop = topPad + i * laneH;
    const yMid = yTop + laneH / 2;
    const isSound = i === soundLane;
    if (isSound) {
      // 効果音を鳴らすレーンを強調
      ctx.fillStyle = "rgba(110,231,154,0.14)";
      ctx.fillRect(0, yTop, labelW, laneH);
      ctx.fillStyle = "#6ee79a";
      ctx.fillRect(0, yTop, 3, laneH);
      ctx.beginPath(); ctx.arc(labelW - 8, yMid, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = isSound ? "#dffbe8" : "#cfcfe0";
    ctx.fillText(taikoTruncate(ctx, diffs[i].name || "Diff " + (i + 1), labelW - (isSound ? 18 : 12)), 10, yMid);
  }

  if (!playable) {
    ctx.fillStyle = "#777"; ctx.font = "12px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(opts.idleText || "osu! を再生すると流れます", (labelW + cssW) / 2, cssH - 6);
  }

  // クリックでレーン選択できるようジオメトリを保存
  canvas.__spreadGeom = { topPad: topPad, laneH: laneH, n: n };
}

// 太鼓の効果音（ドン/カツ）を Web Audio で合成する。音源ファイル不要。
function createTaikoHitSynth() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();       // 音量マスター
  master.gain.value = 1;
  master.connect(ctx.destination);
  let noiseBuf = null;
  const getNoise = () => {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.1);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };
  const at = (when) => (when && when > ctx.currentTime ? when : ctx.currentTime);
  // ドン（低い太鼓）: サイン波を素早く下げて減衰。when=発音予定時刻(ctx時間)
  const don = (big, when) => {
    const t = at(when);
    const g = ctx.createGain();
    g.connect(master);
    const v = big ? 0.95 : 0.6;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.11);
    o.connect(g);
    o.start(t); o.stop(t + 0.2);
  };
  // カツ（高い縁）: バンドパスしたノイズ短音
  const kat = (big, when) => {
    const t = at(when);
    const dur = 0.07;
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.7;
    const g = ctx.createGain();
    const v = big ? 0.7 : 0.42;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  };
  const resume = () => { if (ctx.state === "suspended") ctx.resume(); };
  const setVolume = (v) => { master.gain.value = Math.max(0, Math.min(1, v)); };
  return { don, kat, resume, setVolume, ctx };
}

// 自前の音源ファイル（base64データURLのマップ）から効果音キットを作る。
//   soundMap: { don, kat, donBig?, katBig? }（各 data:URL 文字列）
// createTaikoHitSynth と同じ { don(big), kat(big), resume } を返す。
function createTaikoSampleKit(soundMap) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx || !soundMap || (!soundMap.don && !soundMap.kat)) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();       // 音量マスター
  master.gain.value = 1;
  master.connect(ctx.destination);
  const buffers = { don: null, kat: null, donBig: null, katBig: null };
  Object.keys(buffers).forEach((k) => {
    if (!soundMap[k]) return;
    fetch(soundMap[k])
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => { buffers[k] = buf; })
      .catch(() => {});
  });
  const play = (buf, vol, when) => {
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(master);
    src.start(when && when > ctx.currentTime ? when : ctx.currentTime);
  };
  return {
    don: (big, when) => play(big && buffers.donBig ? buffers.donBig : buffers.don, big ? 1.0 : 0.85, when),
    kat: (big, when) => play(big && buffers.katBig ? buffers.katBig : buffers.kat, big ? 1.0 : 0.85, when),
    resume: () => { if (ctx.state === "suspended") ctx.resume(); },
    setVolume: (v) => { master.gain.value = Math.max(0, Math.min(1, v)); },
    ctx
  };
}

if (typeof window !== "undefined") {
  window.parseTaikoNotes = parseTaikoNotes;
  window.parseTaikoRedTiming = parseTaikoRedTiming;
  window.drawTaikoSpread = drawTaikoSpread;
  window.createTaikoHitSynth = createTaikoHitSynth;
  window.createTaikoSampleKit = createTaikoSampleKit;
}
