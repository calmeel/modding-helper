function runVolumeCompareCheck(sources, options = {}) {
  const thresholdOnly = options.thresholdOnly ?? true;
  const thresholdPercent = options.thresholdPercent ?? 5;
  const minDurationOnly = options.minDurationOnly ?? true;
  const minDurationMs = options.minDurationMs ?? 50;

  if (!sources || sources.length === 0) {
    return {
      results: [],
      intervals: [],
      series: [],
      endTime: 0,
      options: {
        thresholdOnly,
        thresholdPercent,
        minDurationOnly,
        minDurationMs
      },
      needTwoDiffs: true
    };
  }

  const parsed = sources.map(source => ({
    fileName: source.fileName,
    mode: source.mode,
    timingPoints: parseTimingPointsDetailed(source.text),
    endTime: getLastHitObjectTime(source.text),
    breakIntervals: parseVolumeCompareBreakIntervals(source.text)
  }));

  const boundaries = collectVolumeCompareBoundaries(parsed);
  const intervals = [];

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

    intervals.push({
      start,
      end,
      diff,
      minVolume,
      maxVolume,
      states
    });
  }

  let mergedResults = mergeAdjacentVolumeCompareSections(
    intervals.filter(section => {
      if (section.diff === 0) return false;
      return !thresholdOnly || section.diff >= thresholdPercent;
    })
  );

  if (minDurationOnly) {
    mergedResults = mergedResults.filter(section =>
      (section.end - section.start) >= minDurationMs
    );
  }

  return {
    results: mergedResults,
    intervals,
    series: parsed.map(item => ({
      fileName: item.fileName,
      mode: item.mode,
      endTime: item.endTime,
      points: buildVolumeCompareSeries(item.timingPoints, item.endTime),
      kiaiIntervals: buildKiaiIntervals(item.timingPoints, item.endTime),
      breakIntervals: item.breakIntervals
    })),
    endTime: Math.max(0, ...parsed.map(item => item.endTime)),
    options: {
      thresholdOnly,
      thresholdPercent,
      minDurationOnly,
      minDurationMs
    },
    needTwoDiffs: parsed.length < 2
  };
}

function collectVolumeCompareBoundaries(parsed) {
  const boundaries = new Set();

  boundaries.add(0);

  for (const item of parsed) {
    boundaries.add(item.endTime);

    for (const tp of item.timingPoints) {
      boundaries.add(tp.time);
    }
  }

  return [...boundaries]
    .filter(v => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);
}

function findCurrentVolumeTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return timingPoints[0] ?? null;
}

function buildVolumeCompareSeries(timingPoints, endTime) {
  if (!timingPoints.length || endTime <= 0) return [];

  const initial = findCurrentVolumeTimingPoint(timingPoints, 0);
  const points = [{
    time: 0,
    volume: initial?.volume ?? null
  }];

  for (const point of timingPoints) {
    if (point.time < 0 || point.time > endTime) continue;

    const last = points[points.length - 1];

    if (last.time === point.time) {
      last.volume = point.volume;
      continue;
    }

    if (last.volume !== point.volume) {
      points.push({
        time: point.time,
        volume: point.volume
      });
    }
  }

  return points;
}

function parseVolumeCompareBreakIntervals(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const intervals = [];
  let inEvents = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Events]") {
      inEvents = true;
      continue;
    }

    if (!inEvents) continue;
    if (trimmed.startsWith("[")) break;
    if (!trimmed || trimmed.startsWith("//")) continue;

    const parts = trimmed.split(",").map(part => part.trim());
    const eventType = parts[0]?.toLowerCase();

    if (eventType !== "2" && eventType !== "break") continue;

    const start = Math.round(parseFloat(parts[1]));
    const end = Math.round(parseFloat(parts[2]));

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      continue;
    }

    intervals.push({
      start: Math.max(0, start),
      end
    });
  }

  return mergeVolumeCompareSimpleIntervals(intervals);
}

function mergeVolumeCompareSimpleIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];

    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function mergeAdjacentVolumeCompareSections(sections) {
  if (!sections.length) return [];

  const merged = [{ ...sections[0] }];

  for (const section of sections.slice(1)) {
    const last = merged[merged.length - 1];

    const sameStates =
      JSON.stringify(last.states) === JSON.stringify(section.states);

    if (last.end === section.start && sameStates) {
      last.end = section.end;
    } else {
      merged.push({ ...section });
    }
  }

  return merged;
}
