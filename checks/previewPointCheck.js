const PREVIEW_POINT_SNAP_CANDIDATES = [1, 2, 3, 4, 6, 8, 12, 16];
const PREVIEW_POINT_SNAP_TOLERANCE_MS = 1;

function runPreviewPointCheck(text, fileName) {
  const previewTime = parsePreviewTime(text);

  if (previewTime === null) {
    return {
      fileName,
      level: "warn",
      previewTime: null,
      snap: null,
      diff: null
    };
  }

  const redTimingPoints = parseTimingPoints(text);
  const currentRed = findCurrentRedTimingPoint(redTimingPoints, previewTime);

  if (!currentRed) {
    return {
      fileName,
      level: "warn",
      previewTime,
      snap: "unknown",
      diff: null
    };
  }

  const snap = detectSnapAtTime(
    previewTime,
    currentRed.time,
    currentRed.beatLength,
    PREVIEW_POINT_SNAP_CANDIDATES,
    PREVIEW_POINT_SNAP_TOLERANCE_MS
  );

  if (!snap) {
    return {
      fileName,
      level: "warn",
      previewTime,
      snap: "unknown",
      diff: null
    };
  }

  return {
    fileName,
    level: snap.diff === 0 ? "ok" : "warn",
    previewTime,
    snap: `1/${snap.snap}`,
    diff: snap.diff
  };
}

function parsePreviewTime(text) {
  const lines = text.split(/\r?\n/);
  let inGeneral = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[General]") {
      inGeneral = true;
      continue;
    }

    if (inGeneral) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("PreviewTime:")) {
        const value = parseInt(trimmed.slice(trimmed.indexOf(":") + 1), 10);
        return Number.isFinite(value) ? value : null;
      }
    }
  }

  return null;
}
