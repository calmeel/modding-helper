// 太鼓プレビューのタイミング、速度、表示用イベントの計算。
// osu!taiko の実機スクロール定数（800x600 換算）
//   175 px/beat × SliderMultiplier（既定1.4 → 245 px/beat）
//   受け口は左端から165px、プレイフィールド長 = 600×アスペクト比 − 165（16:9 で約901px）
const OSU_TAIKO_PX_PER_BEAT = 175;
const OSU_TAIKO_PLAYFIELD_PX = 600 * (16 / 9) - 165; // ≒901.7（16:9基準）
const TAIKO_TIMING_INFO_WIDTH = 82;
// 通常ノーツの直径(800x600換算)。位置と同じ縮尺で描くことで実機と同じ見え方になる。
// 実機と見比べて調整可能（大きい=詰まって見える / 小さい=まばらに見える）。
const OSU_TAIKO_NOTE_PX = 65;

// 等速表示の基準に使う dominant BPM。
// 最後のノーツまでの各赤線区間を合計し、最も長く使われている BPM を返す。
function getTaikoDominantBpm(red, endTime) {
  if (!Array.isArray(red) || !red.length || !Number.isFinite(endTime)) return null;

  const durationsByBpm = new Map();
  for (let i = 0; i < red.length; i++) {
    const point = red[i];
    const next = red[i + 1];
    const start = Math.max(0, point.time);
    const end = Math.max(start, next ? Math.min(next.time, endTime) : endTime);
    const duration = end - start;
    if (!Number.isFinite(point.beatLength) || point.beatLength <= 0 || duration <= 0) continue;

    const bpm = 60000 / point.beatLength;
    if (!Number.isFinite(bpm) || bpm <= 0) continue;
    const key = bpm.toFixed(6);
    durationsByBpm.set(key, (durationsByBpm.get(key) || 0) + duration);
  }

  let dominantBpm = null;
  let dominantDuration = -1;
  for (const [key, duration] of durationsByBpm) {
    if (duration > dominantDuration) {
      dominantBpm = parseFloat(key);
      dominantDuration = duration;
    }
  }
  return dominantBpm;
}

// SliderMultiplier 1.4 / SV x1.0 の実機速度を、現在のプレビュー幅へ換算する。
// drawTaikoSpread のラベル幅・Test表示の縮尺と同じ式を使う。
function getTaikoEqualSpeedPxPerMs(dominantBpm, canvasWidth, showTimingInfo) {
  if (!Number.isFinite(dominantBpm) || dominantBpm <= 0) return null;
  const cssW = Math.max(360, Number.isFinite(canvasWidth) ? canvasWidth : 800);
  const diffLabelW = Math.round(Math.min(190, Math.max(120, cssW * 0.15)));
  const labelW = diffLabelW + (showTimingInfo ? TAIKO_TIMING_INFO_WIDTH : 0);
  const playWidth = cssW - labelW;
  const previewScale = (playWidth / 2) / OSU_TAIKO_PLAYFIELD_PX;
  const osuPxPerMs = OSU_TAIKO_PX_PER_BEAT * 1.4 * dominantBpm / 60000;
  const pxPerMs = osuPxPerMs * previewScale;
  return Number.isFinite(pxPerMs) && pxPerMs > 0 ? pxPerMs : null;
}

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

// osu!stable の Taiko スピナー表示タイミングを各風船へ付与する。
// stable は赤線・緑線を別配列にせず、ファイル順を保持した単一の Timing Point 一覧を使う。
// これにより、先頭が緑線の時に赤線検索の初期 index=0 が同じ緑線を指し、
// 速度が fallback へ入る legacy 挙動も再現できる。
const TAIKO_STABLE_VELOCITY_MULTIPLIER = 1.4;
const TAIKO_STABLE_SCROLL_FACTOR = 0.6000000238418579;
const TAIKO_STABLE_MAX_PREEMPT_MS = 5000;

function taikoStableVelocityAt(timingPoints, time, taikoSliderMultiplier) {
  const fallback = 100 * taikoSliderMultiplier;
  if (!Array.isArray(timingPoints) || timingPoints.length === 0) return fallback;

  let redIndex = 0;
  let greenIndex = 0;
  for (let i = 0; i < timingPoints.length; i++) {
    const point = timingPoints[i];
    if (point.time > time) break;
    if (point.uninherited === 1) redIndex = i;
    else greenIndex = i;
  }

  const redPoint = timingPoints[redIndex];
  let effectiveBeatLength = redPoint && redPoint.beatLength;
  if (greenIndex > redIndex) {
    const greenPoint = timingPoints[greenIndex];
    const rawGreen = greenPoint && greenPoint.beatLength;
    if (Number.isFinite(rawGreen)) {
      const inheritedMultiplier = Math.max(10, Math.min(10000, -rawGreen)) / 100;
      effectiveBeatLength *= inheritedMultiplier;
    }
  }

  const velocity = 100000 * taikoSliderMultiplier / effectiveBeatLength;
  return Number.isFinite(velocity) && velocity > 0 ? velocity : fallback;
}

function taikoStableObjectLifetime(velocity) {
  if (!(velocity > 0) || !Number.isFinite(velocity)) return 0;
  return Math.max(0, Math.trunc(
    600 / velocity / TAIKO_STABLE_SCROLL_FACTOR * 1000
  ));
}

function applyTaikoStableSwellTimings(notes, text, sliderMultiplier) {
  if (!Array.isArray(notes) || notes.length === 0) return;
  const timingPoints = typeof parseTimingPointsDetailed === "function"
    ? parseTimingPointsDetailed(text).filter(point =>
      Number.isFinite(point.time) &&
      Number.isFinite(point.beatLength) &&
      (point.uninherited === 0 || point.uninherited === 1)
    )
    : [];
  const sm = Number.isFinite(sliderMultiplier) && sliderMultiplier > 0
    ? sliderMultiplier : 1.4;
  const taikoSm = sm * TAIKO_STABLE_VELOCITY_MULTIPLIER;
  const firstTime = timingPoints.length ? timingPoints[0].time : 0;
  const preempt = Math.min(
    TAIKO_STABLE_MAX_PREEMPT_MS,
    taikoStableObjectLifetime(taikoStableVelocityAt(timingPoints, firstTime, taikoSm))
  );

  for (const note of notes) {
    if (note.kind !== "denden") continue;
    note.stableSwellPreemptMs = preempt;
    note.stableSwellLifetimeMs = taikoStableObjectLifetime(
      taikoStableVelocityAt(timingPoints, note.time, taikoSm)
    );
  }
}

// osu!stable と同じ手順で小節線を生成し、速度も付与する。
// 生成時刻は共通の barlineTiming.js に任せることで、負時刻開始、
// 赤線境界、反復加算誤差、conv.i4 相当の整数化、omit first barline を再現する。
// NCシンバルが鳴る間隔（小節数）。meter に関係なく4小節ごと。
const NC_CYMBAL_MEASURES = 4;

function buildTaikoBarlines(text, red, green, sliderMultiplier) {
  if (
    typeof buildBarlineTimelines !== "function" ||
    typeof text !== "string"
  ) {
    return [];
  }

  const timeline = buildBarlineTimelines(text);
  const bars = timeline.stable.events
    .map(event => ({
      time: event.time,
      rawTime: event.rawTime,
      sectionIndex: event.sectionIndex,
      major:
        event.candidateIndex % NC_CYMBAL_MEASURES === 0
    }))
    .sort((a, b) =>
      a.time - b.time ||
      a.sectionIndex - b.sectionIndex
    );

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

// Diff名の横へ表示するBPM / SV / Volume用にTiming Pointを一度だけ解析する。
// 同時刻の行はファイル順を保ち、後の行が最終状態になるようにする。
function parseTaikoTimingInfoPoints(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const points = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "[TimingPoints]") { inSection = true; continue; }
    if (!inSection) continue;
    if (line.startsWith("[")) break;
    if (!line || line.startsWith("//")) continue;

    const parts = line.split(",");
    if (parts.length < 7) continue;
    const time = Math.round(parseFloat(parts[0]));
    const beatLength = parseFloat(parts[1]);
    const volume = parseInt(parts[5], 10);
    const uninherited = parseInt(parts[6], 10);
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(beatLength) ||
      !Number.isFinite(volume) ||
      (uninherited !== 0 && uninherited !== 1)
    ) continue;
    points.push({ time, beatLength, volume, uninherited, order: i });
  }
  points.sort((a, b) => (a.time - b.time) || (a.order - b.order));
  let activeBeatLength = null;
  let activeSv = null;
  let activeVolume = null;
  for (const point of points) {
    activeVolume = Math.max(0, Math.min(100, point.volume));
    if (point.uninherited === 1) {
      if (point.beatLength > 0) activeBeatLength = point.beatLength;
      activeSv = 1;
    } else if (point.beatLength < 0) {
      activeSv = -100 / point.beatLength;
    }
    const bpm = activeBeatLength > 0 ? 60000 / activeBeatLength : null;
    point.activeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : null;
    point.activeSv = Number.isFinite(activeSv) && activeSv > 0 ? activeSv : null;
    point.activeVolume = activeVolume;
  }
  return points;
}

function getTaikoTimingInfoAt(points, currentTime) {
  if (!Array.isArray(points) || !points.length || !Number.isFinite(currentTime)) return null;
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].time <= currentTime) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return null;
  const point = points[lo - 1];
  return {
    bpm: point.activeBpm,
    sv: point.activeSv,
    volume: point.activeVolume
  };
}

function formatTaikoTimingBpm(bpm) {
  if (!Number.isFinite(bpm) || bpm <= 0) return "—";
  const rounded = Math.round(bpm * 100) / 100;
  return (Math.abs(rounded - Math.round(rounded)) < 1e-9
    ? String(Math.round(rounded))
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")) + " BPM";
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

