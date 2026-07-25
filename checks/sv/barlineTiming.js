const BARLINE_TIMING_LAZER_EPSILON = 1e-7;
const BARLINE_TIMING_MIN_MEASURE_LENGTH = 0.001;
const BARLINE_TIMING_MAX_EVENTS = 200000;

function buildBarlineTimelines(text) {
  const redLines = parseBarlineTimingRedLines(text);
  const firstHitObjectTime = getFirstBarlineHitObjectTime(text);
  const lastHitObjectEndTime = getLastHitObjectEndTime(text);

  return {
    redLines,
    firstHitObjectTime,
    lastHitObjectEndTime,
    stable: buildStableBarlineTimeline(redLines, lastHitObjectEndTime),
    lazer: buildLazerBarlineTimeline(
      redLines,
      firstHitObjectTime,
      lastHitObjectEndTime
    )
  };
}

function parseBarlineTimingRedLines(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const redLines = [];
  let inTimingPoints = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (!inTimingPoints) continue;
    if (trimmed.startsWith("[")) break;
    if (!trimmed || trimmed.startsWith("//")) continue;

    const parts = trimmed.split(",").map(part => part.trim());
    if (parts.length < 8) continue;

    const time = parseFloat(parts[0]);
    const beatLength = parseFloat(parts[1]);
    const meterValue = parseInt(parts[2], 10);
    const uninherited = parseInt(parts[6], 10);
    const effects = parseInt(parts[7], 10);

    if (
      uninherited !== 1 ||
      !Number.isFinite(time) ||
      !Number.isFinite(beatLength) ||
      beatLength <= 0
    ) {
      continue;
    }

    redLines.push({
      time,
      beatLength,
      meter: Number.isFinite(meterValue) && meterValue > 0 ? meterValue : 4,
      effects: Number.isFinite(effects) ? effects : 0,
      omitFirstBarline: Number.isFinite(effects) && (effects & 8) !== 0,
      raw: trimmed,
      lineNo: i + 1
    });
  }

  redLines.sort((a, b) =>
    a.time - b.time ||
    a.lineNo - b.lineNo
  );

  return redLines;
}

function getFirstBarlineHitObjectTime(text) {
  const hitObjects = parseHitObjects(text);
  let first = Number.POSITIVE_INFINITY;

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 3) continue;

    const time = parseInt(parts[2], 10);
    if (Number.isFinite(time)) {
      first = Math.min(first, time);
    }
  }

  return Number.isFinite(first) ? first : 0;
}

function buildStableBarlineTimeline(redLines, lastHitObjectEndTime) {
  const events = [];
  if (!redLines.length) {
    return { events, initialCandidate: null, truncated: false };
  }

  const firstRedLine = redLines[0];
  const firstMeasureLength = getBarlineMeasureLength(firstRedLine);
  if (
    !Number.isFinite(firstMeasureLength) ||
    firstMeasureLength <= 0
  ) {
    return { events, initialCandidate: null, truncated: false };
  }

  let time =
    firstRedLine.time -
    Math.trunc(firstRedLine.time / firstMeasureLength) * firstMeasureLength;

  if (time < 0) {
    time += firstMeasureLength;
  }

  const initialCandidate = time;
  const limit = lastHitObjectEndTime + 1;
  let sectionIndex = 0;
  let candidateIndex = 0;
  let iterations = 0;
  let truncated = false;

  while (time <= limit) {
    if (iterations++ >= BARLINE_TIMING_MAX_EVENTS) {
      truncated = true;
      break;
    }

    const section = redLines[sectionIndex];
    const isInitialCandidate = sectionIndex === 0 && candidateIndex === 0;

    if (!(time <= section.time && section.omitFirstBarline)) {
      events.push({
        client: "stable",
        time: Math.trunc(time),
        rawTime: time,
        sectionIndex,
        sectionTime: section.time,
        source: isInitialCandidate
          ? "initial-candidate"
          : time === section.time
            ? "section-start"
            : "repeated-addition"
      });
    }

    const measureLength = getBarlineMeasureLength(section);
    const nextSection = redLines[sectionIndex + 1] ?? null;

    if (measureLength < BARLINE_TIMING_MIN_MEASURE_LENGTH) {
      if (!nextSection) break;
      sectionIndex++;
      time = nextSection.time;
      candidateIndex = 0;
      continue;
    }

    time += measureLength;
    candidateIndex++;

    if (nextSection && time >= nextSection.time) {
      sectionIndex++;
      time = nextSection.time;
      candidateIndex = 0;
    }
  }

  return { events, initialCandidate, truncated };
}

function buildLazerBarlineTimeline(
  redLines,
  firstHitObjectTime,
  lastHitObjectEndTime
) {
  const events = [];
  if (!redLines.length) {
    return { events, truncated: false };
  }

  const generationStartTime = Math.min(0, firstHitObjectTime);
  let iterations = 0;
  let truncated = false;

  for (let sectionIndex = 0; sectionIndex < redLines.length; sectionIndex++) {
    const section = redLines[sectionIndex];
    const measureLength = getBarlineMeasureLength(section);
    if (
      !Number.isFinite(measureLength) ||
      measureLength < BARLINE_TIMING_MIN_MEASURE_LENGTH
    ) {
      continue;
    }

    let time;
    if (section.time > generationStartTime) {
      time = section.time;
    } else {
      const barCount = Math.ceil(
        (generationStartTime - section.time) / measureLength
      );
      time = section.time + barCount * measureLength;
    }

    if (section.omitFirstBarline) {
      time += measureLength;
    }

    const nextSection = redLines[sectionIndex + 1] ?? null;
    const endTime = nextSection
      ? nextSection.time
      : lastHitObjectEndTime + 1 + measureLength;
    let candidateIndex = 0;

    while (endTime > time - BARLINE_TIMING_LAZER_EPSILON) {
      if (iterations++ >= BARLINE_TIMING_MAX_EVENTS) {
        truncated = true;
        break;
      }

      const roundedTime = roundBarlineTimeAwayFromZero(time);
      if (
        Math.abs(time - roundedTime) <=
        BARLINE_TIMING_LAZER_EPSILON
      ) {
        time = roundedTime;
      }

      events.push({
        client: "lazer",
        time,
        rawTime: time,
        sectionIndex,
        sectionTime: section.time,
        source: candidateIndex === 0
          ? "section-start"
          : "repeated-addition"
      });

      time += measureLength;
      candidateIndex++;
    }

    if (truncated) break;
  }

  return { events, truncated };
}

function getBarlineMeasureLength(redLine) {
  return redLine.beatLength * redLine.meter;
}

function roundBarlineTimeAwayFromZero(value) {
  if (value < 0) {
    return -Math.round(-value);
  }

  return Math.round(value);
}
