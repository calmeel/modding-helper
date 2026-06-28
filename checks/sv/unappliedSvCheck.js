const UNAPPLIED_SV_MIN_OFFSET_MS = 1;
const UNAPPLIED_SV_MAX_OFFSET_MS = 5;

function runUnappliedSvCheck(text, fileName) {
  const redLines = parseSpreadRedLines(text);
  const greenLines = parseSpreadGreenLines(text);
  const greenLinesByTime = groupUnappliedSvGreenLinesByTime(greenLines);
  const noteTimes = parseSpreadCircleNoteTimes(text);
  const barlineTimes = buildUnappliedSvBarlineTimes(text);

  return {
    fileName,
    noteIssues: detectUnappliedSvTargetIssues(noteTimes, greenLines, greenLinesByTime, redLines, "note"),
    barlineIssues: detectUnappliedSvTargetIssues(barlineTimes, greenLines, greenLinesByTime, redLines, "barline")
  };
}

function groupUnappliedSvGreenLinesByTime(greenLines) {
  const groups = new Map();

  for (const greenLine of greenLines) {
    if (!Number.isFinite(greenLine.time)) continue;

    if (!groups.has(greenLine.time)) {
      groups.set(greenLine.time, []);
    }

    groups.get(greenLine.time).push(greenLine);
  }

  return groups;
}

function detectUnappliedSvTargetIssues(targetTimes, greenLines, greenLinesByTime, redLines, targetType) {
  const issues = [];
  const seen = new Set();

  for (const targetTime of targetTimes) {
    if (!Number.isFinite(targetTime)) continue;

    const targetGreenLine = getUnappliedSvCurrentGreenLine(greenLines, redLines, targetTime);

    for (
      let offset = UNAPPLIED_SV_MIN_OFFSET_MS;
      offset <= UNAPPLIED_SV_MAX_OFFSET_MS;
      offset++
    ) {
      const greenTime = targetTime + offset;
      const greenLinesAtOffset = greenLinesByTime.get(greenTime);
      if (!greenLinesAtOffset?.length) continue;

      for (const greenLine of greenLinesAtOffset) {
        const key = `${targetType}|${targetTime}|${greenTime}|${greenLine.beatLength}`;
        if (seen.has(key)) continue;
        seen.add(key);

        issues.push({
          targetType,
          targetTime,
          greenTime,
          offset,
          targetGreenLine,
          greenLine
        });
      }
    }
  }

  issues.sort((a, b) => {
    if (a.targetTime !== b.targetTime) return a.targetTime - b.targetTime;
    if (a.greenTime !== b.greenTime) return a.greenTime - b.greenTime;
    return a.offset - b.offset;
  });

  return issues;
}

function getUnappliedSvCurrentGreenLine(greenLines, redLines, targetTime) {
  const redLine = getCurrentSpreadTimingPoint(redLines, targetTime);
  const redTime = redLine ? redLine.time : Number.NEGATIVE_INFINITY;
  return getCurrentSpreadInheritedTimingPoint(greenLines, targetTime, redTime);
}

function buildUnappliedSvBarlineTimes(text) {
  const redLines = parseBarlineRedLines(text);
  const barlineTimes = [];
  const omittedFirstBarlineTimes = new Set(
    redLines
      .filter(redLine => redLine.omitFirstBarline)
      .map(redLine => redLine.time)
  );
  const lastHitObjectTime = getLastHitObjectTime(text);

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
      rawBarlineTime < sectionEnd - 1e-6;
      rawBarlineTime += measureLength
    ) {
      const barlineTime = Math.floor(rawBarlineTime);
      if (
        Number.isFinite(barlineTime) &&
        !omittedFirstBarlineTimes.has(barlineTime)
      ) {
        barlineTimes.push(barlineTime);
      }
    }
  }

  return [...new Set(barlineTimes)].sort((a, b) => a - b);
}
