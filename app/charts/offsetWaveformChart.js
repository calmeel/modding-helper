const offsetWaveformChartState = {
  sources: null,
  dom: null,
  t: null,
  selectedFileName: "",
  audioContext: null,
  audioBuffer: null,
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
    updateOffsetWaveformDiffSelect([]);
    setOffsetWaveformEmpty(t("noFileLoaded"));
    return;
  }

  const sortedSources = sortResultsForDisplay(sources);
  updateOffsetWaveformDiffSelect(sortedSources);

  const selected = getSelectedOffsetWaveformSource(sortedSources);
  if (!selected) {
    setOffsetWaveformEmpty(t("offsetWaveformNoDiff"));
    return;
  }

  renderSelectedOffsetWaveformSource(selected);
}

function initializeOffsetWaveformChart() {
  const state = offsetWaveformChartState;
  if (state.initialized || !state.dom?.offsetWaveformCanvas) return;

  const canvas = state.dom.offsetWaveformCanvas;
  canvas.addEventListener("pointerdown", handleOffsetWaveformPointerDown);
  canvas.addEventListener("pointermove", handleOffsetWaveformPointerMove);
  canvas.addEventListener("pointerup", handleOffsetWaveformPointerUp);
  canvas.addEventListener("pointercancel", handleOffsetWaveformPointerCancel);
  canvas.addEventListener("pointerleave", handleOffsetWaveformPointerLeave);

  if (state.dom.offsetWaveformDiffSelect) {
    state.dom.offsetWaveformDiffSelect.addEventListener("change", () => {
      state.selectedFileName = state.dom.offsetWaveformDiffSelect.value;
      const selected = getSelectedOffsetWaveformSource(
        sortResultsForDisplay(state.sources ?? [])
      );
      if (selected) renderSelectedOffsetWaveformSource(selected);
    });
  }

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

function updateOffsetWaveformDiffSelect(sources) {
  const state = offsetWaveformChartState;
  const select = state.dom?.offsetWaveformDiffSelect;
  if (!select) return;

  const previous = state.selectedFileName || select.value;
  select.replaceChildren();

  for (const source of sources) {
    const option = document.createElement("option");
    option.value = source.fileName;
    option.textContent = getDifficultyNameText(source.fileName);
    select.appendChild(option);
  }

  const nextValue = sources.some(source => source.fileName === previous)
    ? previous
    : sources[0]?.fileName ?? "";

  select.value = nextValue;
  state.selectedFileName = nextValue;
}

function getSelectedOffsetWaveformSource(sources) {
  const state = offsetWaveformChartState;
  return sources.find(source => source.fileName === state.selectedFileName) ??
    sources[0] ??
    null;
}

async function renderSelectedOffsetWaveformSource(source) {
  const state = offsetWaveformChartState;
  const t = state.t;
  const token = ++state.decodeToken;

  if (!source.audioBlob) {
    state.audioBuffer = null;
    state.decodedFileName = "";
    setOffsetWaveformEmpty(
      source.audioFileName
        ? t("offsetWaveformAudioMissing").replace("{audio}", source.audioFileName)
        : t("offsetWaveformNoAudioFilename")
    );
    return;
  }

  const barlines = buildOffsetWaveformBarlines(source.text);
  source.offsetWaveformBarlines = barlines;

  const signature = `${source.fileName}::${source.audioEntryName || source.audioFileName}`;

  if (state.signature !== signature) {
    state.signature = signature;
    state.audioBuffer = null;
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
    state.decodedFileName = source.fileName;

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

    drawOffsetWaveformChart();
  } catch (error) {
    if (token !== state.decodeToken) return;
    state.audioBuffer = null;
    state.decodedFileName = "";
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
  hideOffsetWaveformTooltip();
}

function drawOffsetWaveformChart() {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const audioBuffer = state.audioBuffer;
  const source = getSelectedOffsetWaveformSource(
    sortResultsForDisplay(state.sources ?? [])
  );

  if (
    !canvas ||
    !audioBuffer ||
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

  drawOffsetWaveformPeaks(ctx, audioBuffer, plot, viewStart, viewEnd);
  drawOffsetWaveformBarlines(
    ctx,
    source.offsetWaveformBarlines ?? [],
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

function drawOffsetWaveformPeaks(ctx, audioBuffer, plot, viewStart, viewEnd) {
  const sampleRate = audioBuffer.sampleRate;
  const channelCount = audioBuffer.numberOfChannels;
  const centerY = plot.top + plot.height / 2;
  const halfHeight = plot.height / 2;
  const samplesPerMs = sampleRate / 1000;

  ctx.strokeStyle = "#78d7ff";
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x < plot.width; x++) {
    const rangeStartMs = viewStart + (x / plot.width) * (viewEnd - viewStart);
    const rangeEndMs = viewStart + ((x + 1) / plot.width) * (viewEnd - viewStart);
    const startSample = Math.max(0, Math.floor(rangeStartMs * samplesPerMs));
    const endSample = Math.min(
      audioBuffer.length,
      Math.max(startSample + 1, Math.ceil(rangeEndMs * samplesPerMs))
    );

    let min = 0;
    let max = 0;

    for (let channel = 0; channel < channelCount; channel++) {
      const data = audioBuffer.getChannelData(channel);
      for (let i = startSample; i < endSample; i++) {
        const sample = data[i] || 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
    }

    const canvasX = plot.left + x + 0.5;
    const yMin = centerY - max * halfHeight;
    const yMax = centerY - min * halfHeight;
    ctx.moveTo(canvasX, yMin);
    ctx.lineTo(canvasX, yMax);
  }

  ctx.stroke();
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
