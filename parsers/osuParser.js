function parseHitObjects(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const objects = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[HitObjects]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed) continue;

      objects.push(trimmed);
    }
  }

  return objects;
}

function parseTimingPoints(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const timingPoints = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",");

      if (parts.length < 7) continue;

      const time = parseFloat(parts[0]);
      const beatLength = parseFloat(parts[1]);
      const uninherited = parseInt(parts[6], 10);

      // 赤線のみ
      if (uninherited === 1) {
        timingPoints.push({
          time,
          beatLength
        });
      }
    }
  }

  timingPoints.sort((a, b) => a.time - b.time);
  return timingPoints;
}

function parseInheritedTimingPoints(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const svLines = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());

      if (parts.length < 8) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const uninherited = parseInt(parts[6], 10);
      const volume = parseInt(parts[5], 10);

      // 緑線のみ
      if (uninherited === 0) {
        svLines.push({
          time,
          beatLength,
          volume,
          raw: trimmed
        });
      }
    }
  }

  svLines.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.lineNo - b.lineNo;
  });

  return svLines;
}

function parseAllTimingPoints(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const timingPoints = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 8) continue;

      const time = Math.round(parseFloat(parts[0]));
      const effects = parseInt(parts[7], 10);

      if (Number.isNaN(time) || Number.isNaN(effects)) continue;

      timingPoints.push({
        time,
        effects,
        kiai: (effects & 1) !== 0,
        raw: trimmed,
        lineNo: i + 1
      });
    }
  }

  timingPoints.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.lineNo - b.lineNo;
  });

  return timingPoints;
}

function getLastHitObjectTime(text) {
  const hitObjects = parseHitObjects(text);

  let last = 0;

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 3) continue;

    const time = parseInt(parts[2], 10);
    if (!Number.isNaN(time)) {
      last = Math.max(last, time);
    }
  }

  return last;
}

function getLastHitObjectEndTime(text) {
  const hitObjects = parseHitObjects(text);
  const redTimingPoints = parseTimingPoints(text);
  const inheritedTimingPoints = parseInheritedTimingPoints(text);
  const sliderMultiplier = parseHitObjectEndSliderMultiplier(text);
  let last = 0;

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);
    if (Number.isNaN(time) || Number.isNaN(type)) continue;

    let endTime = time;

    if ((type & 2) !== 0) {
      endTime = calculateHitObjectSliderEndTime(
        parts,
        time,
        redTimingPoints,
        inheritedTimingPoints,
        sliderMultiplier
      );
    } else if ((type & 8) !== 0) {
      const spinnerEndTime = parseInt(parts[5], 10);
      endTime = Number.isNaN(spinnerEndTime) ? time : spinnerEndTime;
    }

    if (Number.isFinite(endTime)) {
      last = Math.max(last, endTime);
    }
  }

  return last;
}

function parseHitObjectEndSliderMultiplier(text) {
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
        return Number.isFinite(value) && value > 0 ? value : 1.4;
      }
    }
  }

  return 1.4;
}

function calculateHitObjectSliderEndTime(
  parts,
  time,
  redTimingPoints,
  inheritedTimingPoints,
  sliderMultiplier
) {
  if (parts.length < 8) return time;

  const repeatCount = parseInt(parts[6], 10);
  const pixelLength = parseFloat(parts[7]);

  if (
    Number.isNaN(repeatCount) ||
    Number.isNaN(pixelLength) ||
    repeatCount <= 0 ||
    pixelLength <= 0
  ) {
    return time;
  }

  const red = findHitObjectEndCurrentTimingPoint(redTimingPoints, time);
  if (!red || !Number.isFinite(red.beatLength) || red.beatLength <= 0) {
    return time;
  }

  const inherited = findHitObjectEndCurrentInheritedTimingPoint(
    inheritedTimingPoints,
    time,
    red.time
  );
  const svMultiplier = inherited ? -100 / inherited.beatLength : 1;
  const effectiveSv = Number.isFinite(svMultiplier) && svMultiplier > 0
    ? svMultiplier
    : 1;
  const effectiveSliderMultiplier =
    Number.isFinite(sliderMultiplier) && sliderMultiplier > 0
      ? sliderMultiplier
      : 1.4;

  const duration =
    (pixelLength * repeatCount * red.beatLength) /
    (effectiveSliderMultiplier * 100 * effectiveSv);

  return Number.isFinite(duration) && duration >= 0
    ? Math.round(time + duration)
    : time;
}

function findHitObjectEndCurrentTimingPoint(timingPoints, time) {
  let current = null;

  for (const point of timingPoints) {
    if (point.time <= time) {
      current = point;
    } else {
      break;
    }
  }

  return current;
}

function findHitObjectEndCurrentInheritedTimingPoint(timingPoints, time, redTime) {
  if (!Number.isFinite(redTime)) return null;

  for (let i = timingPoints.length - 1; i >= 0; i--) {
    const point = timingPoints[i];
    if (point.time > time) continue;
    if (point.time < redTime) return null;
    return point;
  }

  return null;
}

/** 赤線&緑線 */
function parseTimingPointsDetailed(text) {
  const lines = text.split(/\r?\n/);

  let inSection = false;
  const timingPoints = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[TimingPoints]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 8) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const sampleSet = parseInt(parts[3], 10);
      const volume = parseInt(parts[5], 10);
      const uninherited = parseInt(parts[6], 10);
      const effects = parseInt(parts[7], 10);

      if (
        Number.isNaN(time) ||
        Number.isNaN(sampleSet) ||
        Number.isNaN(volume) ||
        Number.isNaN(uninherited) ||
        Number.isNaN(effects)
      ) {
        continue;
      }

      timingPoints.push({
        time,
        beatLength,
        sampleSet,
        volume,
        uninherited,      // 1 = 赤線, 0 = 緑線
        kiai: (effects & 1) !== 0,
        effects,
        raw: trimmed,
        lineNo: i + 1
      });
    }
  }

  timingPoints.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.lineNo - b.lineNo;
  });

  return timingPoints;
}

/** メタデータ用のパーサー */
function parseMetadataValue(text, key) {
  const lines = text.split(/\r?\n/);

  let inMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Metadata]") {
      inMetadata = true;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith(key + ":")) {
        return line.slice(line.indexOf(":") + 1).trim();
      }
    }
  }

  return "";
}

/** mode情報取得 */
function parseMode(text) {
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("Mode:")) {
      const value = parseInt(trimmed.split(":")[1], 10);
      if (!Number.isNaN(value)) return value;
    }
  }

  return 0; // default = Standard
}

function getModeName(mode) {
  switch (mode) {
    case 0: return "Standard";
    case 1: return "Taiko";
    case 2: return "Catch";
    case 3: return "Mania";
    default: return `Mode ${mode}`;
  }
}
