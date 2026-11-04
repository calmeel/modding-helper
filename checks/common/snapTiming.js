// Shared resnap and grid candidate calculations for timing checks.
const DEFAULT_BEAT_SNAPS = [1, 2, 3, 4, 6, 8, 12, 16];
const ADVANCED_SNAPS = [5, 7, 9];
const SUPPLEMENTAL_OFFSET_SNAPS = [...ADVANCED_SNAPS, 24];

function getBeatSnapCandidates(includeAdvancedSnaps = false) {
  return includeAdvancedSnaps
    ? [...DEFAULT_BEAT_SNAPS, ...ADVANCED_SNAPS]
    : DEFAULT_BEAT_SNAPS;
}

// Kiai and preview retain their own severity rules while sharing the same
// candidates as the 1ms check. Invalid/missing timing is not an unknown snap.
function analyzeTimingSnap(time, timingPoints) {
  const currentTp = findCurrentTimingPoint(timingPoints, time);
  if (!currentTp || !Number.isFinite(time) ||
      !Number.isFinite(currentTp.time) ||
      !Number.isFinite(currentTp.beatLength) || currentTp.beatLength <= 0) {
    return { snap: null, wheel: null, supplementalSnaps: [] };
  }

  const snap = findNearestSnapDiff(
    time, currentTp.time, currentTp.beatLength, DEFAULT_BEAT_SNAPS
  );
  const unknown = !snap.compatibility && Math.abs(snap.diff) >= 2;
  return {
    snap,
    wheel: findStableWheelSeekDifference(time, timingPoints, DEFAULT_BEAT_SNAPS),
    supplementalSnaps: unknown ? findSupplementalOffsetSnaps(time, currentTp) : []
  };
}

function findSupplementalOffsetSnaps(time, timingPoint) {
  const matches = [];

  for (const snap of SUPPLEMENTAL_OFFSET_SNAPS) {
    const lazer = createOffsetSnapCandidate(
      time,
      getLazerOffsetSnapTime(time, timingPoint.time, timingPoint.beatLength, snap),
      snap
    );
    const stable = findNearestStableSnapDiff(
      time,
      timingPoint.time,
      timingPoint.beatLength,
      [snap]
    );
    // Use the nearest integer-ms position accepted by either editor.
    const best = isBetterOffsetSnapCandidate(stable, lazer) ? stable : lazer;
    if (Math.abs(best.diff) <= 1) {
      matches.push({ snap, diff: best.diff });
    }
  }

  return matches;
}

function findCurrentTimingPoint(timingPoints, time) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].time <= time) {
      return timingPoints[i];
    }
  }

  // Both editors extend the first red timing point backwards when snapping
  // objects before it. osu!lazer's TimingPointAt() likewise falls back to
  // TimingPoints[0] instead of treating the range as having no timing.
  return timingPoints[0] ?? null;
}

function findNearestSnapDiff(
  time,
  redTime,
  beatLength,
  beatSnaps
) {
  let lazerBest = null;

  for (const beatSnap of beatSnaps) {
    const lazerTime = getLazerOffsetSnapTime(
      time,
      redTime,
      beatLength,
      beatSnap
    );
    const lazerCandidate = createOffsetSnapCandidate(time, lazerTime, beatSnap);

    if (isBetterOffsetSnapCandidate(lazerCandidate, lazerBest)) {
      lazerBest = lazerCandidate;
    }
  }

  const stableBest = findNearestStableSnapDiff(
    time,
    redTime,
    beatLength,
    beatSnaps
  );

  if (!lazerBest || !stableBest) return lazerBest || stableBest;

  const lazerMatches = lazerBest.diff === 0;
  const stableMatches = stableBest.diff === 0;

  if (lazerMatches && stableMatches) {
    return {
      ...lazerBest,
      lazerRawDiff: lazerBest.rawDiff,
      compatibility: null
    };
  }

  if (stableMatches) {
    return {
      ...stableBest,
      diff: lazerBest.diff,
      lazerRawDiff: lazerBest.rawDiff,
      compatibility: "stableOnly"
    };
  }

  if (lazerMatches) {
    return {
      ...lazerBest,
      diff: stableBest.diff,
      lazerRawDiff: lazerBest.rawDiff,
      compatibility: "lazerOnly"
    };
  }

  const best = isBetterOffsetSnapCandidate(stableBest, lazerBest)
    ? stableBest
    : lazerBest;

  return {
    ...best,
    lazerRawDiff: lazerBest.rawDiff,
    compatibility: null
  };
}

function findNearestStableSnapDiff(
  time,
  redTime,
  beatLength,
  beatSnaps
) {
  let stableBest = null;

  for (const beatSnap of beatSnaps) {
    const stableTime = getStableResnapInteger(
      time,
      redTime,
      beatLength,
      beatSnap
    );
    const stableCandidate = createOffsetSnapCandidate(
      time,
      stableTime,
      beatSnap
    );

    if (isBetterOffsetSnapCandidate(stableCandidate, stableBest)) {
      stableBest = stableCandidate;
    }
  }

  return stableBest;
}

function findStableWheelSeekDifference(
  time,
  timingPoints,
  beatSnaps
) {
  const currentTp = findCurrentTimingPoint(timingPoints, time);
  if (!currentTp) return null;

  let lazerBest = null;

  for (const beatSnap of beatSnaps) {
    const lazerTime = getLazerOffsetSnapTime(
      time,
      currentTp.time,
      currentTp.beatLength,
      beatSnap
    );
    const lazerCandidate = createOffsetSnapCandidate(time, lazerTime, beatSnap);

    if (isBetterOffsetSnapCandidate(lazerCandidate, lazerBest)) {
      lazerBest = lazerCandidate;
    }
  }

  if (!lazerBest) return null;

  // Compare the same divisor that represents the nearest lazer snap.
  // Searching stable independently across denser divisors would allow, for
  // example, a 1/12 candidate to hide a real difference at a 1/4 position.
  const stableTime = getStableWheelSeekInteger(
    time,
    time,
    timingPoints,
    lazerBest.snap
  );
  const stableCandidate = createOffsetSnapCandidate(
    time,
    stableTime,
    lazerBest.snap
  );
  const lazerMatches = lazerBest.diff === 0;
  const stableMatches = stableCandidate.diff === 0;

  if (lazerMatches === stableMatches) return null;

  return stableMatches
    ? {
        ...stableCandidate,
        diff: lazerBest.diff,
        compatibility: "stableWheelOnly"
      }
    : {
        ...lazerBest,
        diff: stableCandidate.diff,
        compatibility: "lazerWheelOnly"
      };
}

function createOffsetSnapCandidate(time, snapTime, beatSnap) {
  return {
    diff: Math.trunc(snapTime) - time,
    rawDiff: snapTime - time,
    snap: beatSnap
  };
}

function isBetterOffsetSnapCandidate(candidate, current) {
  if (!current) return true;

  const candidateDiff = Math.abs(candidate.diff);
  const currentDiff = Math.abs(current.diff);

  return candidateDiff < currentDiff;
}

function getStableWheelSeekInteger(
  targetTime,
  referenceTime,
  timingPoints,
  beatSnap
) {
  // osu!stable method 06003484. The editor uses the reference time to
  // select the active red timing point, constructs two integer candidates
  // with conv.i4, and then chooses the nearer one (the upper one on a tie).
  if (!timingPoints.length) return Math.trunc(targetTime);

  const timingPointIndex = findStableWheelTimingPointIndex(
    timingPoints,
    referenceTime
  );
  const timingPoint = timingPoints[timingPointIndex];
  const timingOffset = getStableWheelTimingOffset(
    timingPoint,
    timingPointIndex
  );
  const snapLength = timingPoint.beatLength / beatSnap;
  const relative = targetTime - timingOffset;
  const baseIndex = relative < 0
    ? Math.trunc(relative / snapLength) - 1
    : Math.trunc(relative / snapLength);
  const lower = Math.trunc(baseIndex * snapLength + timingOffset);
  const upper = Math.trunc((baseIndex + 1) * snapLength + timingOffset);

  // When seeking from a different reference time, stable avoids returning
  // that same integer candidate. For wheel-position detection both times
  // are equal, but this branch is retained to reproduce the method itself.
  if (referenceTime !== targetTime) {
    if (lower === referenceTime) return upper;
    if (upper === referenceTime) return lower;
  }

  return targetTime - lower < upper - targetTime ? lower : upper;
}

function findStableWheelTimingPointIndex(timingPoints, referenceTime) {
  let currentIndex = 0;

  for (let i = 0; i < timingPoints.length; i++) {
    if (timingPoints[i].time <= referenceTime) {
      currentIndex = i;
    }
  }

  return currentIndex;
}

function getStableWheelTimingOffset(timingPoint, timingPointIndex) {
  let timingOffset = timingPoint.time;

  // Method 06001BE1 extends only the first positive red timing point
  // backwards by repeated beat-length subtraction.
  if (timingPointIndex === 0 && timingPoint.beatLength > 0) {
    while (timingOffset > 0) {
      timingOffset -= timingPoint.beatLength;
    }
  }

  return timingOffset;
}

function getStableResnapInteger(
  objectTime,
  timingOffset,
  beatLength,
  beatSnap
) {
  // osu!stable method 0600347E:
  //   relative = objectTime - timingOffset
  //   ratio = relative / (beatLength / beatSnap)
  //   result = timingOffset
  //          + Math.Round(ratio) * (beatLength / beatSnap)
  // Its caller (0600347D) immediately applies conv.i4 to the returned
  // float64. Keep the two beat-length divisions separate, as in the IL.
  const relative = objectTime - timingOffset;
  const ratioSnapLength = beatLength / beatSnap;
  const ratio = relative / ratioSnapLength;
  const snapIndex = roundOffsetToEven(ratio);
  const resultSnapLength = beatLength / beatSnap;
  const result = timingOffset + snapIndex * resultSnapLength;

  return Math.trunc(result);
}

function getLazerOffsetSnapTime(
  objectTime,
  timingOffset,
  beatLength,
  beatSnap
) {
  // ControlPointInfo.getClosestPositiveSnappedTime():
  // lazer rounds the beat index away from zero and keeps the snapped time
  // as a double.
  const snapLength = beatLength / beatSnap;
  const beats = (Math.max(objectTime, 0) - timingOffset) / snapLength;
  const snapIndex = roundOffsetAwayFromZero(beats);
  const result = timingOffset + snapIndex * snapLength;

  return result >= 0 ? result : result + snapLength;
}

function roundOffsetToEven(value) {
  if (!Number.isFinite(value)) return value;

  const lower = Math.floor(value);
  const fraction = value - lower;

  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;

  return lower % 2 === 0 ? lower : lower + 1;
}

function roundOffsetAwayFromZero(value) {
  if (!Number.isFinite(value)) return value;

  return value < 0
    ? -Math.floor(-value + 0.5)
    : Math.floor(value + 0.5);
}
