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
  const tickRate = parseTaikoDifficultyValue(text, "SliderTickRate", 1);
  const overallDiff = parseTaikoDifficultyValue(text, "OverallDifficulty", 5);

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
    const nc  = (type & 4) !== 0;                  // New Combo フラグ

    if (type & 8) {                 // スピナー → 風船
      let endTime = parseInt(parts[5], 10);
      if (!Number.isFinite(endTime)) endTime = time;
      // 風船は必要打数（OD と長さで決まる）を持たせて画面に出す
      notes.push({ time, endTime, kind: "denden", nc,
                   requiredHits: taikoSwellRequiredHits(endTime - time, overallDiff) });
    } else if (type & 2) {          // スライダー → 連打
      let endTime = time;
      if (typeof calculateHitObjectSliderEndTime === "function") {
        endTime = calculateHitObjectSliderEndTime(parts, time, redTP, greenTP, sliderMult);
      }
      if (!Number.isFinite(endTime) || endTime < time) endTime = time;
      const tickSpacing = taikoDrumRollTickSpacing(time, redTP, tickRate);
      notes.push({ time, endTime, kind: "drumroll", big, nc, tickSpacing });
    } else if (type & 1) {          // サークル → ドン/カツ
      notes.push({ time, kind: kat ? "kat" : "don", big, nc });
    }
  }
  notes.sort((a, b) => a.time - b.time);
  assignTaikoComboNumbers(notes);
  return notes;
}

// [Difficulty] から数値を1つ読む（SliderTickRate 等）
function parseTaikoDifficultyValue(text, key, fallback) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[Difficulty]") { inSection = true; continue; }
    if (!inSection) continue;
    if (trimmed.startsWith("[")) break;
    if (trimmed.startsWith(key + ":")) {
      const v = parseFloat(trimmed.slice(key.length + 1));
      if (Number.isFinite(v)) return v;
      break;
    }
  }
  return fallback;
}

// osu! の DifficultyRange。難易度値[0,10]を [min, mid, max] の範囲へ写す。
//   出典: osu.Game/Beatmaps/IBeatmapDifficultyInfo.cs
//   OD>5 は mid→max、OD<5 は mid→min へ線形（OD=5 でちょうど mid）。
function taikoDifficultyRange(difficulty, min, mid, max) {
  if (difficulty > 5) return mid + (max - mid) * (difficulty - 5) / 5;
  if (difficulty < 5) return mid + (mid - min) * (difficulty - 5) / 5;
  return mid;
}

// 風船(スピナー/Swell)に必要な打数。
//   1秒あたりの必要打数 = DifficultyRange(OD, 3, 5, 7.5) × 1.65
//     （1.65 は「太鼓の風船は osu! のスピナーより簡単だから」の補正係数）
//   必要打数 = (int)max(1, 長さ秒 × 1秒あたりの必要打数)   ※小数は切り捨て
//   出典: osu.Game.Rulesets.Taiko/Beatmaps/TaikoBeatmapConverter.cs
function taikoSwellRequiredHits(durationMs, overallDifficulty) {
  const od = Number.isFinite(overallDifficulty) ? overallDifficulty : 5;
  const perSecond = taikoDifficultyRange(od, 3, 5, 7.5) * 1.65;
  return Math.trunc(Math.max(1, (durationMs / 1000) * perSecond));
}

// 連打(drumroll)のティック間隔[ms]。osu!taiko の規則に合わせる:
//   ・SliderTickRate をそのまま使わず、3 のときだけ 3、それ以外（1/2/4 等）は 4
//   ・間隔 = 連打開始時点の「赤線」の beatLength ÷ その値（緑線=SV は影響しない）
//   出典: osu.Game.Rulesets.Taiko/Objects/DrumRoll.cs の ApplyDefaultsToSelf
function taikoDrumRollTickSpacing(startTime, redTP, sliderTickRate) {
  const rate = sliderTickRate === 3 ? 3 : 4;
  let beatLength = 0;
  if (redTP && redTP.length) {
    let tp = redTP[0];   // 最初の赤線より前の物は最初の赤線を使う（osu! と同じ）
    for (const p of redTP) { if (p.time <= startTime) tp = p; else break; }
    beatLength = tp.beatLength;
  }
  if (!(beatLength > 0)) return 0;
  return beatLength / rate;
}

// 連打のティック時刻を列挙する。osu! の createTicks と同じ打ち切り条件
//   （t < EndTime + tickSpacing/2）なので、最後のティックが末端を少し超えることがある。
function taikoDrumRollTickTimes(note) {
  const spacing = note.tickSpacing;
  const end = note.endTime != null ? note.endTime : note.time;
  const out = [];
  if (!(spacing > 0)) return out;
  const limit = end + spacing / 2;
  // osu! と同じく加算で進める（誤差の出方まで揃える）。
  // 極端に短い間隔で無限ループにならないよう回数に上限を設ける。
  let t = note.time;
  for (let i = 0; i < 4096 && t < limit; i++, t += spacing) out.push(t);
  return out;
}

// 各ノーツに osu! のコンボ番号を振る（タイムスタンプ「01:23:456 (1,2,3) - 」用）。
//   ・New Combo フラグの付いたノーツが 1 になり、そこから 1 ずつ増える
//   ・譜面の最初のノーツは NC フラグの有無に関わらず必ず 1（osu! が暗黙に NC 扱いするため）
//   ・連打(スライダー)は通常ノーツと同じくカウントする
//   ・風船(スピナー)は NC が立っているものとして扱う
function assignTaikoComboNumbers(notes) {
  let combo = 0;
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const startsCombo = i === 0 || note.nc || note.kind === "denden";
    combo = startsCombo ? 1 : combo + 1;
    note.combo = combo;
  }
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

// osu!taiko の実機スクロール定数（800x600 換算）
//   175 px/beat × SliderMultiplier（既定1.4 → 245 px/beat）
//   受け口は左端から165px、プレイフィールド長 = 600×アスペクト比 − 165（16:9 で約901px）
const OSU_TAIKO_PX_PER_BEAT = 175;
const OSU_TAIKO_PLAYFIELD_PX = 600 * (16 / 9) - 165; // ≒901.7（16:9基準）
// 通常ノーツの直径(800x600換算)。位置と同じ縮尺で描くことで実機と同じ見え方になる。
// 実機と見比べて調整可能（大きい=詰まって見える / 小さい=まばらに見える）。
const OSU_TAIKO_NOTE_PX = 65;

// ゲーム画面表示(SV適用)用: 各ノーツのスクロール速度を求めて note.vel [osu!px/ms] に入れる。
//   osu!taiko は「ノーツごとに、その時刻の SV/BPM で決まる速度」で流れる方式。
//   基準は 175 px/beat × SliderMultiplier（既定1.4 → 245 px/beat, 800x600換算）。
//   px/beat → px/ms は × BPM/60000 = ÷ beatLength なので:
//     v = 175 * SliderMultiplier * SV / beatLength   [px/ms]
//   （出典: osu! forum "Note Speed Mechanics" topic 1851087）
//   赤線(uninherited)は beatLength を更新し SV を 1.0 にリセット、緑線(inherited)が SV を設定する。
function applyTaikoNoteVelocities(notes, red, green, sliderMultiplier) {
  if (!notes || !notes.length) return;
  const sm = Number.isFinite(sliderMultiplier) && sliderMultiplier > 0 ? sliderMultiplier : 1.4;

  // 赤線・緑線を時刻順にマージ（同時刻は赤を先に適用）
  const evts = [];
  if (red)   for (const r of red)   evts.push({ time: r.time, red: true,  beatLength: r.beatLength });
  if (green) for (const g of green) evts.push({ time: g.time, red: false, beatLength: g.beatLength });
  evts.sort((a, b) => (a.time - b.time) || (a.red === b.red ? 0 : (a.red ? -1 : 1)));

  let beat = red && red.length ? red[0].beatLength : 500;
  let sv = 1;
  let ei = 0;
  for (const n of notes) {
    while (ei < evts.length && evts[ei].time <= n.time) {
      const e = evts[ei];
      if (e.red) { if (e.beatLength > 0) beat = e.beatLength; sv = 1; }
      else if (e.beatLength < 0) { sv = -100 / e.beatLength; }
      ei++;
    }
    const b = beat > 0 ? beat : 500;
    const v = OSU_TAIKO_PX_PER_BEAT * sm * sv / b;   // px/ms（800x600換算）
    n.vel = Number.isFinite(v) && v > 0 ? v : 0.3;
  }
}

// 小節線を生成して速度も付与する。赤線の meter ごとに1本、
// 緑線の「小節線を省略」(effects bit3=8) の時刻はスキップする。
// NCシンバルが鳴る間隔（小節数）。meter に関係なく4小節ごと。
const NC_CYMBAL_MEASURES = 4;

function buildTaikoBarlines(red, green, sliderMultiplier, endTime, omitTimes) {
  const bars = [];
  if (!red || !red.length) return bars;
  const omit = Object.create(null);
  if (omitTimes) for (const t of omitTimes) omit[Math.round(t)] = true;

  for (let i = 0; i < red.length; i++) {
    const r = red[i];
    const meter = Number.isFinite(r.meter) && r.meter > 0 ? r.meter : 4;
    const measure = r.beatLength * meter;
    if (!Number.isFinite(measure) || measure <= 0) continue;
    const segEnd = i + 1 < red.length ? red[i + 1].time : endTime;
    if (!(segEnd > r.time)) continue;
    if ((segEnd - r.time) / measure > 20000) continue; // 異常値でのフリーズ防止
    /* major = NCシンバルが鳴る小節線。**meter に関係なく 4小節ごと**（3/4 でも4小節ごと）。
       小節番号は赤線ごとに 0 から数え直すので、各赤線の最初の小節線は必ず major。
       ※ lazer の汎用 BarLineGenerator は `currentBeat % TimeSignature.Numerator == 0` と
         書かれているが、実際の osu! の挙動は meter を問わず4小節ごと。実機に合わせている。 */
    let barIndex = 0;
    for (let t = r.time; t < segEnd; t += measure, barIndex++) {
      if (!omit[Math.round(t)]) bars.push({ time: t, major: barIndex % NC_CYMBAL_MEASURES === 0 });
    }
  }
  bars.sort((a, b) => a.time - b.time);
  applyTaikoNoteVelocities(bars, red, green, sliderMultiplier); // .vel を付与
  return bars;
}

// 進捗バー用のマーカーを .osu から抽出する。
//   kiai: [{start,end}]（end=null は曲末まで）, sv: 緑線の時刻[], bpm: 赤線の時刻[],
//   preview: PreviewTime(ms|null), bookmarks: [ms]
function parseTaikoTimelineMarks(text) {
  const lines = text.split(/\r?\n/);
  let section = "";
  const sv = [], bpm = [], kiai = [], omitBarline = [], breaks = [];
  let bookmarks = [], preview = null, kiaiOpen = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("[") && line.endsWith("]")) { section = line.slice(1, -1); continue; }
    if (!line || line.startsWith("//")) continue;

    if (section === "General") {
      if (line.startsWith("PreviewTime:")) {
        const v = parseInt(line.slice("PreviewTime:".length).trim(), 10);
        if (Number.isFinite(v) && v >= 0) preview = v;
      }
    } else if (section === "Editor") {
      if (line.startsWith("Bookmarks:")) {
        bookmarks = line.slice("Bookmarks:".length).split(",")
          .map(s => parseInt(s.trim(), 10)).filter(v => Number.isFinite(v));
      }
    } else if (section === "Events") {
      // 休憩時間: 「2,開始,終了」または「Break,開始,終了」。他のイベント行は無視
      const p = line.split(",");
      if (p.length >= 3 && (p[0].trim() === "2" || p[0].trim() === "Break")) {
        const s = Math.round(parseFloat(p[1]));
        const e = Math.round(parseFloat(p[2]));
        if (Number.isFinite(s) && Number.isFinite(e) && e > s) breaks.push({ start: s, end: e });
      }
    } else if (section === "TimingPoints") {
      const p = line.split(",");
      if (p.length < 7) continue;
      const time = Math.round(parseFloat(p[0]));
      if (!Number.isFinite(time)) continue;
      const uninherited = parseInt(p[6], 10);
      const effects = p.length >= 8 ? (parseInt(p[7], 10) || 0) : 0;
      if (uninherited === 1) bpm.push(time); else sv.push(time);
      const on = (effects & 1) !== 0; // effects bit0 = kiai
      if (on && kiaiOpen == null) kiaiOpen = time;
      else if (!on && kiaiOpen != null) { kiai.push({ start: kiaiOpen, end: time }); kiaiOpen = null; }
      if ((effects & 8) !== 0) omitBarline.push(time); // bit3 = 小節線を省略
    }
  }
  if (kiaiOpen != null) kiai.push({ start: kiaiOpen, end: null }); // 曲末まで継続
  breaks.sort((a, b) => a.start - b.start);
  return { sv, bpm, kiai, preview, bookmarks, omitBarline, breaks };
}

// 休憩時間の帯を描くための区間を求める。TaikoEditor の ObjectView.java と同じ考え方:
//   ・濃い部分 = .osu に書かれた break 区間そのもの [breakStart, breakEnd]
//   ・薄い部分 = その前後。直前ノーツの「終わり」〜break開始 と、break終了〜次ノーツの頭
//     （直前ノーツは break 開始時刻以前で最後のもの。同時刻に複数あれば最も遅く終わるもの）
//   前後にノーツが無ければ null を返し、描画側で画面端まで伸ばす。
function resolveTaikoBreakRegions(notes, breaks) {
  const out = [];
  if (!breaks || !breaks.length || !notes || !notes.length) return out;
  for (const br of breaks) {
    // 直前のノーツ（同時刻のうち最も遅く終わるもの）の終了時刻
    let idx = -1;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].time <= br.start) idx = i; else break;
    }
    let start = null;
    if (idx >= 0) {
      const t0 = notes[idx].time;
      start = t0;
      for (let i = idx; i >= 0 && notes[i].time === t0; i--) {
        const e = notes[i].endTime != null ? notes[i].endTime : notes[i].time;
        if (e > start) start = e;
      }
    }
    // break 終了以降で最初のノーツの頭
    let end = null;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].time >= br.end) { end = notes[i].time; break; }
    }
    out.push({ start, breakStart: br.start, breakEnd: br.end, end });
  }
  return out;
}

// 下部の進捗バー（音源長を 100% とした帯）。kiai=オレンジ背景 / SV=緑 / BPM=赤 /
// プレビューポイント=黄 / Bookmark=青、再生位置を白線で表示。
function drawTaikoProgressBar(canvas, marks, durationMs, curMs) {
  const wrap = canvas.parentElement || canvas;
  const cssW = Math.max(40, canvas.clientWidth || wrap.clientWidth || 300);
  const cssH = Math.max(8, canvas.clientHeight || 18);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width  !== Math.round(cssW * dpr)) canvas.width  = Math.round(cssW * dpr);
  if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#15151a";
  ctx.fillRect(0, 0, cssW, cssH);

  const dur = durationMs > 0 ? durationMs : 0;
  const xOf = (t) => (dur > 0 ? Math.max(0, Math.min(cssW, (t / dur) * cssW)) : 0);
  const midY = Math.round(cssH / 2) + 0.5;          // 中央の軸線
  const kiaiHalf = Math.max(2, Math.round(cssH * 0.2)); // kiai 帯の上下の厚み
  // 上半分/下半分に伸びる目盛り線
  const vseg = (t, color, w, up) => {
    ctx.strokeStyle = color; ctx.lineWidth = w || 1;
    const x = Math.round(xOf(t)) + 0.5;
    ctx.beginPath();
    if (up) { ctx.moveTo(x, 1); ctx.lineTo(x, midY); }
    else    { ctx.moveTo(x, midY); ctx.lineTo(x, cssH - 1); }
    ctx.stroke();
  };

  // kiai: 中央線の上下だけをオレンジで塗る（全高は塗らない）
  if (dur > 0 && marks && marks.kiai) {
    ctx.fillStyle = "rgba(245,150,40,0.55)";
    for (const k of marks.kiai) {
      const s = xOf(k.start);
      const e = xOf(k.end == null ? dur : k.end);
      if (e > s) ctx.fillRect(s, midY - kiaiHalf, Math.max(1, e - s), kiaiHalf * 2);
    }
  }

  // 中央の白い細線（時間軸）
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(cssW, midY); ctx.stroke();

  if (dur > 0 && marks) {
    // 白線より上: SV(緑) / BPM(赤)
    if (marks.sv)  for (const t of marks.sv)  vseg(t, "rgba(80,220,120,0.95)", 1, true);
    if (marks.bpm) for (const t of marks.bpm) vseg(t, "rgba(240,70,70,1)",     1, true);
    // 白線より下: Bookmark(青) / プレビューポイント(黄)
    if (marks.bookmarks) for (const t of marks.bookmarks) vseg(t, "rgba(80,150,255,1)", 1, false);
    if (marks.preview != null) vseg(marks.preview, "rgba(250,220,60,1)", 2, false);
  }

  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  // 再生位置（全高の白線）
  if (dur > 0 && curMs != null && Number.isFinite(curMs)) {
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
    const x = Math.round(xOf(curMs)) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cssH); ctx.stroke();
  }
}

const TAIKO_COLORS = {
  don: "#f24b4b",
  kat: "#5b9bd5",
  roll: "rgba(245,180,0,0.92)",   // 連打(drumroll): 黄
  rollTick: "rgba(140,95,0,0.55)", // 連打のティック（黄と同系のやや暗い琥珀。茶色すぎると浮く）
  denden: "rgba(205,205,212,0.9)", // 風船/スピナー(denden): 薄いグレー（TaikoEditor風）
  dendenText: "#2b2b34",          // 風船に出す必要打数（薄い本体の上なので暗い色）
  ncBar: "rgba(120,220,255,0.95)", // NCシンバルが鳴る小節線（major）
  selRing: "rgba(255,105,215,0.95)", // 選択中のノーツの縁（osu!エディタ風のピンク）
  selGlow: "rgba(255,60,200,0.95)",  // その外側のモヤ
  /* 休憩時間(break)の帯。TaikoEditor の ObjectView.java の2段階（breakColor /
     faintBreakColor）に倣う。ただし向こうより背景が暗いので、同じ不透明度では
     ほぼ見えないため、2段階の関係は保ったまま濃さを上げてある。 */
  breakMain:  "rgba(165,165,175,0.42)", // break 区間そのもの
  breakFaint: "rgba(140,140,150,0.22)", // その前後の余白
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
  /* 判定ラインの位置（プレイフィールド幅に対する割合）。既定 0.5＝中央。
     左に寄せると過去側が狭く未来側が広くなり、先の譜面を長く見渡せる。 */
  const judgeFrac = Number.isFinite(opts.judgeFrac)
    ? Math.max(0.05, Math.min(0.95, opts.judgeFrac)) : 0.5;
  const judgmentX = playX0 + (playX1 - playX0) * judgeFrac;
  const pxPerMs = opts.pxPerMs || 0.32;
  const snap = Number.isFinite(opts.snap) && opts.snap > 0 ? opts.snap : 4;
  const soundLane = Number.isFinite(opts.soundLane) ? opts.soundLane : -1; // 効果音を鳴らすレーン
  const isSelected = typeof opts.isSelected === "function" ? opts.isSelected : null; // 選択中判定
  const showNcCymbal = !!opts.showNcCymbal;   // NCシンバル位置(major小節線)の強調
  const hits = [];                            // クリック判定用に描いたノーツの位置を溜める
  const svMode  = !!opts.svMode;              // true = ゲーム画面表示（SV/BPM適用）
  /* osu!px → 画面px の換算。判定点→右端の到達時間が実機と一致するように、
     「このビューの接近距離 ÷ osu!のプレイフィールド長」で縮尺を決める（ズーム非依存）。
     基準は「判定ライン中央」時の接近距離で固定する。判定ラインを左に寄せても
     ノーツの大きさとスクロール速度（px/ms）が変わらないようにするため
     （左寄せでは接近距離が伸びるぶん、ノーツが見え始めてからの時間が長くなる）。 */
  const svScale = ((playX1 - playX0) / 2) / OSU_TAIKO_PLAYFIELD_PX;

  const n = diffs.length;
  if (n === 0) {
    ctx.fillStyle = "#666"; ctx.font = "13px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(opts.emptyText || "譜面が読み込まれていません", cssW / 2, cssH / 2);
    return;
  }

  const topPad = 4, botPad = 4;
  /* レーン高さはノーツに合わせたタイトなサイズ。
     大音符の直径は radius*3 なので、それに少しだけ余白を足した高さを基準にし、
     譜面数が多くて入りきらない場合だけ均等割りに縮める。 */
  const rWant  = (OSU_TAIKO_NOTE_PX / 2) * svScale;
  const availH = (cssH - topPad - botPad) / n;
  const laneH  = Math.max(24, Math.min(rWant * 3.3, availH));
  /* サークル半径は常に実機縮尺（等速表示でも同じ大きさ）。
     譜面数が多くレーンが縮んだ時だけ、大音符が収まるように小さくする。 */
  const radius = Math.max(4, Math.min(rWant, laneH * 0.32)); // 大音符=laneH*0.48 まで
  const bigR   = radius * 1.5;
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
    /* 休憩時間(break)の帯。グリッドやノーツより先に描いて背面にする。
       等速表示のみ（SV適用時は位置がノーツと合わなくなるため。グリッドと同じ扱い） */
    if (!svMode) {
      for (let i = 0; i < n; i++) {
        const diff = diffs[i];
        if (diff._breakRegions == null) {
          diff._breakRegions = resolveTaikoBreakRegions(diff.notes, diff.marks && diff.marks.breaks);
        }
        const regions = diff._breakRegions;
        if (!regions.length) continue;
        const yTop = topPad + i * laneH;
        for (let b = 0; b < regions.length; b++) {
          const rg = regions[b];
          const bs = judgmentX + (rg.breakStart - currentTime) * pxPerMs;
          const be = judgmentX + (rg.breakEnd   - currentTime) * pxPerMs;
          // 前後にノーツが無い側は画面端まで伸ばす
          const s = rg.start == null ? playX0 : judgmentX + (rg.start - currentTime) * pxPerMs;
          const e = rg.end   == null ? playX1 : judgmentX + (rg.end   - currentTime) * pxPerMs;
          if (e < playX0 || s > playX1) continue;
          ctx.fillStyle = TAIKO_COLORS.breakFaint;
          if (bs > s) ctx.fillRect(s,  yTop, bs - s, laneH);
          if (e > be) ctx.fillRect(be, yTop, e - be, laneH);
          ctx.fillStyle = TAIKO_COLORS.breakMain;
          ctx.fillRect(bs, yTop, be - bs, laneH);
        }
      }
    }
    /* グリッドは等速表示のみ（SV適用時はノーツと合わなくなるため出さない＝ゲーム画面に近い） */
    if (!svMode) {
      let refRed = null;
      for (let i = 0; i < n; i++) { if (diffs[i].red && diffs[i].red.length) { refRed = diffs[i].red; break; } }
      drawTaikoGrid(ctx, refRed, currentTime, judgmentX, pxPerMs, playX0, playX1, topPad, gridY1, snap);
      /* NCシンバルが鳴る小節線（major）を強調。等速表示では全難易度で同じ時間軸なので
         最初に見つかった小節線リストを使い、全レーンを貫く1本として描く。 */
      if (showNcCymbal) {
        let refBars = null;
        for (let i = 0; i < n; i++) {
          if (diffs[i].barlines && diffs[i].barlines.length) { refBars = diffs[i].barlines; break; }
        }
        if (refBars) {
          ctx.strokeStyle = TAIKO_COLORS.ncBar;
          ctx.lineWidth = 2;
          for (let b = 0; b < refBars.length; b++) {
            if (!refBars[b].major) continue;
            const bx = judgmentX + (refBars[b].time - currentTime) * pxPerMs;
            if (bx < playX0 - 2 || bx > playX1 + 2) continue;
            const px = Math.round(bx) + 0.5;
            ctx.beginPath(); ctx.moveTo(px, topPad); ctx.lineTo(px, gridY1); ctx.stroke();
          }
        }
      }
    }

    const futureMs = (playX1 - judgmentX) / pxPerMs;
    const pastMs   = (judgmentX - playX0) / pxPerMs;
    const marginMs = 40 / pxPerMs;

    const futCut  = futureMs + marginMs;
    const pastCut = -pastMs - marginMs;
    for (let i = 0; i < n; i++) {
      const diff = diffs[i];
      const notes = diff.notes;
      const yMid = topPad + i * laneH + laneH / 2;
      // 連打(尾)の最長長さをキャッシュ。過去側 break の安全マージンに使う
      // （head が画面外でも尾が見えている連打を消さないため）。
      if (diff._maxRollMs == null) {
        let m = 0;
        for (let q = 0; q < notes.length; q++) {
          const e = notes[q].endTime;
          if (e != null) { const d = e - notes[q].time; if (d > m) m = d; }
        }
        diff._maxRollMs = m;
      }
      /* ゲーム画面表示: 小節線（ノーツと同じSV速度で流れる） */
      if (svMode && diff.barlines && diff.barlines.length) {
        const yTop = topPad + i * laneH;
        for (let b = 0; b < diff.barlines.length; b++) {
          const bar = diff.barlines[b];
          const bv = (bar.vel != null && Number.isFinite(bar.vel) && bar.vel > 0) ? bar.vel : 0.3;
          const bx = judgmentX + (bar.time - currentTime) * bv * svScale;
          if (bx < playX0 - 4 || bx > playX1 + 4) continue;
          /* NCシンバルが鳴る小節線は太く色を変えて強調 */
          const major = showNcCymbal && bar.major;
          ctx.strokeStyle = major ? TAIKO_COLORS.ncBar : "rgba(255,255,255,0.28)";
          ctx.lineWidth = major ? 2 : 1;
          const px = Math.round(bx) + 0.5;
          ctx.beginPath(); ctx.moveTo(px, yTop); ctx.lineTo(px, yTop + laneH); ctx.stroke();
        }
      }
      /* ゲーム画面表示: 判定枠（受け口）。ノーツより先に描いて背面にする */
      if (svMode) {
        ctx.beginPath();
        ctx.arc(judgmentX, yMid, bigR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath();
        ctx.arc(judgmentX, yMid, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.stroke();
      }
      /* 時刻の降順で描く＝時間的に先（判定ラインに近い側）のノーツが後から塗られて前面に来る。
         osu! と同じく「早いオブジェクトが遅いオブジェクトを隠す」。
         連打と円で描画パスを分けると、時刻に関係なく円が前面になってしまうので分けない。 */
      for (let k = notes.length - 1; k >= 0; k--) {
        const note = notes[k];
        const dt = note.time - currentTime;            // head
        const isRoll = note.kind === "drumroll" || note.kind === "denden";
        const endT = note.endTime != null ? note.endTime : note.time;
        let x, x2;
        if (svMode) {
          /* ゲーム画面表示: ノーツごとの速度(SV/BPM/SliderMultiplier)で位置を決める。
             SV により画面上の順序が入れ替わり得るので、時間による打ち切りはせず
             各ノーツの x 範囲で可視判定する。 */
          const vel = (note.vel != null && Number.isFinite(note.vel) && note.vel > 0) ? note.vel : 0.3;
          x  = judgmentX + dt * vel * svScale;
          x2 = judgmentX + (endT - currentTime) * vel * svScale;
          const lo = Math.min(x, x2), hi = Math.max(x, x2);
          if (hi < playX0 - 60 || lo > playX1 + 60) continue;
        } else {
          if (dt > futCut) continue;                   // head が右外 → まだ未来
          // これ以上前は、最長連打でも視界に届かない → 打ち切り
          if (dt < pastCut - diff._maxRollMs) break;
          // 可視判定: 連打は尾(endTime)で判定。head が左外でも尾が見えていれば描く
          const endDt = isRoll ? (endT - currentTime) : dt;
          if (endDt < pastCut) continue;               // 全体が左外
          x  = judgmentX + dt * pxPerMs;
          x2 = judgmentX + (endT - currentTime) * pxPerMs;
        }
        const isDen = note.kind === "denden";
        const r = (isRoll && isDen) ? radius : (note.big ? bigR : radius);
        const selected = isSelected ? !!isSelected(note) : false;

        /* 選択中はピンクのモヤ（osu!エディタの選択表示に合わせる）。
           ノーツ本体より先に描いて、はみ出した分だけが縁に残るようにする。 */
        if (selected) {
          ctx.save();
          ctx.shadowColor = TAIKO_COLORS.selGlow;
          ctx.shadowBlur = Math.max(10, r * 0.9);
          ctx.strokeStyle = TAIKO_COLORS.selRing;
          ctx.lineWidth = 3;
          for (let g = 0; g < 2; g++) {   // 2度描いて濃くする
            if (isRoll) { taikoCapsule(ctx, x, x2, yMid, r + 2); ctx.stroke(); }
            else { ctx.beginPath(); ctx.arc(x, yMid, r + 2, 0, Math.PI * 2); ctx.stroke(); }
          }
          ctx.restore();
        }

        if (isRoll) {
          ctx.fillStyle = isDen ? TAIKO_COLORS.denden : TAIKO_COLORS.roll; // スピナーは薄いグレー
          taikoCapsule(ctx, x, x2, yMid, r); ctx.fill();
          if (isDen) {
            ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5;
            taikoCapsule(ctx, x, x2, yMid, r); ctx.stroke();
          }
          /* 連打のティック（風船には無い）。時刻→位置は head/tail の線形補間で求めるので
             等速表示でも SV 適用表示でも同じコードで正しい位置になる。 */
          if (!isDen && note.tickSpacing > 0) {
            const dur = endT - note.time;
            if (dur > 0) {
              const times = taikoDrumRollTickTimes(note);
              const tickR = Math.max(1.2, r * 0.2);
              ctx.fillStyle = TAIKO_COLORS.rollTick;
              for (let ti = 0; ti < times.length; ti++) {
                const tx = x + ((times[ti] - note.time) / dur) * (x2 - x);
                if (tx < playX0 - tickR || tx > playX1 + tickR) continue;
                ctx.beginPath();
                ctx.arc(tx, yMid, tickR, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          /* 始点・終点の円（TaikoEditor 風）。本体とティックの上に重ねて、
             どこが頭でどこが尾かひと目で分かるようにする。 */
          ctx.fillStyle = isDen ? TAIKO_COLORS.denden : TAIKO_COLORS.roll;
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 2;
          for (let cap = 0; cap < 2; cap++) {
            const cx = cap === 0 ? x : x2;
            if (cx < playX0 - r || cx > playX1 + r) continue;
            ctx.beginPath();
            ctx.arc(cx, yMid, r, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          }
          /* 風船は必要打数を本体の中央に出す。
             長い風船で端が画面外でも読めるよう、表示位置は画面内に寄せる。 */
          if (isDen && note.requiredHits > 0) {
            const left = Math.min(x, x2), right = Math.max(x, x2);
            /* 端の円に重ならないよう本体の内側に置きたいが、短い風船では
               内側の余地が無い。その時は素直に中央へ置く
               （内側だけで判定すると短い風船で数字が出なくなる）。 */
            const inL = left + r, inR = right - r;
            let tx = inR > inL ? (inL + inR) / 2 : (left + right) / 2;
            /* 長い風船で端が画面外でも読めるよう、見えている範囲に寄せる */
            const visL = Math.max(left, playX0 + 3);
            const visR = Math.min(right, playX1 - 3);
            if (visR >= visL) {
              tx = Math.max(visL, Math.min(visR, tx));
              ctx.save();
              ctx.font = "bold " + Math.max(9, Math.round(r * 1.05)) + "px sans-serif";
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillStyle = TAIKO_COLORS.dendenText;
              ctx.fillText(String(note.requiredHits), tx, yMid + 0.5);
              ctx.restore();
            }
          }
        } else {
          ctx.beginPath();
          ctx.fillStyle = note.kind === "kat" ? TAIKO_COLORS.kat : TAIKO_COLORS.don;
          ctx.arc(x, yMid, r, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
        }
        /* クリック判定用に、実際に描いた位置と大きさを残す
           （描画順のまま push するので、後ろの要素ほど前面） */
        hits.push({ note: note, diff: diff, lane: i,
                    x: x, x2: isRoll ? x2 : x, y: yMid, r: r });
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

  /* ドラッグ中の選択範囲（ラバーバンド）。ノーツより後＝最前面に描く */
  const mq = opts.marquee;
  if (mq) {
    const mx = Math.min(mq.x0, mq.x1), my = Math.min(mq.y0, mq.y1);
    const mw = Math.abs(mq.x1 - mq.x0), mh = Math.abs(mq.y1 - mq.y0);
    ctx.fillStyle = "rgba(255,105,215,0.13)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = TAIKO_COLORS.selRing; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(mx) + 0.5, Math.round(my) + 0.5, Math.round(mw), Math.round(mh));
  }

  /* クリック判定用のジオメトリを保存（レーン選択・ノーツ選択の両方で使う）。
     playX0 = プレイフィールドの左端。ここより左は難易度名のラベル列で、
     ノーツの上に被せて描いている＝見えていないので、ノーツ判定から除外させる。 */
  canvas.__spreadGeom = { topPad: topPad, laneH: laneH, n: n, hits: hits, playX0: playX0 };
}

// 太鼓の効果音（ドン/カツ）を Web Audio で合成する。音源ファイル不要。
function createTaikoHitSynth(extCtx) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx && !extCtx) return null;
  const ctx = extCtx || new Ctx();   // 外部 ctx があれば共用（音楽と時計を揃えるため）
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
function createTaikoSampleKit(soundMap, extCtx) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if ((!Ctx && !extCtx) || !soundMap || (!soundMap.don && !soundMap.kat)) return null;
  const ctx = extCtx || new Ctx();   // 外部 ctx があれば共用（音楽と時計を揃えるため）
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
  window.assignTaikoComboNumbers = assignTaikoComboNumbers;
  window.taikoDrumRollTickTimes = taikoDrumRollTickTimes;
  window.taikoSwellRequiredHits = taikoSwellRequiredHits;
  window.resolveTaikoBreakRegions = resolveTaikoBreakRegions;
  window.parseTaikoRedTiming = parseTaikoRedTiming;
  window.parseTaikoTimelineMarks = parseTaikoTimelineMarks;
  window.applyTaikoNoteVelocities = applyTaikoNoteVelocities;
  window.buildTaikoBarlines = buildTaikoBarlines;
  window.drawTaikoProgressBar = drawTaikoProgressBar;
  window.drawTaikoSpread = drawTaikoSpread;
  window.createTaikoHitSynth = createTaikoHitSynth;
  window.createTaikoSampleKit = createTaikoSampleKit;
}
