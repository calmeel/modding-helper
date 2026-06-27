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

function renderBarlineResultFromSources(sources, dom, t) {
  if (!dom.barlineOutput) return;

  if (!sources) {
    dom.barlineOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const results = sources.map(source => ({
    ...runBarlineCheck(source.text, source.fileName),
    mode: source.mode
  }));

  dom.barlineOutput.innerHTML = formatMultipleBarlineResults(results, t);

  return results;
}

function renderOffsetWaveformResultFromSources(sources, dom, t) {
  if (!dom.offsetWaveformCanvas) return null;

  renderOffsetWaveformChart(sources, dom, t);
  return sources;
}

function renderKiaiCompareResult(results, dom, t) {
  if (!dom.kiaiOutput) return;

  if (!results) {
    dom.kiaiOutput.innerHTML = t("noFileLoaded");
    renderKiaiCompareChart(null, dom, t);
    return;
  }

  dom.kiaiOutput.innerHTML = formatKiaiCompareResult(results, t);
  renderKiaiCompareChart(results, dom, t);
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

  return sources.map(source => ({
    ...runDoubleSvCheck(source.text, source.fileName, {
      maxGapMs
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
    renderVolumeCompareChart(null, dom, t);
    return null;
  }

  const result = runVolumeCompareCheck(sources, {
    thresholdOnly: dom.volumeCompareThresholdOnly?.checked ?? true,
    thresholdPercent: 5,
    minDurationOnly: dom.volumeCompareMinDurationOnly?.checked ?? true,
    minDurationMs: 50
  });

  dom.volumeCompareOutput.innerHTML = formatVolumeCompareResult(result, t);
  renderVolumeCompareChart(result, dom, t);

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

function renderSourceResultFromResults(results, dom, t) {
  if (!dom.sourceOutput) return;

  if (!results) {
    dom.sourceOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.sourceOutput.innerHTML = formatMultipleSourceResults(results, t);
}

function renderContentPermissionResultFromResults(results, dom, t) {
  if (!dom.contentPermissionOutput) return;

  if (!results) {
    dom.contentPermissionOutput.textContent =
      t("noFileLoaded");
    return;
  }

  dom.contentPermissionOutput.innerHTML =
    formatMultipleContentPermissionResults(results, t);
}

function renderSliderSettingsResultFromResults(results, dom, t) {
  if (!dom.sliderSettingsOutput) return;

  if (!results) {
    dom.sliderSettingsOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.sliderSettingsOutput.innerHTML = formatMultipleSliderSettingsResults(results, t);
}

function renderEarlyNoteResultFromResults(results, dom, t) {
  if (!dom.earlyNoteOutput) return;

  if (!results) {
    dom.earlyNoteOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.earlyNoteOutput.innerHTML = formatMultipleEarlyNoteResults(results, t);
}

/** スプレッドタブ */
function renderSpreadResultFromResults(spreadState, dom, t) {
  const results = spreadState?.results;

  if (!results) {
    if (dom.spreadOrderOutput) dom.spreadOrderOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadOdHpOutput) dom.spreadOdHpOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadScrollSpeedOutput) dom.spreadScrollSpeedOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadNoteCountOutput) dom.spreadNoteCountOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadDensityOutput) dom.spreadDensityOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadRestMomentsOutput) dom.spreadRestMomentsOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadRestThresholdTable) dom.spreadRestThresholdTable.innerHTML = "";
    if (dom.spreadFinishersOutput) dom.spreadFinishersOutput.innerHTML = t("noFileLoaded");
    renderSpreadScrollChart(null, dom, t);
    renderSpreadDensityChart(null, dom, t);
    if (typeof renderSpreadRestMomentBpmChart === "function") {
      renderSpreadRestMomentBpmChart(null, dom, t);
    }
    return;
  }

  const restMomentOptions = getSpreadRestMomentOptionsFromDom(dom);
  const restResults = applySpreadRestMomentOptions(results, restMomentOptions);

  if (dom.spreadOrderOutput) {
    dom.spreadOrderOutput.innerHTML = formatSpreadDiffOrderTable(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadOdHpOutput) {
    dom.spreadOdHpOutput.innerHTML = formatSpreadOdHpTable(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadNoteCountOutput) {
    dom.spreadNoteCountOutput.innerHTML = formatSpreadNoteCountTable(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadDensityOutput) {
    renderSpreadDensityChart(
      results,
      dom,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories,
      dom.spreadDensityMinDiff
        ? parseInt(dom.spreadDensityMinDiff.value, 10)
        : 1
    );

    dom.spreadDensityOutput.innerHTML = formatSpreadDensityResult(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories,
      dom.spreadDensityMinDiff
        ? parseInt(dom.spreadDensityMinDiff.value, 10)
        : 1
    );
  }

  if (dom.spreadFinishersOutput) {
    dom.spreadFinishersOutput.innerHTML = formatSpreadFinishersTable(
      results,
      t,
      spreadState.diffOrder
    );
  }

  if (dom.spreadRestMomentsOutput) {
    if (typeof renderSpreadRestMomentBpmChart === "function") {
      renderSpreadRestMomentBpmChart(
        restResults,
        dom,
        t,
        spreadState.diffOrder,
        restMomentOptions
      );
    }

    if (dom.spreadRestThresholdTable) {
      dom.spreadRestThresholdTable.innerHTML = formatSpreadRestThresholdTable(
        restResults,
        t,
        spreadState.diffOrder,
        restMomentOptions
      );
    }

    dom.spreadRestMomentsOutput.innerHTML = formatSpreadRestMomentsResult(
      restResults,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadScrollSpeedOutput) {
    const scrollGradientMode = getSpreadScrollGradientModeFromDom(dom);
    const scrollIgnoreFinishers = getSpreadScrollIgnoreFinishersFromDom(dom);
    if (spreadState) {
      spreadState.scrollGradientMode = scrollGradientMode;
      spreadState.scrollIgnoreFinishers = scrollIgnoreFinishers;
    }

    renderSpreadScrollChart(
      results,
      dom,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );

    dom.spreadScrollSpeedOutput.innerHTML = formatSpreadScrollSpeedResult(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories,
      scrollGradientMode,
      scrollIgnoreFinishers
    );
  }

  updateSpreadSubtabIssueStates({
    ...spreadState,
    results: restResults
  });
}

/** その他タブ：プレビューポイント */
function renderPreviewPointResultFromResults(results, dom, t) {
  if (!dom.previewPointOutput) return;

  if (!results) {
    dom.previewPointOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.previewPointOutput.innerHTML = formatPreviewPointResult(results, t);
}

/** その他タブ：BGオフセット */
function renderBgOffsetResultFromResults(results, dom, t) {
  if (!dom.bgOffsetOutput) return;

  if (!results) {
    dom.bgOffsetOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.bgOffsetOutput.innerHTML = formatBgOffsetResult(results, t);
}

/** その他タブ：てんかん警告 */
function renderEpilepsyWarningResultFromResults(results, dom, t) {
  if (!dom.epilepsyWarningOutput) return;

  if (!results) {
    dom.epilepsyWarningOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.epilepsyWarningOutput.innerHTML = formatMultipleEpilepsyWarningResults(results, t);
}

/** アーティスト・タイトル */
function renderArtistResultFromResults(results, dom, t) {
  if (!dom.artistOutput) return;

  if (!results) {
    dom.artistOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.artistOutput.innerHTML = formatMultipleArtistResults(results, t);
}

function renderTitleResultFromResults(results, dom, t) {
  if (!dom.titleOutput) return;

  if (!results) {
    dom.titleOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.titleOutput.innerHTML = formatMultipleTitleResults(results, t);
}

/** タイムライン表示 */
function renderTimelineResultFromSources(sources, dom, t, options = {}) {
  if (!dom.timelineOutput) return null;

  if (!sources) {
    dom.timelineOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const result = runTimelineCheck(sources, {
    diffOrder: options.diffOrder ?? []
  });

  dom.timelineOutput.innerHTML = formatTimelineResult(result, t);

  return result;
}

