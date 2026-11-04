function runKiaiSnapCheck(text, fileName) {
  const timingPoints = parseAllTimingPoints(text);
  const redTimingPoints = parseTimingPoints(text);
  const results = [];
  const wheelResults = [];

  for (const point of findKiaiSwitchPoints(timingPoints)) {
    const analysis = analyzeTimingSnap(point.time, redTimingPoints);
    const snap = analysis.snap;
    const base = {
      time: point.time,
      type: point.kiai ? "ON" : "OFF",
      lineNo: point.lineNo
    };

    if (!snap || snap.compatibility || snap.snap !== 1 || snap.diff !== 0) {
      results.push({
        ...base,
        snap: snap ? `1/${snap.snap}` : null,
        diff: snap ? snap.diff : null,
        level: snap?.compatibility ? "warn" : !snap || snap.diff !== 0 ? "error" : "warn",
        compatibility: snap?.compatibility ?? null,
        supplementalSnaps: analysis.supplementalSnaps,
        timingUnavailable: !snap
      });
    }

    if (analysis.wheel) {
      wheelResults.push({
        ...base,
        ...analysis.wheel,
        snap: `1/${analysis.wheel.snap}`,
        level: "info",
        supplementalSnaps: []
      });
    }
  }

  return { fileName, results, wheelResults };
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
