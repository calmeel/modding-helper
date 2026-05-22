function runRedGreenMatchCheck(text, fileName) {
  const timingPoints = parseTimingPointsDetailed(text);

  const reds = timingPoints.filter(tp => tp.uninherited === 1);
  const greens = timingPoints.filter(tp => tp.uninherited === 0);
  const greensByTime = groupGreenTimingPointsByTime(greens);

  const results = [];

  for (const red of reds) {
    const sameTimeGreens = greensByTime.get(red.time) ?? [];

    for (const green of sameTimeGreens) {
      /** 最初の赤線だけ例外処理：kiaiじゃなくてok */
      const isFirstRed = red === reds[0];
      const isFirstGreen = green === greens[0];
      const ignoreFirstRedGreenKiaiMismatch = isFirstRed && isFirstGreen;

      const volumeMismatch = red.volume !== green.volume;
      const kiaiMismatch =
        red.kiai !== green.kiai && !ignoreFirstRedGreenKiaiMismatch;
      const sampleSetMismatch = red.sampleSet !== green.sampleSet;

      if (!volumeMismatch && !kiaiMismatch && !sampleSetMismatch) continue;

      results.push({
        time: red.time,

        redVolume: red.volume,
        greenVolume: green.volume,

        redKiai: red.kiai,
        greenKiai: green.kiai,

        redSampleSet: red.sampleSet,
        greenSampleSet: green.sampleSet,

        volumeMismatch,
        kiaiMismatch,
        sampleSetMismatch,

        redLineNo: red.lineNo,
        greenLineNo: green.lineNo
      });
    }
  }

  return {
    fileName,
    results
  };
}

function groupGreenTimingPointsByTime(greens) {
  const groups = new Map();

  for (const green of greens) {
    if (!groups.has(green.time)) {
      groups.set(green.time, []);
    }

    groups.get(green.time).push(green);
  }

  return groups;
}
