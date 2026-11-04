function runOffset1msCheck(text, fileName, options = {}) {
  const beatSnaps = getBeatSnapCandidates(options.includeAdvancedSnaps);
  const timingPoints = parseTimingPoints(text);
  const hitObjects = parseHitObjects(text);

  const svLines = parseInheritedTimingPoints(text);
  const sliderMultiplier = parseOffsetSliderMultiplier(text);

  const results = [];
  const wheelResults = [];

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

  return {
    fileName,
    results,
    wheelResults
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
