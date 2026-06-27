const SPREAD_REST_MOMENT_EPSILON_MS = 2;
const SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH = 60000 / 180;
const SPREAD_REST_MOMENT_DEFAULT_SCALE_OPTIONS = {
  highEnabled: true,
  highBpm: 270,
  highScale: 0.5,
  lowEnabled: true,
  lowBpm: 110,
  lowScale: 2,
  ignoreSliders: true,
  ignoreSpinners: true,
  useAdjustedThresholds: true,
  useMsGap: false,
  useMsThresholds: false
};

const SPREAD_REST_MOMENT_RULES = {
  kantan: {
    breakType: "3/1",
    gapType: "3/1 x1",
    acceptableRests: [{ consecutiveGaps: 1, beats: 3.0 }],
    minorLimit: 36,
    warningLimit: 44
  },
  futsuu: {
    breakType: "2/1",
    gapType: "2/1 x1",
    acceptableRests: [{ consecutiveGaps: 1, beats: 2.0 }],
    minorLimit: 36,
    warningLimit: 44
  },
  muzukashii: {
    breakType: "3/2 or 3 x 1/1",
    gapType: "3/2 x1 or 1/1 x3",
    acceptableRests: [
      { consecutiveGaps: 1, beats: 1.5 },
      { consecutiveGaps: 3, beats: 1.0 }
    ],
    minorLimit: 36,
    warningLimit: 44
  },
  oni: {
    breakType: "1/1",
    gapType: "1/1 x1",
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

  const useMsGap = options.useMsGap ?? defaults.useMsGap;
  const useMsThresholds = options.useMsThresholds ?? defaults.useMsThresholds;

  return {
    highEnabled: useMsGap ? false : (options.highEnabled ?? defaults.highEnabled),
    highBpm,
    highScale,
    lowEnabled: useMsGap ? false : (options.lowEnabled ?? defaults.lowEnabled),
    lowBpm,
    lowScale,
    ignoreSliders: options.ignoreSliders ?? defaults.ignoreSliders,
    ignoreSpinners: options.ignoreSpinners ?? defaults.ignoreSpinners,
    useAdjustedThresholds: useMsThresholds
      ? false
      : (options.useAdjustedThresholds ?? defaults.useAdjustedThresholds),
    useMsGap,
    useMsThresholds
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
  const minorLimit = scaleOptions.useMsThresholds
    ? rule.minorLimit * SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH
    : rule.minorLimit * thresholdMultiplier;
  const warningLimit = scaleOptions.useMsThresholds
    ? rule.warningLimit * SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH
    : rule.warningLimit * thresholdMultiplier;

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
      const restBeatLength = scaleOptions.useMsGap
        ? SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH
        : scaledBeatLength;
      const minimalRestMomentGapMs = acceptableRest.beats * restBeatLength;
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
      const thresholdUnitLength = scaleOptions.useMsThresholds
        ? 1
        : scaledBeatLength;
      const lengthWithoutBreaks = Math.floor(
        (durationMs + SPREAD_REST_MOMENT_EPSILON_MS) / thresholdUnitLength
      );

      if (lengthWithoutBreaks > warningLimit) {
        issues.push({
          level: "error",
          start: continuousStartTime,
          end: current.endTime,
          breakType: formatSpreadRestMomentBreakType(rule, scaleOptions),
          beats: lengthWithoutBreaks,
          lengthUnit: scaleOptions.useMsThresholds ? "ms" : "beats",
          minorLimit,
          warningLimit,
          baseMinorLimit: rule.minorLimit,
          baseWarningLimit: rule.warningLimit
        });
      } else if (lengthWithoutBreaks > minorLimit) {
        issues.push({
          level: "warn",
          start: continuousStartTime,
          end: current.endTime,
          breakType: formatSpreadRestMomentBreakType(rule, scaleOptions),
          beats: lengthWithoutBreaks,
          lengthUnit: scaleOptions.useMsThresholds ? "ms" : "beats",
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

function formatSpreadRestMomentBreakType(rule, scaleOptions) {
  if (!scaleOptions.useMsGap) return rule.breakType;

  return rule.acceptableRests
    .map(rest => {
      const ms = rest.beats * SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH;
      const count = rest.consecutiveGaps > 1 ? ` x${rest.consecutiveGaps}` : "";
      return `${formatSpreadRestMomentMs(ms)} ms${count}`;
    })
    .join(" or ");
}

function formatSpreadRestMomentMs(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
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
