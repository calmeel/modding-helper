const spreadDensityChartState = {
  results: null,
  dom: null,
  t: null,
  diffOrder: null,
  manualCategories: {},
  minDiff: 1,
  signature: "",
  hiddenFiles: new Set(),
  inversionBaselineHiddenFiles: null,
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  initialized: false,
  resizeObserver: null
};

const SPREAD_DENSITY_CHART_GROUP_TOLERANCE_MS = 10;

function renderSpreadDensityChart(
  results,
  dom,
  t,
  diffOrder = null,
  manualCategories = {},
  minDiff = 1
) {
  const state = spreadDensityChartState;
  state.results = results;
  state.dom = dom;
  state.t = t;
  state.diffOrder = diffOrder;
  state.manualCategories = manualCategories;
  state.minDiff = Number.isFinite(minDiff) ? minDiff : 1;

  initializeSpreadDensityChart();

  const chartResults = getSpreadDensityChartResults();
  const endTime = getSpreadDensityEndTime(chartResults);
  const canRender = chartResults.length > 0 && endTime > 0;

  if (!canRender) {
    if (dom.spreadDensityChartWrap) dom.spreadDensityChartWrap.hidden = true;
    if (dom.spreadDensityDiffToggles) {
      dom.spreadDensityDiffToggles.replaceChildren();
    }
    if (dom.spreadDensityChartEmpty) {
      dom.spreadDensityChartEmpty.hidden = false;
      dom.spreadDensityChartEmpty.textContent = results
        ? t("spreadDensityGraphNoData")
        : t("noFileLoaded");
    }
    return;
  }

  const signature =
    chartResults.map(result => result.fileName).join("|") + `::${endTime}`;

  if (signature !== state.signature) {
    state.signature = signature;
    state.hiddenFiles.clear();
    state.inversionBaselineHiddenFiles = null;
    state.viewStart = 0;
    state.viewEnd = endTime;
    state.hoverTime = null;
  } else {
    state.viewEnd = Math.min(state.viewEnd || endTime, endTime);
  }

  if (dom.spreadDensityChartEmpty) dom.spreadDensityChartEmpty.hidden = true;
  if (dom.spreadDensityChartWrap) dom.spreadDensityChartWrap.hidden = false;

  if (dom.spreadDensityShowInversions?.checked) {
    applySpreadDensityInversionFilter();
  }

  renderSpreadDensityDiffToggles(chartResults);
  drawSpreadDensityChart();
}

function initializeSpreadDensityChart() {
  const state = spreadDensityChartState;
  if (state.initialized || !state.dom?.spreadDensityChart) return;

  const canvas = state.dom.spreadDensityChart;
  const resetButton = state.dom.spreadDensityResetZoom;
  const inversionToggle = state.dom.spreadDensityShowInversions;

  canvas.addEventListener("pointerdown", handleSpreadDensityPointerDown);
  canvas.addEventListener("pointermove", handleSpreadDensityPointerMove);
  canvas.addEventListener("pointerup", handleSpreadDensityPointerUp);
  canvas.addEventListener("pointercancel", handleSpreadDensityPointerCancel);
  canvas.addEventListener("pointerleave", handleSpreadDensityPointerLeave);

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const endTime = getSpreadDensityEndTime(getSpreadDensityChartResults());
      if (endTime <= 0) return;

      state.viewStart = 0;
      state.viewEnd = endTime;
      state.hoverTime = null;
      hideSpreadDensityTooltip();
      drawSpreadDensityChart();
    });
  }

  if (inversionToggle) {
    inversionToggle.addEventListener("change", () => {
      if (inversionToggle.checked) {
        applySpreadDensityInversionFilter();
        renderSpreadDensityDiffToggles(getSpreadDensityChartResults());
      } else {
        restoreSpreadDensityDiffFilter();
      }

      hideSpreadDensityTooltip();
      drawSpreadDensityChart();
    });
  }

  if (
    typeof ResizeObserver !== "undefined" &&
    state.dom.spreadDensityChartSection
  ) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.spreadDensityChartWrap?.hidden) {
        drawSpreadDensityChart();
      }
    });
    state.resizeObserver.observe(state.dom.spreadDensityChartSection);
  } else {
    window.addEventListener("resize", drawSpreadDensityChart);
  }

  state.initialized = true;
}

function getSpreadDensityChartResults() {
  const state = spreadDensityChartState;
  if (!state.results) return [];

  const ordered = state.diffOrder
    ? applySpreadDiffOrder(state.results, state.diffOrder)
    : sortSpreadResults(state.results);

  return ordered.filter(result => result.density?.measures?.length);
}

function applySpreadDensityInversionFilter() {
  const state = spreadDensityChartState;
  const results = getSpreadDensityChartResults();
  const analysis = analyzeSpreadDensityInversions(
    results,
    state.manualCategories,
    state.minDiff
  );
  const affectedFiles = new Set();

  for (const group of analysis.issueGroups) {
    for (const issue of group.issues) {
      affectedFiles.add(issue.lower.fileName);
      affectedFiles.add(issue.higher.fileName);
    }
  }

  if (state.inversionBaselineHiddenFiles === null) {
    state.inversionBaselineHiddenFiles = new Set(state.hiddenFiles);
  }

  state.hiddenFiles = new Set(
    results
      .map(result => result.fileName)
      .filter(fileName => !affectedFiles.has(fileName))
  );
}

function restoreSpreadDensityDiffFilter() {
  const state = spreadDensityChartState;
  if (state.inversionBaselineHiddenFiles === null) return;

  state.hiddenFiles = new Set(state.inversionBaselineHiddenFiles);
  state.inversionBaselineHiddenFiles = null;
  renderSpreadDensityDiffToggles(getSpreadDensityChartResults());
}

function renderSpreadDensityDiffToggles(results) {
  const state = spreadDensityChartState;
  const container = state.dom?.spreadDensityDiffToggles;
  if (!container) return;

  const fragment = document.createDocumentFragment();
  fragment.appendChild(createSpreadDensityDiffActions(results));

  results.forEach((result, index) => {
    const virtualSr = index + 1;
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
      hideSpreadDensityTooltip();
      drawSpreadDensityChart();
    });

    const swatch = document.createElement("span");
    swatch.className = "volume-compare-diff-swatch";
    swatch.style.backgroundColor = getVolumeCompareSrColor(virtualSr);

    const name = document.createElement("span");
    name.textContent = getDifficultyNameText(result.fileName);

    label.append(checkbox, swatch, name);
    fragment.appendChild(label);
  });

  container.replaceChildren(fragment);
}

function createSpreadDensityDiffActions(results) {
  const state = spreadDensityChartState;
  const actions = document.createElement("div");
  actions.className = "graph-diff-toggle-actions";

  const selectAll = document.createElement("button");
  selectAll.type = "button";
  selectAll.textContent = state.t("graphSelectAllDiffs");
  selectAll.addEventListener("click", () => {
    state.hiddenFiles.clear();
    renderSpreadDensityDiffToggles(results);
    hideSpreadDensityTooltip();
    drawSpreadDensityChart();
  });

  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.textContent = state.t("graphClearAllDiffs");
  clearAll.addEventListener("click", () => {
    state.hiddenFiles = new Set(results.map(result => result.fileName));
    renderSpreadDensityDiffToggles(results);
    hideSpreadDensityTooltip();
    drawSpreadDensityChart();
  });

  actions.append(selectAll, clearAll);
  return actions;
}

function drawSpreadDensityChart() {
  const state = spreadDensityChartState;
  const canvas = state.dom?.spreadDensityChart;
  const results = getSpreadDensityChartResults();
  const visibleResults = results.filter(
    result => !state.hiddenFiles.has(result.fileName)
  );
  const endTime = getSpreadDensityEndTime(results);

  if (
    !canvas ||
    !results.length ||
    endTime <= 0 ||
    state.dom?.spreadDensityChartWrap?.hidden
  ) {
    return;
  }

  const cssWidth = Math.max(320, canvas.parentElement?.clientWidth ?? 0);
  /* 分離ウィンドウでは親要素(=ウィンドウ)の高さいっぱいに広げる。
     web ツールでは data-chart-fill が無いので従来どおり固定高さ。 */
  const chartWrap = canvas.parentElement;
  const cssHeight = chartWrap && chartWrap.dataset.chartFill
    ? Math.max(160, chartWrap.clientHeight) : 330;
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
  const maxDensity = getSpreadDensityMaximum(
    visibleResults,
    viewStart,
    viewEnd
  );
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;
  const yForDensity = count =>
    plot.bottom - (count / maxDensity) * plot.height;
  const issueAnalysis = analyzeSpreadDensityInversions(
    results,
    state.manualCategories,
    state.minDiff
  );

  if (state.dom?.spreadDensityShowInversions?.checked) {
    drawSpreadDensityIssueBands(
      ctx,
      issueAnalysis.issueGroups,
      plot,
      viewStart,
      viewEnd,
      xForTime
    );
  }

  drawSpreadDensityGrid(
    ctx,
    plot,
    viewStart,
    viewEnd,
    maxDensity,
    xForTime,
    yForDensity
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  visibleResults.forEach(result => {
    const index = results.findIndex(item => item.fileName === result.fileName);
    drawSpreadDensitySeries(
      ctx,
      result.density.measures,
      getVolumeCompareSrColor(index + 1),
      viewStart,
      viewEnd,
      xForTime,
      yForDensity
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
    const startX = clampSpreadDensityX(state.dragStartX, plot);
    const endX = clampSpreadDensityX(state.dragCurrentX, plot);
    ctx.fillStyle = "rgba(159, 220, 255, 0.16)";
    ctx.fillRect(
      Math.min(startX, endX),
      plot.top,
      Math.abs(endX - startX),
      plot.height
    );
  }

  ctx.restore();

  canvas._spreadDensityPlot = plot;
  canvas.__playheadGeom = { plot, viewStart, viewEnd };
  canvas._spreadDensityVisibleResults = visibleResults;
  canvas._spreadDensityIssueGroups = issueAnalysis.issueGroups;

  // 再生ヘッド用: 指定時刻・現在Diffの密度とy座標
  canvas.__markerAt = function (timeMs, diffFile) {
    if (!diffFile || timeMs < viewStart || timeMs > viewEnd) return null;
    const base = String(diffFile).split(/[\\/]/).pop();
    const res = visibleResults.find(
      r => String(r.fileName || "").split(/[\\/]/).pop() === base
    );
    if (!res || !res.density || !res.density.measures) return null;
    let found = null;
    for (const measure of res.density.measures) {
      if (timeMs >= measure.start && timeMs < measure.end) { found = measure; break; }
    }
    if (!found) return null;
    const index = results.findIndex(item => item.fileName === res.fileName);
    return { y: yForDensity(found.noteCount), color: getVolumeCompareSrColor(index + 1), label: String(found.noteCount) };
  };
}

function drawSpreadDensityIssueBands(
  ctx,
  issueGroups,
  plot,
  viewStart,
  viewEnd,
  xForTime
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();
  ctx.fillStyle = "rgba(214, 90, 103, 0.24)";

  for (const group of issueGroups) {
    if (group.end <= viewStart || group.start >= viewEnd) continue;

    const startX = xForTime(Math.max(group.start, viewStart));
    const endX = xForTime(Math.min(group.end, viewEnd));
    ctx.fillRect(
      startX,
      plot.top,
      Math.max(1, endX - startX),
      plot.height
    );
  }

  ctx.restore();
}

function drawSpreadDensityGrid(
  ctx,
  plot,
  viewStart,
  viewEnd,
  maxDensity,
  xForTime,
  yForDensity
) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  const yTickCount = Math.min(5, maxDensity);
  for (let i = 0; i <= yTickCount; i++) {
    const count = maxDensity * (i / yTickCount);
    const y = yForDensity(count);

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
    ctx.fillText(String(Math.round(count)), plot.left - 8, y);
  }

  ctx.fillStyle = "#aeb8c8";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    spreadDensityChartState.t("spreadDensityGraphYAxis"),
    plot.left,
    plot.top - 4
  );

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
    ctx.fillText(formatSpreadDensityTime(time), x, plot.bottom + 10);
  }
}

function drawSpreadDensitySeries(
  ctx,
  measures,
  color,
  viewStart,
  viewEnd,
  xForTime,
  yForDensity
) {
  const visible = measures
    .filter(measure => measure.end > viewStart && measure.start < viewEnd)
    .sort((a, b) => a.start - b.start);
  if (!visible.length) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.beginPath();

  let previousEnd = null;
  let previousY = null;

  visible.forEach((measure, index) => {
    const start = Math.max(measure.start, viewStart);
    const end = Math.min(measure.end, viewEnd);
    const y = yForDensity(measure.noteCount);

    if (index === 0) {
      ctx.moveTo(xForTime(start), y);
    } else if (
      previousEnd !== null &&
      Math.abs(start - previousEnd) <=
        SPREAD_DENSITY_CHART_GROUP_TOLERANCE_MS
    ) {
      ctx.lineTo(xForTime(start), previousY);
      ctx.lineTo(xForTime(start), y);
    } else {
      ctx.moveTo(xForTime(start), y);
    }
    ctx.lineTo(xForTime(end), y);
    previousEnd = end;
    previousY = y;
  });

  ctx.stroke();
}

function getSpreadDensityMaximum(results, viewStart, viewEnd) {
  const max = Math.max(
    0,
    ...results.flatMap(result =>
      (result.density?.measures ?? [])
        .filter(measure =>
          measure.end > viewStart &&
          measure.start < viewEnd
        )
        .map(measure => measure.noteCount)
    )
  );

  return getSpreadDensityNiceMaximum(max);
}

function getSpreadDensityNiceMaximum(value) {
  if (!Number.isFinite(value) || value <= 0) return 4;

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

function getSpreadDensityEndTime(results) {
  return Math.max(
    0,
    ...results.map(result => {
      const measures = result.density?.measures ?? [];
      return Math.max(
        result.audioDurationMs ?? 0,
        measures[measures.length - 1]?.end ?? 0
      );
    })
  );
}

function handleSpreadDensityPointerDown(event) {
  const state = spreadDensityChartState;
  const canvas = state.dom?.spreadDensityChart;
  const plot = canvas?._spreadDensityPlot;
  if (!canvas || !plot) return;

  const point = getSpreadDensityPointerPosition(event, canvas);
  if (!isSpreadDensityPointInPlot(point, plot)) return;

  canvas.setPointerCapture(event.pointerId);
  state.dragStartX = point.x;
  state.dragCurrentX = point.x;
  hideSpreadDensityTooltip();
  drawSpreadDensityChart();
}

function handleSpreadDensityPointerMove(event) {
  const state = spreadDensityChartState;
  const canvas = state.dom?.spreadDensityChart;
  const plot = canvas?._spreadDensityPlot;
  if (!canvas || !plot) return;

  const point = getSpreadDensityPointerPosition(event, canvas);

  if (state.dragStartX !== null) {
    state.dragCurrentX = clampSpreadDensityX(point.x, plot);
    hideSpreadDensityTooltip();
    drawSpreadDensityChart();
    return;
  }

  if (!isSpreadDensityPointInPlot(point, plot)) {
    state.hoverTime = null;
    hideSpreadDensityTooltip();
    drawSpreadDensityChart();
    return;
  }

  state.hoverTime = spreadDensityXToTime(point.x, plot);
  drawSpreadDensityChart();
  showSpreadDensityTooltip(point, state.hoverTime);
}

function handleSpreadDensityPointerUp(event) {
  const state = spreadDensityChartState;
  const canvas = state.dom?.spreadDensityChart;
  const plot = canvas?._spreadDensityPlot;
  if (!canvas || !plot || state.dragStartX === null) return;

  const point = getSpreadDensityPointerPosition(event, canvas);
  const distance = Math.abs(point.x - state.dragStartX);

  if (distance >= 8) {
    const startTime = spreadDensityXToTime(state.dragStartX, plot);
    const endTime = spreadDensityXToTime(point.x, plot);
    state.viewStart = Math.max(0, Math.min(startTime, endTime));
    state.viewEnd = Math.min(
      getSpreadDensityEndTime(getSpreadDensityChartResults()),
      Math.max(startTime, endTime)
    );
  } else {
    const time = spreadDensityXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.dragStartX = null;
  state.dragCurrentX = null;
  state.hoverTime = null;
  hideSpreadDensityTooltip();
  drawSpreadDensityChart();
}

function handleSpreadDensityPointerCancel() {
  const state = spreadDensityChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
  hideSpreadDensityTooltip();
  drawSpreadDensityChart();
}

function handleSpreadDensityPointerLeave() {
  const state = spreadDensityChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideSpreadDensityTooltip();
  drawSpreadDensityChart();
}

function showSpreadDensityTooltip(point, time) {
  const state = spreadDensityChartState;
  const tooltip = state.dom?.spreadDensityChartTooltip;
  const wrap = state.dom?.spreadDensityChartWrap;
  const canvas = state.dom?.spreadDensityChart;
  const visibleResults = canvas?._spreadDensityVisibleResults ?? [];
  if (!tooltip || !wrap) return;

  const group = findSpreadDensityGroupAtTime(
    createSpreadDensityComparisonGroups(getSpreadDensityChartResults()),
    time
  );
  if (!group) {
    hideSpreadDensityTooltip();
    return;
  }

  const lines = [
    `${msToTimestamp(group.start)} - ${msToTimestamp(group.end)}`
  ];

  for (const result of visibleResults) {
    const measure = group.measuresByFileName.get(result.fileName);
    lines.push(
      `${getDifficultyNameText(result.fileName)}: ` +
      `${measure ? measure.noteCount : "-"} ` +
      state.t("spreadDensityGraphNotes")
    );
  }

  const issueGroup = (canvas?._spreadDensityIssueGroups ?? []).find(item =>
    Math.abs(item.start - group.start) <=
      SPREAD_DENSITY_CHART_GROUP_TOLERANCE_MS
  );
  if (issueGroup) {
    lines.push("", state.t("spreadDensityInversions"));
    for (const issue of issueGroup.issues) {
      lines.push(
        `${getDifficultyNameText(issue.lower.fileName)} ` +
        `${issue.lower.count} > ` +
        `${getDifficultyNameText(issue.higher.fileName)} ` +
        `${issue.higher.count}`
      );
    }
  }

  tooltip.classList.add("is-simple");
  tooltip.textContent = lines.join("\n");
  tooltip.hidden = false;
  positionSpreadDensityTooltip(tooltip, wrap, point);
}

function findSpreadDensityGroupAtTime(groups, time) {
  const containing = groups.find(group =>
    time >= group.start &&
    time < group.end
  );
  if (containing) return containing;

  return groups.reduce((nearest, group) => {
    const distance = Math.min(
      Math.abs(time - group.start),
      Math.abs(time - group.end)
    );
    if (!nearest || distance < nearest.distance) {
      return { group, distance };
    }
    return nearest;
  }, null)?.group ?? null;
}

function positionSpreadDensityTooltip(tooltip, wrap, point) {
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

function hideSpreadDensityTooltip() {
  const tooltip = spreadDensityChartState.dom?.spreadDensityChartTooltip;
  if (tooltip) tooltip.hidden = true;
}

function getSpreadDensityPointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isSpreadDensityPointInPlot(point, plot) {
  return (
    point.x >= plot.left &&
    point.x <= plot.right &&
    point.y >= plot.top &&
    point.y <= plot.bottom
  );
}

function clampSpreadDensityX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function spreadDensityXToTime(x, plot) {
  const state = spreadDensityChartState;
  const ratio = (clampSpreadDensityX(x, plot) - plot.left) / plot.width;
  return state.viewStart + ratio * (state.viewEnd - state.viewStart);
}

function formatSpreadDensityTime(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
