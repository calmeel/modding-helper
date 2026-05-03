async function analyzeOszFile(file) {
  const zip = await JSZip.loadAsync(file);

  const clapWhistleResults = [];
  const shiftResults = [];
  const doubleSvSources = [];
  const kiaiResults = [];
  const kiaiSnapResults = [];
  const svVolumeSources = [];
  const redGreenMatchResults = [];
  const sampleSetResults = [];

  const osuFiles = Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith(".osu"));

  for (const entry of osuFiles) {
    const text = await entry.async("text");

    clapWhistleResults.push(
      runClapWhistleCheck(text, entry.name)
    );

    shiftResults.push(
      runOffset1msCheck(text, entry.name)
    );

    doubleSvSources.push({
      text,
      fileName: entry.name
    });

    kiaiResults.push(
      runKiaiAnalyze(text, entry.name)
    );

    kiaiSnapResults.push(
      runKiaiSnapCheck(text, entry.name)
    );

    svVolumeSources.push({
      text,
      fileName: entry.name
    });

    redGreenMatchResults.push(
      runRedGreenMatchCheck(text, entry.name)
    );

    sampleSetResults.push(
      runSampleSetCheck(text, entry.name)
    );
  }

  return {
    clapWhistleResults,
    shiftResults,
    doubleSvSources,
    kiaiResults,
    kiaiSnapResults,
    svVolumeSources,
    redGreenMatchResults,
    sampleSetResults
  };
}

async function processFile(file) {
  if (!file) return null;

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".osu")) {
    const text = await file.text();

    return {
      clapWhistle: [
        runClapWhistleCheck(text, file.name)
      ],
      offset: [
        runOffset1msCheck(text, file.name)
      ],
      doubleSvSources: [
        { text, fileName: file.name }
      ],
      kiaiCompare: [
        runKiaiAnalyze(text, file.name)
      ],
      kiaiSnap: [
        runKiaiSnapCheck(text, file.name)
      ],

      svVolumeSources: [
        { text, fileName: file.name }
      ],

      redGreenMatch: [
        runRedGreenMatchCheck(text, file.name)
      ],

      sampleSet: [
        runSampleSetCheck(text, file.name)
      ],
    };
  }

  if (lowerName.endsWith(".osz")) {
    const analyzed = await analyzeOszFile(file);

    return {
      clapWhistle: analyzed.clapWhistleResults,
      offset: analyzed.shiftResults,
      doubleSvSources: analyzed.doubleSvSources,
      kiaiCompare: analyzed.kiaiResults,
      kiaiSnap: analyzed.kiaiSnapResults,
      svVolumeSources: analyzed.svVolumeSources,
      redGreenMatch: analyzed.redGreenMatchResults,
      sampleSet: analyzed.sampleSetResults
    };
  }

  throw new Error("invalidFile");
}