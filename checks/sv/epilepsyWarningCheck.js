const EPILEPSY_KIAI_FLASH_CAUTION_HZ = 2;
const EPILEPSY_KIAI_FLASH_WARNING_HZ = 3;

const EPILEPSY_KIAI_BPM_CAUTION = 240;
const EPILEPSY_KIAI_BPM_WARNING = 300;

function runEpilepsyWarningCheck(text, fileName) {
  const timingPoints = parseAllTimingPoints(text);
  const redTimingPoints = parseTimingPoints(text);
  const endTime = getLastHitObjectTime(text);

  const switchPoints = collectEpilepsyKiaiSwitchPoints(timingPoints);
  const kiaiIntervals = buildKiaiIntervals(timingPoints, endTime);

  return {
    fileName,
    flashIssues: detectEpilepsyKiaiFlashIssues(switchPoints),
    bpmIssues: detectEpilepsyHighBpmKiaiIssues(kiaiIntervals, redTimingPoints)
  };
}

function collectEpilepsyKiaiSwitchPoints(timingPoints) {
  const points = [];
  let prevKiai = false;

  for (const tp of timingPoints) {
    if (tp.kiai !== prevKiai) {
      points.push({
        time: tp.time,
        kiai: tp.kiai,
        lineNo: tp.lineNo
      });

      prevKiai = tp.kiai;
    }
  }

  return points;
}

function detectEpilepsyKiaiFlashIssues(switchPoints) {
  const onPoints = switchPoints
    .filter(point => point.kiai)
    .sort((a, b) => a.time - b.time);

  const issues = [];

  for (let i = 1; i < onPoints.length; i++) {
    const prev = onPoints[i - 1];
    const cur = onPoints[i];

    const intervalMs = cur.time - prev.time;
    if (intervalMs <= 0) continue;

    const hz = 1000 / intervalMs;

    if (hz < EPILEPSY_KIAI_FLASH_CAUTION_HZ) continue;

    issues.push({
      time: cur.time,
      prevTime: prev.time,
      intervalMs,
      hz,
      level: hz >= EPILEPSY_KIAI_FLASH_WARNING_HZ ? "warn" : "caution"
    });
  }

  return issues;
}

function detectEpilepsyHighBpmKiaiIssues(kiaiIntervals, redTimingPoints) {
  const issues = [];

  for (const interval of kiaiIntervals) {
    const segments = splitKiaiIntervalByRedTimingPoints(interval, redTimingPoints);

    for (const segment of segments) {
      const bpm = beatLengthToBpm(segment.beatLength);
      if (bpm === null) continue;

      if (bpm < EPILEPSY_KIAI_BPM_CAUTION) continue;

      issues.push({
        start: segment.start,
        end: segment.end,
        bpm,
        hz: bpm / 60,
        level: bpm >= EPILEPSY_KIAI_BPM_WARNING ? "warn" : "caution"
      });
    }
  }

  return mergeEpilepsyHighBpmKiaiIssues(issues);
}

function splitKiaiIntervalByRedTimingPoints(interval, redTimingPoints) {
  const points = redTimingPoints
    .filter(tp => tp.time <= interval.end)
    .sort((a, b) => a.time - b.time);

  const segments = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[i + 1];

    const start = Math.max(interval.start, current.time);
    const end = Math.min(interval.end, next ? next.time : interval.end);

    if (end <= start) continue;

    segments.push({
      start,
      end,
      beatLength: current.beatLength
    });
  }

  return segments;
}

function beatLengthToBpm(beatLength) {
  if (!Number.isFinite(beatLength) || beatLength <= 0) return null;
  return 60000 / beatLength;
}

function mergeEpilepsyHighBpmKiaiIssues(issues) {
  if (!issues.length) return [];

  const merged = [];

  for (const issue of issues) {
    const last = merged[merged.length - 1];

    if (
      last &&
      Math.abs(issue.start - last.end) <= 1 &&
      Math.abs(issue.bpm - last.bpm) < 0.001 &&
      issue.level === last.level
    ) {
      last.end = issue.end;
      continue;
    }

    merged.push({ ...issue });
  }

  return merged;
}