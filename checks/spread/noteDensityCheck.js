const SPREAD_DENSITY_BOUNDARY_TOLERANCE_MS = 3;

function analyzeSpreadNoteDensity(text) {
  const redLines = parseSpreadDensityRedLines(text);
  const noteTimes = parseSpreadCircleNoteTimes(text);

  if (!redLines.length || !noteTimes.length) {
    return {
      measures: []
    };
  }

  const firstTime = Math.min(...noteTimes);
  const lastTime = Math.max(...noteTimes, getLastHitObjectEndTime(text));
  const measures = createSpreadDensityMeasures(redLines, firstTime, lastTime);

  for (const time of noteTimes) {
    const normalizedTime = normalizeSpreadDensityTimeNearBoundary(
      time,
      measures,
      SPREAD_DENSITY_BOUNDARY_TOLERANCE_MS
    );

    const measure = measures.find(m =>
      normalizedTime >= m.start &&
      normalizedTime < m.end
    );

    if (measure) {
      measure.noteCount++;
    }
  }

  return {
    measures
  };
}

function parseSpreadDensityRedLines(text) {
  const lines = text.split(/\r?\n/);
  let inTimingPoints = false;
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (inTimingPoints) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const meter = parseInt(parts[2], 10);
      const uninherited = parseInt(parts[6], 10);

      if (
        uninherited === 1 &&
        Number.isFinite(time) &&
        Number.isFinite(beatLength) &&
        beatLength > 0
      ) {
        points.push({
          time,
          beatLength,
          meter: Number.isFinite(meter) && meter > 0 ? meter : 4
        });
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function createSpreadDensityMeasures(redLines, firstTime, lastTime) {
  const measures = [];

  for (let i = 0; i < redLines.length; i++) {
    const red = redLines[i];
    const nextRed = redLines[i + 1];

    const measureLength = red.beatLength * red.meter;
    const sectionStart = red.time;
    const sectionEnd = nextRed ? nextRed.time : lastTime + measureLength;

    // ハズレ値の beatLength で小節が無限生成されフリーズするのを防ぐ
    if (!Number.isFinite(measureLength) || measureLength <= 0 ||
        (sectionEnd - sectionStart) / measureLength > 200000) continue;

    let start = sectionStart;

    while (start < sectionEnd && start <= lastTime) {
      const end = Math.min(start + measureLength, sectionEnd);

      const roundedStart = Math.round(start);
      const roundedEnd = Math.round(end);

      if (
        end > start &&
        roundedEnd > roundedStart &&
        end >= firstTime &&
        start <= lastTime
      ) {
        measures.push({
          start: roundedStart,
          end: roundedEnd,
          noteCount: 0
        });
      }

      start += measureLength;
    }
  }

  return measures;
}

function normalizeSpreadDensityTimeNearBoundary(time, measures, toleranceMs) {
  for (const measure of measures) {
    if (Math.abs(time - measure.start) <= toleranceMs) {
      return measure.start;
    }

    if (Math.abs(time - measure.end) <= toleranceMs) {
      return measure.end;
    }
  }

  return time;
}
