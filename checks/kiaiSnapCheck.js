const KIAI_SNAP_CANDIDATES = [1, 2, 3, 4, 6, 8, 12, 16];
const KIAI_SNAP_TOLERANCE_MS = 1;

function runKiaiSnapCheck(text, fileName) {
  const timingPoints = parseAllTimingPoints(text);
  const redTimingPoints = parseTimingPoints(text);

  const points = findKiaiSwitchPoints(timingPoints);
  const results = [];

  for (const point of points) {
    const currentRed = findCurrentRedTimingPoint(redTimingPoints, point.time);
    if (!currentRed) continue;

    const snap = detectSnapAtTime(
      point.time,
      currentRed.time,
      currentRed.beatLength,
      KIAI_SNAP_CANDIDATES,
      KIAI_SNAP_TOLERANCE_MS
    );

    if (!snap) {
      results.push({
        time: point.time,
        type: point.kiai ? "ON" : "OFF",
        snap: "unknown",
        diff: null,
        lineNo: point.lineNo
      });
      continue;
    }

    // 1/1 snap上なら正常
    if (snap.snap === 1 && snap.diff === 0) continue;

    results.push({
      time: point.time,
      type: point.kiai ? "ON" : "OFF",
      snap: `1/${snap.snap}`,
      diff: snap.diff,
      lineNo: point.lineNo
    });
  }

  return {
    fileName,
    results
  };
}

function findKiaiSwitchPoints(timingPoints) {
  const points = [];
  let prevKiai = false;

  for (const tp of timingPoints) {
    if (tp.kiai !== prevKiai) {
      points.push(tp);
      prevKiai = tp.kiai;
    }
  }

  return points;
}

function findCurrentRedTimingPoint(redTimingPoints, time) {
  for (let i = redTimingPoints.length - 1; i >= 0; i--) {
    if (redTimingPoints[i].time <= time) {
      return redTimingPoints[i];
    }
  }

  return null;
}

function detectSnapAtTime(time, redTime, beatLength, candidates, toleranceMs) {
  let best = null;

  for (const snap of candidates) {
    const snapLength = beatLength / snap;
    const snapIndex = Math.round((time - redTime) / snapLength);
    const nearest = redTime + snapIndex * snapLength;
    const snapped = Math.trunc(nearest);
    const diff = snapped - time;

    if (Math.abs(diff) <= toleranceMs) {
      if (!best || snap < best.snap) {
        best = {
          snap,
          diff
        };
      }
    }
  }

  return best;
}