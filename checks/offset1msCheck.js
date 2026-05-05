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

  const svLines = parseInheritedTimingPoints(text);

  const results = [];

  for (const line of hitObjects) {
    const items = getOffsetCheckTimesFromHitObject(
      line,
      timingPoints,
      svLines,
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

      if (!best) continue;
      if (best.diff === 0) continue;

      if (Math.abs(best.diff) >= 1 && Math.abs(best.diff) <= 3) {
        results.push({
          time: item.time,
          diff: best.diff,
          snap: best.snap,
          target: item.target
        });
      }
    }
  }

  return {
    fileName,
    results
  };
}

function getOffsetCheckTimesFromHitObject(line, timingPoints, svLines, sliderMultiplier) {
  const parts = line.split(",");
  if (parts.length < 4) return [];

  const startTime = parseInt(parts[2], 10);
  const type = parseInt(parts[3], 10);

  if (Number.isNaN(startTime) || Number.isNaN(type)) return [];

  const items = [
    {
      time: startTime,
      target: "start"
    }
  ];

  if (isOffsetSpinnerType(type)) {
    const endTime = parseInt(parts[5], 10);

    if (!Number.isNaN(endTime)) {
      items.push({
        time: endTime,
        target: "spinnerTail"
      });
    }
  }

  return items;
}

function isOffsetSpinnerType(type) {
  return (type & 8) !== 0;
}

function findCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function findNearestSnapDiff(time, redTime, beatLength, beatSnaps) {
  let best = null;

  for (const beatSnap of beatSnaps) {
    const snapLength = beatLength / beatSnap;
    const snapIndex = Math.round((time - redTime) / snapLength);
    const nearestSnap = redTime + snapIndex * snapLength;

    const snapped = Math.trunc(nearestSnap);
    const diff = snapped - time;

    if (!best || Math.abs(diff) < Math.abs(best.diff)) {
      best = {
        diff,
        snap: beatSnap
      };
    }
  }

  return best;
}