// 波形グラフの状態、音源デコード、初期化と補正結果の表示。
const OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED = false;
const OFFSET_WAVEFORM_MANUAL_PEAK_OFFSET_MS = 28.7;
const offsetWaveformChartState = {
  sources: null,
  dom: null,
  t: null,
  audioContext: null,
  audioBuffer: null,
  waveformData: null,
  decodedFileName: "",
  decodeToken: 0,
  signature: "",
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  dragButton: null,
  manualOffsetResult: null,
  initialized: false,
  resizeObserver: null
};

function renderOffsetWaveformChart(sources, dom, t) {
  const state = offsetWaveformChartState;
  state.sources = sources;
  state.dom = dom;
  state.t = t;

  initializeOffsetWaveformChart();

  if (!sources || !sources.length) {
    state.decodeToken++;
    setOffsetWaveformEmpty(t(sources ? "noOsuFiles" : "noFileLoaded"));
    return;
  }

  const sortedSources = sortResultsForDisplay(sources);
  const selected = getOffsetWaveformSource(sortedSources);
  if (!selected) {
    setOffsetWaveformEmpty(t("offsetWaveformNoDiff"));
    return;
  }

  renderSelectedOffsetWaveformSource(selected);
}

function initializeOffsetWaveformChart() {
  const state = offsetWaveformChartState;
  if (state.initialized || !state.dom?.offsetWaveformCanvas) return;

  syncOffsetWaveformEstimateFeatureVisibility();

  const canvas = state.dom.offsetWaveformCanvas;
  canvas.addEventListener("pointerdown", handleOffsetWaveformPointerDown);
  canvas.addEventListener("pointermove", handleOffsetWaveformPointerMove);
  canvas.addEventListener("pointerup", handleOffsetWaveformPointerUp);
  canvas.addEventListener("pointercancel", handleOffsetWaveformPointerCancel);
  canvas.addEventListener("pointerleave", handleOffsetWaveformPointerLeave);
  canvas.addEventListener("wheel", handleOffsetWaveformWheel, { passive: false });
  canvas.addEventListener("contextmenu", preventChartContextMenu);

  if (
    typeof ResizeObserver !== "undefined" &&
    state.dom.offsetWaveformChartWrap
  ) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.offsetWaveformChartWrap.hidden) {
        drawOffsetWaveformChart();
      }
    });
    state.resizeObserver.observe(state.dom.offsetWaveformChartWrap);
  } else {
    window.addEventListener("resize", drawOffsetWaveformChart);
  }

  state.initialized = true;
}

function syncOffsetWaveformEstimateFeatureVisibility() {
  const section = offsetWaveformChartState.dom?.offsetWaveformChartSection;
  if (!section) return;

  for (const element of section.querySelectorAll(".offset-waveform-estimate-feature")) {
    element.hidden = !OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED;
  }
}

function getOffsetWaveformSource(sources) {
  return sources[0] ?? null;
}

async function renderSelectedOffsetWaveformSource(source) {
  const state = offsetWaveformChartState;
  const t = state.t;
  const token = ++state.decodeToken;

  if (!source.audioBlob) {
    state.audioBuffer = null;
    state.waveformData = null;
    state.decodedFileName = "";
    source.offsetEstimate = null;
    source.estimatedOffsetWaveformBarlines = [];
    source.offsetPeakWaveformBarlines = [];
    renderOffsetEstimate(null);
    setOffsetWaveformEmpty(
      source.audioFileName
        ? t("offsetWaveformAudioMissing").replace("{audio}", source.audioFileName)
        : t("offsetWaveformNoAudioFilename")
    );
    return;
  }

  const barlines = buildOffsetWaveformBarlines(source.text);
  source.offsetWaveformBarlines = barlines;
  clearOffsetWaveformEstimate(source);

  const signature = `${source.fileName}::${source.audioEntryName || source.audioFileName}`;

  if (state.signature !== signature) {
    state.signature = signature;
    state.audioBuffer = null;
    state.waveformData = null;
    state.decodedFileName = "";
    state.viewStart = 0;
    state.viewEnd = 0;
    state.hoverTime = null;
    state.manualOffsetResult = null;
    renderOffsetManualResult(null);
  }

  setOffsetWaveformEmpty(t("offsetWaveformDecoding"));

  try {
    const audioBuffer = await decodeOffsetWaveformAudio(source.audioBlob);
    if (token !== state.decodeToken) return;

    state.audioBuffer = audioBuffer;
    state.waveformData = createOffsetWaveformData(audioBuffer);
    state.decodedFileName = source.fileName;
    if (OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED) {
      source.offsetEstimate = estimateOffsetFromAudioBuffer(audioBuffer, source.text);
      source.estimatedOffsetWaveformBarlines = source.offsetEstimate?.ok
        ? barlines.map(barline => ({
            ...barline,
            time: barline.time + source.offsetEstimate.delta
          }))
        : [];
      source.offsetPeakWaveformBarlines = source.offsetEstimate?.ok
        ? source.estimatedOffsetWaveformBarlines.map(barline => ({
            ...barline,
            time: barline.time + OFFSET_ESTIMATOR_OSU_PEAK_OFFSET_MS
          }))
        : [];
    }

    const durationMs = getOffsetWaveformDurationMs();
    if (!state.viewEnd || state.viewEnd > durationMs) {
      state.viewStart = 0;
      state.viewEnd = durationMs;
    }

    if (state.dom.offsetWaveformEmpty) state.dom.offsetWaveformEmpty.hidden = true;
    if (state.dom.offsetWaveformChartWrap) state.dom.offsetWaveformChartWrap.hidden = false;
    if (state.dom.offsetWaveformInfo) {
      state.dom.offsetWaveformInfo.textContent =
        t("offsetWaveformInfo")
          .replace("{audio}", source.audioEntryName || source.audioFileName)
          .replace("{barlines}", String(barlines.length));
    }
    renderOffsetEstimate(
      OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED ? source.offsetEstimate : null
    );
    renderOffsetManualResult(state.manualOffsetResult);

    drawOffsetWaveformChart();
  } catch (error) {
    if (token !== state.decodeToken) return;
    state.audioBuffer = null;
    state.waveformData = null;
    state.decodedFileName = "";
    clearOffsetWaveformEstimate(source);
    renderOffsetEstimate(null);
    console.error(error);
    setOffsetWaveformEmpty(t("offsetWaveformDecodeFailed"));
  }
}

async function decodeOffsetWaveformAudio(blob) {
  const state = offsetWaveformChartState;
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
  }

  const arrayBuffer = await blob.arrayBuffer();
  return state.audioContext.decodeAudioData(arrayBuffer);
}

function setOffsetWaveformEmpty(message) {
  const state = offsetWaveformChartState;
  if (state.dom?.offsetWaveformChartWrap) {
    state.dom.offsetWaveformChartWrap.hidden = true;
  }
  if (state.dom?.offsetWaveformEmpty) {
    state.dom.offsetWaveformEmpty.hidden = false;
    state.dom.offsetWaveformEmpty.textContent = message;
  }
  if (state.dom?.offsetWaveformInfo) {
    state.dom.offsetWaveformInfo.textContent = "";
  }
  renderOffsetEstimate(null);
  renderOffsetManualResult(null);
  hideOffsetWaveformTooltip();
}

function clearOffsetWaveformEstimate(source) {
  source.offsetEstimate = null;
  source.estimatedOffsetWaveformBarlines = [];
  source.offsetPeakWaveformBarlines = [];
}

function renderOffsetEstimate(estimate) {
  const state = offsetWaveformChartState;
  const element = state.dom?.offsetWaveformEstimate;
  const t = state.t;

  if (!element || !t) return;

  if (!estimate) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }

  element.hidden = false;

  if (!estimate.ok) {
    element.classList.add("offset-waveform-estimate-muted");
    element.textContent = t(estimate.reason || "offsetEstimateFailed");
    return;
  }

  element.classList.remove("offset-waveform-estimate-muted");
  element.innerHTML = `
    <div class="offset-waveform-estimate-title">${escapeHtml(t("offsetEstimateTitle"))}</div>
    <div class="offset-waveform-estimate-grid">
      <div><span>${escapeHtml(t("offsetEstimateCurrent"))}</span><strong>${escapeHtml(formatOffsetEstimateMs(estimate.currentOffset))}</strong></div>
      <div><span>${escapeHtml(t("offsetEstimateEstimated"))}</span><strong>${escapeHtml(formatOffsetEstimateMs(estimate.estimatedOffset))}</strong></div>
      <div><span>${escapeHtml(t("offsetEstimateDelta"))}</span><strong class="${estimate.delta > 0 ? "positive" : estimate.delta < 0 ? "negative" : ""}">${escapeHtml(formatOffsetEstimateSignedMs(estimate.delta))}</strong></div>
      <div><span>${escapeHtml(t("offsetEstimateBpm"))}</span><strong>${escapeHtml(formatOffsetEstimateBpm(estimate.bpm))}</strong></div>
      <div><span>${escapeHtml(t("offsetEstimateConfidence"))}</span><strong>${escapeHtml(formatOffsetEstimateConfidence(estimate.confidence))}</strong></div>
    </div>
  `;
}

function renderOffsetManualResult(result) {
  const state = offsetWaveformChartState;
  const element = state.dom?.offsetWaveformEstimate;
  const t = state.t;

  if (!element || !t) return;

  if (!result) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }

  element.hidden = false;
  element.classList.remove("offset-waveform-estimate-muted");
  element.innerHTML = `
    <div class="offset-waveform-estimate-title">${escapeHtml(t("offsetManualTitle"))}</div>
    <div class="offset-waveform-estimate-grid">
      <div><span>${escapeHtml(t("offsetManualPeak"))}</span><strong>${escapeHtml(msToTimestamp(Math.round(result.peakTime)))}</strong></div>
      <div><span>${escapeHtml(t("offsetManualNearestBarline"))}</span><strong>${escapeHtml(msToTimestamp(Math.round(result.nearestBarlineTime)))}</strong></div>
      <div><span>${escapeHtml(t("offsetManualBarlineGap"))}</span><strong class="${result.barlineGap > 0 ? "positive" : result.barlineGap < 0 ? "negative" : ""}">${escapeHtml(formatOffsetEstimateSignedMs(result.barlineGap))}</strong></div>
      <div><span>${escapeHtml(t("offsetManualRecommended"))}</span><strong>${escapeHtml(msToTimestamp(Math.round(result.recommendedOffsetTime)))}</strong></div>
      <div><span>${escapeHtml(t("offsetManualDelta"))}</span><strong class="${result.recommendedDelta > 0 ? "positive" : result.recommendedDelta < 0 ? "negative" : ""}">${escapeHtml(formatOffsetEstimateSignedMs(result.recommendedDelta))}</strong></div>
    </div>
  `;
}

function formatOffsetEstimateMs(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 10) / 10} ms`;
}

function formatOffsetEstimateSignedMs(value) {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded} ms`;
}

function formatOffsetEstimateBpm(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 1000) / 1000} BPM`;
}

function formatOffsetEstimateConfidence(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getOffsetWaveformDurationMs() {
  const buffer = offsetWaveformChartState.audioBuffer;
  return buffer ? Math.floor(buffer.duration * 1000) : 0;
}
