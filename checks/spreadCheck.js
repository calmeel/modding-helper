function runSpreadCheck(text, fileName) {
  const difficulty = parseSpreadDifficulty(text);

  return {
    fileName,
    od: difficulty.od,
    hp: difficulty.hp,
    sliderMultiplier: difficulty.sliderMultiplier,
    noteCount: countCircleNotes(text),
    density: analyzeSpreadNoteDensity(text),
    finishers: collectSpreadFinishers(text),
    scrollSpeed: analyzeSpreadScrollSpeed(text, difficulty),
    sortInfo: getSpreadSortInfo(fileName)
  };
}

function collectSpreadFinishers(text) {
  const hitObjects = parseHitObjects(text);
  const finishers = [];

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 5) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);
    const hitSound = parseInt(parts[4], 10) || 0;

    if (Number.isNaN(time) || Number.isNaN(type)) continue;

    // Circleのみ対象。Slider / Spinnerは除外
    if ((type & 1) === 0) continue;

    const hasFinish = (hitSound & 4) !== 0;
    if (!hasFinish) continue;

    const hasWhistle = (hitSound & 2) !== 0;
    const hasClap = (hitSound & 8) !== 0;
    const isKat = hasWhistle || hasClap;

    finishers.push({
      time,
      kind: isKat ? "K" : "D"
    });
  }

  return finishers;
}

function parseSpreadDifficulty(text) {
  const lines = text.split(/\r?\n/);
  let inDifficulty = false;

  let od = null;
  let hp = null;
  let sliderMultiplier = 1.4; /** .osu に SliderMultiplier: が存在しないケース */

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Difficulty]") {
      inDifficulty = true;
      continue;
    }

    if (inDifficulty) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      if (trimmed.startsWith("OverallDifficulty:")) {
        od = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
      }

      if (trimmed.startsWith("HPDrainRate:")) {
        hp = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
      }

      if (trimmed.startsWith("SliderMultiplier:")) {
        const value = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
        if (Number.isFinite(value)) {
          sliderMultiplier = value;
        }
      }
    }
  }

  return {
    od: Number.isFinite(od) ? od : null,
    hp: Number.isFinite(hp) ? hp : null,
    sliderMultiplier
  };
}

function getSpreadSortInfo(fileName) {
  const diffName = getDifficultyNameText(fileName);

  const normalized = diffName
    .toLowerCase()
    .replace(/[\[\]]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let base = 999;
  let modifier = 0;

  const has = (...words) => words.some(word => normalized.includes(word));

  const hasWord = (...words) =>
    words.some(word => new RegExp(`\\b${word}\\b`).test(normalized));

  const isGuestOni =
    /\b.+?'s\s+oni\b/.test(normalized) ||
    /\b.+?s'\s+oni\b/.test(normalized);

  const isPlainOni =
    normalized === "oni";

  const isLiteOni =
    hasWord("lite", "light", "basic") && hasWord("oni");

  const isModifiedOni =
    /\boni\b/.test(normalized) &&
    !isGuestOni &&
    !isPlainOni &&
    !isLiteOni;

  if (has("shokyuu", "syokyuu", "shoshinsha", "beginner")) {
    base = -1;
  } else if (has("kantan")) {
    base = 0;
  } else if (has("futsuu")) {
    base = 1;
  } else if (has("muzukashii")) {
    base = 2;
  } else if (hasWord("oni")) {
    base = 3;

    if (isGuestOni || isPlainOni) {
      modifier = 0;
    } else if (isLiteOni) {
      modifier = -1;
    } else if (hasWord("hell", "lunatic")) {
      modifier = 3;
    } else if (hasWord("ura")) {
      modifier = 2;
    } else if (hasWord("inner")) {
      modifier = 1;
    } else if (isModifiedOni) {
      modifier = 4;
    }
  }

  return {
    base,
    modifier,
    score: base * 10 + modifier
  };
}

function createSpreadDiffOrder(results) {
  if (!results) return [];

  return sortSpreadResults(results).map(result => result.fileName);
}

function applySpreadDiffOrder(results, diffOrder) {
  if (!results) return [];

  const orderMap = new Map(diffOrder.map((fileName, index) => [fileName, index]));

  return [...results].sort((a, b) => {
    const ai = orderMap.has(a.fileName) ? orderMap.get(a.fileName) : 9999;
    const bi = orderMap.has(b.fileName) ? orderMap.get(b.fileName) : 9999;

    if (ai !== bi) return ai - bi;

    return getDifficultyNameText(a.fileName).localeCompare(getDifficultyNameText(b.fileName));
  });
}

function countCircleNotes(text) {
  const lines = text.split(/\r?\n/);

  let inHitObjects = false;
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[HitObjects]") {
      inHitObjects = true;
      continue;
    }

    if (inHitObjects) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",");
      const type = parseInt(parts[3], 10);

      if (!Number.isNaN(type) && (type & 1) !== 0) {
        count++;
      }
    }
  }

  return count;
}

const SPREAD_CATEGORY_ORDER = {
  belowKantan: -10,
  kantan: 0,
  futsuu: 10,
  muzukashii: 20,
  oni: 30,
  innerPlus: 40,
  unknown: 999
};

function getSpreadAutoCategory(sortInfo) {
  if (!sortInfo || sortInfo.base === 999) return "unknown";

  if (sortInfo.base <= -1) return "belowKantan";
  if (sortInfo.base === 0) return "kantan";
  if (sortInfo.base === 1) return "futsuu";
  if (sortInfo.base === 2) return "muzukashii";

  if (sortInfo.base === 3) {
    return sortInfo.modifier >= 1 ? "innerPlus" : "oni";
  }

  if (sortInfo.base >= 4) return "innerPlus";

  return "unknown";
}

function getSpreadEffectiveCategory(result, manualCategories = {}) {
  return manualCategories[result.fileName] || getSpreadAutoCategory(result.sortInfo);
}

/** spreadのノーツratio条件 */
const SPREAD_NOTE_RATIO_RULES = {
  kantanToFutsuu: {
    errorLow: 1.55,
    warnLow: 1.60,
    warnHigh: 2.15,
    errorHigh: 2.30
  },
  futsuuToMuzukashii: {
    errorLow: 1.20,
    warnLow: 1.27,
    warnHigh: 1.58,
    errorHigh: 1.65
  },
  muzukashiiToOni: {
    errorLow: 1.13,
    warnLow: 1.17,
    warnHigh: 1.48,
    errorHigh: 1.55
  },
  oniToInnerPlus: {
    errorLow: 1.00,
    warnLow: 1.10,
    warnHigh: 1.45,
    errorHigh: 1.55
  },
  innerPlusToInnerPlus: {
    errorLow: 1.00,
    warnLow: 1.02,
    warnHigh: 1.32,
    errorHigh: 1.50
  }
};

function getSpreadNoteRatioLevel(ratio, prevResult = null, curResult = null, manualCategories = {}) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return "none";
  }

  const rule = getSpreadNoteRatioRule(prevResult, curResult, manualCategories);

  if (ratio < rule.errorLow) return "error";
  if (ratio < rule.warnLow) return "warn";
  if (ratio > rule.errorHigh) return "error";
  if (ratio > rule.warnHigh) return "warn";

  return "ok";
}

function getSpreadNoteRatioRule(prevResult, curResult, manualCategories = {}) {
  const prevCategory = prevResult
    ? getSpreadEffectiveCategory(prevResult, manualCategories)
    : "unknown";

  const curCategory = curResult
    ? getSpreadEffectiveCategory(curResult, manualCategories)
    : "unknown";

  if (
    (prevCategory === "belowKantan" && curCategory === "kantan") ||
    (prevCategory === "kantan" && curCategory === "futsuu")
  ) {
    return SPREAD_NOTE_RATIO_RULES.kantanToFutsuu;
  }

  if (prevCategory === "futsuu" && curCategory === "muzukashii") {
    return SPREAD_NOTE_RATIO_RULES.futsuuToMuzukashii;
  }

  if (prevCategory === "muzukashii" && curCategory === "oni") {
    return SPREAD_NOTE_RATIO_RULES.muzukashiiToOni;
  }

  if (prevCategory === "oni" && curCategory === "innerPlus") {
    return SPREAD_NOTE_RATIO_RULES.oniToInnerPlus;
  }

  if (prevCategory === "innerPlus" && curCategory === "innerPlus") {
    return SPREAD_NOTE_RATIO_RULES.innerPlusToInnerPlus;
  }

  // カテゴリが飛んでいる / Unknown / カスタム順の場合の安全側フォールバック
  if (curCategory === "futsuu") return SPREAD_NOTE_RATIO_RULES.kantanToFutsuu;
  if (curCategory === "muzukashii") return SPREAD_NOTE_RATIO_RULES.futsuuToMuzukashii;
  if (curCategory === "oni") return SPREAD_NOTE_RATIO_RULES.muzukashiiToOni;
  if (curCategory === "innerPlus") return SPREAD_NOTE_RATIO_RULES.oniToInnerPlus;

  return SPREAD_NOTE_RATIO_RULES.muzukashiiToOni;
}

function getSpreadCategoryOrder(category) {
  return SPREAD_CATEGORY_ORDER[category] ?? SPREAD_CATEGORY_ORDER.unknown;
}

function moveSpreadDiffToCategory(diffOrder, results, fileName, category, manualCategories = {}) {
  const currentOrder = diffOrder?.length
    ? [...diffOrder]
    : createSpreadDiffOrder(results);

  const withoutTarget = currentOrder.filter(name => name !== fileName);

  const targetOrder = getSpreadCategoryOrder(category);

  let insertIndex = withoutTarget.length;

  for (let i = 0; i < withoutTarget.length; i++) {
    const otherFileName = withoutTarget[i];
    const otherResult = results.find(result => result.fileName === otherFileName);
    if (!otherResult) continue;

    const otherCategory = getSpreadEffectiveCategory(otherResult, manualCategories);
    const otherOrder = getSpreadCategoryOrder(otherCategory);

    if (otherOrder > targetOrder) {
      insertIndex = i;
      break;
    }
  }

  withoutTarget.splice(insertIndex, 0, fileName);
  return withoutTarget;
}

/** 低難易度のスクロール速度 */
const SPREAD_SCROLL_BASE_PX_PER_BEAT = 175;

const SPREAD_SCROLL_RAPID_RULES = {
  belowKantan: {
    minDeltaPxPerSecond: 80,
    minRatio: 1.15,
    maxGapMs: 1500
  },
  kantan: {
    minDeltaPxPerSecond: 80,
    minRatio: 1.15,
    maxGapMs: 1500
  },
  futsuu: {
    minDeltaPxPerSecond: 80,
    minRatio: 1.15,
    maxGapMs: 1250
  },
  muzukashii: {
    minDeltaPxPerSecond: 160,
    minRatio: 1.25,
    maxGapMs: 1000
  },
  oni: {
    minDeltaPxPerSecond: Infinity,
    minRatio: Infinity,
    maxGapMs: 0
  },
  innerPlus: {
    minDeltaPxPerSecond: Infinity,
    minRatio: Infinity,
    maxGapMs: 0
  },
  unknown: {
    minDeltaPxPerSecond: 160,
    minRatio: 1.25,
    maxGapMs: 1000
  }
};

function analyzeSpreadScrollSpeed(text, difficulty = null) {
  const sliderMultiplier = difficulty?.sliderMultiplier ?? parseSpreadDifficulty(text).sliderMultiplier ?? 1.4;

  const redLines = parseSpreadRedLines(text);
  const greenLines = parseSpreadGreenLines(text);
  const noteTimes = parseSpreadCircleNoteTimes(text);

  if (!redLines.length || !noteTimes.length) {
    return {
      sliderMultiplier,
      samples: [],
      summary: null,
      rapidChanges: []
    };
  }

  const samples = noteTimes.map(time => {
    const red = getCurrentSpreadTimingPoint(redLines, time);
    const green = getCurrentSpreadTimingPoint(greenLines, time);

    const bpm = red ? 60000 / red.beatLength : null;
    const sv = green ? green.sv : 1;

    const pxPerBeat =
      SPREAD_SCROLL_BASE_PX_PER_BEAT *
      sliderMultiplier *
      sv;

    const pxPerSecond =
      bpm !== null
        ? pxPerBeat * bpm / 60
        : null;

    return {
      time,
      bpm,
      sv,
      sliderMultiplier,
      pxPerBeat,
      pxPerSecond
    };
  }).filter(sample =>
    Number.isFinite(sample.pxPerSecond)
  );

  if (!samples.length) {
    return {
      sliderMultiplier,
      samples: [],
      summary: null,
      rapidChanges: []
    };
  }

  const speeds = samples.map(sample => sample.pxPerSecond);
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);

  const svValues = samples.map(sample => sample.sv);
  const minSv = Math.min(...svValues);
  const maxSv = Math.max(...svValues);

  const rapidChanges = [];

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];

    const gapMs = cur.time - prev.time;
    if (gapMs <= 0) continue;

    const delta = cur.pxPerSecond - prev.pxPerSecond;
    const absDelta = Math.abs(delta);

    const min = Math.min(prev.pxPerSecond, cur.pxPerSecond);
    const max = Math.max(prev.pxPerSecond, cur.pxPerSecond);
    const ratio = min > 0 ? max / min : null;

    rapidChanges.push({
      fromTime: prev.time,
      toTime: cur.time,
      gapMs,
      beforeSpeed: prev.pxPerSecond,
      afterSpeed: cur.pxPerSecond,
      delta,
      absDelta,
      ratio,
      beforeSv: prev.sv,
      afterSv: cur.sv,
      beforeBpm: prev.bpm,
      afterBpm: cur.bpm
    });
  }

  return {
    sliderMultiplier,
    samples,
    summary: {
      minSpeed,
      maxSpeed,
      deltaSpeed: maxSpeed - minSpeed,
      ratio: minSpeed > 0 ? maxSpeed / minSpeed : null,
      minSv,
      maxSv
    },
    rapidChanges
  };
}

function parseSpreadRedLines(text) {
  const lines = text.split(/\r?\n/);
  let inTimingPoints = false;
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (inTimingPoints) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const uninherited = parseInt(parts[6], 10);

      if (
        uninherited === 1 &&
        Number.isFinite(time) &&
        Number.isFinite(beatLength) &&
        beatLength > 0
      ) {
        points.push({
          time,
          beatLength
        });
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function parseSpreadGreenLines(text) {
  const lines = text.split(/\r?\n/);
  let inTimingPoints = false;
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (inTimingPoints) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const uninherited = parseInt(parts[6], 10);

      if (
        uninherited === 0 &&
        Number.isFinite(time) &&
        Number.isFinite(beatLength) &&
        beatLength !== 0
      ) {
        points.push({
          time,
          beatLength,
          sv: beatLength < 0 ? -100 / beatLength : 1
        });
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function parseSpreadCircleNoteTimes(text) {
  const hitObjects = parseHitObjects(text);
  const times = [];

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 5) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);

    if (Number.isNaN(time) || Number.isNaN(type)) continue;

    // taikoの通常ノーツのみ対象。Slider / Spinnerはここでは除外
    if ((type & 1) === 0) continue;

    times.push(time);
  }

  times.sort((a, b) => a - b);
  return times;
}

function getCurrentSpreadTimingPoint(points, time) {
  if (!points || !points.length) return null;

  let current = points[0];

  for (const point of points) {
    if (point.time <= time) {
      current = point;
    } else {
      break;
    }
  }

  return current;
}

function getSpreadRapidScrollRule(category) {
  return SPREAD_SCROLL_RAPID_RULES[category] ?? SPREAD_SCROLL_RAPID_RULES.unknown;
}

function getSpreadRapidScrollLevel(change, category) {
  const rule = getSpreadRapidScrollRule(category);

  if (!Number.isFinite(rule.minDeltaPxPerSecond)) {
    return "ok";
  }

  if (change.gapMs > rule.maxGapMs) {
    return "ok";
  }

  if (
    change.absDelta >= rule.minDeltaPxPerSecond &&
    change.ratio !== null &&
    change.ratio >= rule.minRatio
  ) {
    return "warn";
  }

  return "ok";
}

/** ノーツ密度 */
const SPREAD_DENSITY_BOUNDARY_TOLERANCE_MS = 3;

function analyzeSpreadNoteDensity(text) {
  const redLines = parseSpreadDensityRedLines(text);
  const noteTimes = parseSpreadCircleNoteTimes(text);

  if (!redLines.length || !noteTimes.length) {
    return {
      measures: []
    };
  }

  const firstTime = Math.min(...noteTimes);
  const lastTime = Math.max(...noteTimes);
  const measures = createSpreadDensityMeasures(redLines, firstTime, lastTime);

  for (const time of noteTimes) {
    const normalizedTime = normalizeSpreadDensityTimeNearBoundary(
      time,
      measures,
      SPREAD_DENSITY_BOUNDARY_TOLERANCE_MS
    );

    const measure = measures.find(m =>
      normalizedTime >= m.start &&
      normalizedTime < m.end
    );

    if (measure) {
      measure.noteCount++;
    }
  }

  return {
    measures
  };
}

function parseSpreadDensityRedLines(text) {
  const lines = text.split(/\r?\n/);
  let inTimingPoints = false;
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (inTimingPoints) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const meter = parseInt(parts[2], 10);
      const uninherited = parseInt(parts[6], 10);

      if (
        uninherited === 1 &&
        Number.isFinite(time) &&
        Number.isFinite(beatLength) &&
        beatLength > 0
      ) {
        points.push({
          time,
          beatLength,
          meter: Number.isFinite(meter) && meter > 0 ? meter : 4
        });
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function createSpreadDensityMeasures(redLines, firstTime, lastTime) {
  const measures = [];

  for (let i = 0; i < redLines.length; i++) {
    const red = redLines[i];
    const nextRed = redLines[i + 1];

    const measureLength = red.beatLength * red.meter;
    const sectionStart = red.time;
    const sectionEnd = nextRed ? nextRed.time : lastTime + measureLength;

    let start = sectionStart;

    while (start <= sectionEnd && start <= lastTime) {
      const end = start + measureLength;

      if (end >= firstTime && start <= lastTime) {
        measures.push({
          start: Math.round(start),
          end: Math.round(end),
          noteCount: 0
        });
      }

      start += measureLength;
    }
  }

  return measures;
}

function normalizeSpreadDensityTimeNearBoundary(time, measures, toleranceMs) {
  for (const measure of measures) {
    if (Math.abs(time - measure.start) <= toleranceMs) {
      return measure.start;
    }

    if (Math.abs(time - measure.end) <= toleranceMs) {
      return measure.end;
    }
  }

  return time;
}
