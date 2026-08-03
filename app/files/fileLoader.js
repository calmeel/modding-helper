/** Taikoモード以外の譜面を読み込み対象から除外する */
function isTaikoMode(mode) {
  return mode === 1;
}

function createEmptyProcessResult() {
  return {
    clapWhistle: [],
    offsetSources: [],
    offset: [],
    doubleSvSources: [],
    barlineSources: [],
    unappliedSv: [],
    offsetWaveformSources: [],
    kiaiCompare: [],
    kiaiSnap: [],
    svVolumeSources: [],
    volumeCompareSources: [],
    redGreenMatch: [],
    sampleSet: [],
    sliderSettings: [],
    earlyNote: [],
    artist: [],
    title: [],
    source: [],
    tag: [],
    previewPoint: [],
    bgOffset: [],
    epilepsyWarning: [],
    spread: [],
    contentPermission: []
  };
}

function resetDifficultyNameRegistry() {
  if (typeof window === "undefined") return;
  window.moddingHelperDifficultyNames = new Map();
}

function registerDifficultyName(fileName, text) {
  const difficultyName = parseMetadataValue(text, "Version");

  if (
    fileName &&
    difficultyName &&
    typeof window !== "undefined" &&
    window.moddingHelperDifficultyNames
  ) {
    window.moddingHelperDifficultyNames.set(fileName, difficultyName);
  }

  return difficultyName;
}

async function analyzeOszFile(file) {
  const zip = await loadOszZip(file);

  const clapWhistleResults = [];
  const shiftResults = [];
  const offsetSources = [];
  const doubleSvSources = [];
  const barlineSources = [];
  const unappliedSvResults = [];
  const offsetWaveformSources = [];
  const kiaiResults = [];
  const kiaiSnapResults = [];
  const svVolumeSources = [];
  const redGreenMatchResults = [];
  const sampleSetResults = [];
  const sliderSettingsResults = [];
  const earlyNoteResults = [];
  const artistResults = [];
  const titleResults = [];
  const sourceResults = [];
  const tagResults = [];
  const previewPointResults = [];
  const bgOffsetResults = [];
  const epilepsyWarningResults = [];
  const spreadResults = [];
  const contentPermissionResults = [];

  const osuFiles = Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith(".osu"));
  const audioBlobCache = new Map();
  const audioBytesCache = new Map();
  const audioDurationCache = new Map();
  const bgImageTypeCache = new Map();

  for (const entry of osuFiles) {
    const text = await entry.async("text");
    registerDifficultyName(entry.name, text);
    const mode = parseMode(text);

    // Taiko以外のdiffは完全に無視する
    if (!isTaikoMode(mode)) {
      continue;
    }

    clapWhistleResults.push(runClapWhistleCheck(text, entry.name));

    shiftResults.push(runOffset1msCheck(text, entry.name));

    offsetSources.push({
      text,
      fileName: entry.name
    });

    doubleSvSources.push({
      text,
      fileName: entry.name
    });

    barlineSources.push({
      text,
      fileName: entry.name
    });

    unappliedSvResults.push(runUnappliedSvCheck(text, entry.name));

    const audioFileName = parseOffsetAudioFilename(text);
    const audioEntry = findOszAudioEntry(zip, entry.name, audioFileName);
    let audioBlob = null;
    let audioBytes = null;
    let audioDurationMs = 0;

    if (audioEntry) {
      if (!audioBlobCache.has(audioEntry.name)) {
        audioBlobCache.set(audioEntry.name, await audioEntry.async("blob"));
      }
      audioBlob = audioBlobCache.get(audioEntry.name);

      if (!audioDurationCache.has(audioEntry.name)) {
        audioDurationCache.set(audioEntry.name, await getAudioDurationMsFromBlob(audioBlob));
      }
      audioDurationMs = audioDurationCache.get(audioEntry.name) ?? 0;

      if (/\.mp3$/i.test(audioEntry.name)) {
        if (!audioBytesCache.has(audioEntry.name)) {
          audioBytesCache.set(audioEntry.name, await audioEntry.async("uint8array"));
        }
        audioBytes = audioBytesCache.get(audioEntry.name);
      }
    }

    offsetWaveformSources.push({
      text,
      fileName: entry.name,
      audioFileName,
      audioEntryName: audioEntry?.name ?? "",
      audioBlob,
      audioDurationMs
    });

    kiaiResults.push(runKiaiAnalyze(text, entry.name, { audioDurationMs }));

    kiaiSnapResults.push(runKiaiSnapCheck(text, entry.name));

    svVolumeSources.push({
      text,
      fileName: entry.name,
      audioDurationMs
    });

    redGreenMatchResults.push(runRedGreenMatchCheck(text, entry.name));

    sampleSetResults.push(runSampleSetCheck(text, entry.name));

    sliderSettingsResults.push(runSliderSettingsCheck(text, entry.name));

    earlyNoteResults.push(runEarlyNoteCheck(text, entry.name));

    artistResults.push(runArtistCheck(text, entry.name));

    titleResults.push(runTitleCheck(text, entry.name));

    sourceResults.push(runSourceCheck(text, entry.name));

    tagResults.push(runTagCheck(text, entry.name));

    previewPointResults.push(
      runPreviewPointCheck(text, entry.name, {
        audioFileName,
        audioEntryName: audioEntry?.name ?? "",
        audioBytes
      })
    );

    const bgOffsetResult = runBgOffsetCheck(text, entry.name);
    await attachBgImageTypesFromOsz(
      bgOffsetResult,
      zip,
      entry.name,
      bgImageTypeCache
    );

    bgOffsetResults.push(bgOffsetResult);

    epilepsyWarningResults.push(runKiaiFlashCheck(text, entry.name));

    spreadResults.push({
      ...runSpreadCheck(text, entry.name),
      audioDurationMs
    });

    contentPermissionResults.push(runContentPermissionCheck(text, entry.name));
  }

  return {
    clapWhistleResults,
    shiftResults,
    offsetSources,
    doubleSvSources,
    barlineSources,
    unappliedSvResults,
    offsetWaveformSources,
    kiaiResults,
    kiaiSnapResults,
    svVolumeSources,
    redGreenMatchResults,
    sampleSetResults,
    sliderSettingsResults,
    earlyNoteResults,
    artistResults,
    titleResults,
    sourceResults,
    tagResults,
    previewPointResults,
    bgOffsetResults,
    epilepsyWarningResults,
    spreadResults,
    contentPermissionResults
  };
}

async function processFile(file) {
  if (!file) return null;

  resetDifficultyNameRegistry();

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".osu")) {
    const text = await file.text();
    registerDifficultyName(file.name, text);
    const mode = parseMode(text);

    // Taiko以外の.osuは読み込まない
    if (!isTaikoMode(mode)) {
      return createEmptyProcessResult();
    }

    return {
      clapWhistle: [
        runClapWhistleCheck(text, file.name)
      ],
      offsetSources: [
        { text, fileName: file.name }
      ],
      offset: [
        runOffset1msCheck(text, file.name)
      ],
      doubleSvSources: [
        { text, fileName: file.name }
      ],
      barlineSources: [
        { text, fileName: file.name }
      ],
      unappliedSv: [
        runUnappliedSvCheck(text, file.name)
      ],
      offsetWaveformSources: [
        {
          text,
          fileName: file.name,
          audioFileName: parseOffsetAudioFilename(text),
          audioEntryName: "",
          audioBlob: null,
          audioDurationMs: 0
        }
      ],
      kiaiCompare: [
        runKiaiAnalyze(text, file.name, { audioDurationMs: 0 })
      ],
      kiaiSnap: [
        runKiaiSnapCheck(text, file.name)
      ],
      svVolumeSources: [
        { text, fileName: file.name, audioDurationMs: 0 }
      ],
      volumeCompareSources: [
        { text, fileName: file.name, audioDurationMs: 0 }
      ],
      redGreenMatch: [
        runRedGreenMatchCheck(text, file.name)
      ],
      sampleSet: [
        runSampleSetCheck(text, file.name)
      ],
      sliderSettings: [
        runSliderSettingsCheck(text, file.name)
      ],
      earlyNote: [
        runEarlyNoteCheck(text, file.name)
      ],
      artist: [
        runArtistCheck(text, file.name)
      ],
      title: [
        runTitleCheck(text, file.name)
      ],
      source: [
        runSourceCheck(text, file.name)
      ],
      tag: [
        runTagCheck(text, file.name)
      ],
      previewPoint: [
        runPreviewPointCheck(text, file.name, {
          audioFileName: parseOffsetAudioFilename(text)
        })
      ],
      bgOffset: [
        runBgOffsetCheck(text, file.name)
      ],
      epilepsyWarning: [
        runKiaiFlashCheck(text, file.name)
      ],
      spread: [
        {
          ...runSpreadCheck(text, file.name),
          audioDurationMs: 0
        }
      ],
      contentPermission: [
        runContentPermissionCheck(text, file.name)
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
      barlineSources: analyzed.barlineSources,
      unappliedSv: analyzed.unappliedSvResults,
      offsetWaveformSources: analyzed.offsetWaveformSources,
      kiaiCompare: analyzed.kiaiResults,
      kiaiSnap: analyzed.kiaiSnapResults,
      svVolumeSources: analyzed.svVolumeSources,
      volumeCompareSources: analyzed.svVolumeSources,
      redGreenMatch: analyzed.redGreenMatchResults,
      sampleSet: analyzed.sampleSetResults,
      sliderSettings: analyzed.sliderSettingsResults,
      earlyNote: analyzed.earlyNoteResults,
      artist: analyzed.artistResults,
      title: analyzed.titleResults,
      source: analyzed.sourceResults,
      tag: analyzed.tagResults,
      previewPoint: analyzed.previewPointResults,
      bgOffset: analyzed.bgOffsetResults,
      epilepsyWarning: analyzed.epilepsyWarningResults,
      spread: analyzed.spreadResults,
      contentPermission: analyzed.contentPermissionResults,
    };
  }

  throw new Error("invalidFile");
}

async function attachBgImageTypesFromOsz(result, zip, osuEntryName, cache) {
  for (const bg of result?.backgrounds ?? []) {
    const imageEntry = findOszImageEntry(zip, osuEntryName, bg.fileName);

    bg.imageEntryName = imageEntry?.name ?? "";
    bg.actualImageType = "";
    bg.imageTypeMismatch = null;

    if (!imageEntry) continue;

    if (!cache.has(imageEntry.name)) {
      const bytes = await imageEntry.async("uint8array");
      cache.set(imageEntry.name, detectBgImageTypeFromBytes(bytes));
    }

    bg.actualImageType = cache.get(imageEntry.name) ?? "";
    bg.imageTypeMismatch = getBgImageTypeMismatch(
      bg.imageType,
      bg.actualImageType
    );
  }
}

async function getAudioDurationMsFromBlob(audioBlob) {
  if (!audioBlob) return 0;
  return getAudioDurationMsFromElement(audioBlob);
}

function getAudioDurationMsFromElement(audioBlob) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio();
    let settled = false;

    const cleanup = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.floor(value * 1000) : 0);
    };

    const timeoutId = setTimeout(() => cleanup(0), 1200);

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => cleanup(audio.duration), { once: true });
    audio.addEventListener("error", () => cleanup(0), { once: true });
    audio.src = url;
  });
}

function findOszImageEntry(zip, osuEntryName, imageFileName) {
  if (!imageFileName) return null;

  const normalizedImageName = normalizeOszPath(imageFileName);
  const osuDir = getOszEntryDirectory(osuEntryName);
  const relativeTarget = normalizeOszPath(`${osuDir}${imageFileName}`);

  const entries = Object.values(zip.files)
    .filter(entry => !entry.dir);

  return entries.find(entry => normalizeOszPath(entry.name) === relativeTarget) ??
    entries.find(entry => normalizeOszPath(entry.name) === normalizedImageName) ??
    entries.find(entry => getOszEntryBaseName(entry.name) === getOszEntryBaseName(imageFileName)) ??
    null;
}

function findOszAudioEntry(zip, osuEntryName, audioFileName) {
  if (!audioFileName) return null;

  const normalizedAudioName = normalizeOszPath(audioFileName);
  const osuDir = getOszEntryDirectory(osuEntryName);
  const relativeTarget = normalizeOszPath(`${osuDir}${audioFileName}`);

  const entries = Object.values(zip.files)
    .filter(entry => !entry.dir)
    .filter(entry => /\.(mp3|ogg)$/i.test(entry.name));

  return entries.find(entry => normalizeOszPath(entry.name) === relativeTarget) ??
    entries.find(entry => normalizeOszPath(entry.name) === normalizedAudioName) ??
    entries.find(entry => getOszEntryBaseName(entry.name) === getOszEntryBaseName(audioFileName)) ??
    null;
}

function normalizeOszPath(path) {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .toLowerCase();
}

function getOszEntryDirectory(path) {
  const normalized = String(path ?? "").replace(/\\/g, "/");
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(0, slashIndex + 1) : "";
}

function getOszEntryBaseName(path) {
  const normalized = normalizeOszPath(path);
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}
