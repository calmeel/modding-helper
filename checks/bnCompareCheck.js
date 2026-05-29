const BN_NOTE_MOVE_TOLERANCE_MS = 2;

async function readBnOszFile(file) {
  if (!file) return [];

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".osz")) {
    throw new Error("invalidBnOszFile");
  }

  const zip = await loadOszZip(file);

  const osuFiles = Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith(".osu"));

  const diffs = [];

  for (let i = 0; i < osuFiles.length; i++) {
    const entry = osuFiles[i];
    const text = await entry.async("text");

    diffs.push({
      id: `diff-${i}`,
      fileName: entry.name,
      diffName: getDifficultyNameText(entry.name),
      text,
      mode: parseMode(text)
    });
  }

  return diffs;
}

function runBnCompare(beforeDiff, afterDiff, options = {}) {
  const offsetMs = options.offsetMs ?? 0;
  const svChangeThreshold = options.svChangeThreshold ?? "all";

  return {
    pairId: `${beforeDiff.id}__${afterDiff.id}`,
    label: `${beforeDiff.diffName} → ${afterDiff.diffName}`,
    beforeFileName: beforeDiff.fileName,
    afterFileName: afterDiff.fileName,
    offsetMs,
    notes: compareBnNotes(beforeDiff.text, afterDiff.text, { offsetMs }),
    timeline: compareBnTimeline(beforeDiff.text, afterDiff.text, { offsetMs }),
    timing: compareBnTimingPoints(beforeDiff.text, afterDiff.text, {
      offsetMs,
      svChangeThreshold
    }),
    metadata: compareBnMetadata(beforeDiff.text, afterDiff.text),
    difficulty: compareBnDifficulty(beforeDiff.text, afterDiff.text)
  };
}

function compareBnNotes(beforeText, afterText, options = {}) {
  const offsetMs = options.offsetMs ?? 0;

  const beforeObjects = parseBnHitObjects(beforeText);
  const afterObjects = parseBnHitObjects(afterText, offsetMs);

  const results = [];
  const usedAfter = new Set();

  for (const beforeObj of beforeObjects) {
    const matchIndex = findMatchingBnObject(beforeObj, afterObjects, usedAfter);

    if (matchIndex === -1) {
      results.push({
        type: "deleted",
        time: beforeObj.time,
        object: beforeObj
      });
      continue;
    }

    usedAfter.add(matchIndex);
    const afterObj = afterObjects[matchIndex];

    // ±1ms以内のノーツ本体移動は、実質同一扱いとして表示しない
    // tailMoved は別で表示する

    if (beforeObj.kind !== afterObj.kind) {
      results.push({
        type: "changed",
        time: afterObj.time,
        beforeObject: beforeObj,
        afterObject: afterObj
      });
    }

    if (
      beforeObj.tailTime !== null &&
      afterObj.tailTime !== null &&
      beforeObj.tailTime !== afterObj.tailTime
    ) {
      results.push({
        type: "tailMoved",
        objectKind: afterObj.kind,
        beforeTime: beforeObj.tailTime,
        afterTime: afterObj.tailTime
      });
    }
  }

  for (let i = 0; i < afterObjects.length; i++) {
    if (usedAfter.has(i)) continue;

    results.push({
      type: "added",
      time: afterObjects[i].time,
      object: afterObjects[i]
    });
  }

  return results.sort((a, b) => {
    const ta = a.time ?? a.afterTime ?? a.beforeTime ?? 0;
    const tb = b.time ?? b.afterTime ?? b.beforeTime ?? 0;
    return ta - tb;
  });
}

function parseBnHitObjects(text, offsetMs = 0) {
  const hitObjects = parseHitObjects(text);
  const redTimingPoints = parseTimingPoints(text);
  const inheritedTimingPoints = parseInheritedTimingPoints(text);
  const sliderMultiplier = parseBnSliderMultiplier(text);

  return hitObjects
    .map(line => parseBnHitObject(line, redTimingPoints, inheritedTimingPoints, sliderMultiplier, offsetMs))
    .filter(Boolean);
}

function parseBnHitObject(line, redTimingPoints, inheritedTimingPoints, sliderMultiplier, offsetMs = 0) {
  const parts = line.split(",");
  if (parts.length < 5) return null;

  const rawTime = parseInt(parts[2], 10);
  const time = rawTime - offsetMs;
  const type = parseInt(parts[3], 10);
  const hitSound = parseInt(parts[4], 10) || 0;

  if (Number.isNaN(rawTime) || Number.isNaN(type)) return null;

  if ((type & 1) !== 0) {
    return {
      time,
      type,
      kind: getBnCircleKind(hitSound),
      tailTime: null,
      raw: line
    };
  }

  if ((type & 2) !== 0) {
    return {
      time,
      type,
      kind: "slider",
      tailTime: calculateBnSliderEndTime(parts, rawTime, redTimingPoints, inheritedTimingPoints, sliderMultiplier) - offsetMs,
      raw: line
    };
  }

  if ((type & 8) !== 0) {
    const endTime = parseInt(parts[5], 10);

    return {
      time,
      type,
      kind: "spinner",
      tailTime: Number.isNaN(endTime) ? null : endTime - offsetMs,
      raw: line
    };
  }

  return {
    time,
    type,
    kind: "object",
    tailTime: null,
    raw: line
  };
}

function getBnCircleKind(hitSound) {
  const hasWhistle = (hitSound & 2) !== 0;
  const hasFinish = (hitSound & 4) !== 0;
  const hasClap = (hitSound & 8) !== 0;

  const isKat = hasWhistle || hasClap;

  if (isKat && hasFinish) return "K";
  if (isKat) return "k";
  if (hasFinish) return "D";
  return "d";
}

function findMatchingBnObject(beforeObj, afterObjects, usedAfter) {
  let bestIndex = -1;
  let bestDiff = Infinity;

  for (let i = 0; i < afterObjects.length; i++) {
    if (usedAfter.has(i)) continue;

    const afterObj = afterObjects[i];

    if (!isBnComparableKind(beforeObj, afterObj)) continue;

    const diff = Math.abs(afterObj.time - beforeObj.time);

    if (diff <= BN_NOTE_MOVE_TOLERANCE_MS && diff < bestDiff) {
      bestIndex = i;
      bestDiff = diff;
    }
  }

  return bestIndex;
}

function isBnComparableKind(a, b) {
  if (a.kind === "slider" || b.kind === "slider") {
    return a.kind === "slider" && b.kind === "slider";
  }

  if (a.kind === "spinner" || b.kind === "spinner") {
    return a.kind === "spinner" && b.kind === "spinner";
  }

  return true;
}

function parseBnSliderMultiplier(text) {
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

function calculateBnSliderEndTime(parts, time, redTimingPoints, inheritedTimingPoints, sliderMultiplier) {
  const repeatCount = parseInt(parts[6], 10) || 1;
  const pixelLength = parseFloat(parts[7]);

  if (!Number.isFinite(pixelLength)) return null;

  const red = findCurrentBnTimingPoint(redTimingPoints, time);
  if (!red || !Number.isFinite(red.beatLength) || red.beatLength <= 0) return null;

  const inherited = findCurrentBnInheritedTimingPoint(
    inheritedTimingPoints,
    time,
    red.time
  );
  const svMultiplier = inherited ? -100 / inherited.beatLength : 1;

  if (!Number.isFinite(svMultiplier) || svMultiplier <= 0) return null;

  const duration = (pixelLength * repeatCount * red.beatLength) / (sliderMultiplier * 100 * svMultiplier);

  return Math.round(time + duration);
}

function findCurrentBnTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function findCurrentBnInheritedTimingPoint(timingPoints, time, redTime) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time > time) continue;
    if (timingPoints[i].time < redTime) return null;
    return timingPoints[i];
  }

  return null;
}

function compareBnTimingPoints(beforeText, afterText, options = {}) {
  const offsetMs = options.offsetMs ?? 0;
  const svChangeThreshold = options.svChangeThreshold ?? "all";

  const beforePoints = parseTimingPointsDetailed(beforeText).map(normalizeBnTimingPoint);

  const afterPoints = parseTimingPointsDetailed(afterText)
    .map(normalizeBnTimingPoint)
    .map(point => ({
      ...point,
      time: point.time - offsetMs
    }));

  return {
    lineChanges: compareBnTimingLineChanges(beforePoints, afterPoints, {
      svChangeThreshold
    }),
    volumeSections: compareBnTimingStateSections(
      beforePoints,
      afterPoints,
      beforeText,
      afterText,
      offsetMs,
      "volume"
    ),
    kiaiSections: compareBnTimingStateSections(
      beforePoints,
      afterPoints,
      beforeText,
      afterText,
      offsetMs,
      "kiai"
    )
  };
}

function compareBnTimingLineChanges(beforePoints, afterPoints, options = {}) {
  const svChangeThreshold = options.svChangeThreshold ?? "all";
  const thresholdValue = svChangeThreshold === "all" ? 0 : parseFloat(svChangeThreshold);

  const results = [];
  const usedAfter = new Set();

  for (const beforePoint of beforePoints) {
    const afterIndex = afterPoints.findIndex((point, index) =>
      !usedAfter.has(index) &&
      point.time === beforePoint.time &&
      point.uninherited === beforePoint.uninherited
    );

    if (afterIndex === -1) {
      results.push({
        type: "deleted",
        point: beforePoint
      });
      continue;
    }

    usedAfter.add(afterIndex);

    const afterPoint = afterPoints[afterIndex];

    if (beforePoint.beatLength !== afterPoint.beatLength) {
      if (
        beforePoint.uninherited === 0 &&
        afterPoint.uninherited === 0 &&
        svChangeThreshold !== "all"
      ) {
        const beforeSv = -100 / beforePoint.beatLength;
        const afterSv = -100 / afterPoint.beatLength;

        if (Math.abs(afterSv - beforeSv) < thresholdValue) {
          continue;
        }
      }

      results.push({
        type: "changed",
        beforePoint,
        afterPoint
      });
    }
  }

  for (let i = 0; i < afterPoints.length; i++) {
    if (usedAfter.has(i)) continue;

    results.push({
      type: "added",
      point: afterPoints[i]
    });
  }

  return results.sort((a, b) => {
    const ta = a.point?.time ?? a.afterPoint?.time ?? a.beforePoint?.time ?? 0;
    const tb = b.point?.time ?? b.afterPoint?.time ?? b.beforePoint?.time ?? 0;
    return ta - tb;
  });
}

function compareBnTimingStateSections(beforePoints, afterPoints, beforeText, afterText, offsetMs, field) {
  const beforeEndTime = getLastHitObjectTime(beforeText);
  const afterEndTime = getLastHitObjectTime(afterText) - offsetMs;

  const boundaries = new Set();

  boundaries.add(0);
  boundaries.add(beforeEndTime);
  boundaries.add(afterEndTime);

  for (const point of beforePoints) {
    boundaries.add(point.time);
  }

  for (const point of afterPoints) {
    boundaries.add(point.time);
  }

  const sorted = [...boundaries]
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);

  const sections = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];

    if (end <= start) continue;

    const beforeState = findCurrentBnTimingState(beforePoints, start);
    const afterState = findCurrentBnTimingState(afterPoints, start);

    const beforeValue = beforeState ? beforeState[field] : null;
    const afterValue = afterState ? afterState[field] : null;

    if (beforeValue === afterValue) continue;

    sections.push({
      start,
      end,
      beforeValue,
      afterValue
    });
  }

  return mergeAdjacentBnTimingStateSections(sections);
}

function findCurrentBnTimingState(points, time) {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].time <= time) {
      return points[i];
    }
  }

  return null;
}

function mergeAdjacentBnTimingStateSections(sections) {
  if (!sections.length) return [];

  const merged = [sections[0]];

  for (const section of sections.slice(1)) {
    const last = merged[merged.length - 1];

    if (
      last.end === section.start &&
      last.beforeValue === section.beforeValue &&
      last.afterValue === section.afterValue
    ) {
      last.end = section.end;
    } else {
      merged.push(section);
    }
  }

  return merged;
}

function normalizeBnTimingPoint(point) {
  return {
    time: point.time,
    beatLength: point.beatLength,
    uninherited: point.uninherited,
    volume: point.volume,
    kiai: point.kiai,
    sampleSet: point.sampleSet
  };
}

function isSameBnTimingPoint(a, b) {
  return (
    a.beatLength === b.beatLength &&
    a.volume === b.volume &&
    a.kiai === b.kiai &&
    a.sampleSet === b.sampleSet
  );
}

function compareBnMetadata(beforeText, afterText) {
  const before = parseBnMetadata(beforeText);
  const after = parseBnMetadata(afterText);

  const fields = [
    ["Artist", "Artist"],
    ["ArtistUnicode", "Romanised Artist"],
    ["Title", "Title"],
    ["TitleUnicode", "Romanised Title"],
    ["Source", "Source"]
  ];

  const results = [];

  for (const [key, label] of fields) {
    const beforeValue = before[key] ?? "";
    const afterValue = after[key] ?? "";

    results.push({
      field: key,
      label,
      type: beforeValue === afterValue ? "same" : "changed",
      beforeValue,
      afterValue
    });
  }

  results.push(compareBnTags(before.Tags ?? "", after.Tags ?? ""));

  return results;
}

function compareBnDifficulty(beforeText, afterText) {
  const before = parseSpreadDifficulty(beforeText);
  const after = parseSpreadDifficulty(afterText);

  return {
    before,
    after,
    changed:
      before.od !== after.od ||
      before.hp !== after.hp
  };
}

function parseBnMetadata(text) {
  const lines = text.split(/\r?\n/);
  const metadata = {};
  let inMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Metadata]") {
      inMetadata = true;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || !trimmed.includes(":")) continue;

      const index = line.indexOf(":");
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();

      metadata[key] = value;
    }
  }

  return metadata;
}

function compareBnTags(beforeTags, afterTags) {
  const beforeSet = new Set(splitBnTags(beforeTags));
  const afterSet = new Set(splitBnTags(afterTags));

  const removed = [...beforeSet].filter(tag => !afterSet.has(tag));
  const added = [...afterSet].filter(tag => !beforeSet.has(tag));

  return {
    field: "Tags",
    label: "Tags",
    type: removed.length || added.length ? "tagsChanged" : "same",
    beforeValue: beforeTags,
    afterValue: afterTags,
    removed,
    added
  };
}

function splitBnTags(tags) {
  return String(tags)
    .trim()
    .split(/ +/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

/** タイムライン表示 */
const BN_TIMELINE_SNAP_CANDIDATES = [4, 6, 8, 12, 16, 24, 32, 48];
const BN_TIMELINE_EPSILON_MS = 2;

function compareBnTimeline(beforeText, afterText, options = {}) {
  const offsetMs = options.offsetMs ?? 0;

  const beforeObjects = parseBnHitObjects(beforeText);
  const afterObjects = parseBnHitObjects(afterText, offsetMs);

  const timingPoints = parseBnTimelineMeasurePoints(beforeText);

  const allTimes = [
    ...beforeObjects.map(obj => obj.time),
    ...afterObjects.map(obj => obj.time)
  ];

  if (!allTimes.length || !timingPoints.length) {
    return [];
  }

  const firstTime = Math.min(...allTimes);
  const lastTime = Math.max(...allTimes);

  const measures = createBnTimelineMeasures(timingPoints, firstTime, lastTime);
  const results = [];

  for (const measure of measures) {
    const beforeInMeasure = beforeObjects.filter(obj =>
      isBnTimelineObjectInMeasure(obj, measure)
    );

    const afterInMeasure = afterObjects.filter(obj =>
      isBnTimelineObjectInMeasure(obj, measure)
    );

    if (!beforeInMeasure.length && !afterInMeasure.length) continue;

    const gridInfo = chooseBnTimelineGrid(measure, beforeInMeasure, afterInMeasure);
    if (!gridInfo) {
      results.push({
        start: measure.start,
        end: measure.end,
        grid: null,
        before: [],
        after: [],
        unsupported: true
      });
      continue;
    }

    const beforeCells = buildBnTimelineCells(measure, beforeInMeasure, gridInfo.grid);
    const afterCells = buildBnTimelineCells(measure, afterInMeasure, gridInfo.grid);

    const beforePlain = beforeCells.map(cell => cell.kind || "-").join("");
    const afterPlain = afterCells.map(cell => cell.kind || "-").join("");

    if (beforePlain === afterPlain) continue;

    results.push({
      start: measure.start,
      end: measure.end,
      grid: gridInfo.grid,
      snap: gridInfo.snap,
      before: beforeCells,
      after: afterCells,
      unsupported: false
    });
  }

  return results;
}

function isBnTimelineObjectInMeasure(obj, measure) {
  const end = obj.tailTime ?? obj.time;

  return (
    obj.time < measure.end - BN_TIMELINE_EPSILON_MS &&
    end >= measure.start - BN_TIMELINE_EPSILON_MS
  );
}

function parseBnTimelineMeasurePoints(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const points = [];

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

function createBnTimelineMeasures(timingPoints, firstTime, lastTime) {
  const measures = [];

  for (let i = 0; i < timingPoints.length; i++) {
    const tp = timingPoints[i];
    const nextTp = timingPoints[i + 1];

    const measureLength = tp.beatLength * tp.meter;

    const sectionStart = tp.time;
    const sectionEnd = nextTp ? nextTp.time : lastTime + measureLength;

    let start = sectionStart;

    while (start <= sectionEnd && start <= lastTime) {
      const end = start + measureLength;

      if (end >= firstTime && start <= lastTime) {
        measures.push({
          start: Math.round(start),
          end: Math.round(end),
          beatLength: tp.beatLength,
          meter: tp.meter
        });
      }

      start += measureLength;
    }
  }

  return measures;
}

function chooseBnTimelineGrid(measure, beforeObjects, afterObjects) {
  const objects = [...beforeObjects, ...afterObjects];

  for (const snap of BN_TIMELINE_SNAP_CANDIDATES) {
    // osu! の snap は「1拍あたりの分割数」として扱う
    // 4/4なら 1/16 snap = 16 * 4 = 64 cells
    const grid = snap * measure.meter;
    const cellLength = measure.beatLength / snap;

    const ok = objects.every(obj => {
      const position = (obj.time - measure.start) / cellLength;
      const nearest = Math.round(position);

      if (Math.abs(position - nearest) * cellLength > BN_TIMELINE_EPSILON_MS) {
        return false;
      }

      // slider / spinner の終了時刻もグリッドに乗るか確認
      if (
        (obj.kind === "slider" || obj.kind === "spinner") &&
        obj.tailTime !== null
      ) {
        const tailPosition = (obj.tailTime - measure.start) / cellLength;
        const tailNearest = Math.round(tailPosition);

        return Math.abs(tailPosition - tailNearest) * cellLength <= BN_TIMELINE_EPSILON_MS;
      }

      return true;
    });

    if (ok) {
      return {
        grid,
        snap
      };
    }
  }

  return null;
}

function getBnTimelineCellIndex(time, measure, grid) {
  const cellLength = (measure.end - measure.start) / grid;
  const position = (time - measure.start) / cellLength;
  const index = Math.round(position);
  const diffMs = Math.abs(position - index) * cellLength;

  if (diffMs > BN_TIMELINE_EPSILON_MS) {
    return null;
  }

  return Math.max(0, Math.min(grid - 1, index));
}

function buildBnTimelineCells(measure, objects, grid) {
  const cells = Array.from({ length: grid }, () => ({
    kind: null,
    overflow: false
  }));

  const cellLength = (measure.end - measure.start) / grid;

  for (const obj of objects) {

    // slider / spinner
    if (
      (obj.kind === "slider" || obj.kind === "spinner") &&
      obj.tailTime !== null
    ) {
      const startIndex = getBnTimelineCellIndex(obj.time, measure, grid);
      const endIndex = getBnTimelineCellIndex(obj.tailTime, measure, grid);

      if (startIndex === null || endIndex === null) {
        continue;
      }

      for (let i = startIndex; i <= endIndex; i++) {
        if (cells[i].kind) {
          cells[i].overflow = true;
          continue;
        }

        cells[i].kind = obj.kind;
      }

      continue;
    }

    // normal note
    const index = getBnTimelineCellIndex(obj.time, measure, grid);

    if (index === null) continue;

    if (cells[index].kind) {
      cells[index].overflow = true;
      continue;
    }

    cells[index].kind = obj.kind;
  }

  return cells;
}
