function renderClapWhistleResult(results, dom, t) {
  if (!results || !dom.output) return;

  dom.output.textContent = formatMultipleResults(
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

function renderDoubleSvResultFromSources(sources, dom, t) {
  if (!dom.doubleSvOutput) return;

  if (!sources) {
    dom.doubleSvOutput.textContent = t("noFileLoaded");
    return null;
  }

  const results = analyzeDoubleSvSourcesFromSources(sources, dom);
  dom.doubleSvOutput.textContent = formatMultipleDoubleSvResults(results, t);

  return results;
}

function renderKiaiCompareResult(results, dom, t) {
  if (!dom.kiaiOutput) return;

  if (!results) {
    dom.kiaiOutput.textContent = t("noFileLoaded");
    return;
  }

  dom.kiaiOutput.textContent = formatKiaiCompareResult(results, t);
}

function renderKiaiSnapResultFromResults(results, dom, t) {
  if (!dom.kiaiSnapOutput) return;

  if (!results) {
    dom.kiaiSnapOutput.textContent = t("noFileLoaded");
    return;
  }

  dom.kiaiSnapOutput.textContent = formatMultipleKiaiSnapResults(results, t);
}

function analyzeDoubleSvSourcesFromSources(sources, dom) {
  if (!sources) return null;

  const maxGapMs = dom.doubleSvGap
    ? parseInt(dom.doubleSvGap.value, 10)
    : 2;

  const includeExactSame = dom.includeExactSameSv
    ? dom.includeExactSameSv.checked
    : true;

  return sources.map(source =>
    runDoubleSvCheck(source.text, source.fileName, {
      maxGapMs,
      includeExactSame
    })
  );
}

function renderSvVolumeResultFromSources(sources, dom, t) {
  if (!dom.svVolumeOutput) return;

  if (!sources) {
    dom.svVolumeOutput.textContent = t("noFileLoaded");
    return null;
  }

  const thresholdMode = dom.svVolumeThreshold
    ? dom.svVolumeThreshold.value
    : "5ms";

  const results = sources.map(source =>
    runSvVolumeCheck(source.text, source.fileName, {
      thresholdMode
    })
  );

  dom.svVolumeOutput.textContent = formatMultipleSvVolumeResults(results, t);

  return results;
}

function renderRedGreenMatchResultFromResults(results, dom, t) {
  if (!dom.redGreenMatchOutput) return;

  if (!results) {
    dom.redGreenMatchOutput.textContent = t("noFileLoaded");
    return;
  }

  dom.redGreenMatchOutput.textContent = formatMultipleRedGreenMatchResults(results, t);
}

function renderSampleSetResultFromResults(results, dom, t) {
  if (!dom.sampleSetOutput) return;

  if (!results) {
    dom.sampleSetOutput.textContent = t("noFileLoaded");
    return;
  }

  dom.sampleSetOutput.textContent = formatMultipleSampleSetResults(results, t);
}