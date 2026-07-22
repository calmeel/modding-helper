const DEFAULT_BEAT_SNAPS = [1, 2, 3, 4, 6, 8, 12, 16];
const ADVANCED_SNAPS = [5, 7, 9];

function getBeatSnapCandidates(includeAdvancedSnaps = false) {
  return includeAdvancedSnaps
    ? [...DEFAULT_BEAT_SNAPS, ...ADVANCED_SNAPS]
    : DEFAULT_BEAT_SNAPS;
}

function runOffset1msCheck(text, fileName, options = {}) {
  const beatSnaps = getBeatSnapCandidates(options.includeAdvancedSnaps);
  const timingPoints = parseTimingPoints(text);
  const hitObjects = parseHitObjects(text);
  const stableSnapCache = new Map();

  const svLines = parseInheritedTimingPoints(text);
  const sliderMultiplier = parseOffsetSliderMultiplier(text);

  const results = [];

  for (const line of hitObjects) {
    const items = getOffsetCheckTimesFromHitObject(
      line,
      timingPoints,
      svLines,
      sliderMultiplier,
      beatSnaps,
      stableSnapCache
    );

    for (const item of items) {
      const currentTp = findCurrentTimingPoint(timingPoints, item.time);
      if (!currentTp) continue;

      const best = findNearestSnapDiff(
        item.time,
        currentTp.time,
        currentTp.beatLength,
        beatSnaps,
        stableSnapCache
      );

      if (!best) continue;
      if (best.diff === 0) continue;

      results.push({
        time: item.time,
        diff: best.diff,
        snap: best.snap,
        target: item.target,
        objectType: item.objectType,
        level: best.compatibility
          ? "warn"
          : getOffsetIssueLevelFromDiff(best.diff),
        compatibility: best.compatibility
      });
    }
  }

  return {
    fileName,
    results
  };
}

function getOffsetIssueLevelFromDiff(diff) {
  return Math.abs(diff) === 1 ? "warn" : "error";
}

function getOffsetCheckTimesFromHitObject(
  line,
  timingPoints,
  svLines,
  sliderMultiplier,
  beatSnaps,
  stableSnapCache
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
      beatSnaps,
      stableSnapCache
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
  beatSnaps,
  stableSnapCache
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
    beatSnaps,
    stableSnapCache
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
  beatSnaps,
  stableSnapCache
) {
  const snap = findNearestSnapDiff(
    startTime,
    timingPoint.time,
    timingPoint.beatLength,
    beatSnaps,
    stableSnapCache
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

function findCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function findNearestSnapDiff(
  time,
  redTime,
  beatLength,
  beatSnaps,
  stableSnapCache = new Map()
) {
  let lazerBest = null;
  let stableBest = null;

  for (const beatSnap of beatSnaps) {
    const snapLength = beatLength / beatSnap;
    const snapIndex = Math.round((time - redTime) / snapLength);
    const lazerTime = redTime + snapIndex * snapLength;
    const lazerCandidate = createOffsetSnapCandidate(time, lazerTime, beatSnap);

    if (isBetterOffsetSnapCandidate(lazerCandidate, lazerBest)) {
      lazerBest = lazerCandidate;
    }

    for (const stableIndex of [snapIndex, snapIndex - 1, snapIndex + 1]) {
      if (stableIndex < 0) continue;

      const stableTime = getStableOffsetSnapTime(
        redTime,
        beatLength,
        beatSnap,
        stableIndex,
        stableSnapCache
      );
      const stableCandidate = createOffsetSnapCandidate(time, stableTime, beatSnap);

      if (isBetterOffsetSnapCandidate(stableCandidate, stableBest)) {
        stableBest = stableCandidate;
      }
    }
  }

  if (!lazerBest || !stableBest) return lazerBest || stableBest;

  const lazerMatches = lazerBest.diff === 0;
  const stableMatches = stableBest.diff === 0;

  if (lazerMatches && stableMatches) {
    return {
      ...lazerBest,
      lazerRawDiff: lazerBest.rawDiff,
      compatibility: null
    };
  }

  if (stableMatches) {
    return {
      ...stableBest,
      diff: lazerBest.diff,
      lazerRawDiff: lazerBest.rawDiff,
      compatibility: "stableOnly"
    };
  }

  if (lazerMatches) {
    return {
      ...lazerBest,
      diff: stableBest.diff,
      lazerRawDiff: lazerBest.rawDiff,
      compatibility: "lazerOnly"
    };
  }

  const best = isBetterOffsetSnapCandidate(stableBest, lazerBest)
    ? stableBest
    : lazerBest;

  return {
    ...best,
    lazerRawDiff: lazerBest.rawDiff,
    compatibility: null
  };
}

function createOffsetSnapCandidate(time, snapTime, beatSnap) {
  return {
    diff: Math.trunc(snapTime) - time,
    rawDiff: snapTime - time,
    snap: beatSnap
  };
}

function isBetterOffsetSnapCandidate(candidate, current) {
  if (!current) return true;

  const candidateDiff = Math.abs(candidate.diff);
  const currentDiff = Math.abs(current.diff);

  return candidateDiff < currentDiff;
}

function getStableOffsetSnapTime(
  redTime,
  beatLength,
  beatSnap,
  snapIndex,
  stableSnapCache
) {
  const key = `${redTime}:${beatLength}:${beatSnap}`;
  let entry = stableSnapCache.get(key);

  if (!entry) {
    entry = {
      snapLength: beatLength / beatSnap,
      times: [redTime]
    };
    stableSnapCache.set(key, entry);
  }

  while (entry.times.length <= snapIndex) {
    entry.times.push(entry.times[entry.times.length - 1] + entry.snapLength);
  }

  return entry.times[snapIndex];
}
