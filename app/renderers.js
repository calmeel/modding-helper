function renderClapWhistleResult(results, dom, t) {
  if (!results || !dom.output) return;

  dom.output.innerHTML = formatMultipleResults(
    results,
    t,
    dom.showClap,
    dom.showWhistle
  );
}

function renderOffsetResult(results, dom, t) {
  if (!results || !dom.shiftOutput) return;

  dom.shiftOutput.innerHTML = formatMultipleShiftResults(results, t);
}

function renderOffsetResultFromSources(sources, dom, t) {
  if (!dom.shiftOutput) return null;

  if (!sources) {
    dom.shiftOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const includeAdvancedSnaps = dom.includeAdvancedOffsetSnaps
    ? dom.includeAdvancedOffsetSnaps.checked
    : false;

  const results = sources.map(source => ({
    ...runOffset1msCheck(source.text, source.fileName, {
      includeAdvancedSnaps
    }),
    mode: source.mode
  }));

  dom.shiftOutput.innerHTML = formatMultipleShiftResults(results, t);

  return results;
}

function renderDoubleSvResultFromSources(sources, dom, t) {
  if (!dom.doubleSvOutput) return;

  if (!sources) {
    dom.doubleSvOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const results = analyzeDoubleSvSourcesFromSources(sources, dom);
  dom.doubleSvOutput.innerHTML = formatMultipleDoubleSvResults(results, t);

  return results;
}

function renderKiaiCompareResult(results, dom, t) {
  if (!dom.kiaiOutput) return;

  if (!results) {
    dom.kiaiOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.kiaiOutput.innerHTML = formatKiaiCompareResult(results, t);
}

function renderKiaiSnapResultFromResults(results, dom, t) {
  if (!dom.kiaiSnapOutput) return;

  if (!results) {
    dom.kiaiSnapOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.kiaiSnapOutput.innerHTML = formatMultipleKiaiSnapResults(results, t);
}

function analyzeDoubleSvSourcesFromSources(sources, dom) {
  if (!sources) return null;

  const maxGapMs = dom.doubleSvGap
    ? parseInt(dom.doubleSvGap.value, 10)
    : 2;

  const includeExactSame = dom.includeExactSameSv
    ? dom.includeExactSameSv.checked
    : true;

  return sources.map(source => ({
    ...runDoubleSvCheck(source.text, source.fileName, {
      maxGapMs,
      includeExactSame
    }),
    mode: source.mode
  }));
}

function renderSvVolumeResultFromSources(sources, dom, t) {
  if (!dom.svVolumeOutput) return;

  if (!sources) {
    dom.svVolumeOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const thresholdMode = dom.svVolumeThreshold
    ? dom.svVolumeThreshold.value
    : "16snap";

  const largeChangeOnly = dom.svVolumeLargeChangeOnly
    ? dom.svVolumeLargeChangeOnly.checked
    : false;

  const results = sources.map(source => ({
    ...runSvVolumeCheck(source.text, source.fileName, {
      thresholdMode,
      largeChangeOnly,
      largeChangeThreshold: 15
    }),
    mode: source.mode
  }));
  
  dom.svVolumeOutput.innerHTML = formatMultipleSvVolumeResults(results, t);

  return results;
}

function renderRedGreenMatchResultFromResults(results, dom, t) {
  if (!dom.redGreenMatchOutput) return;

  if (!results) {
    dom.redGreenMatchOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.redGreenMatchOutput.innerHTML = formatMultipleRedGreenMatchResults(results, t);
}

function renderSampleSetResultFromResults(results, dom, t) {
  if (!dom.sampleSetOutput) return;

  if (!results) {
    dom.sampleSetOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.sampleSetOutput.innerHTML = formatMultipleSampleSetResults(results, t);
}

function renderVolumeCompareResultFromSources(sources, dom, t) {
  if (!dom.volumeCompareOutput) return null;

  if (!sources) {
    dom.volumeCompareOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const thresholdOnly = dom.volumeCompareThresholdOnly
    ? dom.volumeCompareThresholdOnly.checked
    : false;

  const result = runVolumeCompareCheck(sources, {
    thresholdOnly,
    thresholdPercent: 5
  });

  dom.volumeCompareOutput.innerHTML = formatVolumeCompareResult(result, t);

  return result;
}

function renderTagResultFromResults(results, dom, t) {
  if (!dom.tagOutput) return;

  if (!results) {
    dom.tagOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.tagOutput.innerHTML = formatMultipleTagResults(results, t);
}