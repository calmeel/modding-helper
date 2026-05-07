function runVolumeCompareCheck(sources, options = {}) {
  const thresholdOnly = options.thresholdOnly ?? true;
  const thresholdPercent = options.thresholdPercent ?? 5;
  const minDurationOnly = options.minDurationOnly ?? true;
  const minDurationMs = options.minDurationMs ?? 50;

  if (!sources || sources.length < 2) {
    return {
      results: [],
      needTwoDiffs: true
    };
  }

  const parsed = sources.map(source => ({
    fileName: source.fileName,
    mode: source.mode,
    timingPoints: parseTimingPointsDetailed(source.text),
    endTime: getLastHitObjectTime(source.text)
  }));

  const boundaries = collectVolumeCompareBoundaries(parsed);
  const results = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];

    if (end <= start) continue;

    const states = parsed.map(item => {
      const current = findCurrentVolumeTimingPoint(item.timingPoints, start);

      return {
        fileName: item.fileName,
        mode: item.mode,
        volume: current ? current.volume : null
      };
    });

    const volumes = states
      .map(state => state.volume)
      .filter(volume => volume !== null);

    if (volumes.length < 2) continue;

    const minVolume = Math.min(...volumes);
    const maxVolume = Math.max(...volumes);
    const diff = maxVolume - minVolume;

    if (diff === 0) continue;
    if (thresholdOnly && diff < thresholdPercent) continue;

    results.push({
      start,
      end,
      diff,
      minVolume,
      maxVolume,
      states
    });
  }

  let mergedResults = mergeAdjacentVolumeCompareSections(results);

  if (minDurationOnly) {
    mergedResults = mergedResults.filter(section =>
      (section.end - section.start) >= minDurationMs
    );
  }

  return {
    results: mergedResults,
    needTwoDiffs: false
  };
}

function collectVolumeCompareBoundaries(parsed) {
  const boundaries = new Set();

  boundaries.add(0);

  for (const item of parsed) {
    boundaries.add(item.endTime);

    for (const tp of item.timingPoints) {
      // SV lineのみを境界として使う
      if (tp.uninherited === 0) {
        boundaries.add(tp.time);
      }
    }
  }

  return [...boundaries]
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);
}

function findCurrentVolumeTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function mergeAdjacentVolumeCompareSections(sections) {
  if (!sections.length) return [];

  const merged = [sections[0]];

  for (const section of sections.slice(1)) {
    const last = merged[merged.length - 1];

    const sameStates =
      JSON.stringify(last.states) === JSON.stringify(section.states);

    if (last.end === section.start && sameStates) {
      last.end = section.end;
    } else {
      merged.push(section);
    }
  }

  return merged;
}