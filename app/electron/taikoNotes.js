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

// osu!stable の風船(スピナー/Swell)に必要な実入力数。
//   1. 長さ秒 × DifficultyRange(OD, 3, 5, 7.5) を先に整数化する。
//   2. その基礎 half-spin 数へ 1.65f を掛け、最低1の完了閾値を求める。
//   3. stable は進行値が閾値を「越えた」時に完了するため、最後の1打を加える。
//   この順序は lazer の RequiredHits 計算とは異なり、最短でも実入力は2打になる。
//   参考: docs/spinnerHitCount.html
function taikoSwellRequiredHits(durationMs, overallDifficulty) {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const od = Number.isFinite(overallDifficulty) ? overallDifficulty : 5;
  const halfSpinsPerSecond = taikoDifficultyRange(od, 3, 5, 7.5);
  const baseHalfSpins = Math.trunc((duration / 1000) * halfSpinsPerSecond);
  const scaledHalfSpins = Math.fround(baseHalfSpins * Math.fround(1.65));
  const completionThreshold = Math.trunc(Math.max(1, scaledHalfSpins));
  return completionThreshold + 1;
}

// プレビューで風船の必要打数を自動演奏する時刻。
// 実際のゲームでは風船区間内なら打鍵時刻は自由なので、プレビューでは
// 必要打数を区間全体へ等間隔に配置する。終端ちょうどは判定終了と重なるため含めない。
function taikoSwellHitTimes(note) {
  const start = note && Number.isFinite(note.time) ? note.time : 0;
  const end = note && Number.isFinite(note.endTime) ? Math.max(start, note.endTime) : start;
  const requiredHits = note && Number.isFinite(note.requiredHits)
    ? Math.max(2, Math.trunc(note.requiredHits))
    : 2;
  const duration = end - start;
  if (!(duration > 0)) return Array(requiredHits).fill(start);

  const spacing = duration / requiredHits;
  const times = [];
  for (let i = 0; i < requiredHits; i++) times.push(start + i * spacing);
  return times;
}

// プレビューの自動演奏時点で残っている風船の必要打数。
// taikoSwellHitTimes と同じ時刻列を使うため、効果音と表示のカウントが一致する。
function taikoSwellRemainingHits(note, currentTime) {
  const requiredHits = note && Number.isFinite(note.requiredHits)
    ? Math.max(2, Math.trunc(note.requiredHits))
    : 2;
  if (!Number.isFinite(currentTime)) return requiredHits;

  if (!note._swellHitTimes) note._swellHitTimes = taikoSwellHitTimes(note);
  const times = note._swellHitTimes;
  let lo = 0, hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= currentTime) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(0, requiredHits - lo);
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
  const cached = note._drumRollTickCache;
  if (cached && cached.spacing === spacing && cached.end === end) return cached.times;
  const out = [];
  if (!(spacing > 0)) {
    note._drumRollTickCache = { spacing, end, times: out };
    return out;
  }
  const limit = end + spacing / 2;
  // osu! と同じく加算で進める（誤差の出方まで揃える）。
  // 極端に短い間隔で無限ループにならないよう回数に上限を設ける。
  let t = note.time;
  for (let i = 0; i < 4096 && t < limit; i++, t += spacing) out.push(t);
  note._drumRollTickCache = { spacing, end, times: out };
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

// 現在位置を、アクティブな赤線を起点とする「小節:拍」に変換する。
// 例: meter=4 なら 0:0 → 0:1 → 0:2 → 0:3 → 1:0。
function getTaikoMeasureBeat(red, time) {
  if (!Array.isArray(red) || !red.length || !Number.isFinite(time)) return null;

  let lo = 0;
  let hi = red.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (red[mid].time <= time) lo = mid + 1;
    else hi = mid;
  }
  const point = red[Math.max(0, lo - 1)];
  if (!Number.isFinite(point.time) || !(point.beatLength > 0)) return null;

  const meter = Number.isFinite(point.meter) && point.meter > 0
    ? Math.floor(point.meter)
    : 4;
  // 浮動小数点誤差で拍の境界直後が前の拍になるのを避ける。
  const beatIndex = Math.floor((time - point.time) / point.beatLength + 1e-7);
  const measure = Math.floor(beatIndex / meter);
  const beat = beatIndex - measure * meter;
  return { measure, beat, meter };
}

