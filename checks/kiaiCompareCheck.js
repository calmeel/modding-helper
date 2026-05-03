function runKiaiAnalyze(text, fileName) {
  const timingPoints = parseAllTimingPoints(text);
  const endTime = getLastHitObjectTime(text);

  const intervals = buildKiaiIntervals(timingPoints, endTime);
  const totalDuration = intervals.reduce((sum, item) => sum + (item.end - item.start), 0);

  const lastTimingPoint = timingPoints[timingPoints.length - 1];
  const hasImplicitKiaiEnd = lastTimingPoint ? lastTimingPoint.kiai : false;

  return {
    fileName,
    endTime,
    intervals,
    totalDuration,
    hasImplicitKiaiEnd
  };
}

function buildKiaiIntervals(timingPoints, endTime) {
  const intervals = [];

  if (!timingPoints.length || endTime <= 0) {
    return intervals;
  }

  for (let i = 0; i < timingPoints.length; i++) {
    const current = timingPoints[i];
    const next = timingPoints[i + 1];

    const start = current.time;
    const end = next ? next.time : endTime;

    if (end <= start) continue;

    if (current.kiai) {
      intervals.push({
        start,
        end
      });
    }
  }

  return intervals;
}

function compareKiaiResults(results) {
  if (!results || results.length < 2) {
    return {
      mismatchSections: []
    };
  }

  const boundaries = new Set();

  for (const result of results) {
    boundaries.add(0);
    boundaries.add(result.endTime);

    for (const interval of result.intervals) {
      boundaries.add(interval.start);
      boundaries.add(interval.end);
    }
  }

  const sorted = [...boundaries]
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  const mismatchSections = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];

    if (end <= start) continue;

    const states = results.map(result => ({
      fileName: result.fileName,
      kiai: isKiaiOnAt(result.intervals, start)
    }));

    const hasOn = states.some(s => s.kiai);
    const hasOff = states.some(s => !s.kiai);

    if (hasOn && hasOff) {
      mismatchSections.push({
        start,
        end,
        states
      });
    }
  }

  return {
    mismatchSections: mergeAdjacentMismatchSections(mismatchSections)
  };
}

function isKiaiOnAt(intervals, time) {
  return intervals.some(interval => interval.start <= time && time < interval.end);
}

function mergeAdjacentMismatchSections(sections) {
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