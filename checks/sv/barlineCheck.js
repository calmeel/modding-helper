const BARLINE_SCROLL_BASE_PX_PER_BEAT = 175;
const BARLINE_SCROLL_SPEED_EPSILON = 1e-6;

function runBarlineCheck(text, fileName) {
  const redLines = parseBarlineRedLines(text);
  const greenLines = parseSpreadGreenLines(text);
  const noteTimes = new Set(parseSpreadCircleNoteTimes(text));
  const sliderMultiplier = parseSpreadDifficulty(text).sliderMultiplier;

  const issues = detectBarlineIssues(
    redLines,
    greenLines,
    noteTimes,
    sliderMultiplier,
    getLastHitObjectTime(text)
  );

  return {
    fileName,
    doubleBarlines: issues.doubleBarlines,
    detachedBarlines: issues.detachedBarlines
  };
}

function parseBarlineRedLines(text) {
  const timingPoints = parseTimingPointsDetailed(text)
    .filter(point =>
      point.uninherited === 1 &&
      Number.isFinite(point.time) &&
      Number.isFinite(point.beatLength) &&
      point.beatLength > 0
    )
    .map(point => ({
      ...point,
      time: parseBarlineTime(point.raw),
      meter: parseBarlineMeter(point.raw),
      omitFirstBarline: (point.effects & 8) !== 0
    }));

  timingPoints.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.lineNo - b.lineNo;
  });

  return timingPoints;
}

function parseBarlineTime(raw) {
  const parts = String(raw ?? "").split(",").map(part => part.trim());
  const time = parseFloat(parts[0]);
  return Number.isFinite(time) ? Math.floor(time) : 0;
}

function parseBarlineMeter(raw) {
  const parts = String(raw ?? "").split(",").map(part => part.trim());
  const meter = parseInt(parts[2], 10);
  return Number.isFinite(meter) && meter > 0 ? meter : 4;
}

function detectBarlineIssues(
  redLines,
  greenLines,
  noteTimes,
  sliderMultiplier,
  lastHitObjectTime
) {
  const doubleBarlines = [];
  const detachedBarlines = [];

  if (!redLines.length) {
    return { doubleBarlines, detachedBarlines };
  }

  const redLineByTime = new Map();
  for (const redLine of redLines) {
    if (!redLineByTime.has(redLine.time)) {
      redLineByTime.set(redLine.time, redLine);
    }
  }

  for (let i = 0; i < redLines.length; i++) {
    const section = redLines[i];
    const nextSection = redLines[i + 1] ?? null;
    const measureLength = section.beatLength * section.meter;

    if (!Number.isFinite(measureLength) || measureLength <= 0) continue;

    const sectionEnd = nextSection
      ? nextSection.time
      : Math.max(lastHitObjectTime, section.time) + measureLength;

    for (
      let rawBarlineTime = section.time;
      rawBarlineTime < sectionEnd - BARLINE_SCROLL_SPEED_EPSILON;
      rawBarlineTime += measureLength
    ) {
      const barlineTime = Math.floor(rawBarlineTime);
      const redLineTime = barlineTime + 1;
      const redLine = redLineByTime.get(redLineTime);

      if (!redLine || redLine.omitFirstBarline) continue;

      doubleBarlines.push({
        barlineTime,
        redLineTime,
        redLine
      });

      if (!noteTimes.has(redLineTime)) continue;

      const barlineSpeed = calculateBarlineVisualScrollSpeed(
        redLines,
        greenLines,
        sliderMultiplier,
        barlineTime
      );
      const noteSpeed = calculateBarlineVisualScrollSpeed(
        redLines,
        greenLines,
        sliderMultiplier,
        redLineTime
      );

      if (
        !Number.isFinite(barlineSpeed) ||
        !Number.isFinite(noteSpeed) ||
        Math.abs(barlineSpeed - noteSpeed) <= BARLINE_SCROLL_SPEED_EPSILON
      ) {
        continue;
      }

      detachedBarlines.push({
        barlineTime,
        noteTime: redLineTime,
        barlineSpeed,
        noteSpeed,
        delta: noteSpeed - barlineSpeed,
        redLine
      });
    }
  }

  return {
    doubleBarlines,
    detachedBarlines
  };
}

function calculateBarlineVisualScrollSpeed(
  redLines,
  greenLines,
  sliderMultiplier,
  time
) {
  const red = getCurrentSpreadTimingPoint(redLines, time);
  if (!red || !Number.isFinite(red.beatLength) || red.beatLength <= 0) {
    return null;
  }

  const green = getCurrentSpreadInheritedTimingPoint(
    greenLines,
    time,
    red.time
  );

  const bpm = 60000 / red.beatLength;
  const sv = green ? green.sv : 1;
  return BARLINE_SCROLL_BASE_PX_PER_BEAT * sliderMultiplier * sv * bpm / 60;
}
