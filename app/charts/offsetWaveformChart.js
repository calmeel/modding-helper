const OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED = false;

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
    setOffsetWaveformEmpty(t("noFileLoaded"));
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

  if (state.dom.offsetWaveformResetZoom) {
    state.dom.offsetWaveformResetZoom.addEventListener("click", () => {
      const duration = getOffsetWaveformDurationMs();
      if (duration <= 0) return;
      state.viewStart = 0;
      state.viewEnd = duration;
      state.hoverTime = null;
      hideOffsetWaveformTooltip();
      drawOffsetWaveformChart();
    });
  }

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
  hideOffsetWaveformTooltip();
}

function drawOffsetWaveformChart() {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const audioBuffer = state.audioBuffer;
  const waveformData = state.waveformData;
  const source = getOffsetWaveformSource(
    sortResultsForDisplay(state.sources ?? [])
  );

  if (
    !canvas ||
    !audioBuffer ||
    !waveformData ||
    !source ||
    state.dom?.offsetWaveformChartWrap?.hidden
  ) {
    return;
  }

  const durationMs = getOffsetWaveformDurationMs();
  const cssWidth = Math.max(360, canvas.parentElement?.clientWidth ?? 0);
  const cssHeight = 330;
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const plot = {
    left: 62,
    top: 20,
    right: cssWidth - 18,
    bottom: cssHeight - 42
  };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);

  const viewStart = Math.max(0, Math.floor(state.viewStart));
  const viewEnd = Math.min(
    durationMs,
    Math.max(viewStart + 1, Math.ceil(state.viewEnd || durationMs))
  );
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;

  drawOffsetWaveformGrid(ctx, plot, viewStart, viewEnd, xForTime);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  drawOffsetWaveformData(ctx, waveformData, plot, viewStart, viewEnd);
  drawOffsetWaveformBarlines(
    ctx,
    source.offsetWaveformBarlines ?? [],
    plot,
    viewStart,
    viewEnd,
    xForTime
  );
  drawEstimatedOffsetWaveformBarlines(
    ctx,
    OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED
      ? source.estimatedOffsetWaveformBarlines ?? []
      : [],
    plot,
    viewStart,
    viewEnd,
    xForTime
  );
  drawOffsetPeakWaveformBarlines(
    ctx,
    OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED
      ? source.offsetPeakWaveformBarlines ?? []
      : [],
    plot,
    viewStart,
    viewEnd,
    xForTime
  );

  if (state.hoverTime !== null) {
    const x = xForTime(state.hoverTime);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  if (state.dragStartX !== null && state.dragCurrentX !== null) {
    const startX = clampOffsetWaveformX(state.dragStartX, plot);
    const endX = clampOffsetWaveformX(state.dragCurrentX, plot);
    ctx.fillStyle = "rgba(159, 220, 255, 0.16)";
    ctx.fillRect(
      Math.min(startX, endX),
      plot.top,
      Math.abs(endX - startX),
      plot.height
    );
  }

  ctx.restore();

  canvas._offsetWaveformPlot = plot;
}

function clearOffsetWaveformEstimate(source) {
  source.offsetEstimate = null;
  source.estimatedOffsetWaveformBarlines = [];
  source.offsetPeakWaveformBarlines = [];
}

function drawOffsetWaveformGrid(ctx, plot, viewStart, viewEnd, xForTime) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  const centerY = plot.top + plot.height / 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.moveTo(plot.left, centerY);
  ctx.lineTo(plot.right, centerY);
  ctx.stroke();

  const ticks = getOffsetWaveformTimeTicks(viewStart, viewEnd, 8);
  for (const tick of ticks) {
    const x = xForTime(tick);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(221, 231, 255, 0.82)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(msToTimestamp(tick).slice(0, 8), x, plot.bottom + 10);
  }

  ctx.fillStyle = "rgba(221, 231, 255, 0.82)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("amp", plot.left, 2);
}

function drawOffsetWaveformData(ctx, waveformData, plot, viewStart, viewEnd) {
  const centerY = plot.top + plot.height / 2;
  const halfHeight = plot.height / 2;
  const pointCount = Math.max(2, Math.ceil(plot.width));
  const resampled = resampleOffsetWaveformData(
    waveformData,
    viewStart,
    viewEnd,
    pointCount
  );
  const points = resampled.points;

  if (points.length < 2) return;

  const separation = plot.width / (points.length - 1);

  for (let i = 0; i < points.length - 1; i++) {
    const point = points[i];
    const next = points[i + 1];
    const x1 = plot.left + i * separation;
    const x2 = plot.left + (i + 1) * separation;
    const colour = getOffsetWaveformPointColour(point, resampled);

    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x1, centerY - point.amplitudeLeft * halfHeight);
    ctx.lineTo(x2, centerY - next.amplitudeLeft * halfHeight);
    ctx.lineTo(x2, centerY + next.amplitudeRight * halfHeight);
    ctx.lineTo(x1, centerY + point.amplitudeRight * halfHeight);
    ctx.closePath();
    ctx.fill();
  }
}

function getOffsetWaveformPointColour(point, resampled) {
  const amplitude = Math.max(point.amplitudeLeft, point.amplitudeRight);
  const amount = Math.max(0, Math.min(1, amplitude));
  const colour = mixOffsetWaveformColour(
    [58, 160, 210],
    [132, 222, 255],
    amount
  );

  return `rgba(${Math.round(colour[0])}, ${Math.round(colour[1])}, ${Math.round(colour[2])}, 0.9)`;
}

function mixOffsetWaveformColour(from, to, ratio) {
  const amount = Math.max(0, Math.min(1, ratio));
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount
  ];
}

function drawOffsetWaveformBarlines(ctx, barlines, plot, viewStart, viewEnd, xForTime) {
  ctx.lineWidth = 1;

  for (const barline of barlines) {
    if (barline.time < viewStart || barline.time > viewEnd) continue;

    const x = Math.round(xForTime(barline.time)) + 0.5;
    ctx.strokeStyle = "rgba(255, 92, 112, 0.72)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }
}

function drawEstimatedOffsetWaveformBarlines(ctx, barlines, plot, viewStart, viewEnd, xForTime) {
  ctx.lineWidth = 1;

  for (const barline of barlines) {
    if (barline.time < viewStart || barline.time > viewEnd) continue;

    const x = Math.round(xForTime(barline.time)) + 0.5;
    ctx.strokeStyle = "rgba(255, 207, 92, 0.7)";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawOffsetPeakWaveformBarlines(ctx, barlines, plot, viewStart, viewEnd, xForTime) {
  ctx.lineWidth = 1;

  for (const barline of barlines) {
    if (barline.time < viewStart || barline.time > viewEnd) continue;

    const x = Math.round(xForTime(barline.time)) + 0.5;
    ctx.strokeStyle = "rgba(194, 126, 255, 0.72)";
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  ctx.setLineDash([]);
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

function handleOffsetWaveformPointerDown(event) {
  const state = offsetWaveformChartState;
  const plot = state.dom?.offsetWaveformCanvas?._offsetWaveformPlot;
  if (!plot) return;

  state.dragStartX = clampOffsetWaveformX(event.offsetX, plot);
  state.dragCurrentX = state.dragStartX;
  hideOffsetWaveformTooltip();
  state.dom.offsetWaveformCanvas.setPointerCapture?.(event.pointerId);
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerMove(event) {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const plot = canvas?._offsetWaveformPlot;
  if (!plot) return;

  const x = clampOffsetWaveformX(event.offsetX, plot);
  const time = offsetWaveformTimeForX(x, plot);

  if (state.dragStartX !== null) {
    state.dragCurrentX = x;
    drawOffsetWaveformChart();
    return;
  }

  state.hoverTime = Math.round(time);
  showOffsetWaveformTooltip(event, state.hoverTime);
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerUp(event) {
  const state = offsetWaveformChartState;
  const plot = state.dom?.offsetWaveformCanvas?._offsetWaveformPlot;
  if (!plot || state.dragStartX === null || state.dragCurrentX === null) {
    resetOffsetWaveformDrag();
    return;
  }

  const startX = clampOffsetWaveformX(state.dragStartX, plot);
  const endX = clampOffsetWaveformX(state.dragCurrentX, plot);

  if (Math.abs(startX - endX) >= 4) {
    const startTime = Math.round(offsetWaveformTimeForX(Math.min(startX, endX), plot));
    const endTime = Math.round(offsetWaveformTimeForX(Math.max(startX, endX), plot));

    if (endTime > startTime) {
      state.viewStart = startTime;
      state.viewEnd = endTime;
    }
  }

  state.dom?.offsetWaveformCanvas?.releasePointerCapture?.(event.pointerId);
  resetOffsetWaveformDrag();
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerCancel(event) {
  offsetWaveformChartState.dom?.offsetWaveformCanvas?.releasePointerCapture?.(event.pointerId);
  resetOffsetWaveformDrag();
  hideOffsetWaveformTooltip();
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerLeave() {
  const state = offsetWaveformChartState;
  if (state.dragStartX !== null) return;
  state.hoverTime = null;
  hideOffsetWaveformTooltip();
  drawOffsetWaveformChart();
}

function resetOffsetWaveformDrag() {
  const state = offsetWaveformChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
}

function offsetWaveformTimeForX(x, plot) {
  const state = offsetWaveformChartState;
  const viewStart = Math.max(0, Math.floor(state.viewStart));
  const viewEnd = Math.max(viewStart + 1, Math.ceil(state.viewEnd || getOffsetWaveformDurationMs()));
  const ratio = (x - plot.left) / plot.width;
  return viewStart + ratio * (viewEnd - viewStart);
}

function clampOffsetWaveformX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function getOffsetWaveformDurationMs() {
  const buffer = offsetWaveformChartState.audioBuffer;
  return buffer ? Math.floor(buffer.duration * 1000) : 0;
}

function getOffsetWaveformTimeTicks(start, end, maxTicks) {
  const span = Math.max(1, end - start);
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000];
  const step = steps.find(value => span / value <= maxTicks) ?? 120000;
  const first = Math.ceil(start / step) * step;
  const ticks = [];

  for (let time = first; time <= end; time += step) {
    ticks.push(time);
  }

  return ticks;
}

function showOffsetWaveformTooltip(event, time) {
  const state = offsetWaveformChartState;
  const tooltip = state.dom?.offsetWaveformTooltip;
  if (!tooltip) return;

  tooltip.hidden = false;
  tooltip.textContent = msToTimestamp(time);
  tooltip.style.left = `${event.offsetX + 14}px`;
  tooltip.style.top = `${event.offsetY + 14}px`;
}

function hideOffsetWaveformTooltip() {
  const tooltip = offsetWaveformChartState.dom?.offsetWaveformTooltip;
  if (tooltip) tooltip.hidden = true;
}
