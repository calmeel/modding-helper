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
    const mode = parseMode(text);

    clapWhistleResults.push({
      ...runClapWhistleCheck(text, entry.name),
      mode
    });

    shiftResults.push({
      ...runOffset1msCheck(text, entry.name),
      mode
    });

    doubleSvSources.push({
      text,
      fileName: entry.name,
      mode
    });

    kiaiResults.push({
      ...runKiaiAnalyze(text, entry.name),
      mode
    });

    kiaiSnapResults.push({
      ...runKiaiSnapCheck(text, entry.name),
      mode
    });

    svVolumeSources.push({
      text,
      fileName: entry.name,
      mode
    });

    redGreenMatchResults.push({
      ...runRedGreenMatchCheck(text, entry.name),
      mode
    });

    sampleSetResults.push({
      ...runSampleSetCheck(text, entry.name),
      mode
    });
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
    const mode = parseMode(text);

    return {
      clapWhistle: [
        {
          ...runClapWhistleCheck(text, file.name),
          mode
        }
      ],
      offset: [
        {
          ...runOffset1msCheck(text, file.name),
          mode
        }
      ],
      doubleSvSources: [
        { text, fileName: file.name, mode }
      ],
      kiaiCompare: [
        {
          ...runKiaiAnalyze(text, file.name),
          mode
        }
      ],
      kiaiSnap: [
        {
          ...runKiaiSnapCheck(text, file.name),
          mode
        }
      ],
      svVolumeSources: [
        { text, fileName: file.name, mode }
      ],
      redGreenMatch: [
        {
          ...runRedGreenMatchCheck(text, file.name),
          mode
        }
      ],
      sampleSet: [
        {
          ...runSampleSetCheck(text, file.name),
          mode
        }
      ]
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