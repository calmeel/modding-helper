function runSvVolumeCheck(text, fileName, options = {}) {
  const thresholdMode = options.thresholdMode || "5ms";
  const largeChangeOnly = options.largeChangeOnly ?? true;
  const largeChangeThreshold = options.largeChangeThreshold ?? 15;

  const svLines = parseInheritedTimingPoints(text);
  const hitObjects = parseHitObjects(text);
  const redTimingPoints = parseTimingPoints(text);

  const hitTimes = hitObjects
    .map(line => {
      const parts = line.split(",");
      return parseInt(parts[2], 10);
    })
    .filter(time => !Number.isNaN(time))
    .sort((a, b) => a - b);

  const volumeChanges = detectSvVolumeChanges(svLines);
  const results = [];

  for (const change of volumeChanges) {
    const nearestHit = findNearestHitObjectTime(hitTimes, change.time);
    if (nearestHit === null) continue;

    const currentRed = findCurrentTimingPoint(redTimingPoints, nearestHit);
    if (!currentRed) continue;

    const thresholdMs =
      thresholdMode === "16snap"
        ? currentRed.beatLength / 16
        : 5;

    const diff = change.time - nearestHit;

    const volumeDiff = Math.abs(change.newVolume - change.oldVolume);

    if (largeChangeOnly && volumeDiff < largeChangeThreshold) {
      continue;
    }

    if (Math.abs(diff) < thresholdMs) {
      results.push({
        time: change.time,
        hitTime: nearestHit,
        diff,
        oldVolume: change.oldVolume,
        newVolume: change.newVolume,
        volumeDiff,
        thresholdMs
      });
    }
  }

  return {
    fileName,
    results
  };
}

function detectSvVolumeChanges(svLines) {
  const changes = [];

  for (let i = 1; i < svLines.length; i++) {
    const prev = svLines[i - 1];
    const cur = svLines[i];

    if (cur.volume !== prev.volume) {
      changes.push({
        time: cur.time,
        oldVolume: prev.volume,
        newVolume: cur.volume
      });
    }
  }

  return changes;
}

function findNearestHitObjectTime(hitTimes, time) {
  if (!hitTimes.length) return null;

  let best = null;

  for (const hitTime of hitTimes) {
    const diff = Math.abs(hitTime - time);

    if (best === null || diff < Math.abs(best - time)) {
      best = hitTime;
    }
  }

  return best;
}