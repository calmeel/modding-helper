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
  const doubleSvOutput = document.getElementById("doubleSvOutput");
  const doubleSvGap = document.getElementById("doubleSvGap");
  const includeExactSameSv = document.getElementById("includeExactSameSv");
  const kiaiOutput = document.getElementById("kiaiOutput");
  const kiaiSnapOutput = document.getElementById("kiaiSnapOutput");
  const svVolumeOutput = document.getElementById("svVolumeOutput");
  const svVolumeThreshold = document.getElementById("svVolumeThreshold");
  const redGreenMatchOutput = document.getElementById("redGreenMatchOutput");
  const sampleSetOutput = document.getElementById("sampleSetOutput");

  const i18nData = window.i18n;

  let currentLang = localStorage.getItem("moddingHelperLang") || "en";

  function t(key) {
    return i18nData[currentLang][key] || i18nData.en[key] || key;
  }

  const dom = {
    output,
    showClap,
    showWhistle,
    shiftOutput,
    doubleSvOutput,
    doubleSvGap,
    includeExactSameSv,
    kiaiOutput,
    kiaiSnapOutput,
    svVolumeOutput,
    svVolumeThreshold,
    redGreenMatchOutput,
    sampleSetOutput
  };

  const state = {
    clapWhistle: null,
    offset: null,
    doubleSvSources: null,
    doubleSvResults: null,
    kiaiCompare: null,
    kiaiSnap: null,
    selectedFileName: null,
    svVolumeSources: null,
    svVolumeResults: null,
    redGreenMatch: null,
    sampleSet: null
  };

  setupFileInput(fileInput, handleFile);
  setupDropArea(dropArea, handleFile);
  setupOptionEvents({
    showClap,
    showWhistle,
    doubleSvGap,
    includeExactSameSv,
    renderResult,
    renderDoubleSvResult,
    svVolumeThreshold,
    renderSvVolumeResult
  });

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
  setupTabVisibilitySettings();

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

    renderResult();
    renderShiftResult();
    renderKiaiResult();
    renderKiaiSnapResult();
    renderDoubleSvResult();
    renderSvVolumeResult();
    renderRedGreenMatchResult();
    renderSampleSetResult();
  }

  function renderResult() {
    renderClapWhistleResult(state.clapWhistle, dom, t);
  }

  function renderShiftResult() {
    renderOffsetResult(state.offset, dom, t);
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

  async function handleFile(file) {
    if (!file) return;

    state.selectedFileName = file.name;

    if (fileName) {
      fileName.textContent = state.selectedFileName;
    }

    try {
      const result = await processFile(file);

      state.clapWhistle = result.clapWhistle;
      state.offset = result.offset;
      state.doubleSvSources = result.doubleSvSources;
      state.kiaiCompare = result.kiaiCompare;
      state.kiaiSnap = result.kiaiSnap;
      state.svVolumeSources = result.svVolumeSources;
      state.redGreenMatch = result.redGreenMatch;
      state.sampleSet = result.sampleSet;

      renderResult();
      renderShiftResult();
      renderDoubleSvResult();
      renderKiaiResult();
      renderKiaiSnapResult();
      renderSvVolumeResult();
      renderRedGreenMatchResult();
      renderSampleSetResult();
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