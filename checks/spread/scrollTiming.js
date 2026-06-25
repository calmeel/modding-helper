function parseSpreadRedLines(text) {
  const lines = text.split(/\r?\n/);
  let inTimingPoints = false;
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (inTimingPoints) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const uninherited = parseInt(parts[6], 10);

      if (
        uninherited === 1 &&
        Number.isFinite(time) &&
        Number.isFinite(beatLength) &&
        beatLength > 0
      ) {
        points.push({
          time,
          beatLength
        });
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function parseSpreadGreenLines(text) {
  const lines = text.split(/\r?\n/);
  let inTimingPoints = false;
  const points = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[TimingPoints]") {
      inTimingPoints = true;
      continue;
    }

    if (inTimingPoints) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",").map(p => p.trim());
      if (parts.length < 7) continue;

      const time = Math.round(parseFloat(parts[0]));
      const beatLength = parseFloat(parts[1]);
      const uninherited = parseInt(parts[6], 10);

      if (
        uninherited === 0 &&
        Number.isFinite(time) &&
        Number.isFinite(beatLength) &&
        beatLength !== 0
      ) {
        points.push({
          time,
          beatLength,
          sv: beatLength < 0 ? -100 / beatLength : 1
        });
      }
    }
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function parseSpreadCircleNoteTimes(text) {
  return parseSpreadCircleNotes(text).map(note => note.time);
}

function parseSpreadCircleNotes(text) {
  const hitObjects = parseHitObjects(text);
  const notes = [];

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 5) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);
    const hitSound = parseInt(parts[4], 10);

    if (Number.isNaN(time) || Number.isNaN(type) || Number.isNaN(hitSound)) continue;

    // taikoの通常ノーツのみ対象。Slider / Spinnerはここでは除外
    if ((type & 1) === 0) continue;

    notes.push({
      time,
      isFinisher: (hitSound & 4) !== 0
    });
  }

  notes.sort((a, b) => a.time - b.time);
  return notes;
}

function getCurrentSpreadTimingPoint(points, time) {
  if (!points || !points.length) return null;

  let current = points[0];

  for (const point of points) {
    if (point.time <= time) {
      current = point;
    } else {
      break;
    }
  }

  return current;
}

function getCurrentSpreadInheritedTimingPoint(points, time, redTime) {
  if (!points || !points.length || !Number.isFinite(redTime)) return null;

  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];

    if (point.time > time) continue;
    if (point.time < redTime) return null;

    return point;
  }

  return null;
}
