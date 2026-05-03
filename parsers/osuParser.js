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
