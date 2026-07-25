const BARLINE_SCROLL_BASE_PX_PER_BEAT = 175;
const BARLINE_SCROLL_SPEED_EPSILON = 1e-6;
const BARLINE_ISSUE_TIME_EPSILON = 1e-7;
const BARLINE_DOUBLE_MAX_GAP_MS = 1;

function runBarlineCheck(text, fileName) {
  const timelines = buildBarlineTimelines(text);
  const redLines = timelines.redLines;
  const greenLines = parseSpreadGreenLines(text);
  const noteTimes = new Set(parseSpreadCircleNoteTimes(text));
  const sliderMultiplier = parseSpreadDifficulty(text).sliderMultiplier;

  const issues = detectBarlineIssues(
    timelines,
    greenLines,
    noteTimes,
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
  noteTimes,
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
      noteTimes,
      sliderMultiplier
    ),
    detectClientBarlineIssues(
      "lazer",
      timelines.lazer.events,
      timelines.redLines,
      greenLines,
      noteTimes,
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
        normalizeBarlineIssueTime(issue.barlineTime),
        issue.noteTime
      ].join("|")
    ),
    intentionalDetachedBarlines: mergeBarlineClientIssues(
      perClient.flatMap(result => result.intentionalDetachedBarlines),
      issue => [
        normalizeBarlineIssueTime(issue.barlineTime),
        issue.noteTime
      ].join("|")
    )
  };
}

function detectClientBarlineIssues(
  client,
  events,
  redLines,
  greenLines,
  noteTimes,
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

  for (const barlineTime of getUniqueBarlineEventTimes(events)) {
    const firstCandidate = Math.floor(barlineTime) - 1;
    const lastCandidate = Math.ceil(barlineTime) + 1;

    for (
      let noteTime = firstCandidate;
      noteTime <= lastCandidate;
      noteTime++
    ) {
      if (!noteTimes.has(noteTime)) continue;

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

      addDetachedBarlineIssue(
        target,
        redLines,
        greenLines,
        sliderMultiplier,
        barlineTime,
        noteTime,
        redLineAtBarline || redLineAtNote,
        client
      );
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

function getUniqueBarlineEventTimes(events) {
  const times = events
    .map(event => event.time)
    .filter(time => Number.isFinite(time))
    .sort((a, b) => a - b);
  const unique = [];

  for (const time of times) {
    const previous = unique[unique.length - 1];
    if (
      previous === undefined ||
      Math.abs(previous - time) > BARLINE_ISSUE_TIME_EPSILON
    ) {
      unique.push(time);
    }
  }

  return unique;
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

function addDetachedBarlineIssue(
  detachedBarlines,
  redLines,
  greenLines,
  sliderMultiplier,
  barlineTime,
  noteTime,
  redLine,
  client
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
    barlineSpeed,
    noteSpeed,
    delta: noteSpeed - barlineSpeed,
    redLine,
    clients: [client]
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
