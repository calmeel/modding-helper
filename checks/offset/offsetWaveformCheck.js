function parseOffsetAudioFilename(text) {
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

      if (trimmed.startsWith("AudioFilename:")) {
        return line.slice(line.indexOf(":") + 1).trim();
      }
    }
  }

  return "";
}

function buildOffsetWaveformBarlines(text) {
  const redLines = parseOffsetWaveformRedLines(text);
  const lastHitObjectTime = getLastHitObjectTime(text);
  const barlines = [];

  for (let i = 0; i < redLines.length; i++) {
    const red = redLines[i];
    const nextRed = redLines[i + 1] ?? null;
    const measureLength = red.beatLength * red.meter;

    if (!Number.isFinite(measureLength) || measureLength <= 0) continue;

    const sectionEnd = nextRed
      ? nextRed.time
      : Math.max(lastHitObjectTime, red.time) + measureLength;

    for (
      let rawTime = red.time;
      rawTime < sectionEnd - 1e-6;
      rawTime += measureLength
    ) {
      barlines.push({
        time: Math.floor(rawTime),
        redTime: red.time,
        beatLength: red.beatLength,
        meter: red.meter
      });
    }
  }

  return barlines;
}

function parseOffsetWaveformRedLines(text) {
  return parseTimingPointsDetailed(text)
    .filter(point =>
      point.uninherited === 1 &&
      Number.isFinite(point.beatLength) &&
      point.beatLength > 0
    )
    .map(point => ({
      time: parseOffsetWaveformTimingTime(point.raw),
      beatLength: point.beatLength,
      meter: parseOffsetWaveformMeter(point.raw),
      lineNo: point.lineNo
    }))
    .sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      return a.lineNo - b.lineNo;
    });
}

function parseOffsetWaveformTimingTime(raw) {
  const parts = String(raw ?? "").split(",").map(part => part.trim());
  const time = parseFloat(parts[0]);
  return Number.isFinite(time) ? Math.floor(time) : 0;
}

function parseOffsetWaveformMeter(raw) {
  const parts = String(raw ?? "").split(",").map(part => part.trim());
  const meter = parseInt(parts[2], 10);
  return Number.isFinite(meter) && meter > 0 ? meter : 4;
}
