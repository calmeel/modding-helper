function runSpreadCheck(text, fileName) {
  const difficulty = parseSpreadDifficulty(text);

  return {
    fileName,
    od: difficulty.od,
    hp: difficulty.hp,
    sliderMultiplier: difficulty.sliderMultiplier,
    noteCount: countCircleNotes(text),
    density: analyzeSpreadNoteDensity(text),
    restMoments: analyzeSpreadRestMoments(text),
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

/** 低難易度のスクロール速度：速すぎ */
const SPREAD_SCROLL_TOO_FAST_RULES = {
  belowKantan: 820,
  kantan: 820,
  futsuu: 1020,
  muzukashii: 1225,
  oni: 1225,
  innerPlus: Infinity,
  unknown: Infinity
};

/** 低難易度のスクロール速度：変化しすぎ */
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
      rapidChanges: [],
      linearGradients: []
    };
  }

  const samples = noteTimes.map(time => {
    const red = getCurrentSpreadTimingPoint(redLines, time);
    const green = getCurrentSpreadInheritedTimingPoint(
      greenLines,
      time,
      red?.time
    );

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
      rapidChanges: [],
      linearGradients: []
    };
  }

  const speeds = samples.map(sample => sample.pxPerSecond);
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);

  const averageSpeed =
    speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

  const percentile90Speed = getPercentileValue(speeds, 0.9);

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
      averageSpeed,
      percentile90Speed,
      deltaSpeed: maxSpeed - minSpeed,
      ratio: minSpeed > 0 ? maxSpeed / minSpeed : null,
      minSv,
      maxSv
    },
    rapidChanges,
    linearGradients: isSpreadLinearSvFeatureEnabled()
      ? analyzeSpreadLinearSvGradients(samples)
      : []
  };
}

const SPREAD_LINEAR_SV_MIN_POINTS = 4;
const SPREAD_LINEAR_SV_MAX_POINTS = 96;
const SPREAD_LINEAR_SV_SEED_POINT_COUNTS = [
  4, 6, 8, 12, 16, 24, 32, 48, 64, 96
];
const SPREAD_LINEAR_SV_MIN_TOTAL_CHANGE = 0.001;
const SPREAD_LINEAR_SV_ABSOLUTE_TOLERANCE = 0.00075;
const SPREAD_LINEAR_SV_RELATIVE_TOLERANCE = 0.03;

function isSpreadLinearSvFeatureEnabled() {
  return false;
}

function analyzeSpreadLinearSvGradients(samples) {
  const points = normalizeSpreadLinearSvSamples(samples);
  if (points.length < SPREAD_LINEAR_SV_MIN_POINTS) return [];

  const selected = [];
  let startIndex = 0;

  while (startIndex <= points.length - SPREAD_LINEAR_SV_MIN_POINTS) {
    const maxEndIndex = Math.min(
      points.length - 1,
      startIndex + SPREAD_LINEAR_SV_MAX_POINTS - 1
    );
    let best = null;

    for (const pointCount of SPREAD_LINEAR_SV_SEED_POINT_COUNTS) {
      const endIndex = startIndex + pointCount - 1;
      if (endIndex > maxEndIndex) break;

      best = evaluateSpreadLinearSvGradient(
        points,
        startIndex,
        endIndex
      );
      if (best) break;
    }

    if (!best) {
      startIndex++;
      continue;
    }

    for (
      let endIndex = best.endIndex + 1;
      endIndex <= maxEndIndex;
      endIndex++
    ) {
      const candidate = evaluateSpreadLinearSvGradient(
        points,
        startIndex,
        endIndex
      );
      if (candidate) best = candidate;
    }

    selected.push(best);
    startIndex = Math.max(startIndex + 1, best.endIndex);
  }

  const merged = [];

  for (const candidate of selected) {
    const previous = merged[merged.length - 1];

    if (previous && candidate.startIndex <= previous.endIndex + 1) {
      const combined = evaluateSpreadLinearSvGradient(
        points,
        previous.startIndex,
        candidate.endIndex
      );

      if (combined) {
        merged[merged.length - 1] = combined;
        continue;
      }
    }

    merged.push(candidate);
  }

  return merged
    .map(({ startIndex, endIndex, normalizedMaxError, ...gradient }) => gradient);
}

function normalizeSpreadLinearSvSamples(samples) {
  const byTime = new Map();

  for (const sample of samples ?? []) {
    if (
      !Number.isFinite(sample.time) ||
      !Number.isFinite(sample.sv)
    ) {
      continue;
    }

    byTime.set(sample.time, {
      time: sample.time,
      sv: sample.sv,
      pxPerSecond: sample.pxPerSecond
    });
  }

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function evaluateSpreadLinearSvGradient(points, startIndex, endIndex) {
  const start = points[startIndex];
  const end = points[endIndex];
  const duration = end.time - start.time;
  const totalChange = end.sv - start.sv;

  if (
    duration <= 0 ||
    Math.abs(totalChange) < SPREAD_LINEAR_SV_MIN_TOTAL_CHANGE
  ) {
    return null;
  }

  const tolerance = Math.max(
    SPREAD_LINEAR_SV_ABSOLUTE_TOLERANCE,
    Math.abs(totalChange) * SPREAD_LINEAR_SV_RELATIVE_TOLERANCE
  );
  const direction = Math.sign(totalChange);
  const outliers = [];
  let maxError = 0;
  let monotonicViolations = 0;

  for (let index = startIndex; index <= endIndex; index++) {
    const point = points[index];
    const progress = (point.time - start.time) / duration;
    const expectedSv = start.sv + totalChange * progress;
    const error = point.sv - expectedSv;
    const absError = Math.abs(error);

    maxError = Math.max(maxError, absError);

    if (
      index > startIndex &&
      index < endIndex &&
      absError > tolerance
    ) {
      outliers.push({
        time: point.time,
        actualSv: point.sv,
        expectedSv,
        error
      });
    }

    if (index > startIndex) {
      const previous = points[index - 1];
      if ((point.sv - previous.sv) * direction < -tolerance) {
        monotonicViolations++;
      }
    }
  }

  const pointCount = endIndex - startIndex + 1;
  const interiorCount = pointCount - 2;
  const maxOutliers = Math.max(1, Math.floor(interiorCount * 0.25));

  if (
    outliers.length > maxOutliers ||
    monotonicViolations > maxOutliers
  ) {
    return null;
  }

  const distinctSvCount = new Set(
    points
      .slice(startIndex, endIndex + 1)
      .map(point => point.sv.toFixed(6))
  ).size;

  if (distinctSvCount < 3) return null;

  return {
    startIndex,
    endIndex,
    startTime: start.time,
    endTime: end.time,
    startSv: start.sv,
    endSv: end.sv,
    type: "linear",
    status: outliers.length ? "warn" : "ok",
    pointCount,
    tolerance,
    maxError,
    normalizedMaxError: tolerance > 0 ? maxError / tolerance : 0,
    outliers
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

function getCurrentSpreadInheritedTimingPoint(points, time, redTime) {
  if (!points || !points.length || !Number.isFinite(redTime)) return null;

  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];

    if (point.time > time) continue;
    if (point.time < redTime) return null;

    return point;
  }

  return null;
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

function getPercentileValue(values, percentile) {
  const sorted = values
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (!sorted.length) return null;

  const index = Math.ceil(sorted.length * percentile) - 1;
  const clampedIndex = Math.max(0, Math.min(sorted.length - 1, index));

  return sorted[clampedIndex];
}

function getSpreadTooFastScrollRule(category) {
  return SPREAD_SCROLL_TOO_FAST_RULES[category] ?? SPREAD_SCROLL_TOO_FAST_RULES.unknown;
}

function getSpreadTooFastScrollLevel(scrollSpeed, category) {
  const threshold = getSpreadTooFastScrollRule(category);

  if (!Number.isFinite(threshold)) return "ok";

  const speed = scrollSpeed?.summary?.percentile90Speed;

  if (!Number.isFinite(speed)) return "ok";

  return speed >= threshold ? "warn" : "ok";
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

const SPREAD_SCROLL_PROGRESSION_GROUP_TOLERANCE_MS = 10;
const SPREAD_SCROLL_PROGRESSION_MIN_ABS_DELTA = 80;
const SPREAD_SCROLL_PROGRESSION_SPEED_TOLERANCE = 5;

function analyzeSpreadScrollSpeedProgressionByEvent(
  results,
  manualCategories = {}
) {
  const comparableResults = results.filter(result => {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    return category !== "unknown";
  });
  const groups = groupSpreadScrollChangeEvents(
    comparableResults,
    SPREAD_SCROLL_PROGRESSION_MIN_ABS_DELTA,
    SPREAD_SCROLL_PROGRESSION_GROUP_TOLERANCE_MS
  );
  const issueGroups = [];

  for (const group of groups) {
    const byFileName = new Map(
      group.items.map(item => [item.fileName, item.event])
    );
    const rows = comparableResults
      .map(result => ({
        fileName: result.fileName,
        event: byFileName.get(result.fileName) ?? null
      }))
      .filter(row => row.event);

    if (rows.length < 3) continue;

    const issues = [];
    let expectedDirection = "flat";

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      const direction = getSpreadScrollProgressionDirection(
        cur.event.afterSpeed - prev.event.afterSpeed
      );

      if (direction === "flat") continue;
      if (expectedDirection === "flat") {
        expectedDirection = direction;
        continue;
      }

      if (direction !== expectedDirection) {
        issues.push({
          type: "scrollSpeedProgressionMismatch",
          prev,
          cur,
          prevDirection: expectedDirection,
          curDirection: direction
        });
      }
    }

    if (issues.length) {
      issueGroups.push({
        ...group,
        issues
      });
    }
  }

  return {
    groups,
    issueGroups
  };
}

function getSpreadScrollProgressionDirection(delta) {
  if (Math.abs(delta) <= SPREAD_SCROLL_PROGRESSION_SPEED_TOLERANCE) {
    return "flat";
  }

  return delta > 0 ? "up" : "down";
}

const SPREAD_SCROLL_CONSISTENCY_GROUP_TOLERANCE_MS = 10;
const SPREAD_SCROLL_CONSISTENCY_MIN_ABS_DELTA = 80;
const SPREAD_SCROLL_CONSISTENCY_STRONGER_RATIO = 1.5;
const SPREAD_SCROLL_CONSISTENCY_STRONGER_DELTA = 120;
const SPREAD_SCROLL_CONSISTENCY_DIRECTION_DELTA = 120;

function analyzeSpreadScrollChangeConsistency(
  results,
  manualCategories = {}
) {
  const comparableResults = results.filter(result => {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    return category !== "unknown";
  });
  const groups = groupSpreadScrollChangeEvents(
    comparableResults,
    SPREAD_SCROLL_CONSISTENCY_MIN_ABS_DELTA,
    SPREAD_SCROLL_CONSISTENCY_GROUP_TOLERANCE_MS
  );
  const issueGroups = [];

  for (const group of groups) {
    const issues = [];
    const byFileName = new Map(
      group.items.map(item => [item.fileName, item.event])
    );

    for (let i = 1; i < comparableResults.length; i++) {
      const lower = comparableResults[i - 1];
      const higher = comparableResults[i];
      const lowerEvent = byFileName.get(lower.fileName);
      const higherEvent = byFileName.get(higher.fileName);

      if (!lowerEvent || !higherEvent) continue;

      const lowerAbs = lowerEvent.absDelta;
      const higherAbs = higherEvent.absDelta;

      if (
        higherAbs > 0 &&
        lowerAbs >= higherAbs * SPREAD_SCROLL_CONSISTENCY_STRONGER_RATIO &&
        lowerAbs - higherAbs >= SPREAD_SCROLL_CONSISTENCY_STRONGER_DELTA
      ) {
        issues.push({
          type: "strongerLowerDiff",
          lower: {
            fileName: lower.fileName,
            event: lowerEvent
          },
          higher: {
            fileName: higher.fileName,
            event: higherEvent
          }
        });
      }

      const lowerDirection = Math.sign(lowerEvent.delta);
      const higherDirection = Math.sign(higherEvent.delta);

      if (
        lowerDirection !== 0 &&
        higherDirection !== 0 &&
        lowerDirection !== higherDirection &&
        lowerAbs >= SPREAD_SCROLL_CONSISTENCY_DIRECTION_DELTA &&
        higherAbs >= SPREAD_SCROLL_CONSISTENCY_DIRECTION_DELTA
      ) {
        issues.push({
          type: "directionMismatch",
          lower: {
            fileName: lower.fileName,
            event: lowerEvent
          },
          higher: {
            fileName: higher.fileName,
            event: higherEvent
          }
        });
      }
    }

    if (issues.length) {
      issueGroups.push({
        ...group,
        issues
      });
    }
  }

  return {
    groups,
    issueGroups
  };
}

function groupSpreadScrollChangeEvents(results, minAbsDelta, toleranceMs) {
  const events = [];

  for (const result of results) {
    for (const change of result.scrollSpeed?.rapidChanges ?? []) {
      if (change.absDelta < minAbsDelta) continue;

      events.push({
        fileName: result.fileName,
        time: change.toTime,
        event: change
      });
    }
  }

  events.sort((a, b) => a.time - b.time);

  const groups = [];
  for (const event of events) {
    const last = groups[groups.length - 1];

    if (last && Math.abs(event.time - last.time) <= toleranceMs) {
      last.items.push(event);
      last.time = Math.round(
        last.items.reduce((sum, item) => sum + item.time, 0) /
        last.items.length
      );
    } else {
      groups.push({
        time: event.time,
        items: [event]
      });
    }
  }

  return groups;
}

const SPREAD_REST_MOMENT_EPSILON_MS = 2;
const SPREAD_REST_MOMENT_DEFAULT_SCALE_OPTIONS = {
  highEnabled: true,
  highBpm: 270,
  highScale: 0.5,
  lowEnabled: true,
  lowBpm: 110,
  lowScale: 2,
  ignoreSliders: true,
  ignoreSpinners: true,
  useAdjustedThresholds: true
};

const SPREAD_REST_MOMENT_RULES = {
  kantan: {
    breakType: "3/1",
    acceptableRests: [{ consecutiveGaps: 1, beats: 3.0 }],
    minorLimit: 36,
    warningLimit: 44
  },
  futsuu: {
    breakType: "2/1",
    acceptableRests: [{ consecutiveGaps: 1, beats: 2.0 }],
    minorLimit: 36,
    warningLimit: 44
  },
  muzukashii: {
    breakType: "3/2 or 3 x 1/1",
    acceptableRests: [
      { consecutiveGaps: 1, beats: 1.5 },
      { consecutiveGaps: 3, beats: 1.0 }
    ],
    minorLimit: 36,
    warningLimit: 44
  },
  oni: {
    breakType: "1/1",
    acceptableRests: [{ consecutiveGaps: 1, beats: 1.0 }],
    minorLimit: 20,
    warningLimit: 32
  }
};

function analyzeSpreadRestMoments(text, options = {}) {
  const timingPoints = parseTimingPoints(text);
  const inheritedTimingPoints = parseInheritedTimingPoints(text);
  const difficulty = parseSpreadDifficulty(text);
  const objects = parseSpreadRestMomentObjects(
    text,
    timingPoints,
    inheritedTimingPoints,
    difficulty.sliderMultiplier
  );

  if (!objects.length) {
    return {
      issuesByCategory: {},
      timingPoints: [],
      objects: [],
      endTime: 0
    };
  }

  const scaleOptions = normalizeSpreadRestMomentScaleOptions(options);
  const filteredObjects = filterSpreadRestMomentObjects(objects, scaleOptions);
  const endTime = Math.max(...objects.map(object => object.endTime));
  const thresholdMultiplier = scaleOptions.useAdjustedThresholds
    ? getSpreadRestMomentThresholdMultiplier(timingPoints, endTime, scaleOptions)
    : 1;
  const issuesByCategory = {};

  if (filteredObjects.length) {
    for (const [category, rule] of Object.entries(SPREAD_REST_MOMENT_RULES)) {
      issuesByCategory[category] = analyzeSpreadRestMomentsForCategory(
        filteredObjects,
        timingPoints,
        rule,
        scaleOptions,
        thresholdMultiplier
      );
    }
  }

  return {
    issuesByCategory,
    timingPoints: timingPoints.map(point => ({
      time: point.time,
      beatLength: point.beatLength
    })),
    objects: objects.map(object => ({
      time: object.time,
      endTime: object.endTime,
      kind: object.kind
    })),
    endTime,
    scaleOptions
  };
}

function reanalyzeSpreadRestMoments(restMoments, options = {}) {
  const timingPoints = restMoments?.timingPoints ?? [];
  const objects = restMoments?.objects ?? [];

  if (!timingPoints.length || !objects.length) {
    return {
      ...(restMoments ?? {}),
      issuesByCategory: {}
    };
  }

  const scaleOptions = normalizeSpreadRestMomentScaleOptions(options);
  const filteredObjects = filterSpreadRestMomentObjects(objects, scaleOptions);
  const endTime = restMoments?.endTime ?? Math.max(...objects.map(object => object.endTime ?? object.time ?? 0));
  const thresholdMultiplier = scaleOptions.useAdjustedThresholds
    ? getSpreadRestMomentThresholdMultiplier(timingPoints, endTime, scaleOptions)
    : 1;
  const issuesByCategory = {};

  if (filteredObjects.length) {
    for (const [category, rule] of Object.entries(SPREAD_REST_MOMENT_RULES)) {
      issuesByCategory[category] = analyzeSpreadRestMomentsForCategory(
        filteredObjects,
        timingPoints,
        rule,
        scaleOptions,
        thresholdMultiplier
      );
    }
  }

  return {
    ...restMoments,
    issuesByCategory,
    scaleOptions
  };
}

function normalizeSpreadRestMomentScaleOptions(options = {}) {
  const defaults = SPREAD_REST_MOMENT_DEFAULT_SCALE_OPTIONS;
  const highBpm = Number.isFinite(options.highBpm) && options.highBpm > 0
    ? options.highBpm
    : defaults.highBpm;
  const highScale = Number.isFinite(options.highScale) && options.highScale > 0
    ? options.highScale
    : defaults.highScale;
  const lowBpm = Number.isFinite(options.lowBpm) && options.lowBpm > 0
    ? options.lowBpm
    : defaults.lowBpm;
  const lowScale = Number.isFinite(options.lowScale) && options.lowScale > 0
    ? options.lowScale
    : defaults.lowScale;

  return {
    highEnabled: options.highEnabled ?? defaults.highEnabled,
    highBpm,
    highScale,
    lowEnabled: options.lowEnabled ?? defaults.lowEnabled,
    lowBpm,
    lowScale,
    ignoreSliders: options.ignoreSliders ?? defaults.ignoreSliders,
    ignoreSpinners: options.ignoreSpinners ?? defaults.ignoreSpinners,
    useAdjustedThresholds: options.useAdjustedThresholds ?? defaults.useAdjustedThresholds
  };
}

function filterSpreadRestMomentObjects(objects, options = {}) {
  const scaleOptions = normalizeSpreadRestMomentScaleOptions(options);

  return (objects ?? []).filter(object => {
    if (scaleOptions.ignoreSliders && object.kind === "slider") return false;
    if (scaleOptions.ignoreSpinners && object.kind === "spinner") return false;
    return true;
  });
}

function getSpreadRestMomentBpmScale(beatLength, options = {}) {
  if (!Number.isFinite(beatLength) || beatLength <= 0) return 1;

  const scaleOptions = normalizeSpreadRestMomentScaleOptions(options);
  const bpm = 60000 / beatLength;
  let scale = 1;

  if (scaleOptions.highEnabled && bpm >= scaleOptions.highBpm) {
    scale *= scaleOptions.highScale;
  }

  if (scaleOptions.lowEnabled && bpm <= scaleOptions.lowBpm) {
    scale *= scaleOptions.lowScale;
  }

  return scale > 0 && Number.isFinite(scale) ? scale : 1;
}

function getSpreadRestMomentScaledBeatLength(beatLength, options = {}) {
  return beatLength / getSpreadRestMomentBpmScale(beatLength, options);
}

function getSpreadRestMomentThresholdMultiplier(timingPoints, endTime, options = {}) {
  const dominantBpm = getSpreadRestMomentDominantScaledBpm(timingPoints, endTime, options);
  return dominantBpm > 0 ? 180 / dominantBpm : 1;
}

function getSpreadRestMomentDominantScaledBpm(timingPoints, endTime, options = {}) {
  const durationsByBpm = new Map();

  for (let i = 0; i < (timingPoints ?? []).length; i++) {
    const point = timingPoints[i];
    const next = timingPoints[i + 1];
    const start = Math.max(0, point.time);
    const end = Math.max(start, next ? next.time : endTime);
    const duration = end - start;

    if (!Number.isFinite(point.beatLength) || point.beatLength <= 0 || duration <= 0) {
      continue;
    }

    const bpm = 60000 / point.beatLength;
    const scale = getSpreadRestMomentBpmScale(point.beatLength, options);
    const scaledBpm = bpm * scale;

    if (!Number.isFinite(scaledBpm) || scaledBpm <= 0) continue;

    const key = scaledBpm.toFixed(6);
    durationsByBpm.set(key, (durationsByBpm.get(key) ?? 0) + duration);
  }

  let dominantBpm = null;
  let dominantDuration = -1;

  for (const [key, duration] of durationsByBpm.entries()) {
    const bpm = parseFloat(key);
    if (duration > dominantDuration) {
      dominantBpm = bpm;
      dominantDuration = duration;
    }
  }

  return dominantBpm;
}

function analyzeSpreadRestMomentsForCategory(objects, timingPoints, rule, scaleOptions, thresholdMultiplier = 1) {
  const issues = [];
  let continuousStartTime = objects[0]?.time ?? 0;
  let isWithinContinuousMapping = false;
  const minorLimit = rule.minorLimit * thresholdMultiplier;
  const warningLimit = rule.warningLimit * thresholdMultiplier;

  for (let i = 0; i < objects.length; i++) {
    const current = objects[i];
    const timing = findSpreadRestCurrentTimingPoint(timingPoints, current.time);

    if (!timing || !Number.isFinite(timing.beatLength) || timing.beatLength <= 0) {
      continue;
    }

    const scaledBeatLength = getSpreadRestMomentScaledBeatLength(
      timing.beatLength,
      scaleOptions
    );
    let isBeginningOfContinuousMapping = false;
    let isEndOfContinuousMapping = false;

    for (const acceptableRest of rule.acceptableRests) {
      const minimalRestMomentGapMs = acceptableRest.beats * scaledBeatLength;
      const backwardGap = getSpreadRestSmallestConsecutiveGap(
        objects,
        i - acceptableRest.consecutiveGaps,
        acceptableRest.consecutiveGaps
      );

      if (backwardGap + SPREAD_REST_MOMENT_EPSILON_MS >= minimalRestMomentGapMs) {
        isBeginningOfContinuousMapping = true;
      }

      const forwardGap = getSpreadRestSmallestConsecutiveGap(
        objects,
        i,
        acceptableRest.consecutiveGaps
      );

      if (forwardGap + SPREAD_REST_MOMENT_EPSILON_MS >= minimalRestMomentGapMs) {
        isEndOfContinuousMapping = true;
      }
    }

    if (isBeginningOfContinuousMapping) {
      isWithinContinuousMapping = true;
      continuousStartTime = current.time;
    }

    if (isEndOfContinuousMapping && isWithinContinuousMapping) {
      isWithinContinuousMapping = false;

      const durationMs = current.endTime - continuousStartTime;
      const beatsWithoutBreaks = Math.floor(
        (durationMs + SPREAD_REST_MOMENT_EPSILON_MS) / scaledBeatLength
      );

      if (beatsWithoutBreaks > warningLimit) {
        issues.push({
          level: "error",
          start: continuousStartTime,
          end: current.endTime,
          breakType: rule.breakType,
          beats: beatsWithoutBreaks,
          minorLimit,
          warningLimit,
          baseMinorLimit: rule.minorLimit,
          baseWarningLimit: rule.warningLimit
        });
      } else if (beatsWithoutBreaks > minorLimit) {
        issues.push({
          level: "warn",
          start: continuousStartTime,
          end: current.endTime,
          breakType: rule.breakType,
          beats: beatsWithoutBreaks,
          minorLimit,
          warningLimit,
          baseMinorLimit: rule.minorLimit,
          baseWarningLimit: rule.warningLimit
        });
      }
    }
  }

  return issues;
}

function getSpreadRestSmallestConsecutiveGap(objects, startIndex, consecutiveGaps) {
  let smallestGap = Infinity;

  for (let j = 0; j < consecutiveGaps; j++) {
    const gapBeginObject = objects[startIndex + j];
    const gapEndObject = objects[startIndex + j + 1];

    if (!gapBeginObject || !gapEndObject) {
      continue;
    }

    const gap = gapEndObject.time - gapBeginObject.endTime;
    smallestGap = Math.min(smallestGap, gap);
  }

  return smallestGap;
}

function parseSpreadRestMomentObjects(text, timingPoints, inheritedTimingPoints, sliderMultiplier) {
  const hitObjects = parseHitObjects(text);
  const objects = [];

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);

    if (Number.isNaN(time) || Number.isNaN(type)) continue;

    let endTime = time;
    let kind = "circle";

    if ((type & 2) !== 0) {
      kind = "slider";
      endTime = calculateSpreadRestSliderEndTime(
        parts,
        time,
        timingPoints,
        inheritedTimingPoints,
        sliderMultiplier
      );
    } else if ((type & 8) !== 0) {
      kind = "spinner";
      const spinnerEnd = parseInt(parts[5], 10);
      endTime = Number.isNaN(spinnerEnd) ? time : spinnerEnd;
    }

    objects.push({
      time,
      endTime: Number.isFinite(endTime) ? endTime : time,
      kind
    });
  }

  objects.sort((a, b) => a.time - b.time);
  return objects;
}

function calculateSpreadRestSliderEndTime(parts, time, timingPoints, inheritedTimingPoints, sliderMultiplier) {
  if (parts.length < 8) return time;

  const repeatCount = parseInt(parts[6], 10);
  const pixelLength = parseFloat(parts[7]);

  if (
    Number.isNaN(repeatCount) ||
    Number.isNaN(pixelLength) ||
    repeatCount <= 0 ||
    pixelLength <= 0
  ) {
    return time;
  }

  const red = findSpreadRestCurrentTimingPoint(timingPoints, time);
  if (!red || !Number.isFinite(red.beatLength) || red.beatLength <= 0) return time;

  const inherited = getCurrentSpreadInheritedTimingPoint(
    inheritedTimingPoints,
    time,
    red.time
  );
  const svMultiplier = inherited ? -100 / inherited.beatLength : 1;
  const effectiveSv = Number.isFinite(svMultiplier) && svMultiplier > 0 ? svMultiplier : 1;
  const effectiveSliderMultiplier =
    Number.isFinite(sliderMultiplier) && sliderMultiplier > 0
      ? sliderMultiplier
      : 1.4;

  const duration =
    (pixelLength * repeatCount * red.beatLength) /
    (effectiveSliderMultiplier * 100 * effectiveSv);

  if (!Number.isFinite(duration) || duration < 0) return time;

  const exactEndTime = time + duration;
  return exactEndTime + getSpreadRestPracticalUnsnap(exactEndTime, timingPoints);
}

function findSpreadRestCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function getSpreadRestPracticalUnsnap(time, timingPoints) {
  const timing = findSpreadRestCurrentTimingPoint(timingPoints, time);
  if (!timing || !Number.isFinite(timing.beatLength) || timing.beatLength <= 0) {
    return 0;
  }

  const divisors = [16, 12, 9, 7, 5];
  const unsnaps = divisors
    .map(divisor => getSpreadRestPracticalUnsnapForDivisor(time, divisor, timing))
    .filter(Number.isFinite);

  if (!unsnaps.length) return 0;

  const minUnsnap = Math.min(...unsnaps.map(unsnap => Math.abs(unsnap)));
  return unsnaps.find(unsnap => Math.abs(unsnap) === minUnsnap) ?? 0;
}

function getSpreadRestPracticalUnsnapForDivisor(time, divisor, timing) {
  const theoreticalUnsnap = getSpreadRestTheoreticalUnsnap(time, divisor, timing);
  return time - Math.trunc(time - theoreticalUnsnap);
}

function getSpreadRestTheoreticalUnsnap(time, divisor, timing) {
  const beatOffset = getSpreadRestOffsetIntoBeat(time, timing);
  const currentFraction = beatOffset / timing.beatLength;
  const desiredFraction = Math.round(currentFraction * divisor) / divisor;
  const differenceFraction = currentFraction - desiredFraction;

  return differenceFraction * timing.beatLength;
}

function getSpreadRestOffsetIntoBeat(time, timing) {
  const offset = (time - timing.time) % timing.beatLength;
  return offset < 0 ? offset + timing.beatLength : offset;
}
