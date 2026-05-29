const TIMELINE_SNAP_CANDIDATES = [1, 2, 3, 4, 6, 8, 12, 16, 24, 48];
const TIMELINE_MIN_SNAP = 4;
const TIMELINE_SNAP_TOLERANCE_MS = 2;

function runTimelineCheck(sources, options = {}) {
  if (!sources || !sources.length) {
    return {
      measures: [],
      unsupportedCount: 0
    };
  }

  const rawDiffs = sources.map(source => ({
    fileName: source.fileName,
    text: source.text,
    objects: parseTimelineObjects(source.text),
    redLines: parseTimelineRedLines(source.text),
    kiaiRanges: parseTimelineKiaiRanges(source.text)
  }));

  const diffs = sortTimelineDiffs(rawDiffs, options.diffOrder ?? []);

  const allObjects = diffs.flatMap(diff => diff.objects);
  if (!allObjects.length) {
    return {
      measures: [],
      unsupportedCount: 0
    };
  }

  const minTime = Math.min(...allObjects.map(obj => obj.time));
  const maxTime = Math.max(...allObjects.map(obj => obj.time));

  const baseRedLines = diffs[0].redLines;
  const measures = buildTimelineMeasures(baseRedLines, minTime, maxTime);

  for (const measure of measures) {
    const measureObjects = diffs.flatMap(diff =>
      diff.objects.filter(obj => {
        const end = obj.tailTime ?? obj.time;
        return obj.time < measure.end && end >= measure.start;
      })
    );

    const snap = chooseTimelineSnap(measure, measureObjects);

    measure.supported = snap !== null;
    measure.snap = snap ?? TIMELINE_MIN_SNAP;
    measure.displaySnap = Math.max(TIMELINE_MIN_SNAP, measure.snap);
    measure.resolution = measure.displaySnap * measure.meter;
  }

  let unsupportedCount = 0;

  const resultMeasures = measures.map(measure => {
    const rows = diffs.map(diff => {
      const row = buildTimelineMeasureRow(diff, measure);

      if (!row.supported) {
        unsupportedCount++;
      }

      return row;
    });

    return {
      start: measure.start,
      end: measure.end,
      snap: measure.snap,
      displaySnap: measure.displaySnap,
      resolution: measure.resolution,
      rows
    };
  });

  return {
    measures: resultMeasures,
    unsupportedCount
  };
}

function parseTimelineObjects(text) {
  const hitObjects = parseHitObjects(text);
  const redTimingPoints = parseTimingPoints(text);
  const inheritedTimingPoints = parseInheritedTimingPoints(text);
  const sliderMultiplier = parseTimelineSliderMultiplier(text);

  return hitObjects
    .map(line => parseTimelineHitObject(
      line,
      redTimingPoints,
      inheritedTimingPoints,
      sliderMultiplier
    ))
    .filter(Boolean);
}

function parseTimelineHitObject(line, redTimingPoints, inheritedTimingPoints, sliderMultiplier) {
  const parts = line.split(",");
  if (parts.length < 5) return null;

  const time = parseInt(parts[2], 10);
  const type = parseInt(parts[3], 10);
  const hitSound = parseInt(parts[4], 10) || 0;

  if (Number.isNaN(time) || Number.isNaN(type)) return null;

  if ((type & 1) !== 0) {
    return {
      time,
      kind: getTimelineCircleKind(hitSound),
      tailTime: null
    };
  }

  if ((type & 2) !== 0) {
    return {
      time,
      kind: "slider",
      tailTime: calculateTimelineSliderEndTime(
        parts,
        time,
        redTimingPoints,
        inheritedTimingPoints,
        sliderMultiplier
      )
    };
  }

  if ((type & 8) !== 0) {
    const endTime = parseInt(parts[5], 10);

    return {
      time,
      kind: "spinner",
      tailTime: Number.isNaN(endTime) ? null : endTime
    };
  }

  return null;
}
function getTimelineCircleKind(hitSound) {
  const hasWhistle = (hitSound & 2) !== 0;
  const hasFinish = (hitSound & 4) !== 0;
  const hasClap = (hitSound & 8) !== 0;

  const isKat = hasWhistle || hasClap;

  if (isKat && hasFinish) return "K";
  if (isKat) return "k";
  if (hasFinish) return "D";
  return "d";
}

function buildTimelineMeasures(redLines, minTime, maxTime) {
  if (!redLines.length) return [];

  const measures = [];

  for (let i = 0; i < redLines.length; i++) {
    const red = redLines[i];
    const nextRed = redLines[i + 1];

    const startLimit = Math.max(red.time, minTime - 1);
    const endLimit = nextRed ? nextRed.time : maxTime + red.beatLength * 4;

    const beatLength = red.beatLength;
    const meter = red.meter || 4;
    const measureLength = beatLength * meter;

    if (!Number.isFinite(measureLength) || measureLength <= 0) continue;

    let start = red.time;

    while (start < endLimit && start <= maxTime) {
      const rawEnd = start + measureLength;
      const end = Math.min(rawEnd, endLimit);

      if (end >= minTime && end > start) {
        measures.push({
          start: Math.round(start),
          end: Math.round(end),
          beatLength,
          meter,
          partial: end < rawEnd
        });
      }

      start = rawEnd;
    }
  }

  return measures;
}

function buildTimelineMeasureRow(diff, measure) {
  const objects = diff.objects.filter(obj => {
    const end = obj.tailTime ?? obj.time;

    return (
      obj.time < measure.end - TIMELINE_SNAP_TOLERANCE_MS &&
      end >= measure.start - TIMELINE_SNAP_TOLERANCE_MS
    );
  });

  const resolution = measure.resolution;

  const chars = Array(resolution).fill("-");

  for (const obj of objects) {

    // slider / spinner
    if (obj.kind === "slider" || obj.kind === "spinner") {

      if (obj.tailTime === null || obj.tailTime === undefined) {
        continue;
      }

      const startPlacement = getTimelineSnapPlacement(
        Math.max(obj.time, measure.start),
        measure
      );

      const endPlacement = getTimelineSnapPlacement(
        Math.min(obj.tailTime, measure.end),
        measure
      );

      if (!startPlacement.supported || !endPlacement.supported) {
        return {
          fileName: diff.fileName,
          supported: false,
          cells: []
        };
      }

      const startIndex = Math.max(
        0,
        Math.min(
          resolution - 1,
          startPlacement.index
        )
      );

      const endIndex = Math.max(
        0,
        Math.min(
          resolution - 1,
          endPlacement.index
        )
      );

      for (let i = startIndex; i <= endIndex; i++) {
        chars[i] = obj.kind;
      }

      continue;
    }

    // normal notes
    const placement = getTimelineSnapPlacement(
      obj.time,
      measure
    );

    if (!placement.supported) {
      return {
        fileName: diff.fileName,
        supported: false,
        cells: []
      };
    }

    const index = Math.max(
      0,
      Math.min(
        resolution - 1,
        placement.index
      )
    );

    chars[index] = obj.kind;
  }

  return {
    fileName: diff.fileName,
    supported: true,
    cells: chars.map((kind, index) => ({
      kind: kind === "-" ? null : kind,
      kiai: isTimelineCellInKiai(diff.kiaiRanges, measure, index)
    }))
  };
}

function getTimelineSnapPlacement(time, measure) {
  const cellLength = measure.beatLength / measure.displaySnap;

  if (!Number.isFinite(cellLength) || cellLength <= 0) {
    return {
      supported: false,
      index: -1
    };
  }

  const position = (time - measure.start) / cellLength;
  const index = Math.round(position);
  const diffMs = Math.abs(position - index) * cellLength;

  if (diffMs > TIMELINE_SNAP_TOLERANCE_MS) {
    return {
      supported: false,
      index: -1
    };
  }

  return {
    supported: true,
    index
  };
}

function parseTimelineRedLines(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const redLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = parseFloat(parts[0]);
      const beatLength = parseFloat(parts[1]);
      const meter = parseInt(parts[2], 10);
      const uninherited = parseInt(parts[6], 10);

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
        meter: Number.isFinite(meter) && meter > 0 ? meter : 4
      });
    }
  }

  redLines.sort((a, b) => a.time - b.time);
  return redLines;
}

/** 1/6と1/8同時に存在する時用 */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }

  return a;
}

function lcm(a, b) {
  if (!a || !b) return Math.max(a, b);
  return Math.abs(a * b) / gcd(a, b);
}

function lcmArray(values) {
  const filtered = values.filter(v => Number.isFinite(v) && v > 0);

  if (!filtered.length) {
    return TIMELINE_MIN_RESOLUTION;
  }

  return filtered.reduce((acc, v) => lcm(acc, v), 1);
}

function sortTimelineDiffs(diffs, diffOrder = []) {
  if (diffOrder && diffOrder.length) {
    const orderMap = new Map(
      diffOrder.map((fileName, index) => [fileName, index])
    );

    return [...diffs].sort((a, b) => {
      const ai = orderMap.has(a.fileName) ? orderMap.get(a.fileName) : 9999;
      const bi = orderMap.has(b.fileName) ? orderMap.get(b.fileName) : 9999;

      if (ai !== bi) return ai - bi;

      return getDifficultyNameText(a.fileName)
        .localeCompare(getDifficultyNameText(b.fileName));
    });
  }

  return [...diffs].sort((a, b) => {
    const an = a.objects?.length ?? 0;
    const bn = b.objects?.length ?? 0;

    if (an !== bn) return an - bn;

    return getDifficultyNameText(a.fileName)
      .localeCompare(getDifficultyNameText(b.fileName));
  });
}

function parseTimelineSliderMultiplier(text) {
  const lines = text.split(/\r?\n/);
  let inDifficulty = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Difficulty]") {
      inDifficulty = true;
      continue;
    }

    if (inDifficulty) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("SliderMultiplier:")) {
        const value = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
        return Number.isFinite(value) ? value : 1.4;
      }
    }
  }

  return 1.4;
}

function calculateTimelineSliderEndTime(parts, time, redTimingPoints, inheritedTimingPoints, sliderMultiplier) {
  const repeatCount = parseInt(parts[6], 10) || 1;
  const pixelLength = parseFloat(parts[7]);

  if (!Number.isFinite(pixelLength)) return null;

  const red = findTimelineCurrentTimingPoint(redTimingPoints, time);
  if (!red || !Number.isFinite(red.beatLength) || red.beatLength <= 0) return null;

  const inherited = findTimelineCurrentInheritedTimingPoint(
    inheritedTimingPoints,
    time,
    red.time
  );
  const svMultiplier = inherited ? -100 / inherited.beatLength : 1;

  if (!Number.isFinite(svMultiplier) || svMultiplier <= 0) return null;

  const duration =
    (pixelLength * repeatCount * red.beatLength) /
    (sliderMultiplier * 100 * svMultiplier);

  return Math.round(time + duration);
}

function findTimelineCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function findTimelineCurrentInheritedTimingPoint(timingPoints, time, redTime) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time > time) continue;
    if (timingPoints[i].time < redTime) return null;
    return timingPoints[i];
  }

  return null;
}

function chooseTimelineSnap(measure, objects) {
  for (const snap of TIMELINE_SNAP_CANDIDATES) {
    const cellLength = measure.beatLength / snap;

    const ok = objects.every(obj => {
      if (!isTimelineTimeOnGrid(obj.time, measure, cellLength)) {
        return false;
      }

      if (
        (obj.kind === "slider" || obj.kind === "spinner") &&
        obj.tailTime !== null &&
        obj.tailTime !== undefined
      ) {
        return isTimelineTimeOnGrid(obj.tailTime, measure, cellLength);
      }

      return true;
    });

    if (ok) return snap;
  }

  return null;
}

function isTimelineTimeOnGrid(time, measure, cellLength) {
  const position = (time - measure.start) / cellLength;
  const nearest = Math.round(position);
  return Math.abs(position - nearest) * cellLength <= TIMELINE_SNAP_TOLERANCE_MS;
}

/** kiaiを背景色表示するための機能 */
function parseTimelineKiaiRanges(text) {
  const lines = text.split(/\r?\n/);
  const points = [];

  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 8) continue;

      const time = parseFloat(parts[0]);
      const effects = parseInt(parts[7], 10);

      if (!Number.isFinite(time) || Number.isNaN(effects)) continue;

      points.push({
        time,
        kiai: (effects & 1) !== 0
      });
    }
  }

  points.sort((a, b) => a.time - b.time);

  const ranges = [];

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];
    const next = points[i + 1];

    if (!cur.kiai) continue;

    ranges.push({
      start: cur.time,
      end: next ? next.time : Infinity
    });
  }

  return ranges;
}

function isTimelineCellInKiai(kiaiRanges, measure, index) {
  if (!kiaiRanges || !kiaiRanges.length) return false;

  const cellLength = measure.beatLength / measure.displaySnap;
  const cellStart = measure.start + index * cellLength;

  return kiaiRanges.some(range =>
    cellStart >= range.start - TIMELINE_SNAP_TOLERANCE_MS &&
    cellStart < range.end - TIMELINE_SNAP_TOLERANCE_MS
  );
}
