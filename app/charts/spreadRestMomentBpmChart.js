const spreadRestMomentBpmChartState = {
  results: null,
  dom: null,
  t: null,
  diffOrder: null,
  options: {},
  signature: "",
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  initialized: false,
  resizeObserver: null
};

function renderSpreadRestMomentBpmChart(
  results,
  dom,
  t,
  diffOrder = null,
  options = {}
) {
  const state = spreadRestMomentBpmChartState;
  state.results = results;
  state.dom = dom;
  state.t = t;
  state.diffOrder = diffOrder;
  state.options = options;

  initializeSpreadRestMomentBpmChart();

  const chartResults = getSpreadRestMomentChartResults();
  const endTime = getSpreadRestMomentChartEndTime(chartResults);
  const canRender = chartResults.length > 0 && endTime > 0;

  if (!canRender) {
    if (dom.spreadRestChartWrap) dom.spreadRestChartWrap.hidden = true;
    if (dom.spreadRestChartEmpty) {
      dom.spreadRestChartEmpty.hidden = false;
      dom.spreadRestChartEmpty.textContent = results
        ? t("spreadRestBpmGraphNoData")
        : t("noFileLoaded");
    }
    return;
  }

  const signature =
    chartResults.map(result => result.fileName).join("|") + `::${endTime}`;

  if (signature !== state.signature) {
    state.signature = signature;
    state.viewStart = 0;
    state.viewEnd = endTime;
    state.hoverTime = null;
  } else {
    state.viewEnd = Math.min(state.viewEnd || endTime, endTime);
  }

  if (dom.spreadRestChartEmpty) dom.spreadRestChartEmpty.hidden = true;
  if (dom.spreadRestChartWrap) dom.spreadRestChartWrap.hidden = false;

  drawSpreadRestMomentBpmChart();
}

function initializeSpreadRestMomentBpmChart() {
  const state = spreadRestMomentBpmChartState;
  if (state.initialized || !state.dom?.spreadRestChart) return;

  const canvas = state.dom.spreadRestChart;
  canvas.addEventListener("pointerdown", handleSpreadRestMomentPointerDown);
  canvas.addEventListener("pointermove", handleSpreadRestMomentPointerMove);
  canvas.addEventListener("pointerup", handleSpreadRestMomentPointerUp);
  canvas.addEventListener("pointercancel", handleSpreadRestMomentPointerCancel);
  canvas.addEventListener("pointerleave", handleSpreadRestMomentPointerLeave);

  if (state.dom.spreadRestResetZoom) {
    state.dom.spreadRestResetZoom.addEventListener("click", () => {
      const endTime = getSpreadRestMomentChartEndTime(
        getSpreadRestMomentChartResults()
      );
      if (endTime <= 0) return;

      state.viewStart = 0;
      state.viewEnd = endTime;
      state.hoverTime = null;
      hideSpreadRestMomentTooltip();
      drawSpreadRestMomentBpmChart();
    });
  }

  if (
    typeof ResizeObserver !== "undefined" &&
    state.dom.spreadRestChartSection
  ) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.spreadRestChartWrap?.hidden) {
        drawSpreadRestMomentBpmChart();
      }
    });
    state.resizeObserver.observe(state.dom.spreadRestChartSection);
  } else {
    window.addEventListener("resize", drawSpreadRestMomentBpmChart);
  }

  state.initialized = true;
}

function getSpreadRestMomentChartResults() {
  const state = spreadRestMomentBpmChartState;
  if (!state.results) return [];

  const ordered = state.diffOrder
    ? applySpreadDiffOrder(state.results, state.diffOrder)
    : sortSpreadResults(state.results);

  return ordered.filter(result => result.restMoments?.timingPoints?.length);
}

function drawSpreadRestMomentBpmChart() {
  const state = spreadRestMomentBpmChartState;
  const canvas = state.dom?.spreadRestChart;
  const results = getSpreadRestMomentChartResults();
  const visibleResults = results.slice(0, 1);
  const endTime = getSpreadRestMomentChartEndTime(results);

  if (
    !canvas ||
    !results.length ||
    endTime <= 0 ||
    state.dom?.spreadRestChartWrap?.hidden
  ) {
    return;
  }

  const cssWidth = Math.max(320, canvas.parentElement?.clientWidth ?? 0);
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
    top: 24,
    right: cssWidth - 18,
    bottom: cssHeight - 42
  };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);

  const viewStart = Math.max(0, state.viewStart);
  const viewEnd = Math.max(viewStart + 1, state.viewEnd || endTime);
  const maxBpm = getSpreadRestMomentNiceMaximum(
    getSpreadRestMomentMaxBpm(visibleResults, viewStart, viewEnd)
  );
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;
  const yForBpm = bpm =>
    plot.bottom - (bpm / maxBpm) * plot.height;

  drawSpreadRestMomentGrid(
    ctx,
    plot,
    viewStart,
    viewEnd,
    maxBpm,
    xForTime,
    yForBpm
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  visibleResults.forEach(result => {
    const sections = getSpreadRestMomentBpmSections(result, state.options);
    drawSpreadRestMomentSeries(
      ctx,
      sections,
      viewStart,
      viewEnd,
      xForTime,
      yForBpm,
      "originalBpm",
      "#6ecbff",
      true
    );
    drawSpreadRestMomentSeries(
      ctx,
      sections,
      viewStart,
      viewEnd,
      xForTime,
      yForBpm,
      "scaledBpm",
      "#f2b84b",
      false
    );
  });

  if (state.hoverTime !== null) {
    const x = xForTime(state.hoverTime);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  if (state.dragStartX !== null && state.dragCurrentX !== null) {
    const startX = clampSpreadRestMomentX(state.dragStartX, plot);
    const endX = clampSpreadRestMomentX(state.dragCurrentX, plot);
    ctx.fillStyle = "rgba(159, 220, 255, 0.16)";
    ctx.fillRect(
      Math.min(startX, endX),
      plot.top,
      Math.abs(endX - startX),
      plot.height
    );
  }

  ctx.restore();

  canvas._spreadRestMomentPlot = plot;
  canvas.__playheadGeom = { plot, viewStart, viewEnd };
  canvas._spreadRestMomentVisibleResults = visibleResults;
}

function drawSpreadRestMomentGrid(
  ctx,
  plot,
  viewStart,
  viewEnd,
  maxBpm,
  xForTime,
  yForBpm
) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  const yTickCount = 5;
  for (let i = 0; i <= yTickCount; i++) {
    const bpm = maxBpm * (i / yTickCount);
    const y = yForBpm(bpm);

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
    ctx.fillText(String(Math.round(bpm)), plot.left - 8, y);
  }

  ctx.fillStyle = "#aeb8c8";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("BPM", plot.left, plot.top - 4);

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
    ctx.fillText(formatSpreadRestMomentTime(time), x, plot.bottom + 10);
  }
}

function drawSpreadRestMomentSeries(
  ctx,
  sections,
  viewStart,
  viewEnd,
  xForTime,
  yForBpm,
  key,
  color,
  dashed
) {
  const visible = sections
    .filter(section => section.end > viewStart && section.start < viewEnd)
    .sort((a, b) => a.start - b.start);
  if (!visible.length) return;

  ctx.strokeStyle = color;
  ctx.globalAlpha = dashed ? 0.72 : 0.95;
  ctx.lineWidth = dashed ? 1.5 : 2.25;
  ctx.setLineDash(dashed ? [6, 4] : []);
  ctx.lineJoin = "round";
  ctx.beginPath();

  visible.forEach((section, index) => {
    const start = Math.max(section.start, viewStart);
    const end = Math.min(section.end, viewEnd);
    const y = yForBpm(section[key]);

    if (index === 0) {
      ctx.moveTo(xForTime(start), y);
    } else {
      ctx.lineTo(xForTime(start), y);
    }
    ctx.lineTo(xForTime(end), y);
  });

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function getSpreadRestMomentBpmSections(result, options) {
  const restMoments = result.restMoments;
  const timingPoints = restMoments?.timingPoints ?? [];
  const endTime = restMoments?.endTime ?? 0;
  const sections = [];

  for (let i = 0; i < timingPoints.length; i++) {
    const point = timingPoints[i];
    const next = timingPoints[i + 1];
    const start = Math.max(0, point.time);
    const end = Math.max(start, next ? next.time : endTime);
    const originalBpm = 60000 / point.beatLength;
    const scale = getSpreadRestMomentBpmScale(point.beatLength, options);

    if (
      end > start &&
      Number.isFinite(originalBpm) &&
      originalBpm > 0
    ) {
      sections.push({
        start,
        end,
        originalBpm,
        scaledBpm: originalBpm * scale,
        scale
      });
    }
  }

  return sections;
}

function getSpreadRestMomentMaxBpm(results, viewStart, viewEnd) {
  return Math.max(
    0,
    ...results.flatMap(result =>
      getSpreadRestMomentBpmSections(
        result,
        spreadRestMomentBpmChartState.options
      )
        .filter(section =>
          section.end > viewStart &&
          section.start < viewEnd
        )
        .flatMap(section => [section.originalBpm, section.scaledBpm])
    )
  );
}

function getSpreadRestMomentNiceMaximum(value) {
  if (!Number.isFinite(value) || value <= 0) return 300;

  const padded = Math.max(1, value * 1.08);
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const nice = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 5
        ? 5
        : 10;

  return Math.max(1, nice * magnitude);
}

function getSpreadRestMomentChartEndTime(results) {
  return Math.max(
    0,
    ...results.map(result => result.restMoments?.endTime ?? 0)
  );
}

function handleSpreadRestMomentPointerDown(event) {
  const state = spreadRestMomentBpmChartState;
  const canvas = state.dom?.spreadRestChart;
  const plot = canvas?._spreadRestMomentPlot;
  if (!canvas || !plot) return;

  const point = getSpreadRestMomentPointerPosition(event, canvas);
  if (!isSpreadRestMomentPointInPlot(point, plot)) return;

  canvas.setPointerCapture(event.pointerId);
  state.dragStartX = point.x;
  state.dragCurrentX = point.x;
  hideSpreadRestMomentTooltip();
  drawSpreadRestMomentBpmChart();
}

function handleSpreadRestMomentPointerMove(event) {
  const state = spreadRestMomentBpmChartState;
  const canvas = state.dom?.spreadRestChart;
  const plot = canvas?._spreadRestMomentPlot;
  if (!canvas || !plot) return;

  const point = getSpreadRestMomentPointerPosition(event, canvas);

  if (state.dragStartX !== null) {
    state.dragCurrentX = clampSpreadRestMomentX(point.x, plot);
    hideSpreadRestMomentTooltip();
    drawSpreadRestMomentBpmChart();
    return;
  }

  if (!isSpreadRestMomentPointInPlot(point, plot)) {
    state.hoverTime = null;
    hideSpreadRestMomentTooltip();
    drawSpreadRestMomentBpmChart();
    return;
  }

  state.hoverTime = spreadRestMomentXToTime(point.x, plot);
  drawSpreadRestMomentBpmChart();
  showSpreadRestMomentTooltip(point, state.hoverTime);
}

function handleSpreadRestMomentPointerUp(event) {
  const state = spreadRestMomentBpmChartState;
  const canvas = state.dom?.spreadRestChart;
  const plot = canvas?._spreadRestMomentPlot;
  if (!canvas || !plot || state.dragStartX === null) return;

  const point = getSpreadRestMomentPointerPosition(event, canvas);
  const distance = Math.abs(point.x - state.dragStartX);

  if (distance >= 8) {
    const startTime = spreadRestMomentXToTime(state.dragStartX, plot);
    const endTime = spreadRestMomentXToTime(point.x, plot);
    state.viewStart = Math.max(0, Math.min(startTime, endTime));
    state.viewEnd = Math.min(
      getSpreadRestMomentChartEndTime(getSpreadRestMomentChartResults()),
      Math.max(startTime, endTime)
    );
  } else {
    const time = spreadRestMomentXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.dragStartX = null;
  state.dragCurrentX = null;
  state.hoverTime = null;
  hideSpreadRestMomentTooltip();
  drawSpreadRestMomentBpmChart();
}

function handleSpreadRestMomentPointerCancel() {
  const state = spreadRestMomentBpmChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
  hideSpreadRestMomentTooltip();
  drawSpreadRestMomentBpmChart();
}

function handleSpreadRestMomentPointerLeave() {
  const state = spreadRestMomentBpmChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideSpreadRestMomentTooltip();
  drawSpreadRestMomentBpmChart();
}

function showSpreadRestMomentTooltip(point, time) {
  const state = spreadRestMomentBpmChartState;
  const tooltip = state.dom?.spreadRestChartTooltip;
  const wrap = state.dom?.spreadRestChartWrap;
  const canvas = state.dom?.spreadRestChart;
  const visibleResults = canvas?._spreadRestMomentVisibleResults ?? [];
  if (!tooltip || !wrap) return;

  const lines = [msToTimestamp(Math.round(time))];

  for (const result of visibleResults) {
    const section = getSpreadRestMomentBpmSections(
      result,
      state.options
    ).find(item => time >= item.start && time < item.end);
    if (!section) continue;

    lines.push(
      `元BPM ${formatSpreadRestMomentBpm(section.originalBpm)} -> ` +
      `変換後BPM ${formatSpreadRestMomentBpm(section.scaledBpm)} ` +
      `(${section.scale}x)`
    );
    break;
  }

  tooltip.classList.add("is-simple");
  tooltip.textContent = lines.join("\n");
  tooltip.hidden = false;
  positionSpreadRestMomentTooltip(tooltip, wrap, point);
}

function positionSpreadRestMomentTooltip(tooltip, wrap, point) {
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

  tooltip.style.left =
    `${Math.max(edgePadding, Math.min(left, wrap.clientWidth - tooltipWidth - edgePadding))}px`;
  tooltip.style.top =
    `${Math.max(edgePadding, Math.min(top, wrap.clientHeight - tooltipHeight - edgePadding))}px`;
}

function hideSpreadRestMomentTooltip() {
  const tooltip = spreadRestMomentBpmChartState.dom?.spreadRestChartTooltip;
  if (tooltip) tooltip.hidden = true;
}

function getSpreadRestMomentPointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isSpreadRestMomentPointInPlot(point, plot) {
  return (
    point.x >= plot.left &&
    point.x <= plot.right &&
    point.y >= plot.top &&
    point.y <= plot.bottom
  );
}

function clampSpreadRestMomentX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function spreadRestMomentXToTime(x, plot) {
  const state = spreadRestMomentBpmChartState;
  const ratio = (clampSpreadRestMomentX(x, plot) - plot.left) / plot.width;
  return state.viewStart + ratio * (state.viewEnd - state.viewStart);
}

function formatSpreadRestMomentTime(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSpreadRestMomentBpm(value) {
  if (!Number.isFinite(value)) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
