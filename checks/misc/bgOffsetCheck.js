function runBgOffsetCheck(text, fileName) {
  return {
    fileName,
    backgrounds: parseBgOffsetEvents(text)
  };
}

function parseBgOffsetEvents(text) {
  const lines = text.split(/\r?\n/);
  const backgrounds = [];

  let inEvents = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[Events]") {
      inEvents = true;
      continue;
    }

    if (inEvents) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = splitEventCsvLine(trimmed);
      if (parts.length < 3) continue;

      const eventType = parts[0].trim();
      const startTime = parts[1].trim();

      // Background event: 0,0,filename,xOffset,yOffset
      if (eventType !== "0" || startTime !== "0") continue;

      const rawFileName = parts[2].trim();
      const bgFileName = unquoteBgFileName(rawFileName);

      if (!bgFileName) continue;

      const xOffset = parts.length >= 4 ? parseInt(parts[3], 10) : 0;
      const yOffset = parts.length >= 5 ? parseInt(parts[4], 10) : 0;

      backgrounds.push({
        fileName: bgFileName,
        normalizedFileName: normalizeBgFileName(bgFileName),
        imageType: getBgImageType(bgFileName),
        xOffset: Number.isFinite(xOffset) ? xOffset : 0,
        yOffset: Number.isFinite(yOffset) ? yOffset : 0,
        lineNo: i + 1
      });
    }
  }

  return backgrounds;
}

function splitEventCsvLine(line) {
  const result = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
      continue;
    }

    if (ch === "," && !inQuote) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

function unquoteBgFileName(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizeBgFileName(value) {
  return value
    .trim()
    .replace(/\\/g, "/")
    .toLowerCase();
}

function getBgImageType(fileName) {
  const match = String(fileName ?? "").match(/\.([^.\\/]+)$/);
  const ext = match ? match[1].toLowerCase() : "";

  if (ext === "jpg" || ext === "jpeg" || ext === "png") {
    return ext;
  }

  return "";
}

function normalizeBgImageType(type) {
  return type === "jpg" ? "jpeg" : type;
}

function getBgImageTypeMismatch(expectedType, actualType) {
  const expected = normalizeBgImageType(expectedType);
  const actual = normalizeBgImageType(actualType);

  if (!expected || !actual) return null;
  if (
    (expected === "jpeg" || expected === "png") &&
    (actual === "jpeg" || actual === "png") &&
    expected !== actual
  ) {
    return { expected, actual };
  }

  return null;
}

function detectBgImageTypeFromBytes(bytes) {
  if (!bytes || bytes.length < 3) return "";

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }

  return "";
}
