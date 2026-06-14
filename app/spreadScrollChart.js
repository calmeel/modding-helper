const spreadScrollChartState = {
  results: null,
  dom: null,
  t: null,
  diffOrder: null,
  signature: "",
  hiddenFiles: new Set(),
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  initialized: false,
  resizeObserver: null
};

function renderSpreadScrollChart(results, dom, t, diffOrder = null) {
  const state = spreadScrollChartState;
  state.results = results;
  state.dom = dom;
  state.t = t;
  state.diffOrder = diffOrder;

  initializeSpreadScrollChart();

  const orderedResults = getSpreadScrollOrderedResults(results, diffOrder);
  const chartResults = orderedResults.filter(
    result => result.scrollSpeed?.samples?.length
  );
  const endTime = getSpreadScrollEndTime(chartResults);
  const canRender = chartResults.length > 0 && endTime > 0;

  if (!canRender) {
    if (dom.spreadScrollChartWrap) dom.spreadScrollChartWrap.hidden = true;
    if (dom.spreadScrollDiffToggles) {
      dom.spreadScrollDiffToggles.replaceChildren();
    }
    if (dom.spreadScrollChartEmpty) {
      dom.spreadScrollChartEmpty.hidden = false;
      dom.spreadScrollChartEmpty.textContent = results
        ? t("spreadScrollGraphNoData")
        : t("noFileLoaded");
    }
    return;
  }

  const signature =
    [...chartResults]
      .map(result => result.fileName)
      .sort()
      .join("|") + `::${endTime}`;

  if (signature !== state.signature) {
    state.signature = signature;
    state.hiddenFiles.clear();
    state.viewStart = 0;
    state.viewEnd = endTime;
    state.hoverTime = null;
  } else {
    state.viewEnd = Math.min(state.viewEnd || endTime, endTime);
  }

  if (dom.spreadScrollChartEmpty) dom.spreadScrollChartEmpty.hidden = true;
  if (dom.spreadScrollChartWrap) dom.spreadScrollChartWrap.hidden = false;

  renderSpreadScrollDiffToggles(chartResults);
  drawSpreadScrollChart();
}

function initializeSpreadScrollChart() {
  const state = spreadScrollChartState;
  if (state.initialized || !state.dom?.spreadScrollChart) return;

  const canvas = state.dom.spreadScrollChart;
  const resetButton = state.dom.spreadScrollResetZoom;

  canvas.addEventListener("pointerdown", handleSpreadScrollPointerDown);
  canvas.addEventListener("pointermove", handleSpreadScrollPointerMove);
  canvas.addEventListener("pointerup", handleSpreadScrollPointerUp);
  canvas.addEventListener("pointercancel", handleSpreadScrollPointerCancel);
  canvas.addEventListener("pointerleave", handleSpreadScrollPointerLeave);

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const endTime = getSpreadScrollEndTime(getSpreadScrollChartResults());
      if (endTime <= 0) return;

      state.viewStart = 0;
      state.viewEnd = endTime;
      state.hoverTime = null;
      hideSpreadScrollTooltip();
      drawSpreadScrollChart();
    });
  }

  if (typeof ResizeObserver !== "undefined" && state.dom.spreadScrollChartWrap) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.spreadScrollChartWrap.hidden) {
        drawSpreadScrollChart();
      }
    });
    state.resizeObserver.observe(state.dom.spreadScrollChartWrap);
  } else {
    window.addEventListener("resize", drawSpreadScrollChart);
  }

  state.initialized = true;
}

function getSpreadScrollOrderedResults(results, diffOrder) {
  if (!results) return [];
  return diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);
}

function getSpreadScrollChartResults() {
  return getSpreadScrollOrderedResults(
    spreadScrollChartState.results,
    spreadScrollChartState.diffOrder
  ).filter(result => result.scrollSpeed?.samples?.length);
}

function renderSpreadScrollDiffToggles(results) {
  const state = spreadScrollChartState;
  const container = state.dom?.spreadScrollDiffToggles;
  if (!container) return;

  const fragment = document.createDocumentFragment();

  results.forEach((result, index) => {
    const virtualSr = index + 1;
    const color = getVolumeCompareSrColor(virtualSr);
    const label = document.createElement("label");
    label.className = "volume-compare-diff-toggle";
    label.title = `Virtual SR ${virtualSr}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !state.hiddenFiles.has(result.fileName);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.hiddenFiles.delete(result.fileName);
      } else {
        state.hiddenFiles.add(result.fileName);
      }

      drawSpreadScrollChart();
    });

    const swatch = document.createElement("span");
    swatch.className = "volume-compare-diff-swatch";
    swatch.style.backgroundColor = color;

    const name = document.createElement("span");
    name.textContent = getDifficultyNameText(result.fileName);

    label.append(checkbox, swatch, name);
    fragment.appendChild(label);
  });

  container.replaceChildren(fragment);
}

function drawSpreadScrollChart() {
  const state = spreadScrollChartState;
  const canvas = state.dom?.spreadScrollChart;
  const results = getSpreadScrollChartResults();
  const visibleResults = results.filter(
    result => !state.hiddenFiles.has(result.fileName)
  );
  const endTime = getSpreadScrollEndTime(results);

  if (
    !canvas ||
    !results.length ||
    endTime <= 0 ||
    state.dom?.spreadScrollChartWrap?.hidden
  ) {
    return;
  }

  const cssWidth = Math.max(320, canvas.parentElement?.clientWidth ?? 0);
  const cssHeight = 340;
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const plot = {
    left: 68,
    top: 18,
    right: cssWidth - 18,
    bottom: cssHeight - 42
  };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);

  const viewStart = Math.max(0, state.viewStart);
  const viewEnd = Math.max(viewStart + 1, state.viewEnd || endTime);
  const maxSpeed = getSpreadScrollChartMaxSpeed(visibleResults);
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;
  const yForSpeed = speed =>
    plot.bottom - (speed / maxSpeed) * plot.height;

  drawSpreadScrollGrid(
    ctx,
    plot,
    viewStart,
    viewEnd,
    maxSpeed,
    xForTime,
    yForSpeed
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  visibleResults.forEach((result, index) => {
    const originalIndex = results.findIndex(
      item => item.fileName === result.fileName
    );
    drawSpreadScrollSeries(
      ctx,
      result.scrollSpeed.samples,
      getVolumeCompareSrColor(originalIndex + 1),
      viewStart,
      viewEnd,
      xForTime,
      yForSpeed
    );
  });

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
    const startX = clampSpreadScrollX(state.dragStartX, plot);
    const endX = clampSpreadScrollX(state.dragCurrentX, plot);
    ctx.fillStyle = "rgba(159, 220, 255, 0.16)";
    ctx.fillRect(
      Math.min(startX, endX),
      plot.top,
      Math.abs(endX - startX),
      plot.height
    );
  }

  ctx.restore();

  canvas._spreadScrollPlot = plot;
  canvas._spreadScrollVisibleResults = visibleResults;
}

function drawSpreadScrollGrid(
  ctx,
  plot,
  viewStart,
  viewEnd,
  maxSpeed,
  xForTime,
  yForSpeed
) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  const yTickCount = 5;
  for (let i = 0; i <= yTickCount; i++) {
    const speed = maxSpeed * (i / yTickCount);
    const y = yForSpeed(speed);

    ctx.strokeStyle = i === 0
      ? "rgba(255, 255, 255, 0.35)"
      : "rgba(255, 255, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(speed)}`, plot.left - 8, y);
  }

  ctx.fillStyle = "#aeb8c8";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("px/s", 8, plot.top);

  const xTickCount = Math.max(3, Math.min(8, Math.floor(plot.width / 110)));
  for (let i = 0; i <= xTickCount; i++) {
    const ratio = i / xTickCount;
    const time = viewStart + (viewEnd - viewStart) * ratio;
    const x = xForTime(time);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = i === 0 ? "left" : i === xTickCount ? "right" : "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatSpreadScrollAxisTime(time), x, plot.bottom + 10);
  }
}

function drawSpreadScrollSeries(
  ctx,
  samples,
  color,
  viewStart,
  viewEnd,
  xForTime,
  yForSpeed
) {
  if (!samples?.length) return;

  const lastSampleTime = samples[samples.length - 1].time;
  if (viewStart > lastSampleTime) return;

  let current = getSpreadScrollSampleAtTime(samples, viewStart);
  let currentTime = viewStart;

  if (!current) {
    current = samples.find(sample => sample.time >= viewStart) ?? null;
    if (!current || current.time > viewEnd) return;
    currentTime = current.time;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(xForTime(currentTime), yForSpeed(current.pxPerSecond));

  for (const sample of samples) {
    if (sample.time <= currentTime) continue;
    if (sample.time > viewEnd) break;

    ctx.lineTo(xForTime(sample.time), yForSpeed(current.pxPerSecond));
    if (sample.pxPerSecond !== current.pxPerSecond) {
      ctx.lineTo(xForTime(sample.time), yForSpeed(sample.pxPerSecond));
    }

    current = sample;
    currentTime = sample.time;
  }

  ctx.lineTo(
    xForTime(Math.min(viewEnd, lastSampleTime)),
    yForSpeed(current.pxPerSecond)
  );
  ctx.stroke();
}

function getSpreadScrollSampleAtTime(samples, time) {
  let current = null;

  for (const sample of samples ?? []) {
    if (sample.time > time) break;
    current = sample;
  }

  return current;
}

function getSpreadScrollEndTime(results) {
  return Math.max(
    0,
    ...(results ?? []).map(result => {
      const samples = result.scrollSpeed?.samples ?? [];
      return samples[samples.length - 1]?.time ?? 0;
    })
  );
}

function getSpreadScrollChartMaxSpeed(results) {
  const max = Math.max(
    0,
    ...(results ?? []).flatMap(result =>
      (result.scrollSpeed?.samples ?? [])
        .map(sample => sample.pxPerSecond)
        .filter(Number.isFinite)
    )
  );

  return getSpreadScrollNiceMaximum(max);
}

function getSpreadScrollNiceMaximum(value) {
  if (!Number.isFinite(value) || value <= 0) return 100;

  const padded = value * 1.08;
  const step =
    padded <= 500 ? 50 :
    padded <= 2000 ? 100 :
    padded <= 5000 ? 250 : 500;

  return Math.ceil(padded / step) * step;
}

function handleSpreadScrollPointerDown(event) {
  const state = spreadScrollChartState;
  const canvas = state.dom?.spreadScrollChart;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);
  if (!isSpreadScrollPointInPlot(point, plot)) return;

  canvas.setPointerCapture(event.pointerId);
  state.dragStartX = point.x;
  state.dragCurrentX = point.x;
  hideSpreadScrollTooltip();
  drawSpreadScrollChart();
}

function handleSpreadScrollPointerMove(event) {
  const state = spreadScrollChartState;
  const canvas = state.dom?.spreadScrollChart;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);

  if (state.dragStartX !== null) {
    state.dragCurrentX = point.x;
    drawSpreadScrollChart();
    return;
  }

  if (!isSpreadScrollPointInPlot(point, plot)) {
    state.hoverTime = null;
    hideSpreadScrollTooltip();
    drawSpreadScrollChart();
    return;
  }

  state.hoverTime = spreadScrollXToTime(point.x, plot);
  showSpreadScrollTooltip(point, state.hoverTime);
  drawSpreadScrollChart();
}

function handleSpreadScrollPointerUp(event) {
  const state = spreadScrollChartState;
  const canvas = state.dom?.spreadScrollChart;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot || state.dragStartX === null) return;

  const point = getSpreadScrollPointerPosition(event, canvas);
  const distance = Math.abs(point.x - state.dragStartX);

  if (distance >= 8) {
    const startTime = spreadScrollXToTime(state.dragStartX, plot);
    const endTime = spreadScrollXToTime(point.x, plot);
    state.viewStart = Math.max(0, Math.min(startTime, endTime));
    state.viewEnd = Math.min(
      getSpreadScrollEndTime(getSpreadScrollChartResults()),
      Math.max(startTime, endTime)
    );
  } else {
    const time = spreadScrollXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.dragStartX = null;
  state.dragCurrentX = null;
  state.hoverTime = null;
  hideSpreadScrollTooltip();
  drawSpreadScrollChart();
}

function handleSpreadScrollPointerCancel() {
  const state = spreadScrollChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
  hideSpreadScrollTooltip();
  drawSpreadScrollChart();
}

function handleSpreadScrollPointerLeave() {
  const state = spreadScrollChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideSpreadScrollTooltip();
  drawSpreadScrollChart();
}

function showSpreadScrollTooltip(point, time) {
  const state = spreadScrollChartState;
  const tooltip = state.dom?.spreadScrollChartTooltip;
  const wrap = state.dom?.spreadScrollChartWrap;
  const results =
    state.dom?.spreadScrollChart?._spreadScrollVisibleResults ?? [];
  if (!tooltip || !wrap) return;

  const lines = [msToTimestamp(Math.round(time))];

  for (const result of results) {
    const sample = getSpreadScrollSampleAtTime(
      result.scrollSpeed?.samples,
      time
    );
    const diffName = getDifficultyNameText(result.fileName);

    if (!sample) {
      lines.push(`${diffName}: N/A`);
      continue;
    }

    lines.push("");
    lines.push(
      `${diffName}: ${Math.round(sample.pxPerSecond)} px/s`
    );
    lines.push(
      `${state.t("spreadScrollGraphBpm")}: ${formatSpreadScrollTooltipNumber(sample.bpm, 3)} | ` +
      `${state.t("spreadScrollGraphSv")}: ${formatSpreadScrollTooltipNumber(sample.sv, 3)} | ` +
      `${state.t("spreadScrollGraphSliderMultiplier")}: ` +
      `${formatSpreadScrollTooltipNumber(sample.sliderMultiplier, 2)}`
    );
  }

  tooltip.textContent = lines.join("\n");
  tooltip.hidden = false;

  const gap = 14;
  const edgePadding = 8;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  let left = point.x + gap;
  let top = point.y + gap;

  if (left + tooltipWidth > wrap.clientWidth - edgePadding) {
    left = point.x - tooltipWidth - gap;
  }
  if (top + tooltipHeight > wrap.clientHeight - edgePadding) {
    top = point.y - tooltipHeight - gap;
  }

  tooltip.style.left = `${Math.max(edgePadding, left)}px`;
  tooltip.style.top = `${Math.max(edgePadding, top)}px`;
}

function hideSpreadScrollTooltip() {
  const tooltip = spreadScrollChartState.dom?.spreadScrollChartTooltip;
  if (tooltip) tooltip.hidden = true;
}

function formatSpreadScrollTooltipNumber(value, maximumFractionDigits) {
  if (!Number.isFinite(value)) return "N/A";
  return Number(value.toFixed(maximumFractionDigits)).toString();
}

function getSpreadScrollPointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isSpreadScrollPointInPlot(point, plot) {
  return (
    point.x >= plot.left &&
    point.x <= plot.right &&
    point.y >= plot.top &&
    point.y <= plot.bottom
  );
}

function clampSpreadScrollX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function spreadScrollXToTime(x, plot) {
  const state = spreadScrollChartState;
  const ratio =
    (clampSpreadScrollX(x, plot) - plot.left) / Math.max(1, plot.width);
  return state.viewStart + ratio * (state.viewEnd - state.viewStart);
}

function formatSpreadScrollAxisTime(time) {
  const totalSeconds = Math.max(0, Math.round(time / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
