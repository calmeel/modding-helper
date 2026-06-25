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
