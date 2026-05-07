document.addEventListener("DOMContentLoaded", () => {
  const langEn = document.getElementById("langEn");
  const langJa = document.getElementById("langJa");
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
  const kiaiSnapOutput = document.getElementById("kiaiSnapOutput");
  const svVolumeOutput = document.getElementById("svVolumeOutput");
  const svVolumeThreshold = document.getElementById("svVolumeThreshold");
  const volumeCompareOutput = document.getElementById("volumeCompareOutput");
  const volumeCompareThresholdOnly = document.getElementById("volumeCompareThresholdOnly");
  const volumeCompareMinDurationOnly = document.getElementById("volumeCompareMinDurationOnly");
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
  const spreadOdHpOutput = document.getElementById("spreadOdHpOutput");
  const spreadOrderOutput = document.getElementById("spreadOrderOutput");
  const spreadResetOrderButton = document.getElementById("spreadResetOrderButton");
  const spreadNoteCountOutput = document.getElementById("spreadNoteCountOutput");
  const spreadDensityOutput = document.getElementById("spreadDensityOutput");
  const spreadDensityMinDiff = document.getElementById("spreadDensityMinDiff");
  const spreadFinishersOutput = document.getElementById("spreadFinishersOutput");
  const spreadScrollSpeedOutput = document.getElementById("spreadScrollSpeedOutput");
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
    kiaiSnapOutput,
    svVolumeOutput,
    svVolumeThreshold,
    svVolumeLargeChangeOnly,
    volumeCompareOutput,
    volumeCompareThresholdOnly,
    volumeCompareMinDurationOnly,
    redGreenMatchOutput,
    sampleSetOutput,
    sliderSettingsOutput,
    earlyNoteOutput,
    artistOutput,
    titleOutput,
    sourceOutput,
    tagOutput,
    previewPointOutput,
    spreadOdHpOutput,
    spreadOrderOutput,
    spreadResetOrderButton,
    spreadNoteCountOutput,
    spreadDensityOutput,
    spreadDensityMinDiff,
    spreadFinishersOutput,
    spreadScrollSpeedOutput,
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
    spread: {
      results: null,
      diffOrder: [],
      manualCategories: {}
    },
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

    if (!state.spread && spreadOdHpOutput) {
      spreadOdHpOutput.textContent = t("noFileLoaded");
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
    renderSpreadResult();
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

  function renderSpreadResult() {
    renderSpreadResultFromResults(state.spread, dom, t);
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
      state.offset = result.offset;
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
      state.spread.results = result.spread;
      state.spread.diffOrder = createSpreadDiffOrder(result.spread);
      state.spread.manualCategories = {};

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
      renderSpreadResult();
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