/** ハイブリットセットの場合、taikoモード以外を弾く */
function isTaikoMode(mode) {
  return mode === 1;
}

function createEmptyProcessResult() {
  return {
    clapWhistle: [],
    offsetSources: [],
    offset: [],
    doubleSvSources: [],
    kiaiCompare: [],
    kiaiSnap: [],
    svVolumeSources: [],
    volumeCompareSources: [],
    redGreenMatch: [],
    sampleSet: [],
    sliderSettings: [],
    earlyNote: [],
    tag: [],
    source: [],
    spread: []
  };
}

async function analyzeOszFile(file) {
  const zip = await loadOszZip(file);

  const clapWhistleResults = [];
  const shiftResults = [];
  const offsetSources = [];
  const doubleSvSources = [];
  const kiaiResults = [];
  const kiaiSnapResults = [];
  const svVolumeSources = [];
  const redGreenMatchResults = [];
  const sampleSetResults = [];
  const sliderSettingsResults = [];
  const earlyNoteResults = [];
  const tagResults = [];
  const sourceResults = [];
  const spreadResults = [];

  const osuFiles = Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith(".osu"));

  console.log("osuFiles:", osuFiles.map(entry => entry.name));

  for (const entry of osuFiles) {
    const text = await entry.async("text");
    const mode = parseMode(text);

    // Taiko以外のdiffは完全に無視する
    if (!isTaikoMode(mode)) {
      continue;
    }

    clapWhistleResults.push({
      ...runClapWhistleCheck(text, entry.name),
      mode
    });

    shiftResults.push({
      ...runOffset1msCheck(text, entry.name),
      mode
    });

    offsetSources.push({
      text,
      fileName: entry.name,
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

    sliderSettingsResults.push({
      ...runSliderSettingsCheck(text, entry.name),
      mode
    });

    earlyNoteResults.push({
      ...runEarlyNoteCheck(text, entry.name),
      mode
    });

    tagResults.push({
      ...runTagCheck(text, entry.name),
      mode
    });

    sourceResults.push({
      ...runSourceCheck(text, entry.name),
      mode
    });

    spreadResults.push({
      ...runSpreadCheck(text, entry.name),
      mode
    });
  }

  return {
    clapWhistleResults,
    shiftResults,
    offsetSources,
    doubleSvSources,
    kiaiResults,
    kiaiSnapResults,
    svVolumeSources,
    redGreenMatchResults,
    sampleSetResults,
    sliderSettingsResults,
    earlyNoteResults,
    tagResults,
    sourceResults,
    spreadResults
  };
}

async function processFile(file) {
  if (!file) return null;

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".osu")) {
    const text = await file.text();
    const mode = parseMode(text);

    // Taiko以外の.osuは読み込まない
    if (!isTaikoMode(mode)) {
      return createEmptyProcessResult();
    }

    return {
      clapWhistle: [
        {
          ...runClapWhistleCheck(text, file.name),
          mode
        }
      ],
      offsetSources: [
        { text, fileName: file.name, mode }
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
      volumeCompareSources: [
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
      ],
      sliderSettings: [
        {
          ...runSliderSettingsCheck(text, file.name),
          mode
        }
      ],
      earlyNote: [
        {
          ...runEarlyNoteCheck(text, file.name),
          mode
        }
      ],
      tag: [
        {
          ...runTagCheck(text, file.name),
          mode
        }
      ],
      source: [
        {
          ...runSourceCheck(text, file.name),
          mode
        }
      ],
      spread: [
        {
          ...runSpreadCheck(text, file.name),
          mode
        }
      ],
    };
  }

  if (lowerName.endsWith(".osz")) {
    const analyzed = await analyzeOszFile(file);

    return {
      clapWhistle: analyzed.clapWhistleResults,
      offsetSources: analyzed.offsetSources,
      offset: analyzed.shiftResults,
      doubleSvSources: analyzed.doubleSvSources,
      kiaiCompare: analyzed.kiaiResults,
      kiaiSnap: analyzed.kiaiSnapResults,
      svVolumeSources: analyzed.svVolumeSources,
      volumeCompareSources: analyzed.svVolumeSources,
      redGreenMatch: analyzed.redGreenMatchResults,
      sampleSet: analyzed.sampleSetResults,
      sliderSettings: analyzed.sliderSettingsResults,
      earlyNote: analyzed.earlyNoteResults,
      tag: analyzed.tagResults,
      source: analyzed.sourceResults,
      spread: analyzed.spreadResults,
    };
  }

  throw new Error("invalidFile");
}