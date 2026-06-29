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
    negativeStartBarlineWarnings: issues.negativeStartBarlineWarnings,
    detachedBarlines: issues.detachedBarlines,
    intentionalDetachedBarlines: issues.intentionalDetachedBarlines
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
  const negativeStartBarlineWarnings = [];
  const detachedBarlines = [];
  const intentionalDetachedBarlines = [];

  if (!redLines.length) {
    return {
      doubleBarlines,
      negativeStartBarlineWarnings,
      detachedBarlines,
      intentionalDetachedBarlines
    };
  }

  const redLinesByTime = new Map();
  for (const redLine of redLines) {
    if (!redLinesByTime.has(redLine.time)) {
      redLinesByTime.set(redLine.time, []);
    }
    redLinesByTime.get(redLine.time).push(redLine);
  }

  const greenLineTimes = new Set(
    greenLines
      .map(line => line.time)
      .filter(time => Number.isFinite(time))
  );

  detectNegativeStartBarlineWarnings(
    negativeStartBarlineWarnings,
    redLines
  );

  for (let i = 0; i < redLines.length; i++) {
    const section = redLines[i];
    const nextSection = redLines[i + 1] ?? null;
    const measureLength = section.beatLength * section.meter;

    if (!Number.isFinite(measureLength) || measureLength <= 0) continue;

    const sectionEnd = nextSection
      ? nextSection.time
      : Math.max(lastHitObjectTime, section.time) + measureLength;

    // ハズレ値の beatLength（例: 1E-308）で小節線が無限生成されフリーズするのを防ぐ
    if ((sectionEnd - section.time) / measureLength > 200000) continue;

    for (
      let rawBarlineTime = section.time;
      rawBarlineTime < sectionEnd - BARLINE_SCROLL_SPEED_EPSILON;
      rawBarlineTime += measureLength
    ) {
      const barlineTime = Math.floor(rawBarlineTime);
      const redLineTime = barlineTime + 1;
      const redLine = findBarlineRedLineAtTime(redLinesByTime, redLineTime, {
        omitFirstBarline: false
      });
      const omittedRedLine = findBarlineRedLineAtTime(redLinesByTime, redLineTime, {
        omitFirstBarline: true
      });
      const omittedBarlineRedLine = findBarlineRedLineAtTime(
        redLinesByTime,
        barlineTime,
        { omitFirstBarline: true }
      );

      if (!redLine) {
        if (
          !redLinesByTime.has(redLineTime) &&
          noteTimes.has(redLineTime) &&
          greenLineTimes.has(redLineTime)
        ) {
          addDetachedBarlineIssue(
            intentionalDetachedBarlines,
            redLines,
            greenLines,
            sliderMultiplier,
            barlineTime,
            redLineTime,
            null,
            barlineTime,
            redLineTime
          );
        }

        addBeforeBarlineIntentionalDetachedIssue(
          intentionalDetachedBarlines,
          redLines,
          greenLines,
          noteTimes,
          sliderMultiplier,
          barlineTime
        );

        if (omittedRedLine && noteTimes.has(redLineTime)) {
          addDetachedBarlineIssue(
            detachedBarlines,
            redLines,
            greenLines,
            sliderMultiplier,
            barlineTime,
            redLineTime,
            omittedRedLine,
            barlineTime,
            redLineTime
          );
        }

        continue;
      }

      if (!omittedBarlineRedLine) {
        doubleBarlines.push({
          barlineTime,
          redLineTime,
          redLine
        });

        addBeforeBarlineIntentionalDetachedIssue(
          intentionalDetachedBarlines,
          redLines,
          greenLines,
          noteTimes,
          sliderMultiplier,
          barlineTime
        );

        if (noteTimes.has(redLineTime)) {
          addDetachedBarlineIssue(
            detachedBarlines,
            redLines,
            greenLines,
            sliderMultiplier,
            barlineTime,
            redLineTime,
            redLine,
            barlineTime,
            redLineTime
          );
        }

        continue;
      }

      if (noteTimes.has(barlineTime)) {
        addDetachedBarlineIssue(
          detachedBarlines,
          redLines,
          greenLines,
          sliderMultiplier,
          barlineTime,
          barlineTime,
          redLine,
          redLineTime,
          barlineTime
        );
      }
    }
  }

  return {
    doubleBarlines,
    negativeStartBarlineWarnings,
    detachedBarlines,
    intentionalDetachedBarlines
  };
}

function detectNegativeStartBarlineWarnings(warnings, redLines) {
  if (redLines.length < 2) return;

  const firstRedLine = redLines[0];
  const nextRedLine = redLines[1];

  if (firstRedLine.time >= 0) return;

  const measureLength = firstRedLine.beatLength * firstRedLine.meter;
  if (!Number.isFinite(measureLength) || measureLength <= 0) return;

  const generatedBarlineTime = Math.floor(firstRedLine.time + measureLength);
  if (generatedBarlineTime < nextRedLine.time) return;

  warnings.push({
    firstRedLineTime: firstRedLine.time,
    generatedBarlineTime,
    nextRedLineTime: nextRedLine.time,
    nextRedLine,
    stableLazerMessageKey: nextRedLine.omitFirstBarline
      ? "barlineNegativeStartStableSingleLazerMissing"
      : "barlineNegativeStartStableDoubleLazerSingle"
  });
}

function findBarlineRedLineAtTime(redLinesByTime, time, options = {}) {
  const candidates = redLinesByTime.get(time) ?? [];

  if (typeof options.omitFirstBarline === "boolean") {
    return candidates.find(redLine =>
      redLine.omitFirstBarline === options.omitFirstBarline
    ) ?? null;
  }

  return candidates[0] ?? null;
}

function addBeforeBarlineIntentionalDetachedIssue(
  intentionalDetachedBarlines,
  redLines,
  greenLines,
  noteTimes,
  sliderMultiplier,
  barlineTime
) {
  const noteTime = barlineTime - 1;
  if (!noteTimes.has(noteTime)) return;

  addDetachedBarlineIssue(
    intentionalDetachedBarlines,
    redLines,
    greenLines,
    sliderMultiplier,
    barlineTime,
    noteTime,
    null,
    barlineTime,
    noteTime
  );
}

function addDetachedBarlineIssue(
  detachedBarlines,
  redLines,
  greenLines,
  sliderMultiplier,
  barlineTime,
  noteTime,
  redLine,
  barlineSpeedTime,
  noteSpeedTime
) {
  const barlineSpeed = calculateBarlineVisualScrollSpeed(
    redLines,
    greenLines,
    sliderMultiplier,
    barlineSpeedTime
  );
  const noteSpeed = calculateBarlineVisualScrollSpeed(
    redLines,
    greenLines,
    sliderMultiplier,
    noteSpeedTime
  );

  if (
    !Number.isFinite(barlineSpeed) ||
    !Number.isFinite(noteSpeed) ||
    Math.abs(barlineSpeed - noteSpeed) <= BARLINE_SCROLL_SPEED_EPSILON
  ) {
    return;
  }

  detachedBarlines.push({
    barlineTime,
    noteTime,
    barlineSpeed,
    noteSpeed,
    delta: noteSpeed - barlineSpeed,
    redLine
  });
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
