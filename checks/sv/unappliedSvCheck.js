const UNAPPLIED_SV_MIN_OFFSET_MS = 1;
const UNAPPLIED_SV_MAX_OFFSET_MS = 5;
const UNAPPLIED_SV_DISPLAY_PRECISION = 1000;

function runUnappliedSvCheck(text, fileName) {
  const timelines = buildBarlineTimelines(text);
  const redLines = timelines.redLines;
  const greenLines = parseSpreadGreenLines(text);
  const greenLinesByTime = groupUnappliedSvGreenLinesByTime(greenLines);
  const noteTimes = parseSpreadCircleNoteTimes(text);
  const stableBarlineIssues = detectUnappliedSvBarlineIssues(
    timelines.stable.events,
    "stable",
    greenLines,
    redLines
  );
  const lazerBarlineIssues = detectUnappliedSvBarlineIssues(
    timelines.lazer.events,
    "lazer",
    greenLines,
    redLines
  );

  return {
    fileName,
    noteIssues: detectUnappliedSvTargetIssues(noteTimes, greenLines, greenLinesByTime, redLines, "note"),
    barlineIssues: mergeUnappliedSvBarlineIssues([
      ...stableBarlineIssues,
      ...lazerBarlineIssues
    ])
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

        if (!hasUnappliedSvDisplayDelta(targetGreenLine, greenLine)) {
          continue;
        }

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

function hasUnappliedSvDisplayDelta(targetGreenLine, followingGreenLine) {
  const targetSv = getUnappliedSvValue(targetGreenLine);
  const followingSv = getUnappliedSvValue(followingGreenLine);

  return Math.round(
    (followingSv - targetSv) * UNAPPLIED_SV_DISPLAY_PRECISION
  ) !== 0;
}

function getUnappliedSvValue(greenLine) {
  if (!greenLine || !Number.isFinite(greenLine.sv)) return 1;
  return greenLine.sv;
}

function getUnappliedSvCurrentGreenLine(greenLines, redLines, targetTime) {
  const redLine = getCurrentSpreadTimingPoint(redLines, targetTime);
  const redTime = redLine ? redLine.time : Number.NEGATIVE_INFINITY;
  return getCurrentSpreadInheritedTimingPoint(greenLines, targetTime, redTime);
}

function buildUnappliedSvBarlineTimes(text) {
  const timelines = buildBarlineTimelines(text);
  return {
    stable: getUniqueUnappliedSvBarlineTimes(timelines.stable.events),
    lazer: getUniqueUnappliedSvBarlineTimes(timelines.lazer.events)
  };
}

function detectUnappliedSvBarlineIssues(
  events,
  client,
  greenLines,
  redLines
) {
  const issues = [];
  const seen = new Set();
  const targetTimes = getUniqueUnappliedSvBarlineTimes(events);

  for (const targetTime of targetTimes) {
    const targetGreenLine = getUnappliedSvCurrentGreenLine(
      greenLines,
      redLines,
      targetTime
    );

    for (const greenLine of greenLines) {
      const offset = greenLine.time - targetTime;
      if (offset < UNAPPLIED_SV_MIN_OFFSET_MS - BARLINE_TIMING_LAZER_EPSILON) {
        continue;
      }
      if (offset > UNAPPLIED_SV_MAX_OFFSET_MS + BARLINE_TIMING_LAZER_EPSILON) {
        break;
      }

      const key = [
        client,
        normalizeUnappliedSvBarlineTime(targetTime),
        greenLine.time,
        greenLine.beatLength
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      if (!hasUnappliedSvDisplayDelta(targetGreenLine, greenLine)) {
        continue;
      }

      issues.push({
        targetType: "barline",
        targetTime,
        greenTime: greenLine.time,
        offset,
        targetGreenLine,
        greenLine,
        clients: [client]
      });
    }
  }

  return issues;
}

function getUniqueUnappliedSvBarlineTimes(events) {
  const times = events
    .map(event => event.time)
    .filter(time => Number.isFinite(time))
    .sort((a, b) => a - b);
  const unique = [];

  for (const time of times) {
    const previous = unique[unique.length - 1];
    if (
      previous === undefined ||
      Math.abs(previous - time) > BARLINE_TIMING_LAZER_EPSILON
    ) {
      unique.push(time);
    }
  }

  return unique;
}

function mergeUnappliedSvBarlineIssues(issues) {
  const merged = new Map();

  for (const issue of issues) {
    const key = [
      normalizeUnappliedSvBarlineTime(issue.targetTime),
      issue.greenTime,
      issue.greenLine.beatLength
    ].join("|");
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...issue,
        clients: [...issue.clients]
      });
      continue;
    }

    for (const client of issue.clients) {
      if (!existing.clients.includes(client)) {
        existing.clients.push(client);
      }
    }
  }

  const clientOrder = { stable: 0, lazer: 1 };
  return [...merged.values()]
    .map(issue => ({
      ...issue,
      clients: issue.clients.sort((a, b) =>
        clientOrder[a] - clientOrder[b]
      )
    }))
    .sort((a, b) =>
      a.targetTime - b.targetTime ||
      a.greenTime - b.greenTime
    );
}

function normalizeUnappliedSvBarlineTime(time) {
  return Math.round(time / BARLINE_TIMING_LAZER_EPSILON);
}
