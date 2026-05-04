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

  const results = [];

  for (const line of hitObjects) {
    const parts = line.split(",");

    if (parts.length < 3) continue;

    const time = parseInt(parts[2], 10);

    if (Number.isNaN(time)) continue;

    const currentTp = findCurrentTimingPoint(timingPoints, time);
    if (!currentTp) continue;

    const best = findNearestSnapDiff(
      time,
      currentTp.time,
      currentTp.beatLength,
      beatSnaps
    );

    if (!best) continue;

    // 完全一致なら正常
    if (best.diff === 0) continue;

    // ±1〜±3msだけ検出
    if (Math.abs(best.diff) >= 1 && Math.abs(best.diff) <= 3) {
      results.push({
        time,
        diff: best.diff,
        snap: best.snap
      });
    }
  }

  return {
    fileName,
    results
  };
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