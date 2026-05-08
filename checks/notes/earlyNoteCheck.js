const EARLY_NOTE_VISIBLE_TIME_BASE = 253440;

function runEarlyNoteCheck(text, fileName) {
  const timingPoints = parseTimingPoints(text);
  const svLines = parseInheritedTimingPoints(text);
  const hitObjects = parseHitObjects(text);

  const firstCircleTime = findFirstCircleTime(hitObjects);

  if (firstCircleTime === null) {
    return {
      fileName,
      level: "none",
      firstHitTime: null,
      bpm: null,
      sv: null,
      visibleTime: null,
      positionPercent: null
    };
  }

  const red = findEarlyNoteCurrentTimingPoint(timingPoints, firstCircleTime);
  if (!red || !Number.isFinite(red.beatLength) || red.beatLength <= 0) {
    return {
      fileName,
      level: "error",
      reason: "firstNoteBeforeFirstRedLine",
      firstHitTime: firstCircleTime,
      bpm: null,
      sv: null,
      visibleTime: null,
      positionPercent: null
    };
  }

  const bpm = 60000 / red.beatLength;
  const sv = getEarlyNoteCurrentSv(svLines, firstCircleTime);
  const visibleTime = EARLY_NOTE_VISIBLE_TIME_BASE / (bpm * sv);

  const positionPercent = (firstCircleTime / visibleTime) * 100;

  let level = "ok";

  if (firstCircleTime <= visibleTime / 4) {
    level = "error";
  } else if (firstCircleTime <= visibleTime / 2) {
    level = "warn";
  }

  return {
    fileName,
    level,
    firstHitTime: firstCircleTime,
    bpm,
    sv,
    visibleTime,
    positionPercent
  };
}

function findFirstCircleTime(hitObjects) {
  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);

    if (Number.isNaN(time) || Number.isNaN(type)) continue;

    if ((type & 1) !== 0) {
      return time;
    }
  }

  return null;
}

function findEarlyNoteCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function getEarlyNoteCurrentSv(svLines, time) {
  let current = null;

  for (const svLine of svLines) {
    if (svLine.time <= time) {
      current = svLine;
    } else {
      break;
    }
  }

  if (!current || current.beatLength === 0) return 1;

  const sv = -100 / current.beatLength;

  return Number.isFinite(sv) && sv > 0 ? sv : 1;
}