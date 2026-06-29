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
    endTime: getLastHitObjectEndTime(source.text),
    audioDurationMs: normalizeVolumeCompareAudioDurationMs(source.audioDurationMs),
    breakIntervals: parseVolumeCompareBreakIntervals(source.text)
  }));
  const overallEndTime = Math.max(0, ...parsed.map(item => item.endTime));
  const displayEndTime = Math.max(
    overallEndTime,
    ...parsed.map(item => item.audioDurationMs)
  );

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

  const displaySections = filterVolumeCompareSectionsByOptions(intervals, {
    thresholdOnly,
    thresholdPercent,
    minDurationOnly,
    minDurationMs
  });

  return {
    results: displaySections,
    intervals,
    series: parsed.map(item => ({
      fileName: item.fileName,
      mode: item.mode,
      endTime: item.endTime,
      displayEndTime,
      audioDurationMs: item.audioDurationMs,
      points: buildVolumeCompareSeries(item.timingPoints, displayEndTime),
      kiaiIntervals: buildKiaiIntervals(item.timingPoints, Math.max(item.endTime, item.audioDurationMs)),
      breakIntervals: item.breakIntervals
    })),
    endTime: overallEndTime,
    displayEndTime,
    options: {
      thresholdOnly,
      thresholdPercent,
      minDurationOnly,
      minDurationMs
    },
    needTwoDiffs: parsed.length < 2
  };
}

function normalizeVolumeCompareAudioDurationMs(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function filterVolumeCompareSectionsByOptions(intervals, options = {}) {
  const thresholdOnly = options.thresholdOnly ?? true;
  const thresholdPercent = options.thresholdPercent ?? 5;
  const minDurationOnly = options.minDurationOnly ?? true;
  const minDurationMs = options.minDurationMs ?? 50;

  const sections = intervals.filter(section => {
    if (section.diff === 0) return false;
    return !thresholdOnly || section.diff >= thresholdPercent;
  });

  if (!minDurationOnly) return sections;

  const groups = groupContinuousVolumeCompareSections(sections);
  const allowed = new Set();

  for (const group of groups) {
    const start = group[0].start;
    const end = group[group.length - 1].end;

    if (end - start < minDurationMs) continue;

    for (const section of group) {
      allowed.add(section);
    }
  }

  return sections.filter(section => allowed.has(section));
}

function groupContinuousVolumeCompareSections(sections) {
  const groups = [];

  for (const section of sections) {
    const lastGroup = groups[groups.length - 1];
    const last = lastGroup?.[lastGroup.length - 1];

    if (last && last.end === section.start) {
      lastGroup.push(section);
    } else {
      groups.push([section]);
    }
  }

  return groups;
}

function mergeVolumeCompareSectionsAsBands(sections) {
  return groupContinuousVolumeCompareSections(sections).map(group => ({
    start: group[0].start,
    end: group[group.length - 1].end,
    diff: Math.max(...group.map(section => section.diff))
  }));
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
