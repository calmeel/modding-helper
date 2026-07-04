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
  const barlineOutput = document.getElementById("barlineOutput");
  const unappliedSvOutput = document.getElementById("unappliedSvOutput");
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
  const spreadRestMomentsOutput = document.getElementById("spreadRestMomentsOutput");
  const spreadRestThresholdTable = document.getElementById("spreadRestThresholdTable");
  const spreadRestChartSection = document.getElementById("spreadRestChartSection");
  const spreadRestChartWrap = document.getElementById("spreadRestChartWrap");
  const spreadRestChart = document.getElementById("spreadRestChart");
  const spreadRestChartTooltip = document.getElementById("spreadRestChartTooltip");
  const spreadRestChartEmpty = document.getElementById("spreadRestChartEmpty");
  const spreadRestResetZoom = document.getElementById("spreadRestResetZoom");
  const spreadRestHighBpmEnabled = document.getElementById("spreadRestHighBpmEnabled");
  const spreadRestHighBpmThreshold = document.getElementById("spreadRestHighBpmThreshold");
  const spreadRestHighBpmScale = document.getElementById("spreadRestHighBpmScale");
  const spreadRestLowBpmEnabled = document.getElementById("spreadRestLowBpmEnabled");
  const spreadRestLowBpmThreshold = document.getElementById("spreadRestLowBpmThreshold");
  const spreadRestLowBpmScale = document.getElementById("spreadRestLowBpmScale");
  const spreadRestIgnoreSliders = document.getElementById("spreadRestIgnoreSliders");
  const spreadRestIgnoreSpinners = document.getElementById("spreadRestIgnoreSpinners");
  const spreadRestUseAdjustedThresholds = document.getElementById("spreadRestUseAdjustedThresholds");
  const spreadRestUseMsGap = document.getElementById("spreadRestUseMsGap");
  const spreadRestUseMsThresholds = document.getElementById("spreadRestUseMsThresholds");
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
  const offsetWaveformChartSection = document.getElementById("offsetWaveformChartSection");
  const offsetWaveformChartWrap = document.getElementById("offsetWaveformChartWrap");
  const offsetWaveformCanvas = document.getElementById("offsetWaveformCanvas");
  const offsetWaveformTooltip = document.getElementById("offsetWaveformTooltip");
  const offsetWaveformEmpty = document.getElementById("offsetWaveformEmpty");
  const offsetWaveformResetZoom = document.getElementById("offsetWaveformResetZoom");
  const offsetWaveformInfo = document.getElementById("offsetWaveformInfo");
  const offsetWaveformEstimate = document.getElementById("offsetWaveformEstimate");
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
    barlineOutput,
    unappliedSvOutput,
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
    spreadRestMomentsOutput,
    spreadRestThresholdTable,
    spreadRestChartSection,
    spreadRestChartWrap,
    spreadRestChart,
    spreadRestChartTooltip,
    spreadRestChartEmpty,
    spreadRestResetZoom,
    spreadRestHighBpmEnabled,
    spreadRestHighBpmThreshold,
    spreadRestHighBpmScale,
    spreadRestLowBpmEnabled,
    spreadRestLowBpmThreshold,
    spreadRestLowBpmScale,
    spreadRestIgnoreSliders,
    spreadRestIgnoreSpinners,
    spreadRestUseAdjustedThresholds,
    spreadRestUseMsGap,
    spreadRestUseMsThresholds,
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
    offsetWaveformChartSection,
    offsetWaveformChartWrap,
    offsetWaveformCanvas,
    offsetWaveformTooltip,
    offsetWaveformEmpty,
    offsetWaveformResetZoom,
    offsetWaveformInfo,
    offsetWaveformEstimate,
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
    barlineSources: null,
    barlineResults: null,
    unappliedSv: null,
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
    offsetWaveformSources: null,
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

  // ユーザーが手動でファイルを選択/ドロップしたら自動でファイルモードに戻す
  const userFileHandler = async (file) => {
    const osuRadio = document.querySelector('input[name="osuSource"][value="osu"]');
    if (osuRadio && osuRadio.checked) {
      const fileRadio = document.querySelector('input[name="osuSource"][value="file"]');
      if (fileRadio) fileRadio.checked = true;
      applyOsuSourceMode("file");
    }
    await handleFile(file);
  };
  setupFileInput(fileInput, userFileHandler);
  setupDropArea(dropArea, userFileHandler);

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

    refreshOsuSourceStatus();

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

    if (!state.barlineSources && barlineOutput) {
      barlineOutput.textContent = t("noFileLoaded");
    }

    if (!state.unappliedSv && unappliedSvOutput) {
      unappliedSvOutput.textContent = t("noFileLoaded");
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

    if (!state.offsetWaveformSources && offsetWaveformEmpty) {
      offsetWaveformEmpty.textContent = t("noFileLoaded");
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
    renderBarlineResult();
    renderUnappliedSvResult();
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
    renderOffsetWaveformResult();
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

  function renderBarlineResult() {
    state.barlineResults = renderBarlineResultFromSources(
      state.barlineSources,
      dom,
      t
    );
  }

  function renderUnappliedSvResult() {
    renderUnappliedSvResultFromResults(
      state.unappliedSv,
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

  function renderOffsetWaveformResult() {
    renderOffsetWaveformResultFromSources(
      state.offsetWaveformSources,
      dom,
      t
    );
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

  function renderSpreadResultAndUpdateTabs() {
    renderSpreadResult();
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
    renderResult: renderResultAndUpdateTabs,
    renderDoubleSvResult: renderDoubleSvResultAndUpdateTabs,
    svVolumeThreshold,
    svVolumeLargeChangeOnly,
    renderSvVolumeResult: renderSvVolumeResultAndUpdateTabs,
    volumeCompareThresholdOnly,
    volumeCompareMinDurationOnly,
    renderVolumeCompareResult: renderVolumeCompareResultAndUpdateTabs,
    spreadDensityMinDiff,
    spreadRestHighBpmEnabled,
    spreadRestHighBpmThreshold,
    spreadRestHighBpmScale,
    spreadRestLowBpmEnabled,
    spreadRestLowBpmThreshold,
    spreadRestLowBpmScale,
    spreadRestIgnoreSliders,
    spreadRestIgnoreSpinners,
    spreadRestUseAdjustedThresholds,
    spreadRestUseMsGap,
    spreadRestUseMsThresholds,
    spreadScrollSpeedOutput,
    renderSpreadResult: renderSpreadResultAndUpdateTabs,
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
      // スプレッド表示(exe)用に全難易度のテキストを公開
      window.__loadedDiffs = result.offsetSources;
      // スプレッド表示(exe)の音楽再生用に、先頭難易度の音源を Blob URL で公開
      try {
        if (window.__loadedAudioUrl) {
          URL.revokeObjectURL(window.__loadedAudioUrl);
          window.__loadedAudioUrl = null;
        }
        const wfs = (result.offsetWaveformSources || []).find(s => s && s.audioBlob);
        if (wfs && wfs.audioBlob) {
          window.__loadedAudioUrl = URL.createObjectURL(wfs.audioBlob);
          window.__loadedAudio = { url: window.__loadedAudioUrl, durationMs: wfs.audioDurationMs || 0 };
        } else {
          window.__loadedAudio = null;
        }
      } catch (e) {
        window.__loadedAudio = null;
      }
      state.offset = result.offset;
      state.timeline = null;
      state.doubleSvSources = result.doubleSvSources;
      state.barlineSources = result.barlineSources;
      state.unappliedSv = result.unappliedSv;
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
      // スプレッド表示(exe)用に難易度順（易→難）を公開。表示側で逆順=難→易に並べる
      window.__loadedDiffOrder = state.spread.diffOrder;
      state.offsetWaveformSources = result.offsetWaveformSources;
      state.contentPermission = result.contentPermission;

      if (timelineOutput) {
        timelineOutput.textContent = t("timelineNotRendered");
      }

      renderResult();
      renderShiftResult();
      renderDoubleSvResult();
      renderBarlineResult();
      renderUnappliedSvResult();
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
      renderOffsetWaveformResult();
      renderContentPermissionResult();
      updateTabIssueStates(state);

      // file モードのときは読み込んだファイルのメタデータを左パネルに表示
      lastLoadedFileForMeta = file;
      if (osuSourceMode === "file") {
        await renderFileMetaToPanel(file);
      }
    } catch (err) {
      if (err.message === "invalidFile") {
        output.textContent = t("invalidFile");
      } else {
        output.textContent = `Error:\n${err.message}`;
        console.error(err);
      }
    }
  }

  // ───────────────────────────────────────────────
  // チェック対象の切替（ファイル / osu! で開いている譜面）— Electron 専用
  // ───────────────────────────────────────────────
  let osuSourceMode        = "file";
  let osuLastLoadedFolder  = null;
  let osuStatusKey         = "";
  let osuStatusCls         = "";
  let lastLoadedFileForMeta = null;  // file モードで左パネルに出すため最後に読んだ File を保持

  // .osu テキストからメタデータを取り出す
  function metaFromOsuText(text, bgDataUrl) {
    return {
      artist:        parseMetadataValue(text, "Artist"),
      artistUnicode: parseMetadataValue(text, "ArtistUnicode"),
      title:         parseMetadataValue(text, "Title"),
      titleUnicode:  parseMetadataValue(text, "TitleUnicode"),
      source:        parseMetadataValue(text, "Source"),
      tags:          parseMetadataValue(text, "Tags"),
      bgDataUrl:     bgDataUrl || null
    };
  }

  function parseBgFilename(text) {
    const m = text.match(/^\s*0\s*,\s*0\s*,\s*"(.+?)"/m);
    return m ? m[1] : "";
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  // 読み込んだ File からメタデータ（+ .osz なら BG）を抽出
  async function extractMapMetaFromFile(file) {
    if (!file) return null;
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".osu")) {
      const text = await file.text();
      return metaFromOsuText(text, null);
    }

    if (lower.endsWith(".osz")) {
      const zip = await loadOszZip(file);
      const osuEntries = Object.values(zip.files)
        .filter(e => !e.dir && e.name.toLowerCase().endsWith(".osu"));

      let chosenEntry = null;
      let chosenText  = null;
      for (const entry of osuEntries) {
        const text = await entry.async("text");
        if (parseMode(text) === 1) { chosenEntry = entry; chosenText = text; break; }
        if (!chosenEntry) { chosenEntry = entry; chosenText = text; }  // taiko が無ければ先頭
      }
      if (!chosenText) return null;

      let bgDataUrl = null;
      const bgName = parseBgFilename(chosenText);
      if (bgName && typeof findOszImageEntry === "function") {
        const imgEntry = findOszImageEntry(zip, chosenEntry.name, bgName);
        if (imgEntry) {
          try { bgDataUrl = await blobToDataUrl(await imgEntry.async("blob")); } catch {}
        }
      }
      return metaFromOsuText(chosenText, bgDataUrl);
    }

    return null;
  }

  async function renderFileMetaToPanel(file) {
    if (!window.__osuPanel || typeof window.__osuPanel.renderFileMeta !== "function") return;
    try {
      const fileMeta = await extractMapMetaFromFile(file);
      window.__osuPanel.renderFileMeta(fileMeta);
    } catch { /* メタ抽出失敗は無視（チェック結果には影響しない） */ }
  }

  function refreshOsuSourceStatus() {
    const el = document.getElementById("osuSourceStatus");
    if (!el) return;
    el.classList.remove("error", "ok");
    if (!osuStatusKey) { el.textContent = ""; return; }
    el.textContent = t(osuStatusKey);
    if (osuStatusCls) el.classList.add(osuStatusCls);
  }

  function setOsuStatus(key, cls) {
    osuStatusKey = key;
    osuStatusCls = cls || "";
    refreshOsuSourceStatus();
  }

  function applyOsuSourceMode(mode) {
    osuSourceMode = (mode === "osu") ? "osu" : "file";
    try { localStorage.setItem("moddingHelperCheckSource", osuSourceMode); } catch {}

    const reloadBtn = document.getElementById("osuReloadBtn");
    if (reloadBtn) reloadBtn.hidden = (osuSourceMode !== "osu");

    if (osuSourceMode === "file") setOsuStatus("", "");

    // 左パネル（メタ/タイミング）のモードを連動。osu モードはリアルタイム表示、
    // file モードは読み込んだファイルのメタデータ表示に切り替える。
    if (window.__osuPanel && typeof window.__osuPanel.setMode === "function") {
      window.__osuPanel.setMode(osuSourceMode);
      // file モードに切り替えた際、既に読み込み済みのファイルがあれば即反映
      if (osuSourceMode === "file" && lastLoadedFileForMeta) {
        renderFileMetaToPanel(lastLoadedFileForMeta);
      }
    }
  }

  async function loadFromOsu(force) {
    if (osuSourceMode !== "osu") return;
    setOsuStatus("osuSourceLoading", "");

    let res;
    try {
      res = await window.electronAPI.getCurrentMapset(force ? null : osuLastLoadedFolder);
    } catch {
      setOsuStatus("osuSourceNoMap", "error");
      return;
    }

    if (!res) {
      osuLastLoadedFolder = null;
      setOsuStatus("osuSourceNoMap", "error");
      return;
    }
    if (res.unchanged) {
      setOsuStatus("osuSourceLoaded", "ok");
      return;
    }

    osuLastLoadedFolder = res.folder;
    try {
      const file = new File([res.buffer], res.name, { type: "application/octet-stream" });
      await handleFile(file);
      setOsuStatus("osuSourceLoaded", "ok");
    } catch {
      setOsuStatus("osuSourceNoMap", "error");
    }
  }

  function setupOsuSourceMode() {
    const settings = document.getElementById("osuSourceSettings");
    if (!settings ||
        !window.electronAPI ||
        typeof window.electronAPI.getCurrentMapset !== "function") {
      return;
    }
    settings.hidden = false;

    let saved = "file";
    try { saved = localStorage.getItem("moddingHelperCheckSource") || "file"; } catch {}

    settings.querySelectorAll('input[name="osuSource"]').forEach(radio => {
      radio.checked = (radio.value === saved);
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        applyOsuSourceMode(radio.value);
        if (radio.value === "osu") loadFromOsu(true);
      });
    });

    const reloadBtn = document.getElementById("osuReloadBtn");
    if (reloadBtn) reloadBtn.addEventListener("click", () => loadFromOsu(true));

    // osu! 側で譜面が変わったら（osu モード時）自動で再読み込み
    if (typeof window.electronAPI.onOsuMapInfo === "function") {
      window.electronAPI.onOsuMapInfo(() => {
        if (osuSourceMode === "osu") loadFromOsu(false);
      });
    }

    // 同じ譜面の .osu が更新（osu! エディタで保存）されたら強制再読み込み
    if (typeof window.electronAPI.onMapsetChanged === "function") {
      window.electronAPI.onMapsetChanged(() => {
        if (osuSourceMode === "osu") loadFromOsu(true);
      });
    }

    applyOsuSourceMode(saved);
    if (saved === "osu") loadFromOsu(true);
  }

  setupOsuSourceMode();

applyLanguage();
});
