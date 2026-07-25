const BARLINE_SCROLL_BASE_PX_PER_BEAT = 175;
const BARLINE_SCROLL_SPEED_EPSILON = 1e-6;
const BARLINE_ISSUE_TIME_EPSILON = 1e-7;
const BARLINE_DOUBLE_MAX_GAP_MS = 1;

function runBarlineCheck(text, fileName) {
  const timelines = buildBarlineTimelines(text);
  const redLines = timelines.redLines;
  const greenLines = parseSpreadGreenLines(text);
  const scrollObjects = parseSpreadScrollObjects(text);
  const sliderMultiplier = parseSpreadDifficulty(text).sliderMultiplier;

  const issues = detectBarlineIssues(
    timelines,
    greenLines,
    scrollObjects,
    sliderMultiplier
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
  return parseBarlineTimingRedLines(text);
}

function detectBarlineIssues(
  timelines,
  greenLines,
  scrollObjects,
  sliderMultiplier
) {
  const empty = {
    doubleBarlines: [],
    negativeStartBarlineWarnings: [],
    detachedBarlines: [],
    intentionalDetachedBarlines: []
  };

  if (!timelines.redLines.length) {
    return empty;
  }

  const perClient = [
    detectClientBarlineIssues(
      "stable",
      timelines.stable.events,
      timelines.redLines,
      greenLines,
      scrollObjects,
      sliderMultiplier
    ),
    detectClientBarlineIssues(
      "lazer",
      timelines.lazer.events,
      timelines.redLines,
      greenLines,
      scrollObjects,
      sliderMultiplier
    )
  ];

  return {
    doubleBarlines: mergeBarlineClientIssues(
      perClient.flatMap(result => result.doubleBarlines),
      issue => [
        normalizeBarlineIssueTime(issue.barlineTime),
        normalizeBarlineIssueTime(issue.redLineTime)
      ].join("|")
    ),
    negativeStartBarlineWarnings:
      detectNegativeStartBarlineWarnings(timelines),
    detachedBarlines: mergeBarlineClientIssues(
      perClient.flatMap(result => result.detachedBarlines),
      issue => [
        issue.barlineTime,
        issue.noteTime,
        issue.objectType,
        normalizeBarlineIssueSpeed(issue.barlineSpeed),
        normalizeBarlineIssueSpeed(issue.noteSpeed)
      ].join("|")
    ),
    intentionalDetachedBarlines: mergeBarlineClientIssues(
      perClient.flatMap(result => result.intentionalDetachedBarlines),
      issue => [
        issue.barlineTime,
        issue.noteTime,
        issue.objectType,
        normalizeBarlineIssueSpeed(issue.barlineSpeed),
        normalizeBarlineIssueSpeed(issue.noteSpeed)
      ].join("|")
    )
  };
}

function detectClientBarlineIssues(
  client,
  events,
  redLines,
  greenLines,
  scrollObjects,
  sliderMultiplier
) {
  const doubleBarlines = detectClientDoubleBarlines(events, client);
  const detachedBarlines = [];
  const intentionalDetachedBarlines = [];
  const greenLineTimes = new Set(
    greenLines
      .map(line => line.time)
      .filter(time => Number.isFinite(time))
  );
  const objectsByTime = new Map();

  for (const object of scrollObjects) {
    if (!Number.isFinite(object.time)) continue;

    if (!objectsByTime.has(object.time)) {
      objectsByTime.set(object.time, []);
    }
    objectsByTime.get(object.time).push(object);
  }

  for (
    const barline of getUniqueBarlineComparisonTimes(events)
  ) {
    const barlineTime = barline.time;
    const firstCandidate = barlineTime - 1;
    const lastCandidate = barlineTime + 1;

    for (
      let noteTime = firstCandidate;
      noteTime <= lastCandidate;
      noteTime++
    ) {
      const objectsAtTime = objectsByTime.get(noteTime);
      if (!objectsAtTime?.length) continue;

      const gap = Math.abs(noteTime - barlineTime);
      if (
        gap <= BARLINE_ISSUE_TIME_EPSILON ||
        gap > BARLINE_DOUBLE_MAX_GAP_MS + BARLINE_ISSUE_TIME_EPSILON
      ) {
        continue;
      }

      const redLineAtBarline = findBarlineRedLineNearTime(
        redLines,
        barlineTime
      );
      const redLineAtNote = findBarlineRedLineNearTime(redLines, noteTime);
      const target = redLineAtBarline || redLineAtNote
        ? detachedBarlines
        : intentionalDetachedBarlines;

      if (
        target === intentionalDetachedBarlines &&
        noteTime > barlineTime &&
        !greenLineTimes.has(noteTime)
      ) {
        continue;
      }

      for (const object of objectsAtTime) {
        addDetachedBarlineIssue(
          target,
          redLines,
          greenLines,
          sliderMultiplier,
          barlineTime,
          noteTime,
          object.objectType,
          redLineAtBarline || redLineAtNote,
          client,
          barline.rawTimes
        );
      }
    }
  }

  return {
    doubleBarlines,
    detachedBarlines,
    intentionalDetachedBarlines
  };
}

function detectClientDoubleBarlines(events, client) {
  const sortedEvents = events
    .filter(event => Number.isFinite(event.time))
    .slice()
    .sort((a, b) =>
      a.time - b.time ||
      a.sectionIndex - b.sectionIndex
    );
  const issues = [];
  const seen = new Set();

  for (let i = 0; i < sortedEvents.length; i++) {
    const first = sortedEvents[i];

    for (let j = i + 1; j < sortedEvents.length; j++) {
      const second = sortedEvents[j];
      const gap = second.time - first.time;

      if (
        gap >
        BARLINE_DOUBLE_MAX_GAP_MS + BARLINE_ISSUE_TIME_EPSILON
      ) {
        break;
      }

      if (first.sectionIndex === second.sectionIndex) continue;

      const key = [
        normalizeBarlineIssueTime(first.time),
        normalizeBarlineIssueTime(second.time)
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const count = sortedEvents.filter(event =>
        event.time >= first.time - BARLINE_ISSUE_TIME_EPSILON &&
        event.time <= second.time + BARLINE_ISSUE_TIME_EPSILON
      ).length;

      issues.push({
        barlineTime: first.time,
        redLineTime: second.time,
        gap,
        count,
        clients: [client],
        clientCounts: { [client]: count }
      });
    }
  }

  return issues;
}

function detectNegativeStartBarlineWarnings(timelines) {
  const redLines = timelines.redLines;
  if (redLines.length < 2) return [];

  const firstRedLine = redLines[0];
  const nextRedLine = redLines[1];
  const initialCandidate = timelines.stable.initialCandidate;

  if (
    firstRedLine.time >= 0 ||
    !Number.isFinite(initialCandidate) ||
    initialCandidate < nextRedLine.time
  ) {
    return [];
  }

  return [{
    firstRedLineTime: firstRedLine.time,
    generatedBarlineTime: Math.trunc(initialCandidate),
    rawGeneratedBarlineTime: initialCandidate,
    nextRedLineTime: nextRedLine.time,
    nextRedLine,
    clients: ["stable"],
    stableLazerMessageKey: nextRedLine.omitFirstBarline
      ? "barlineNegativeStartStableSingleLazerMissing"
      : "barlineNegativeStartStableDoubleLazerSingle"
  }];
}

function getUniqueBarlineComparisonTimes(events) {
  const byTime = new Map();

  for (const event of events) {
    if (!Number.isFinite(event.time)) continue;

    const time = Math.trunc(event.time);
    if (!byTime.has(time)) {
      byTime.set(time, []);
    }
    byTime.get(time).push(event.time);
  }

  return [...byTime.entries()]
    .map(([time, rawTimes]) => ({
      time,
      rawTimes
    }))
    .sort((a, b) => a.time - b.time);
}

function findBarlineRedLineNearTime(redLines, time) {
  return redLines.find(redLine =>
    Math.abs(redLine.time - time) <= BARLINE_ISSUE_TIME_EPSILON
  ) ?? null;
}

function mergeBarlineClientIssues(issues, keyBuilder) {
  const merged = new Map();

  for (const issue of issues) {
    const key = keyBuilder(issue);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...issue,
        clients: [...issue.clients],
        clientCounts: issue.clientCounts
          ? { ...issue.clientCounts }
          : undefined,
        rawBarlineTimes: issue.rawBarlineTimes
          ? { ...issue.rawBarlineTimes }
          : undefined
      });
      continue;
    }

    for (const client of issue.clients) {
      if (!existing.clients.includes(client)) {
        existing.clients.push(client);
      }
    }

    if (issue.clientCounts) {
      existing.clientCounts = {
        ...(existing.clientCounts ?? {}),
        ...issue.clientCounts
      };
    }

    if (issue.rawBarlineTimes) {
      existing.rawBarlineTimes = {
        ...(existing.rawBarlineTimes ?? {}),
        ...issue.rawBarlineTimes
      };
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
      (a.barlineTime ?? a.nextRedLineTime) -
      (b.barlineTime ?? b.nextRedLineTime)
    );
}

function normalizeBarlineIssueTime(time) {
  return Math.round(time / BARLINE_ISSUE_TIME_EPSILON);
}

function normalizeBarlineIssueSpeed(speed) {
  return Math.round(speed / BARLINE_SCROLL_SPEED_EPSILON);
}

function addDetachedBarlineIssue(
  detachedBarlines,
  redLines,
  greenLines,
  sliderMultiplier,
  barlineTime,
  noteTime,
  objectType,
  redLine,
  client,
  rawBarlineTimes
) {
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
    noteTime
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
    objectType,
    barlineSpeed,
    noteSpeed,
    delta: noteSpeed - barlineSpeed,
    redLine,
    clients: [client],
    rawBarlineTimes: {
      [client]: [...rawBarlineTimes]
    }
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
