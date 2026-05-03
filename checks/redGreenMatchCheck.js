function runRedGreenMatchCheck(text, fileName) {
  const timingPoints = parseTimingPointsDetailed(text);

  const reds = timingPoints.filter(tp => tp.uninherited === 1);
  const greens = timingPoints.filter(tp => tp.uninherited === 0);

  const results = [];

  for (const red of reds) {
    const sameTimeGreens = greens.filter(green => green.time === red.time);

    for (const green of sameTimeGreens) {
      const volumeMismatch = red.volume !== green.volume;
      const kiaiMismatch = red.kiai !== green.kiai;
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