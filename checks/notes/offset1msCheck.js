function runOffset1msCheck(text, fileName, options = {}) {
  const beatSnaps = getBeatSnapCandidates(options.includeAdvancedSnaps);
  const timingPoints = parseTimingPoints(text);
  const hitObjects = parseHitObjects(text);

  const svLines = parseInheritedTimingPoints(text);
  const sliderMultiplier = parseOffsetSliderMultiplier(text);

  const results = [];
  const wheelResults = [];
  const summary = createOffsetSnapSummary(beatSnaps);
  const summaryPoints = [];

  for (const line of hitObjects) {
    const items = getOffsetCheckTimesFromHitObject(
      line,
      timingPoints,
      svLines,
      sliderMultiplier,
      beatSnaps
    );

    for (const item of items) {
      const currentTp = findCurrentTimingPoint(timingPoints, item.time);
      collectOffsetSnapSummary(summary, summaryPoints, item, currentTp);
      if (!currentTp) continue;

      const best = findNearestSnapDiff(
        item.time,
        currentTp.time,
        currentTp.beatLength,
        beatSnaps
      );
      if (best && best.diff !== 0) {
        const level = best.compatibility
          ? "warn"
          : getOffsetIssueLevelFromDiff(best.diff);
        const supplementalSnaps = !options.includeAdvancedSnaps && level === "error"
          ? findSupplementalOffsetSnaps(item.time, currentTp)
          : [];
        results.push({
          time: item.time,
          diff: best.diff,
          snap: best.snap,
          target: item.target,
          objectType: item.objectType,
          supplementalSnaps,
          level,
          compatibility: best.compatibility
        });
      }

      const wheelDifference = findStableWheelSeekDifference(
        item.time,
        timingPoints,
        beatSnaps
      );

      if (wheelDifference) {
        wheelResults.push({
          time: item.time,
          diff: wheelDifference.diff,
          snap: wheelDifference.snap,
          target: item.target,
          objectType: item.objectType,
          supplementalSnaps: [],
          level: "info",
          compatibility: wheelDifference.compatibility
        });
      }
    }
  }

  finishOffsetSnapSummary(summary, summaryPoints);

  return {
    fileName,
    summary,
    results,
    wheelResults
  };
}

// Use the same candidates and start/tail times as the detailed check.
// Sort a copy so ties consistently belong to the coarsest snap.
function createOffsetSnapSummary(beatSnaps = DEFAULT_BEAT_SNAPS) {
  return {
    snapped: 0,
    shifted: 0,
    unknown: 0,
    unavailable: 0,
    compatibility: 0,
    snaps: [...beatSnaps].sort((a, b) => a - b)
      .map(snap => ({ snap, snapped: 0, shifted: 0 })),
    usedSnaps: [],
    resnapDivisor: null,
    status: "empty"
  };
}

function collectOffsetSnapSummary(summary, points, item, timingPoint) {
  if (!timingPoint || !Number.isFinite(item.time) ||
      !Number.isFinite(timingPoint.time) ||
      !Number.isFinite(timingPoint.beatLength) || timingPoint.beatLength <= 0) {
    summary.unavailable++;
    return;
  }

  // Find exact matches before near matches; a tie belongs to the coarsest
  // snap. Count each start/tail once, even when several grids share it.
  let best = null;
  for (const row of summary.snaps) {
    const stableDiff = getStableResnapInteger(
      item.time, timingPoint.time, timingPoint.beatLength, row.snap
    ) - item.time;
    const lazerDiff = Math.trunc(getLazerOffsetSnapTime(
      item.time, timingPoint.time, timingPoint.beatLength, row.snap
    )) - item.time;
    const distance = Math.min(Math.abs(stableDiff), Math.abs(lazerDiff));
    if (!best || distance < best.distance) {
      best = { row, distance, stableDiff, lazerDiff };
    }
  }

  if (best.distance > 1) {
    summary.unknown++;
    return;
  }

  const category = best.distance === 0 ? "snapped" : "shifted";
  summary[category]++;
  best.row[category]++;
  if (category === "snapped" &&
      (best.stableDiff === 0) !== (best.lazerDiff === 0)) {
    summary.compatibility++;
  }
  points.push({ ...item, timingPoint, category });
}

function finishOffsetSnapSummary(summary, points) {
  summary.usedSnaps = summary.snaps
    .filter(row => row.snapped + row.shifted > 0)
    .map(row => row.snap);
  if (summary.usedSnaps.length) {
    summary.resnapDivisor = summary.usedSnaps.reduce((multiple, snap) => {
      let a = multiple;
      let b = snap;
      while (b) [a, b] = [b, a % b];
      return multiple / a * snap;
    }, 1);
  }

  if (summary.unavailable) summary.status = "unavailable";
  else if (summary.unknown) summary.status = "unknown";
  else if (!points.length) summary.status = "empty";
  else if (!summary.shifted) summary.status = "snapped";
  else {
    // A common divisor alone is insufficient: integer rounding may change
    // with a finer grid. Check both editors and preserve already exact times.
    // Slider tails depend on length/SV and cannot be resnapped independently.
    const safe = points.every(point => {
      if (point.objectType === "slider" && point.category === "shifted") return false;
      const tp = point.timingPoint;
      const stable = getStableResnapInteger(
        point.time, tp.time, tp.beatLength, summary.resnapDivisor
      );
      const lazer = Math.trunc(getLazerOffsetSnapTime(
        point.time, tp.time, tp.beatLength, summary.resnapDivisor
      ));
      const tolerance = point.category === "snapped" ? 0 : 1;
      return Math.abs(stable - point.time) <= tolerance &&
        Math.abs(lazer - point.time) <= tolerance;
    });
    summary.status = safe ? "resnap" : "review";
  }
}

function getOffsetIssueLevelFromDiff(diff) {
  return Math.abs(diff) === 1 ? "warn" : "error";
}

function getOffsetCheckTimesFromHitObject(
  line,
  timingPoints,
  svLines,
  sliderMultiplier,
  beatSnaps
) {
  const parts = line.split(",");
  if (parts.length < 4) return [];

  const startTime = parseInt(parts[2], 10);
  const type = parseInt(parts[3], 10);

  if (Number.isNaN(startTime) || Number.isNaN(type)) return [];

  const objectType = getOffsetObjectType(type);
  const items = [
    {
      time: startTime,
      target: "start",
      objectType
    }
  ];

  if (isOffsetSliderType(type)) {
    const sliderTailTime = estimateOffsetSliderTailTime(
      parts,
      startTime,
      timingPoints,
      svLines,
      sliderMultiplier,
      beatSnaps
    );

    if (sliderTailTime !== null) {
      items.push({
        time: sliderTailTime,
        target: "sliderTail",
        objectType
      });
    }
  }

  if (isOffsetSpinnerType(type)) {
    const endTime = parseInt(parts[5], 10);

    if (!Number.isNaN(endTime)) {
      items.push({
        time: endTime,
        target: "spinnerTail",
        objectType
      });
    }
  }

  return items;
}

function getOffsetObjectType(type) {
  if (isOffsetSliderType(type)) return "slider";
  if (isOffsetSpinnerType(type)) return "spinner";
  return "circle";
}

function isOffsetSpinnerType(type) {
  return (type & 8) !== 0;
}

function isOffsetSliderType(type) {
  return (type & 2) !== 0;
}

function estimateOffsetSliderTailTime(
  parts,
  startTime,
  timingPoints,
  svLines,
  sliderMultiplier,
  beatSnaps
) {
  // osu! slider object:
  // x,y,time,type,hitSound,curveType|points,slides,length,...
  if (parts.length < 8) return null;

  const repeat = parseInt(parts[6], 10);
  const pixelLength = parseFloat(parts[7]);

  if (
    Number.isNaN(repeat) ||
    Number.isNaN(pixelLength) ||
    repeat <= 0 ||
    pixelLength <= 0
  ) {
    return null;
  }

  const currentTp = findCurrentTimingPoint(timingPoints, startTime);
  if (!currentTp || !Number.isFinite(currentTp.beatLength) || currentTp.beatLength <= 0) {
    return null;
  }

  const sv = getOffsetCurrentSv(svLines, startTime, currentTp.time);
  const anchoredStartTime = getOffsetSliderStartAnchorTime(
    startTime,
    currentTp,
    beatSnaps
  );

  const duration =
    (pixelLength * repeat * currentTp.beatLength) /
    (sliderMultiplier * sv * 100);

  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  return Math.trunc(anchoredStartTime + duration);
}

function getOffsetSliderStartAnchorTime(
  startTime,
  timingPoint,
  beatSnaps
) {
  const snap = findNearestSnapDiff(
    startTime,
    timingPoint.time,
    timingPoint.beatLength,
    beatSnaps
  );

  if (!snap || Math.abs(snap.lazerRawDiff) >= 1) {
    return startTime;
  }

  return startTime + snap.lazerRawDiff;
}

function getOffsetCurrentSv(svLines, time, redTime = -Infinity) {
  let current = null;

  for (const svLine of svLines) {
    if (svLine.time < redTime) {
      continue;
    }

    if (svLine.time <= time) {
      current = svLine;
    } else {
      break;
    }
  }

  if (!current || !Number.isFinite(current.beatLength) || current.beatLength === 0) {
    return 1;
  }

  const sv = -100 / current.beatLength;

  return Number.isFinite(sv) && sv > 0 ? sv : 1;
}

function parseOffsetSliderMultiplier(text) {
  const lines = text.split(/\r?\n/);
  let inDifficulty = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Difficulty]") {
      inDifficulty = true;
      continue;
    }

    if (inDifficulty) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      if (trimmed.startsWith("SliderMultiplier:")) {
        const value = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));

        if (Number.isFinite(value) && value > 0) {
          return value;
        }
      }
    }
  }

  return 1.4;
}
