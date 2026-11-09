document.addEventListener("DOMContentLoaded", () => {
  const isChartPopout = new URLSearchParams(location.search).has('popoutChart');
  let receivedDiffOrder = null;
  const synchronizeDiffOrder = () => {
    publishDisplayDiffOrder(state.spread.diffOrder);
    if (!isChartPopout && window.electronAPI?.setDiffOrder) {
      window.electronAPI.setDiffOrder({
        diffOrder: state.spread.diffOrder,
        manualCategories: state.spread.manualCategories
      });
    }
  };
  const langEn = document.getElementById("langEn");
  const langJa = document.getElementById("langJa");
  const manualLink = document.getElementById("manualLink");
  const updateHistoryContent = document.getElementById("updateHistoryContent");
  const fileInput = document.getElementById("fileInput");
  const output = document.getElementById("output");
  const coordinateOutput = document.getElementById("coordinateOutput");
  const showClap = document.getElementById("showClap");
  const showWhistle = document.getElementById("showWhistle");
  const fileName = document.getElementById("fileName");
  const openBeatmapPage = document.getElementById("openBeatmapPage");
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
  const fileCheckOutput = document.getElementById("fileCheckOutput");
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
  const spreadDensityShowInversions = document.getElementById("spreadDensityShowInversions");
  const spreadRestMomentsOutput = document.getElementById("spreadRestMomentsOutput");
  const spreadRestThresholdTable = document.getElementById("spreadRestThresholdTable");
  const spreadRestChartSection = document.getElementById("spreadRestChartSection");
  const spreadRestChartWrap = document.getElementById("spreadRestChartWrap");
  const spreadRestChart = document.getElementById("spreadRestChart");
  const spreadRestChartTooltip = document.getElementById("spreadRestChartTooltip");
  const spreadRestChartEmpty = document.getElementById("spreadRestChartEmpty");
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
  const offsetWaveformInfo = document.getElementById("offsetWaveformInfo");
  const offsetWaveformEstimate = document.getElementById("offsetWaveformEstimate");
  const srCalculatorOutput = document.getElementById("srCalculatorOutput");
  const srCalculatorTabButton = document.querySelector('.tab-button[data-tab="srCalculator"]');
  const srCalculatorModInputs = [...document.querySelectorAll(".sr-calculator-mod")];
  const srCalculatorRuleset = document.getElementById("srCalculatorRuleset");
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
    fileName,
    openBeatmapPage,
    output,
    coordinateOutput,
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
    fileCheckOutput,
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
    spreadDensityShowInversions,
    spreadRestMomentsOutput,
    spreadRestThresholdTable,
    spreadRestChartSection,
    spreadRestChartWrap,
    spreadRestChart,
    spreadRestChartTooltip,
    spreadRestChartEmpty,
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
    offsetWaveformInfo,
    offsetWaveformEstimate,
    srCalculatorOutput,
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
    coordinates: null,
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
    fileCheck: null,
    songFolderCheck: null,
    epilepsyWarning: null,
    spread: {
      results: null,
      diffOrder: [],
      manualCategories: {}
    },
    srCalculator: createSrCalculatorState(),
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

  const {
    renderAllDiffResults,
    renderLoadedFileResults,
    renderResult,
    renderShiftResult,
    renderDoubleSvResult,
    renderBarlineResult,
    renderUnappliedSvResult,
    renderKiaiResult,
    renderKiaiSnapResult,
    renderSvVolumeResult,
    renderVolumeCompareResult,
    renderRedGreenMatchResult,
    renderSampleSetResult,
    renderSliderSettingsResult,
    renderArtistResult,
    renderTitleResult,
    renderSourceResult,
    renderTagResult,
    renderPreviewPointResult,
    renderBgOffsetResult,
    renderFileCheckResult,
    renderEpilepsyWarningResult,
    renderSpreadResult,
    renderOffsetWaveformResult,
    renderContentPermissionResult,
    renderTimelineResult,
    renderResultAndUpdateTabs,
    renderShiftResultAndUpdateTabs,
    renderDoubleSvResultAndUpdateTabs,
    renderSvVolumeResultAndUpdateTabs,
    renderVolumeCompareResultAndUpdateTabs,
    renderSpreadResultAndUpdateTabs,
    renderEarlyNoteResult
  } = createResultRenderer({ state, dom, t, getBnCompareUi: () => bnCompareUi });

  const fileSession = createFileSessionController({
    state, dom, t, isChartPopout,
    getSourceMode: () => osuSource.mode,
    getReceivedDiffOrder: () => receivedDiffOrder,
    synchronizeDiffOrder, renderLoadedFileResults, onCleared: applyLanguage
  });

  const osuSource = createOsuSourceController({
    t, invalidateLoads: fileSession.invalidateLoads, handleFile: fileSession.handleFile,
    clearResults: fileSession.clearResults,
    onModeChanged(mode) {
      if (mode === "osu") fileSession.publishChartSourceFile(null);

      // 左パネル（メタ/タイミング）のモードを連動。osu モードはリアルタイム表示、
      // file モードは読み込んだファイルのメタデータ表示に切り替える。
      if (window.__osuPanel && typeof window.__osuPanel.setMode === "function") {
        window.__osuPanel.setMode(mode);
        // file モードに切り替えた際、既に読み込み済みのファイルがあれば即反映
        if (mode === "file" && fileSession.lastFile) {
          fileSession.renderFileMetaToPanel(fileSession.lastFile);
          fileSession.publishChartSourceFile(fileSession.lastFile);
        }
      }
    }
  });
  const applyOsuSourceMode = osuSource.setMode;
  const refreshOsuSourceStatus = osuSource.refreshStatus;

  // ユーザーが手動でファイルを選択/ドロップしたら自動でファイルモードに戻す
  const userFileHandler = async (file) => {
    const osuRadio = document.querySelector('input[name="osuSource"][value="osu"]');
    if (osuRadio && osuRadio.checked) {
      const fileRadio = document.querySelector('input[name="osuSource"][value="file"]');
      if (fileRadio) fileRadio.checked = true;
      applyOsuSourceMode("file");
    }
    await fileSession.handleFile(file);
  };
  // グラフ分離ウィンドウでも、通常画面と同じ読込処理を再利用する。
  window.__loadModdingHelperFile = userFileHandler;
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
  revealElectronOnlyFeatures();

  setupTabs();
  
  setupSpreadSubtabs();
  
  setupSpreadOrderControls({
    state,
    dom,
    t,
    renderSpreadResult,
    onOrderChanged: () => {
      void fileSession.persistDiffPreferences();
      synchronizeDiffOrder();
      renderAllDiffResults();
    }
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

  function getSelectedSrMods() {
    return srCalculatorModInputs
      .filter(input => input.checked)
      .map(input => input.value);
  }

  function startSrCalculationIfReady() {
    if (state.srCalculator.status !== "ready") return;

    void startSrCalculation(
      state.offsetSources, state.srCalculator, srCalculatorOutput, t,
      state.spread.diffOrder, getSelectedSrMods(),
      srCalculatorRuleset?.value || "current"
    );
  }

  if (srCalculatorTabButton) {
    srCalculatorTabButton.addEventListener("click", startSrCalculationIfReady);
  }

  const srModConflicts = {
    EZ: ["HR"],
    HR: ["EZ"],
    HT: ["DT"],
    DT: ["HT"]
  };

  for (const input of srCalculatorModInputs) {
    input.addEventListener("change", () => {
      if (input.checked) {
        for (const conflict of srModConflicts[input.value] || []) {
          const conflictingInput = srCalculatorModInputs.find(item => item.value === conflict);
          if (conflictingInput) conflictingInput.checked = false;
        }
      }

      prepareSrCalculation(
        state.offsetSources, state.srCalculator, srCalculatorOutput, t,
        state.spread.diffOrder, true
      );

      if (document.getElementById("tab-srCalculator")?.classList.contains("active")) {
        startSrCalculationIfReady();
      }
    });
  }

  if (srCalculatorRuleset) {
    const savedRuleset = localStorage.getItem("srCalculatorRuleset");
    if (savedRuleset && [...srCalculatorRuleset.options].some(option => option.value === savedRuleset && !option.disabled)) {
      srCalculatorRuleset.value = savedRuleset;
    }
    srCalculatorRuleset.addEventListener("change", () => {
      localStorage.setItem("srCalculatorRuleset", srCalculatorRuleset.value);
      prepareSrCalculation(
        state.offsetSources, state.srCalculator, srCalculatorOutput, t,
        state.spread.diffOrder, true
      );

      if (document.getElementById("tab-srCalculator")?.classList.contains("active")) {
        startSrCalculationIfReady();
      }
    });
  }

  function applyLanguage() {
    document.documentElement.lang = currentLang === "ja" ? "ja" : "en";

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.dataset.i18nTitle;
      el.title = t(key);
    });

    refreshOsuSourceStatus();

    if (fileName) {
      fileName.textContent = state.selectedFileName || t("noFileSelected");
    }

    if (langEn) langEn.classList.toggle("active", currentLang === "en");
    if (langJa) langJa.classList.toggle("active", currentLang === "ja");
    if (window.electronAPI &&
        typeof window.electronAPI.setLanguage === "function") {
      window.electronAPI.setLanguage(currentLang);
    }
    if (manualLink) {
      const docsBase = window.electronAPI
        ? "https://calmeel.github.io/modding-helper/docs/"
        : "docs/";
      manualLink.href = docsBase + (currentLang === "ja" ? "docs.html" : "docs-en.html");
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

    if (!state.fileCheck && fileCheckOutput) {
      fileCheckOutput.textContent = t("noFileLoaded");
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

    renderAllDiffResults();
  }

  // did-finish-load 後に追加される Electron 専用 DOM へも、
  // 現在言語を初回適用できるよう公開する。
  window.applyModdingHelperLanguage = applyLanguage;

  if (isChartPopout && window.electronAPI?.onDiffOrder) {
    window.electronAPI.onDiffOrder(payload => {
      receivedDiffOrder = payload;
      state.spread.diffOrder = [...payload.diffOrder];
      state.spread.manualCategories = { ...payload.manualCategories };
      synchronizeDiffOrder();
      renderAllDiffResults();
    });
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

  osuSource.setup();

  applyLanguage();
});
