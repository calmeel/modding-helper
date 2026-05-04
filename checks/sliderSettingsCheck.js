const EXPECTED_SLIDER_MULTIPLIER = 1.4;
const SLIDER_MULTIPLIER_TOLERANCE = 0.00001;
const TICK_RATE_TRIPLET_RATIO_THRESHOLD = 0.30;

function runSliderSettingsCheck(text, fileName) {
  const difficulty = parseSliderDifficultySettings(text);
  const tripletRatio = calculateTripletSnapRatio(text);

  const expectedTickRate =
    tripletRatio >= TICK_RATE_TRIPLET_RATIO_THRESHOLD ? 3 : 1;

  const issues = [];

  if (
    difficulty.sliderMultiplier === null ||
    Math.abs(difficulty.sliderMultiplier - EXPECTED_SLIDER_MULTIPLIER) > SLIDER_MULTIPLIER_TOLERANCE
  ) {
    issues.push({
      type: "sliderMultiplier",
      value: difficulty.sliderMultiplier,
      expected: EXPECTED_SLIDER_MULTIPLIER
    });
  }

  if (difficulty.sliderTickRate !== expectedTickRate) {
    issues.push({
      type: "sliderTickRate",
      value: difficulty.sliderTickRate,
      expected: expectedTickRate,
      tripletRatio
    });
  }

  return {
    fileName,
    sliderMultiplier: difficulty.sliderMultiplier,
    sliderTickRate: difficulty.sliderTickRate,
    tripletRatio,
    expectedTickRate,
    issues
  };
}

function parseSliderDifficultySettings(text) {
  const lines = text.split(/\r?\n/);
  let inDifficulty = false;

  let sliderMultiplier = null;
  let sliderTickRate = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Difficulty]") {
      inDifficulty = true;
      continue;
    }

    if (inDifficulty) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      if (trimmed.startsWith("SliderMultiplier:")) {
        sliderMultiplier = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
      }

      if (trimmed.startsWith("SliderTickRate:")) {
        sliderTickRate = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
      }
    }
  }

  return {
    sliderMultiplier: Number.isFinite(sliderMultiplier) ? sliderMultiplier : null,
    sliderTickRate: Number.isFinite(sliderTickRate) ? sliderTickRate : null
  };
}

function calculateTripletSnapRatio(text) {
  const timingPoints = parseTimingPoints(text);
  const hitObjects = parseHitObjects(text);

  let total = 0;
  let triplet = 0;

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 3) continue;

    const time = parseInt(parts[2], 10);
    if (Number.isNaN(time)) continue;

    const currentTp = findSliderSettingsCurrentTimingPoint(timingPoints, time);
    if (!currentTp) continue;

    const snap = detectSliderSettingsSnap(
      time,
      currentTp.time,
      currentTp.beatLength
    );

    if (!snap) continue;

    total++;

    if (snap === 3) {
      triplet++;
    }
  }

  return total === 0 ? 0 : triplet / total;
}

function findSliderSettingsCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  return null;
}

function detectSliderSettingsSnap(time, redTime, beatLength) {
  const candidates = [1, 2, 3, 4, 6, 8, 12, 16];
  let best = null;

  for (const snap of candidates) {
    const snapLength = beatLength / snap;
    const snapIndex = Math.round((time - redTime) / snapLength);
    const nearest = redTime + snapIndex * snapLength;
    const snapped = Math.trunc(nearest);
    const diff = Math.abs(snapped - time);

    if (diff <= 1) {
      if (!best || snap < best) {
        best = snap;
      }
    }
  }

  return best;
}