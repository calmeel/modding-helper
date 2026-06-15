document.addEventListener("DOMContentLoaded", () => {
  const langEn = document.getElementById("langEn");
  const langJa = document.getElementById("langJa");
  const manualLink = document.getElementById("manualLink");
  const updateHistoryContent = document.getElementById("updateHistoryContent");
  const fileInput = document.getElementById("fileInput");
  const output = document.getElementById("output");
  const showClap = document.getElementById("showClap");
  const showWhistle = document.getElementById("showWhistle");
  const fileName = document.getElementById("fileName");
  const dropArea = document.querySelector(".drop-area");
  const shiftOutput = document.getElementById("shiftOutput");
  const includeAdvancedOffsetSnaps = document.getElementById("includeAdvancedOffsetSnaps");
  const doubleSvOutput = document.getElementById("doubleSvOutput");
  const doubleSvGap = document.getElementById("doubleSvGap");
  const includeExactSameSv = document.getElementById("includeExactSameSv");
  const kiaiOutput = document.getElementById("kiaiOutput");
  const kiaiCompareChartSection = document.getElementById("kiaiCompareChartSection");
  const kiaiCompareChartWrap = document.getElementById("kiaiCompareChartWrap");
  const kiaiCompareChart = document.getElementById("kiaiCompareChart");
  const kiaiCompareChartTooltip = document.getElementById("kiaiCompareChartTooltip");
  const kiaiCompareChartEmpty = document.getElementById("kiaiCompareChartEmpty");
  const kiaiCompareResetZoom = document.getElementById("kiaiCompareResetZoom");
  const kiaiSnapOutput = document.getElementById("kiaiSnapOutput");
  const svVolumeOutput = document.getElementById("svVolumeOutput");
  const svVolumeThreshold = document.getElementById("svVolumeThreshold");
  const volumeCompareOutput = document.getElementById("volumeCompareOutput");
  const volumeCompareThresholdOnly = document.getElementById("volumeCompareThresholdOnly");
  const volumeCompareMinDurationOnly = document.getElementById("volumeCompareMinDurationOnly");
  const volumeCompareChartSection = document.getElementById("volumeCompareChartSection");
  const volumeCompareChartWrap = document.getElementById("volumeCompareChartWrap");
  const volumeCompareChart = document.getElementById("volumeCompareChart");
  const volumeCompareChartTooltip = document.getElementById("volumeCompareChartTooltip");
  const volumeCompareChartEmpty = document.getElementById("volumeCompareChartEmpty");
  const volumeCompareDiffToggles = document.getElementById("volumeCompareDiffToggles");
  const volumeCompareResetZoom = document.getElementById("volumeCompareResetZoom");
  const volumeCompareShowDifferences = document.getElementById("volumeCompareShowDifferences");
  const volumeCompareShowKiai = document.getElementById("volumeCompareShowKiai");
  const volumeCompareShowBreaks = document.getElementById("volumeCompareShowBreaks");
  const redGreenMatchOutput = document.getElementById("redGreenMatchOutput");
  const sampleSetOutput = document.getElementById("sampleSetOutput");
  const svVolumeLargeChangeOnly = document.getElementById("svVolumeLargeChangeOnly");
  const sliderSettingsOutput = document.getElementById("sliderSettingsOutput");
  const earlyNoteOutput = document.getElementById("earlyNoteOutput");
  const artistOutput = document.getElementById("artistOutput");
  const titleOutput = document.getElementById("titleOutput");
  const sourceOutput = document.getElementById("sourceOutput");
  const tagOutput = document.getElementById("tagOutput");
  const previewPointOutput = document.getElementById("previewPointOutput");
  const bgOffsetOutput = document.getElementById("bgOffsetOutput");
  const epilepsyWarningOutput = document.getElementById("epilepsyWarningOutput");
  const spreadOdHpOutput = document.getElementById("spreadOdHpOutput");
  const spreadOrderOutput = document.getElementById("spreadOrderOutput");
  const spreadResetOrderButton = document.getElementById("spreadResetOrderButton");
  const spreadNoteCountOutput = document.getElementById("spreadNoteCountOutput");
  const spreadDensityOutput = document.getElementById("spreadDensityOutput");
  const spreadDensityMinDiff = document.getElementById("spreadDensityMinDiff");
  const spreadDensityChartSection = document.getElementById("spreadDensityChartSection");
  const spreadDensityChartWrap = document.getElementById("spreadDensityChartWrap");
  const spreadDensityChart = document.getElementById("spreadDensityChart");
  const spreadDensityChartTooltip = document.getElementById("spreadDensityChartTooltip");
  const spreadDensityChartEmpty = document.getElementById("spreadDensityChartEmpty");
  const spreadDensityDiffToggles = document.getElementById("spreadDensityDiffToggles");
  const spreadDensityResetZoom = document.getElementById("spreadDensityResetZoom");
  const spreadDensityShowInversions = document.getElementById("spreadDensityShowInversions");
  const spreadFinishersOutput = document.getElementById("spreadFinishersOutput");
  const spreadScrollSpeedOutput = document.getElementById("spreadScrollSpeedOutput");
  const spreadScrollChartSection = document.getElementById("spreadScrollChartSection");
  const spreadScrollChartWrap = document.getElementById("spreadScrollChartWrap");
  const spreadScrollChart = document.getElementById("spreadScrollChart");
  const spreadScrollChartTooltip = document.getElementById("spreadScrollChartTooltip");
  const spreadScrollDeltaHeader = document.getElementById("spreadScrollDeltaHeader");
  const spreadScrollDeltaChartWrap = document.getElementById("spreadScrollDeltaChartWrap");
  const spreadScrollDeltaChart = document.getElementById("spreadScrollDeltaChart");
  const spreadScrollDeltaChartTooltip = document.getElementById("spreadScrollDeltaChartTooltip");
  const spreadScrollChartEmpty = document.getElementById("spreadScrollChartEmpty");
  const spreadScrollDiffToggles = document.getElementById("spreadScrollDiffToggles");
  const spreadScrollResetZoom = document.getElementById("spreadScrollResetZoom");
  const spreadScrollDetailedTooltip = document.getElementById("spreadScrollDetailedTooltip");
  const spreadScrollVisualBpm = document.getElementById("spreadScrollVisualBpm");
  const spreadScrollGraphTitle = document.getElementById("spreadScrollGraphTitle");
  const spreadScrollDeltaGraphTitle = document.getElementById("spreadScrollDeltaGraphTitle");
  const spreadScrollShowLimits = document.getElementById("spreadScrollShowLimits");
  const spreadScrollShowRapidChanges = document.getElementById("spreadScrollShowRapidChanges");
  const spreadScrollShowProgression = document.getElementById("spreadScrollShowProgression");
  const spreadScrollShowConsistency = document.getElementById("spreadScrollShowConsistency");
  const contentPermissionOutput = document.getElementById("contentPermissionOutput");
  const timelineOutput = document.getElementById("timelineOutput");
  const timelineRunButton = document.getElementById("timelineRunButton");
  /** BN評価 */
  const bnBeforeFileInput = document.getElementById("bnBeforeFileInput");
  const bnAfterFileInput = document.getElementById("bnAfterFileInput");
  const bnBeforeFileName = document.getElementById("bnBeforeFileName");
  const bnAfterFileName = document.getElementById("bnAfterFileName");
  const bnDiffMatchingArea = document.getElementById("bnDiffMatchingArea");
  const bnCompareRunButton = document.getElementById("bnCompareRunButton");
  const bnPairSelect = document.getElementById("bnPairSelect");
  const bnNotesOutput = document.getElementById("bnNotesOutput");
  const bnTimelineOutput = document.getElementById("bnTimelineOutput");
  const bnTimingOutput = document.getElementById("bnTimingOutput");
  const bnMetadataOutput = document.getElementById("bnMetadataOutput");
  const bnDifficultyOutput = document.getElementById("bnDifficultyOutput");
  const bnApplyRedOffsetButton = document.getElementById("bnApplyRedOffsetButton");
  const bnOffsetStatus = document.getElementById("bnOffsetStatus");
  const bnSvChangeThreshold = document.getElementById("bnSvChangeThreshold");

  const i18nData = window.i18n;

  const savedLang = localStorage.getItem("moddingHelperLang");

  let currentLang = savedLang
    ? savedLang
    : ((navigator.language || navigator.userLanguage || "").startsWith("ja") ? "ja" : "en");

  if (!savedLang) {
    localStorage.setItem("moddingHelperLang", currentLang);
  }

  function t(key) {
    return i18nData[currentLang][key] || i18nData.en[key] || key;
  }

  const dom = {
    output,
    showClap,
    showWhistle,
    shiftOutput,
    includeAdvancedOffsetSnaps,
    doubleSvOutput,
    doubleSvGap,
    includeExactSameSv,
    kiaiOutput,
    kiaiCompareChartSection,
    kiaiCompareChartWrap,
    kiaiCompareChart,
    kiaiCompareChartTooltip,
    kiaiCompareChartEmpty,
    kiaiCompareResetZoom,
    kiaiSnapOutput,
    svVolumeOutput,
    svVolumeThreshold,
    svVolumeLargeChangeOnly,
    volumeCompareOutput,
    volumeCompareThresholdOnly,
    volumeCompareMinDurationOnly,
    volumeCompareChartSection,
    volumeCompareChartWrap,
    volumeCompareChart,
    volumeCompareChartTooltip,
    volumeCompareChartEmpty,
    volumeCompareDiffToggles,
    volumeCompareResetZoom,
    volumeCompareShowDifferences,
    volumeCompareShowKiai,
    volumeCompareShowBreaks,
    redGreenMatchOutput,
    sampleSetOutput,
    sliderSettingsOutput,
    earlyNoteOutput,
    artistOutput,
    titleOutput,
    sourceOutput,
    tagOutput,
    previewPointOutput,
    bgOffsetOutput,
    epilepsyWarningOutput,
    spreadOdHpOutput,
    spreadOrderOutput,
    spreadResetOrderButton,
    spreadNoteCountOutput,
    spreadDensityOutput,
    spreadDensityMinDiff,
    spreadDensityChartSection,
    spreadDensityChartWrap,
    spreadDensityChart,
    spreadDensityChartTooltip,
    spreadDensityChartEmpty,
    spreadDensityDiffToggles,
    spreadDensityResetZoom,
    spreadDensityShowInversions,
    spreadFinishersOutput,
    spreadScrollSpeedOutput,
    spreadScrollChartSection,
    spreadScrollChartWrap,
    spreadScrollChart,
    spreadScrollChartTooltip,
    spreadScrollDeltaHeader,
    spreadScrollDeltaChartWrap,
    spreadScrollDeltaChart,
    spreadScrollDeltaChartTooltip,
    spreadScrollChartEmpty,
    spreadScrollDiffToggles,
    spreadScrollResetZoom,
    spreadScrollDetailedTooltip,
    spreadScrollVisualBpm,
    spreadScrollGraphTitle,
    spreadScrollDeltaGraphTitle,
    spreadScrollShowLimits,
    spreadScrollShowRapidChanges,
    spreadScrollShowProgression,
    spreadScrollShowConsistency,
    contentPermissionOutput,
    timelineOutput,
    timelineRunButton,
    bnNotesOutput,
    bnTimelineOutput,
    bnTimingOutput,
    bnMetadataOutput,
    bnDifficultyOutput,
    bnSvChangeThreshold,
  };

  const state = {
    clapWhistle: null,
    offsetSources: null,
    offset: null,
    doubleSvSources: null,
    doubleSvResults: null,
    kiaiCompare: null,
    kiaiSnap: null,
    selectedFileName: null,
    svVolumeSources: null,
    svVolumeResults: null,
    volumeCompareSources: null,
    volumeCompareResult: null,
    redGreenMatch: null,
    sampleSet: null,
    sliderSettings: null,
    earlyNote: null,
    artist: null,
    title: null,
    source: null,
    tag: null,
    previewPoint: null,
    bgOffset: null,
    epilepsyWarning: null,
    spread: {
      results: null,
      diffOrder: [],
      manualCategories: {}
    },
    contentPermission: null,
    timelineSources: null,
    timeline: null,
    bnCompare: {
      beforeFileName: null,
      afterFileName: null,
      beforeDiffs: [],
      afterDiffs: [],
      resultsByPair: [],
      selectedPairId: null,
      offsetMs: 0,
      svChangeThreshold: "all"
    }
  };

  setupFileInput(fileInput, handleFile);
  setupDropArea(dropArea, handleFile);

  setupLanguageButtons(
    langEn,
    langJa,
    () => currentLang,
    (lang) => {
      currentLang = lang;
    },
    applyLanguage
  );

  setupTabs();
  
  setupSpreadSubtabs();
  
  setupSpreadOrderControls({
    state,
    dom,
    t,
    renderSpreadResult
  });

  setupTabVisibilitySettings();
  const bnCompareUi = setupBnCompareUi({
    state,
    dom,
    t,
    bnBeforeFileInput,
    bnAfterFileInput,
    bnBeforeFileName,
    bnAfterFileName,
    bnDiffMatchingArea,
    bnCompareRunButton,
    bnPairSelect,
    bnApplyRedOffsetButton,
    bnOffsetStatus,
    bnSvChangeThreshold
  });

  if (timelineRunButton) {
    timelineRunButton.addEventListener("click", renderTimelineResult);
  }

  function applyLanguage() {
    document.documentElement.lang = currentLang === "ja" ? "ja" : "en";

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });

    if (fileName) {
      fileName.textContent = state.selectedFileName || t("noFileSelected");
    }

    if (langEn) langEn.classList.toggle("active", currentLang === "en");
    if (langJa) langJa.classList.toggle("active", currentLang === "ja");
    if (manualLink) {
      manualLink.href = currentLang === "ja" ? "docs/docs.html" : "docs/docs-en.html";
    }
    if (updateHistoryContent) {
      renderUpdateHistory(updateHistoryContent, currentLang);
    }

    if (!state.clapWhistle && output) {
      output.textContent = t("noFileLoaded");
    }

    if (!state.offset && shiftOutput) {
      shiftOutput.textContent = t("noFileLoaded");
    }

    if (!state.kiaiCompare && kiaiOutput) {
      kiaiOutput.textContent = t("noFileLoaded");
    }

    if (!state.kiaiSnap && kiaiSnapOutput) {
      kiaiSnapOutput.textContent = t("noFileLoaded");
    }

    if (!state.doubleSvSources && doubleSvOutput) {
      doubleSvOutput.textContent = t("noFileLoaded");
    }

    if (!state.redGreenMatch && redGreenMatchOutput) {
      redGreenMatchOutput.textContent = t("noFileLoaded");
    }

    if (!state.sampleSet && sampleSetOutput) {
      sampleSetOutput.textContent = t("noFileLoaded");
    }

    if (!state.sliderSettings && sliderSettingsOutput) {
      sliderSettingsOutput.textContent = t("noFileLoaded");
    }

    if (!state.earlyNote && earlyNoteOutput) {
      earlyNoteOutput.textContent = t("noFileLoaded");
    }

    if (!state.artist && artistOutput) {
      artistOutput.textContent = t("noFileLoaded");
    }

    if (!state.title && titleOutput) {
      titleOutput.textContent = t("noFileLoaded");
    }

    if (!state.source && sourceOutput) {
      sourceOutput.textContent = t("noFileLoaded");
    }

    if (!state.tag && tagOutput) {
      tagOutput.textContent = t("noFileLoaded");
    }

    if (!state.previewPoint && previewPointOutput) {
      previewPointOutput.textContent = t("noFileLoaded");
    }

    if (!state.bgOffset && bgOffsetOutput) {
      bgOffsetOutput.textContent = t("noFileLoaded");
    }

    if (!state.epilepsyWarning && epilepsyWarningOutput) {
      epilepsyWarningOutput.textContent = t("noFileLoaded");
    }

    if (!state.spread && spreadOdHpOutput) {
      spreadOdHpOutput.textContent = t("noFileLoaded");
    }

    if (!state.contentPermission && contentPermissionOutput) {
      contentPermissionOutput.textContent = t("noFileLoaded");
    }

    if (!state.timeline && timelineOutput) {
      timelineOutput.textContent = t("timelineNotRendered");
    }

    renderResult();
    renderShiftResult();
    renderKiaiResult();
    renderKiaiSnapResult();
    renderDoubleSvResult();
    renderSvVolumeResult();
    renderVolumeCompareResult();
    renderRedGreenMatchResult();
    renderSampleSetResult();
    renderSliderSettingsResult();
    renderEarlyNoteResult();
    renderArtistResult();
    renderTitleResult();
    renderSourceResult();
    renderTagResult();
    renderPreviewPointResult();
    renderBgOffsetResult();
    renderEpilepsyWarningResult();
    renderSpreadResult();
    renderContentPermissionResult();

    if (state.timeline) {
      renderTimelineResult();
    }

    updateTabIssueStates(state);
    bnCompareUi.renderBnSelectedResult();
  }

  function renderResult() {
    renderClapWhistleResult(state.clapWhistle, dom, t);
  }

  function renderShiftResult() {
    state.offset = renderOffsetResultFromSources(
      state.offsetSources,
      dom,
      t
    );
  }

  function renderDoubleSvResult() {
    state.doubleSvResults = renderDoubleSvResultFromSources(
      state.doubleSvSources,
      dom,
      t
    );
  }

  function renderKiaiResult() {
    renderKiaiCompareResult(state.kiaiCompare, dom, t);
  }

  function renderKiaiSnapResult() {
    renderKiaiSnapResultFromResults(state.kiaiSnap, dom, t);
  }

  function renderSvVolumeResult() {
    state.svVolumeResults = renderSvVolumeResultFromSources(
      state.svVolumeSources,
      dom,
      t
    );
  }

  function renderVolumeCompareResult() {
    state.volumeCompareResult = renderVolumeCompareResultFromSources(
      state.volumeCompareSources,
      dom,
      t
    );
  }

  function renderRedGreenMatchResult() {
    renderRedGreenMatchResultFromResults(
      state.redGreenMatch,
      dom,
      t
    );
  }

  function renderSampleSetResult() {
    renderSampleSetResultFromResults(
      state.sampleSet,
      dom,
      t
    );
  }

  function renderSliderSettingsResult() {
    renderSliderSettingsResultFromResults(
      state.sliderSettings,
      dom,
      t
    );
  }

  function renderArtistResult() {
    renderArtistResultFromResults(
      state.artist,
      dom,
      t
    );
  }

  function renderTitleResult() {
    renderTitleResultFromResults(
      state.title,
      dom,
      t
    );
  }

  function renderSourceResult() {
    renderSourceResultFromResults(
      state.source,
      dom,
      t
    );
  }

  function renderTagResult() {
    renderTagResultFromResults(
      state.tag,
      dom,
      t
    );
  }

  function renderPreviewPointResult() {
    renderPreviewPointResultFromResults(
      state.previewPoint,
      dom,
      t
    );
  }

  function renderBgOffsetResult() {
    renderBgOffsetResultFromResults(
      state.bgOffset,
      dom,
      t
    );
  }

  function renderEpilepsyWarningResult() {
    renderEpilepsyWarningResultFromResults(
      state.epilepsyWarning,
      dom,
      t
    );
  }

  function renderSpreadResult() {
    renderSpreadResultFromResults(state.spread, dom, t);
  }

  function renderContentPermissionResult() {
    renderContentPermissionResultFromResults(
      state.contentPermission,
      dom,
      t
    );
  }

  function renderTimelineResult() {
    state.timeline = renderTimelineResultFromSources(
      state.timelineSources,
      dom,
      t,
      {
        diffOrder: state.spread?.diffOrder ?? []
      }
    );
  }

  /** 警告tabのレンダー */
  function renderResultAndUpdateTabs() {
    renderResult();
    updateTabIssueStates(state);
  }

  function renderShiftResultAndUpdateTabs() {
    renderShiftResult();
    updateTabIssueStates(state);
  }

  function renderDoubleSvResultAndUpdateTabs() {
    renderDoubleSvResult();
    updateTabIssueStates(state);
  }

  function renderSvVolumeResultAndUpdateTabs() {
    renderSvVolumeResult();
    updateTabIssueStates(state);
  }

  function renderVolumeCompareResultAndUpdateTabs() {
    renderVolumeCompareResult();
    updateTabIssueStates(state);
  }

  function renderEarlyNoteResult() {
    renderEarlyNoteResultFromResults(state.earlyNote, dom, t);
  }

  setupPersistentOptions({
    showClap,
    showWhistle,
    includeAdvancedOffsetSnaps,
    doubleSvGap,
    includeExactSameSv,
    svVolumeThreshold,
    svVolumeLargeChangeOnly,
    volumeCompareThresholdOnly,
    volumeCompareMinDurationOnly
  });

  setupOptionEvents({
    showClap,
    showWhistle,
    includeAdvancedOffsetSnaps,
    renderShiftResult: renderShiftResultAndUpdateTabs,
    doubleSvGap,
    includeExactSameSv,
    renderResult: renderResultAndUpdateTabs,
    renderDoubleSvResult: renderDoubleSvResultAndUpdateTabs,
    svVolumeThreshold,
    svVolumeLargeChangeOnly,
    renderSvVolumeResult: renderSvVolumeResultAndUpdateTabs,
    volumeCompareThresholdOnly,
    volumeCompareMinDurationOnly,
    renderVolumeCompareResult: renderVolumeCompareResultAndUpdateTabs,
    spreadDensityMinDiff,
    renderSpreadResult,
  });

  async function handleFile(file) {
    if (!file) return;

    state.selectedFileName = file.name;

    if (fileName) {
      fileName.textContent = state.selectedFileName;
    }

    try {
      const result = await processFile(file);

      state.clapWhistle = result.clapWhistle;
      state.offsetSources = result.offsetSources;
      state.timelineSources = result.offsetSources;
      state.offset = result.offset;
      state.timeline = null;
      state.doubleSvSources = result.doubleSvSources;
      state.kiaiCompare = result.kiaiCompare;
      state.kiaiSnap = result.kiaiSnap;
      state.svVolumeSources = result.svVolumeSources;
      state.volumeCompareSources = result.volumeCompareSources;
      state.redGreenMatch = result.redGreenMatch;
      state.sampleSet = result.sampleSet;
      state.earlyNote = result.earlyNote;
      state.sliderSettings = result.sliderSettings;
      state.artist = result.artist;
      state.title = result.title;
      state.source = result.source;
      state.tag = result.tag;
      state.previewPoint = result.previewPoint;
      state.bgOffset = result.bgOffset;
      state.epilepsyWarning = result.epilepsyWarning;
      state.spread.results = result.spread;
      state.spread.diffOrder = createSpreadDiffOrder(result.spread);
      state.spread.manualCategories = {};
      state.contentPermission = result.contentPermission;

      if (timelineOutput) {
        timelineOutput.textContent = t("timelineNotRendered");
      }

      renderResult();
      renderShiftResult();
      renderDoubleSvResult();
      renderKiaiResult();
      renderKiaiSnapResult();
      renderSvVolumeResult();
      renderVolumeCompareResult();
      renderRedGreenMatchResult();
      renderSampleSetResult();
      renderSliderSettingsResult();
      renderEarlyNoteResult();
      renderArtistResult();
      renderTitleResult();
      renderSourceResult();
      renderTagResult();
      renderPreviewPointResult();
      renderBgOffsetResult();
      renderEpilepsyWarningResult();
      renderSpreadResult();
      renderContentPermissionResult();
      updateTabIssueStates(state);
    } catch (err) {
      if (err.message === "invalidFile") {
        output.textContent = t("invalidFile");
      } else {
        output.textContent = `Error:\n${err.message}`;
        console.error(err);
      }
    }
  }

applyLanguage();
});
