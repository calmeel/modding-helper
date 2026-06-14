const kiaiCompareChartState = {
  results: null,
  dom: null,
  t: null,
  signature: "",
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  initialized: false,
  resizeObserver: null
};

function renderKiaiCompareChart(results, dom, t) {
  const state = kiaiCompareChartState;
  state.results = results;
  state.dom = dom;
  state.t = t;

  initializeKiaiCompareChart();

  const sortedResults = results ? sortResultsForDisplay(results) : [];
  const endTime = Math.max(0, ...sortedResults.map(result => result.endTime ?? 0));
  const canRender = sortedResults.length > 0 && endTime > 0;

  if (!canRender) {
    if (dom.kiaiCompareChartWrap) dom.kiaiCompareChartWrap.hidden = true;
    if (dom.kiaiCompareChartEmpty) {
      dom.kiaiCompareChartEmpty.hidden = false;
      dom.kiaiCompareChartEmpty.textContent = results
        ? t("kiaiCompareGraphNoData")
        : t("noFileLoaded");
    }
    return;
  }

  const signature =
    sortedResults.map(result => result.fileName).join("|") + `::${endTime}`;

  if (signature !== state.signature) {
    state.signature = signature;
    state.viewStart = 0;
    state.viewEnd = endTime;
    state.hoverTime = null;
  } else {
    state.viewEnd = Math.min(state.viewEnd || endTime, endTime);
  }

  if (dom.kiaiCompareChartEmpty) dom.kiaiCompareChartEmpty.hidden = true;
  if (dom.kiaiCompareChartWrap) dom.kiaiCompareChartWrap.hidden = false;

  drawKiaiCompareChart();
}

function initializeKiaiCompareChart() {
  const state = kiaiCompareChartState;
  if (state.initialized || !state.dom?.kiaiCompareChart) return;

  const canvas = state.dom.kiaiCompareChart;
  const resetButton = state.dom.kiaiCompareResetZoom;

  canvas.addEventListener("pointerdown", handleKiaiComparePointerDown);
  canvas.addEventListener("pointermove", handleKiaiComparePointerMove);
  canvas.addEventListener("pointerup", handleKiaiComparePointerUp);
  canvas.addEventListener("pointercancel", handleKiaiComparePointerCancel);
  canvas.addEventListener("pointerleave", handleKiaiComparePointerLeave);

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const endTime = getKiaiCompareEndTime();
      if (endTime <= 0) return;

      state.viewStart = 0;
      state.viewEnd = endTime;
      state.hoverTime = null;
      hideKiaiCompareTooltip();
      drawKiaiCompareChart();
    });
  }

  if (typeof ResizeObserver !== "undefined" && state.dom.kiaiCompareChartWrap) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.kiaiCompareChartWrap.hidden) {
        drawKiaiCompareChart();
      }
    });
    state.resizeObserver.observe(state.dom.kiaiCompareChartWrap);
  } else {
    window.addEventListener("resize", drawKiaiCompareChart);
  }

  state.initialized = true;
}

function drawKiaiCompareChart() {
  const state = kiaiCompareChartState;
  const canvas = state.dom?.kiaiCompareChart;
  const sortedResults = state.results
    ? sortResultsForDisplay(state.results)
    : [];
  const endTime = getKiaiCompareEndTime();

  if (
    !canvas ||
    !sortedResults.length ||
    endTime <= 0 ||
    state.dom?.kiaiCompareChartWrap?.hidden
  ) {
    return;
  }

  const hasMismatchRow = sortedResults.length >= 2;
  const rowCount = sortedResults.length + (hasMismatchRow ? 1 : 0);
  const rowHeight = 34;
  const cssHeight = Math.max(210, 54 + rowCount * rowHeight);
  const cssWidth = Math.max(320, canvas.parentElement?.clientWidth ?? 0);
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.font = '12px "JetBrains Mono", Consolas, monospace';

  const labelWidth = getKiaiCompareLabelWidth(ctx, sortedResults, cssWidth);
  const plot = {
    left: labelWidth,
    top: 14,
    right: cssWidth - 18,
    bottom: 14 + rowCount * rowHeight
  };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);
  plot.rowHeight = rowHeight;

  const viewStart = Math.max(0, state.viewStart);
  const viewEnd = Math.max(viewStart + 1, state.viewEnd || endTime);
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;

  const mismatchSections = hasMismatchRow
    ? compareKiaiResults(sortedResults).mismatchSections
    : [];

  drawKiaiCompareRows(
    ctx,
    sortedResults,
    mismatchSections,
    plot,
    viewStart,
    viewEnd,
    xForTime,
    hasMismatchRow
  );
  drawKiaiCompareTimeGrid(ctx, plot, viewStart, viewEnd, xForTime);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  if (state.hoverTime !== null) {
    const x = xForTime(state.hoverTime);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  if (state.dragStartX !== null && state.dragCurrentX !== null) {
    const startX = clampKiaiCompareX(state.dragStartX, plot);
    const endX = clampKiaiCompareX(state.dragCurrentX, plot);
    ctx.fillStyle = "rgba(159, 220, 255, 0.18)";
    ctx.fillRect(
      Math.min(startX, endX),
      plot.top,
      Math.abs(endX - startX),
      plot.height
    );
  }

  ctx.restore();

  canvas._kiaiComparePlot = plot;
  canvas._kiaiCompareResults = sortedResults;
  canvas._kiaiCompareMismatchSections = mismatchSections;
}

function drawKiaiCompareRows(
  ctx,
  results,
  mismatchSections,
  plot,
  viewStart,
  viewEnd,
  xForTime,
  hasMismatchRow
) {
  const rows = [];

  if (hasMismatchRow) {
    rows.push({
      label: kiaiCompareChartState.t("kiaiCompareGraphMismatch"),
      intervals: mismatchSections,
      color: "rgba(255, 107, 107, 0.72)",
      labelColor: "#ff8b8b"
    });
  }

  for (const result of results) {
    rows.push({
      label: getDifficultyNameText(result.fileName),
      intervals: result.intervals ?? [],
      color: "rgba(255, 216, 107, 0.78)",
      labelColor: "#f2f2f2"
    });
  }

  rows.forEach((row, index) => {
    const top = plot.top + index * plot.rowHeight;

    ctx.fillStyle = index % 2 === 0
      ? "rgba(255, 255, 255, 0.025)"
      : "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(plot.left, top, plot.width, plot.rowHeight);

    ctx.fillStyle = row.labelColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      fitKiaiCompareLabel(ctx, row.label, plot.left - 18),
      plot.left - 10,
      top + plot.rowHeight / 2
    );

    ctx.fillStyle = row.color;
    for (const interval of row.intervals) {
      if (interval.end <= viewStart || interval.start >= viewEnd) continue;

      const startX = xForTime(Math.max(interval.start, viewStart));
      const endX = xForTime(Math.min(interval.end, viewEnd));
      ctx.fillRect(
        startX,
        top + 5,
        Math.max(1, endX - startX),
        plot.rowHeight - 10
      );
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, top + plot.rowHeight);
    ctx.lineTo(plot.right, top + plot.rowHeight);
    ctx.stroke();
  });
}

function drawKiaiCompareTimeGrid(ctx, plot, viewStart, viewEnd, xForTime) {
  const tickCount = Math.max(3, Math.min(8, Math.floor(plot.width / 110)));

  for (let i = 0; i <= tickCount; i++) {
    const ratio = i / tickCount;
    const time = viewStart + (viewEnd - viewStart) * ratio;
    const x = xForTime(time);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = i === 0 ? "left" : i === tickCount ? "right" : "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatKiaiCompareAxisTime(time), x, plot.bottom + 10);
  }
}

function getKiaiCompareLabelWidth(ctx, results, cssWidth) {
  const labels = [
    kiaiCompareChartState.t("kiaiCompareGraphMismatch"),
    ...results.map(result => getDifficultyNameText(result.fileName))
  ];
  const widest = Math.max(...labels.map(label => ctx.measureText(label).width));
  return Math.min(Math.max(110, Math.ceil(widest) + 24), cssWidth * 0.36);
}

function fitKiaiCompareLabel(ctx, label, maxWidth) {
  if (ctx.measureText(label).width <= maxWidth) return label;

  let fitted = label;
  while (fitted.length > 1 && ctx.measureText(`${fitted}...`).width > maxWidth) {
    fitted = fitted.slice(0, -1);
  }

  return `${fitted}...`;
}

function handleKiaiComparePointerDown(event) {
  const state = kiaiCompareChartState;
  const canvas = state.dom?.kiaiCompareChart;
  const plot = canvas?._kiaiComparePlot;
  if (!canvas || !plot) return;

  const point = getKiaiComparePointerPosition(event, canvas);
  if (!isKiaiComparePointInPlot(point, plot)) return;

  canvas.setPointerCapture(event.pointerId);
  state.dragStartX = point.x;
  state.dragCurrentX = point.x;
  hideKiaiCompareTooltip();
  drawKiaiCompareChart();
}

function handleKiaiComparePointerMove(event) {
  const state = kiaiCompareChartState;
  const canvas = state.dom?.kiaiCompareChart;
  const plot = canvas?._kiaiComparePlot;
  if (!canvas || !plot) return;

  const point = getKiaiComparePointerPosition(event, canvas);

  if (state.dragStartX !== null) {
    state.dragCurrentX = point.x;
    drawKiaiCompareChart();
    return;
  }

  if (!isKiaiComparePointInPlot(point, plot)) {
    state.hoverTime = null;
    hideKiaiCompareTooltip();
    drawKiaiCompareChart();
    return;
  }

  state.hoverTime = kiaiCompareXToTime(point.x, plot);
  showKiaiCompareTooltip(point, state.hoverTime);
  drawKiaiCompareChart();
}

function handleKiaiComparePointerUp(event) {
  const state = kiaiCompareChartState;
  const canvas = state.dom?.kiaiCompareChart;
  const plot = canvas?._kiaiComparePlot;
  if (!canvas || !plot || state.dragStartX === null) return;

  const point = getKiaiComparePointerPosition(event, canvas);
  const distance = Math.abs(point.x - state.dragStartX);

  if (distance >= 8) {
    const startTime = kiaiCompareXToTime(state.dragStartX, plot);
    const endTime = kiaiCompareXToTime(point.x, plot);
    state.viewStart = Math.max(0, Math.min(startTime, endTime));
    state.viewEnd = Math.min(getKiaiCompareEndTime(), Math.max(startTime, endTime));
  } else {
    const time = kiaiCompareXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.dragStartX = null;
  state.dragCurrentX = null;
  state.hoverTime = null;
  hideKiaiCompareTooltip();
  drawKiaiCompareChart();
}

function handleKiaiComparePointerCancel() {
  const state = kiaiCompareChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
  hideKiaiCompareTooltip();
  drawKiaiCompareChart();
}

function handleKiaiComparePointerLeave() {
  const state = kiaiCompareChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideKiaiCompareTooltip();
  drawKiaiCompareChart();
}

function showKiaiCompareTooltip(point, time) {
  const state = kiaiCompareChartState;
  const tooltip = state.dom?.kiaiCompareChartTooltip;
  const wrap = state.dom?.kiaiCompareChartWrap;
  const canvas = state.dom?.kiaiCompareChart;
  const results = canvas?._kiaiCompareResults ?? [];
  if (!tooltip || !wrap || !canvas) return;

  const lines = [msToTimestamp(Math.round(time))];
  const mismatch = (canvas._kiaiCompareMismatchSections ?? [])
    .some(section => section.start <= time && time < section.end);

  if (results.length >= 2) {
    lines.push(
      `${state.t("kiaiCompareGraphMismatch")}: ` +
      (mismatch
        ? state.t("kiaiCompareGraphMismatchYes")
        : state.t("kiaiCompareGraphMismatchNo"))
    );
  }

  for (const result of results) {
    const isOn = isKiaiOnAt(result.intervals ?? [], time);
    lines.push(
      `${getDifficultyNameText(result.fileName)}: ` +
      state.t(isOn ? "kiaiCompareGraphKiaiOn" : "kiaiCompareGraphKiaiOff")
    );
  }

  tooltip.textContent = lines.join("\n");
  tooltip.hidden = false;

  const offset = 14;
  const wrapRect = wrap.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = point.x + offset;
  let top = point.y + offset;

  if (left + tooltipRect.width > wrapRect.width - 8) {
    left = point.x - tooltipRect.width - offset;
  }
  if (top + tooltipRect.height > wrapRect.height - 8) {
    top = point.y - tooltipRect.height - offset;
  }

  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}

function hideKiaiCompareTooltip() {
  const tooltip = kiaiCompareChartState.dom?.kiaiCompareChartTooltip;
  if (tooltip) tooltip.hidden = true;
}

function getKiaiComparePointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isKiaiComparePointInPlot(point, plot) {
  return (
    point.x >= plot.left &&
    point.x <= plot.right &&
    point.y >= plot.top &&
    point.y <= plot.bottom
  );
}

function clampKiaiCompareX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function kiaiCompareXToTime(x, plot) {
  const state = kiaiCompareChartState;
  const ratio =
    (clampKiaiCompareX(x, plot) - plot.left) / Math.max(1, plot.width);
  return state.viewStart + ratio * (state.viewEnd - state.viewStart);
}

function getKiaiCompareEndTime() {
  return Math.max(
    0,
    ...(kiaiCompareChartState.results ?? [])
      .map(result => result.endTime ?? 0)
  );
}

function formatKiaiCompareAxisTime(time) {
  const totalSeconds = Math.max(0, Math.round(time / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
