const spreadScrollChartState = {
  results: null,
  dom: null,
  t: null,
  diffOrder: null,
  manualCategories: {},
  signature: "",
  hiddenFiles: new Set(),
  autoFilterBaselineHiddenFiles: null,
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  dragCanvas: null,
  initialized: false,
  resizeObserver: null
};

const SPREAD_SCROLL_VISUAL_BPM_BASE_PX_PER_BEAT = 175;
const SPREAD_SCROLL_VISUAL_BPM_SLIDER_MULTIPLIER = 1.4;

function renderSpreadScrollChart(
  results,
  dom,
  t,
  diffOrder = null,
  manualCategories = {}
) {
  const state = spreadScrollChartState;
  state.results = results;
  state.dom = dom;
  state.t = t;
  state.diffOrder = diffOrder;
  state.manualCategories = manualCategories;

  initializeSpreadScrollChart();
  updateSpreadScrollDisplayTitles();

  const orderedResults = getSpreadScrollOrderedResults(results, diffOrder);
  const chartResults = orderedResults.filter(
    result => result.scrollSpeed?.samples?.length
  );
  const endTime = getSpreadScrollEndTime(chartResults);
  const canRender = chartResults.length > 0 && endTime > 0;

  if (!canRender) {
    if (dom.spreadScrollChartWrap) dom.spreadScrollChartWrap.hidden = true;
    if (dom.spreadScrollDeltaChartWrap) {
      dom.spreadScrollDeltaChartWrap.hidden = true;
    }
    if (dom.spreadScrollDeltaHeader) dom.spreadScrollDeltaHeader.hidden = true;
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
    state.autoFilterBaselineHiddenFiles = null;
    state.viewStart = 0;
    state.viewEnd = endTime;
    state.hoverTime = null;
  } else {
    state.viewEnd = Math.min(state.viewEnd || endTime, endTime);
  }

  if (dom.spreadScrollChartEmpty) dom.spreadScrollChartEmpty.hidden = true;
  if (dom.spreadScrollChartWrap) dom.spreadScrollChartWrap.hidden = false;
  if (dom.spreadScrollDeltaChartWrap) {
    dom.spreadScrollDeltaChartWrap.hidden = false;
  }
  if (dom.spreadScrollDeltaHeader) dom.spreadScrollDeltaHeader.hidden = false;

  renderSpreadScrollDiffToggles(chartResults);
  drawSpreadScrollCharts();
}

function initializeSpreadScrollChart() {
  const state = spreadScrollChartState;
  if (state.initialized || !state.dom?.spreadScrollChart) return;

  const canvas = state.dom.spreadScrollChart;
  const deltaCanvas = state.dom.spreadScrollDeltaChart;
  const resetButton = state.dom.spreadScrollResetZoom;
  const displayToggles = [
    state.dom.spreadScrollShowLimits,
    state.dom.spreadScrollShowRapidChanges,
    state.dom.spreadScrollShowProgression,
    state.dom.spreadScrollShowConsistency
  ];
  const detailedTooltipToggle = state.dom.spreadScrollDetailedTooltip;
  const visualBpmToggle = state.dom.spreadScrollVisualBpm;

  initializeSpreadScrollCanvas(canvas);
  initializeSpreadScrollCanvas(deltaCanvas);

  for (const toggle of displayToggles) {
    if (!toggle) continue;

    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        for (const otherToggle of displayToggles) {
          if (otherToggle && otherToggle !== toggle) {
            otherToggle.checked = false;
          }
        }

        applySpreadScrollProblemDiffFilter(toggle);
      } else {
        restoreSpreadScrollDiffFilter();
      }

      hideSpreadScrollTooltips();
      drawSpreadScrollCharts();
    });
  }

  if (detailedTooltipToggle) {
    detailedTooltipToggle.addEventListener("change", () => {
      hideSpreadScrollTooltips();
    });
  }

  if (visualBpmToggle) {
    visualBpmToggle.addEventListener("change", () => {
      updateSpreadScrollDisplayTitles();
      hideSpreadScrollTooltips();
      drawSpreadScrollCharts();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const endTime = getSpreadScrollEndTime(getSpreadScrollChartResults());
      if (endTime <= 0) return;

      state.viewStart = 0;
      state.viewEnd = endTime;
      state.hoverTime = null;
      state.dragStartX = null;
      state.dragCurrentX = null;
      state.dragCanvas = null;
      hideSpreadScrollTooltips();
      drawSpreadScrollCharts();
    });
  }

  if (typeof ResizeObserver !== "undefined" && state.dom.spreadScrollChartSection) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.spreadScrollChartWrap.hidden) {
        drawSpreadScrollCharts();
      }
    });
    state.resizeObserver.observe(state.dom.spreadScrollChartSection);
  } else {
    window.addEventListener("resize", drawSpreadScrollCharts);
  }

  state.initialized = true;
}

function updateSpreadScrollDisplayTitles() {
  const state = spreadScrollChartState;
  const visualBpm = isSpreadScrollVisualBpmEnabled();

  if (state.dom?.spreadScrollGraphTitle) {
    state.dom.spreadScrollGraphTitle.textContent = state.t(
      visualBpm
        ? "spreadScrollGraphTitleVisualBpm"
        : "spreadScrollGraphTitle"
    );
  }

  if (state.dom?.spreadScrollDeltaGraphTitle) {
    state.dom.spreadScrollDeltaGraphTitle.textContent = state.t(
      visualBpm
        ? "spreadScrollDeltaGraphTitleVisualBpm"
        : "spreadScrollDeltaGraphTitle"
    );
  }
}

function isSpreadScrollVisualBpmEnabled() {
  return spreadScrollChartState.dom?.spreadScrollVisualBpm?.checked ?? true;
}

function convertSpreadScrollDisplayValue(value) {
  if (!Number.isFinite(value) || !isSpreadScrollVisualBpmEnabled()) {
    return value;
  }

  return value * 60 / (
    SPREAD_SCROLL_VISUAL_BPM_BASE_PX_PER_BEAT *
    SPREAD_SCROLL_VISUAL_BPM_SLIDER_MULTIPLIER
  );
}

function formatSpreadScrollDisplayValue(value) {
  const converted = convertSpreadScrollDisplayValue(value);
  return Number.isFinite(converted) ? String(Math.round(converted)) : "N/A";
}

function getSpreadScrollDisplayUnit() {
  return isSpreadScrollVisualBpmEnabled() ? "BPM" : "px/s";
}

function applySpreadScrollProblemDiffFilter(toggle) {
  const state = spreadScrollChartState;
  const results = getSpreadScrollChartResults();
  const affectedFiles = getSpreadScrollAffectedFiles(toggle, results);

  if (state.autoFilterBaselineHiddenFiles === null) {
    state.autoFilterBaselineHiddenFiles = new Set(state.hiddenFiles);
  }

  state.hiddenFiles = new Set(
    results
      .map(result => result.fileName)
      .filter(fileName => !affectedFiles.has(fileName))
  );
  renderSpreadScrollDiffToggles(results);
}

function restoreSpreadScrollDiffFilter() {
  const state = spreadScrollChartState;
  if (state.autoFilterBaselineHiddenFiles === null) return;

  state.hiddenFiles = new Set(state.autoFilterBaselineHiddenFiles);
  state.autoFilterBaselineHiddenFiles = null;
  renderSpreadScrollDiffToggles(getSpreadScrollChartResults());
}

function getSpreadScrollAffectedFiles(toggle, results) {
  const state = spreadScrollChartState;
  const affectedFiles = new Set();

  if (toggle === state.dom?.spreadScrollShowLimits) {
    for (const result of results) {
      const category = getSpreadEffectiveCategory(
        result,
        state.manualCategories
      );

      if (getSpreadTooFastScrollLevel(result.scrollSpeed, category) === "warn") {
        affectedFiles.add(result.fileName);
      }
    }
    return affectedFiles;
  }

  if (toggle === state.dom?.spreadScrollShowRapidChanges) {
    for (const result of results) {
      const category = getSpreadEffectiveCategory(
        result,
        state.manualCategories
      );
      const hasWarning = (result.scrollSpeed?.rapidChanges ?? []).some(
        change => getSpreadRapidScrollLevel(change, category) === "warn"
      );

      if (hasWarning) affectedFiles.add(result.fileName);
    }
    return affectedFiles;
  }

  if (toggle === state.dom?.spreadScrollShowProgression) {
    const analysis = analyzeSpreadScrollSpeedProgressionByEvent(
      results,
      state.manualCategories
    );

    for (const group of analysis.issueGroups) {
      for (const item of group.items) {
        affectedFiles.add(item.fileName);
      }
    }
    return affectedFiles;
  }

  if (toggle === state.dom?.spreadScrollShowConsistency) {
    const analysis = analyzeSpreadScrollChangeConsistency(
      results,
      state.manualCategories
    );

    for (const group of analysis.issueGroups) {
      for (const issue of group.issues) {
        affectedFiles.add(issue.lower.fileName);
        affectedFiles.add(issue.higher.fileName);
      }
    }
  }

  return affectedFiles;
}

function initializeSpreadScrollCanvas(canvas) {
  if (!canvas) return;

  canvas.addEventListener("pointerdown", event =>
    handleSpreadScrollPointerDown(event, canvas)
  );
  canvas.addEventListener("pointermove", event =>
    handleSpreadScrollPointerMove(event, canvas)
  );
  canvas.addEventListener("pointerup", event =>
    handleSpreadScrollPointerUp(event, canvas)
  );
  canvas.addEventListener("pointercancel", () =>
    handleSpreadScrollPointerCancel()
  );
  canvas.addEventListener("pointerleave", () =>
    handleSpreadScrollPointerLeave()
  );
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
  fragment.appendChild(createSpreadScrollDiffActions(results));

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

      drawSpreadScrollCharts();
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

function createSpreadScrollDiffActions(results) {
  const state = spreadScrollChartState;
  const actions = document.createElement("div");
  actions.className = "graph-diff-toggle-actions";

  const selectAll = document.createElement("button");
  selectAll.type = "button";
  selectAll.textContent = state.t("graphSelectAllDiffs");
  selectAll.addEventListener("click", () => {
    state.hiddenFiles.clear();
    renderSpreadScrollDiffToggles(results);
    hideSpreadScrollTooltips();
    drawSpreadScrollCharts();
  });

  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.textContent = state.t("graphClearAllDiffs");
  clearAll.addEventListener("click", () => {
    state.hiddenFiles = new Set(results.map(result => result.fileName));
    renderSpreadScrollDiffToggles(results);
    hideSpreadScrollTooltips();
    drawSpreadScrollCharts();
  });

  actions.append(selectAll, clearAll);
  return actions;
}

function drawSpreadScrollCharts() {
  drawSpreadScrollChart();
  drawSpreadScrollDeltaChart();
}

function drawSpreadScrollChart() {
  const state = spreadScrollChartState;
  const canvas = state.dom?.spreadScrollChart;
  const results = getSpreadScrollChartResults();
  const visibleResults = results.filter(
    result => !state.hiddenFiles.has(result.fileName)
  );
  const visibleAssignments = visibleResults.map(result => {
    const index = results.findIndex(item => item.fileName === result.fileName);
    const category = getSpreadEffectiveCategory(
      result,
      state.manualCategories
    );

    return {
      result,
      category,
      color: getVolumeCompareSrColor(index + 1)
    };
  });
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
  const maxSpeed = getSpreadScrollChartMaxSpeed(
    visibleResults,
    state.dom?.spreadScrollShowLimits?.checked
      ? visibleAssignments
          .map(assignment => getSpreadTooFastScrollRule(assignment.category))
          .filter(Number.isFinite)
      : []
  );
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;
  const yForSpeed = speed =>
    plot.bottom - (speed / maxSpeed) * plot.height;
  const issueDisplay = getSpreadScrollDeltaIssueDisplay(results);

  if (state.dom?.spreadScrollShowRapidChanges?.checked) {
    drawSpreadScrollRapidChangeBackgrounds(
      ctx,
      visibleAssignments,
      plot,
      viewStart,
      viewEnd,
      xForTime
    );
  } else {
    drawSpreadScrollDeltaIssueBands(
      ctx,
      issueDisplay,
      plot,
      viewStart,
      viewEnd,
      xForTime
    );
  }

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

  if (state.dom?.spreadScrollShowLimits?.checked) {
    drawSpreadScrollLimitLines(
      ctx,
      visibleAssignments,
      plot,
      yForSpeed
    );
  }

  visibleAssignments.forEach(assignment => {
    drawSpreadScrollSeries(
      ctx,
      assignment.result.scrollSpeed.samples,
      assignment.color,
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
  canvas._spreadScrollVisibleAssignments = visibleAssignments;
}

function drawSpreadScrollDeltaChart() {
  const state = spreadScrollChartState;
  const canvas = state.dom?.spreadScrollDeltaChart;
  const results = getSpreadScrollChartResults();
  const visibleResults = results.filter(
    result => !state.hiddenFiles.has(result.fileName)
  );
  const visibleAssignments = visibleResults.map(result => {
    const index = results.findIndex(item => item.fileName === result.fileName);
    return {
      result,
      category: getSpreadEffectiveCategory(result, state.manualCategories),
      color: getVolumeCompareSrColor(index + 1)
    };
  });
  const endTime = getSpreadScrollEndTime(results);

  if (
    !canvas ||
    !results.length ||
    endTime <= 0 ||
    state.dom?.spreadScrollDeltaChartWrap?.hidden
  ) {
    return;
  }

  const cssWidth = Math.max(320, canvas.parentElement?.clientWidth ?? 0);
  const cssHeight = 300;
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
  const maxAbsDelta = getSpreadScrollDeltaMaximum(visibleAssignments);
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;
  const yForDelta = delta =>
    plot.top + plot.height / 2 -
    (delta / maxAbsDelta) * (plot.height / 2);
  const issueDisplay = getSpreadScrollDeltaIssueDisplay(results);

  if (state.dom?.spreadScrollShowRapidChanges?.checked) {
    drawSpreadScrollRapidChangeBackgrounds(
      ctx,
      visibleAssignments,
      plot,
      viewStart,
      viewEnd,
      xForTime
    );
  } else {
    drawSpreadScrollDeltaIssueBands(
      ctx,
      issueDisplay,
      plot,
      viewStart,
      viewEnd,
      xForTime
    );
  }
  drawSpreadScrollDeltaGrid(
    ctx,
    plot,
    viewStart,
    viewEnd,
    maxAbsDelta,
    xForTime,
    yForDelta
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  for (const assignment of visibleAssignments) {
    drawSpreadScrollDeltaSeries(
      ctx,
      assignment,
      viewStart,
      viewEnd,
      xForTime,
      yForDelta,
      state.dom?.spreadScrollShowRapidChanges?.checked,
      issueDisplay.highlightedEvents
    );
  }

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
  canvas._spreadScrollVisibleAssignments = visibleAssignments;
}

function getSpreadScrollDeltaIssueDisplay(results) {
  const state = spreadScrollChartState;
  let mode = null;
  let analysis = null;

  if (state.dom?.spreadScrollShowProgression?.checked) {
    mode = "progression";
    analysis = analyzeSpreadScrollSpeedProgressionByEvent(
      results,
      state.manualCategories
    );
  } else if (state.dom?.spreadScrollShowConsistency?.checked) {
    mode = "consistency";
    analysis = analyzeSpreadScrollChangeConsistency(
      results,
      state.manualCategories
    );
  }

  const groups = analysis?.issueGroups ?? [];
  const highlightedEvents = new Set();

  for (const group of groups) {
    if (mode === "progression") {
      for (const item of group.items) {
        highlightedEvents.add(item.event);
      }
      continue;
    }

    for (const issue of group.issues) {
      highlightedEvents.add(issue.lower.event);
      highlightedEvents.add(issue.higher.event);
    }
  }

  return {
    mode,
    groups,
    highlightedEvents
  };
}

function drawSpreadScrollDeltaIssueBands(
  ctx,
  issueDisplay,
  plot,
  viewStart,
  viewEnd,
  xForTime
) {
  if (!issueDisplay.mode || !issueDisplay.groups.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  for (const group of issueDisplay.groups) {
    if (group.time < viewStart || group.time > viewEnd) continue;

    const color = issueDisplay.mode === "progression"
      ? "rgba(214, 90, 103, 0.26)"
      : "rgba(196, 147, 75, 0.26)";
    const x = xForTime(group.time);

    ctx.fillStyle = color;
    ctx.fillRect(x - 5, plot.top, 10, plot.height);
  }

  ctx.restore();
}

function getSpreadScrollDeltaMaximum(assignments) {
  const max = Math.max(
    0,
    ...assignments.flatMap(assignment =>
      (assignment.result.scrollSpeed?.rapidChanges ?? [])
        .map(change => Math.abs(change.delta))
        .filter(Number.isFinite)
    )
  );

  return getSpreadScrollNiceMaximum(max);
}

function drawSpreadScrollDeltaGrid(
  ctx,
  plot,
  viewStart,
  viewEnd,
  maxAbsDelta,
  xForTime,
  yForDelta
) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  for (const ratio of [-1, -0.5, 0, 0.5, 1]) {
    const delta = maxAbsDelta * ratio;
    const y = yForDelta(delta);
    ctx.strokeStyle = ratio === 0
      ? "rgba(255, 255, 255, 0.45)"
      : "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = ratio === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const rounded = Math.round(convertSpreadScrollDisplayValue(delta));
    ctx.fillText(
      rounded > 0 ? `+${rounded}` : String(rounded),
      plot.left - 8,
      y
    );
  }

  ctx.fillStyle = "#aeb8c8";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    `Δ ${getSpreadScrollDisplayUnit()}`,
    plot.left,
    plot.top - 4
  );

  const xTickCount = Math.max(3, Math.min(8, Math.floor(plot.width / 110)));
  for (let i = 0; i <= xTickCount; i++) {
    const ratio = i / xTickCount;
    const time = viewStart + (viewEnd - viewStart) * ratio;
    const x = xForTime(time);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
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

function drawSpreadScrollDeltaSeries(
  ctx,
  assignment,
  viewStart,
  viewEnd,
  xForTime,
  yForDelta,
  emphasizeWarnings,
  highlightedEvents
) {
  const changes = (assignment.result.scrollSpeed?.rapidChanges ?? [])
    .filter(change =>
      Number.isFinite(change.delta) &&
      Math.abs(change.delta) > 0.01 &&
      change.toTime >= viewStart &&
      change.toTime <= viewEnd
    )
    .sort((a, b) => a.toTime - b.toTime);

  if (!changes.length) return;

  ctx.strokeStyle = spreadScrollColorWithAlpha(assignment.color, 0.38);
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "round";
  ctx.beginPath();
  changes.forEach((change, index) => {
    const x = xForTime(change.toTime);
    const y = yForDelta(change.delta);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  for (const change of changes) {
    const isWarning =
      emphasizeWarnings &&
      getSpreadRapidScrollLevel(change, assignment.category) === "warn";
    const isIssue = highlightedEvents.has(change);
    const x = xForTime(change.toTime);
    const y = yForDelta(change.delta);

    ctx.fillStyle = assignment.color;
    ctx.strokeStyle = isIssue || isWarning
      ? "#ffffff"
      : "rgba(15, 18, 26, 0.9)";
    ctx.lineWidth = isIssue ? 3 : isWarning ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(x, y, isIssue ? 6 : isWarning ? 5.5 : 3.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawSpreadScrollRapidChangeBackgrounds(
  ctx,
  assignments,
  plot,
  viewStart,
  viewEnd,
  xForTime
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  for (const assignment of assignments) {
    for (const change of assignment.result.scrollSpeed?.rapidChanges ?? []) {
      if (getSpreadRapidScrollLevel(change, assignment.category) !== "warn") {
        continue;
      }
      if (change.toTime <= viewStart || change.fromTime >= viewEnd) continue;

      const startX = xForTime(Math.max(change.fromTime, viewStart));
      const endX = xForTime(Math.min(change.toTime, viewEnd));
      ctx.fillStyle = "rgba(224, 122, 95, 0.24)";
      ctx.fillRect(
        startX,
        plot.top,
        Math.max(1, endX - startX),
        plot.height
      );
    }
  }

  ctx.restore();
}

function drawSpreadScrollLimitLines(ctx, assignments, plot, yForSpeed) {
  assignments.forEach((assignment, index) => {
    const limit = getSpreadTooFastScrollRule(assignment.category);
    if (!Number.isFinite(limit)) return;

    const y = yForSpeed(limit);
    ctx.strokeStyle = assignment.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.lineDashOffset = index * -3;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function spreadScrollColorWithAlpha(color, alpha) {
  const match = String(color).match(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
  );

  if (!match) return `rgba(255, 107, 107, ${alpha})`;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
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
    ctx.fillText(
      formatSpreadScrollDisplayValue(speed),
      plot.left - 8,
      y
    );
  }

  ctx.fillStyle = "#aeb8c8";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    getSpreadScrollDisplayUnit(),
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

function getSpreadScrollChartMaxSpeed(results, extraValues = []) {
  const max = Math.max(
    0,
    ...(results ?? []).flatMap(result =>
      (result.scrollSpeed?.samples ?? [])
        .map(sample => sample.pxPerSecond)
        .filter(Number.isFinite)
    ),
    ...extraValues.filter(Number.isFinite)
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

function handleSpreadScrollPointerDown(event, canvas) {
  const state = spreadScrollChartState;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);
  if (!isSpreadScrollPointInPlot(point, plot)) return;

  canvas.setPointerCapture(event.pointerId);
  state.dragStartX = point.x;
  state.dragCurrentX = point.x;
  state.dragCanvas = canvas;
  hideSpreadScrollTooltips();
  drawSpreadScrollCharts();
}

function handleSpreadScrollPointerMove(event, canvas) {
  const state = spreadScrollChartState;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);

  if (state.dragStartX !== null && state.dragCanvas === canvas) {
    state.dragCurrentX = point.x;
    drawSpreadScrollCharts();
    return;
  }

  if (!isSpreadScrollPointInPlot(point, plot)) {
    state.hoverTime = null;
    hideSpreadScrollTooltips();
    drawSpreadScrollCharts();
    return;
  }

  state.hoverTime = spreadScrollXToTime(point.x, plot);
  hideSpreadScrollTooltips();
  if (canvas === state.dom?.spreadScrollDeltaChart) {
    showSpreadScrollDeltaTooltip(point, state.hoverTime);
  } else {
    showSpreadScrollTooltip(point, state.hoverTime);
  }
  drawSpreadScrollCharts();
}

function handleSpreadScrollPointerUp(event, canvas) {
  const state = spreadScrollChartState;
  const plot = canvas?._spreadScrollPlot;
  if (
    !canvas ||
    !plot ||
    state.dragStartX === null ||
    state.dragCanvas !== canvas
  ) {
    return;
  }

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
  state.dragCanvas = null;
  state.hoverTime = null;
  hideSpreadScrollTooltips();
  drawSpreadScrollCharts();
}

function handleSpreadScrollPointerCancel() {
  const state = spreadScrollChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
  state.dragCanvas = null;
  hideSpreadScrollTooltips();
  drawSpreadScrollCharts();
}

function handleSpreadScrollPointerLeave() {
  const state = spreadScrollChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideSpreadScrollTooltips();
  drawSpreadScrollCharts();
}

function showSpreadScrollTooltip(point, time) {
  const state = spreadScrollChartState;
  const tooltip = state.dom?.spreadScrollChartTooltip;
  const wrap = state.dom?.spreadScrollChartWrap;
  const assignments =
    state.dom?.spreadScrollChart?._spreadScrollVisibleAssignments ?? [];
  if (!tooltip || !wrap) return;
  const simple = !(state.dom?.spreadScrollDetailedTooltip?.checked ?? false);

  if (simple) {
    const lines = [msToTimestamp(Math.round(time))];

    for (const assignment of assignments) {
      const result = assignment.result;
      const sample = getSpreadScrollSampleAtTime(
        result.scrollSpeed?.samples,
        time
      );
      const diffName = getDifficultyNameText(result.fileName);
      lines.push(
        `${diffName}: ` +
        `${sample
          ? `${formatSpreadScrollDisplayValue(sample.pxPerSecond)} ${getSpreadScrollDisplayUnit()}`
          : "N/A"}`
      );
    }

    appendSpreadScrollSimpleDetails(lines, assignments, time);
    tooltip.classList.remove("is-dense");
    tooltip.classList.add("is-simple");
    tooltip.textContent = lines.join("\n");
    tooltip.hidden = false;
    positionSpreadScrollTooltip(tooltip, wrap, point);
    return;
  }

  const timeElement = document.createElement("div");
  timeElement.className = "spread-scroll-delta-tooltip-time";
  timeElement.textContent = msToTimestamp(Math.round(time));

  const grid = document.createElement("div");
  grid.className = "spread-scroll-delta-tooltip-grid";
  if (assignments.length >= 4) {
    grid.classList.add("is-multicolumn");
  }

  for (const assignment of assignments) {
    const result = assignment.result;
    const sample = getSpreadScrollSampleAtTime(
      result.scrollSpeed?.samples,
      time
    );
    const diffName = getDifficultyNameText(result.fileName);

    const item = document.createElement("div");
    item.className = "spread-scroll-delta-tooltip-item";

    const name = document.createElement("div");
    name.className = "spread-scroll-delta-tooltip-diff";
    name.textContent = diffName;
    name.title = diffName;

    const values = document.createElement("div");
    values.className = "spread-scroll-delta-tooltip-values";
    values.textContent = sample
      ? `${isSpreadScrollVisualBpmEnabled()
          ? `${state.t("spreadScrollVisualBpmValue")} `
          : ""}` +
        `${formatSpreadScrollDisplayValue(sample.pxPerSecond)} ` +
        `${getSpreadScrollDisplayUnit()} | ` +
        `BPM ${formatSpreadScrollTooltipNumber(sample.bpm, 3)} | ` +
        `SV ${formatSpreadScrollTooltipNumber(sample.sv, 3)} | ` +
        `SM ${formatSpreadScrollTooltipNumber(sample.sliderMultiplier, 2)}`
      : "N/A";

    item.append(name, values);
    grid.appendChild(item);
  }

  const detailLines = [];

  if (state.dom?.spreadScrollShowLimits?.checked) {
    const limits = assignments
      .map(assignment => ({
        name: getDifficultyNameText(assignment.result.fileName),
        value: getSpreadTooFastScrollRule(assignment.category)
      }))
      .filter(item => Number.isFinite(item.value));

    if (limits.length) {
      detailLines.push(state.t("spreadScrollGraphLimit"));
      for (const limit of limits) {
        detailLines.push(
          `${limit.name}: ${formatSpreadScrollDisplayValue(limit.value)} ` +
          getSpreadScrollDisplayUnit()
        );
      }
    }
  }

  if (state.dom?.spreadScrollShowRapidChanges?.checked) {
    const rapidChanges = assignments.filter(assignment =>
      (assignment.result.scrollSpeed?.rapidChanges ?? []).some(change =>
        getSpreadRapidScrollLevel(change, assignment.category) === "warn" &&
        change.fromTime <= time &&
        time < change.toTime
      )
    );

    if (rapidChanges.length) {
      if (detailLines.length) detailLines.push("");
      detailLines.push(state.t("spreadScrollGraphRapidChange"));
      for (const assignment of rapidChanges) {
        detailLines.push(getDifficultyNameText(assignment.result.fileName));
      }
    }
  }

  const children = [timeElement, grid];
  if (detailLines.length) {
    const details = document.createElement("div");
    details.className = "spread-scroll-delta-tooltip-issue";
    details.textContent = detailLines.join("\n");
    children.push(details);
  }

  tooltip.classList.toggle("is-dense", assignments.length >= 9);
  tooltip.classList.remove("is-simple");
  tooltip.replaceChildren(...children);
  tooltip.hidden = false;
  positionSpreadScrollTooltip(tooltip, wrap, point);
}

function showSpreadScrollDeltaTooltip(point, time) {
  const state = spreadScrollChartState;
  const tooltip = state.dom?.spreadScrollDeltaChartTooltip;
  const wrap = state.dom?.spreadScrollDeltaChartWrap;
  const canvas = state.dom?.spreadScrollDeltaChart;
  const assignments = canvas?._spreadScrollVisibleAssignments ?? [];
  const plot = canvas?._spreadScrollPlot;
  if (!tooltip || !wrap || !plot) return;
  const simple = !(state.dom?.spreadScrollDetailedTooltip?.checked ?? false);

  const toleranceMs =
    ((state.viewEnd - state.viewStart) / Math.max(1, plot.width)) * 9;
  const matches = assignments
    .map(assignment => {
      const change = (assignment.result.scrollSpeed?.rapidChanges ?? [])
        .filter(item =>
          Number.isFinite(item.delta) &&
          Math.abs(item.delta) > 0.01
        )
        .reduce((nearest, item) => {
          const distance = Math.abs(item.toTime - time);
          if (distance > toleranceMs) return nearest;
          if (!nearest || distance < nearest.distance) {
            return { item, distance };
          }
          return nearest;
        }, null);

      return change ? { assignment, change: change.item } : null;
    })
    .filter(Boolean);

  if (simple) {
    const lines = [msToTimestamp(Math.round(time))];

    for (const { assignment, change } of matches) {
      const diffName = getDifficultyNameText(assignment.result.fileName);
      const delta = Math.round(convertSpreadScrollDisplayValue(change.delta));
      const deltaText = delta > 0 ? `+${delta}` : String(delta);
      lines.push(
        `${diffName}: Δ ${deltaText} ${getSpreadScrollDisplayUnit()}`
      );
    }

    const issueLines = getSpreadScrollDeltaIssueTooltipLines(
      time,
      toleranceMs,
      getSpreadScrollChartResults()
    );
    if (issueLines.length) {
      lines.push("", ...issueLines);
    }

    tooltip.classList.remove("is-dense");
    tooltip.classList.add("is-simple");
    tooltip.textContent = lines.join("\n");
    tooltip.hidden = false;
    positionSpreadScrollTooltip(tooltip, wrap, point);
    return;
  }

  const timeElement = document.createElement("div");
  timeElement.className = "spread-scroll-delta-tooltip-time";
  timeElement.textContent = msToTimestamp(Math.round(time));

  const grid = document.createElement("div");
  grid.className = "spread-scroll-delta-tooltip-grid";
  if (matches.length >= 4) {
    grid.classList.add("is-multicolumn");
  }

  for (const { assignment, change } of matches) {
    const diffName = getDifficultyNameText(assignment.result.fileName);
    const delta = Math.round(convertSpreadScrollDisplayValue(change.delta));
    const deltaText = delta > 0 ? `+${delta}` : String(delta);

    const item = document.createElement("div");
    item.className = "spread-scroll-delta-tooltip-item";

    const name = document.createElement("div");
    name.className = "spread-scroll-delta-tooltip-diff";
    name.textContent = diffName;
    name.title = diffName;

    const values = document.createElement("div");
    values.className = "spread-scroll-delta-tooltip-values";
    const valueParts = [
      `${formatSpreadScrollDisplayValue(change.beforeSpeed)} → ` +
      `${formatSpreadScrollDisplayValue(change.afterSpeed)} ` +
      getSpreadScrollDisplayUnit(),
      `Δ ${deltaText} ${getSpreadScrollDisplayUnit()}`
    ];
    if (Number.isFinite(change.ratio)) {
      valueParts.push(
        `${formatSpreadScrollTooltipNumber(change.ratio, 2)}x`
      );
    }
    if (Number.isFinite(change.gapMs)) {
      valueParts.push(`${Math.round(change.gapMs)} ms`);
    }
    values.textContent = valueParts.join(" | ");

    item.append(name, values);
    grid.appendChild(item);
  }

  const issueLines = getSpreadScrollDeltaIssueTooltipLines(
    time,
    toleranceMs,
    getSpreadScrollChartResults()
  );

  const children = [timeElement, grid];
  if (issueLines.length) {
    const issue = document.createElement("div");
    issue.className = "spread-scroll-delta-tooltip-issue";
    issue.textContent = issueLines.join("\n");
    children.push(issue);
  }

  tooltip.classList.toggle("is-dense", matches.length >= 9);
  tooltip.classList.remove("is-simple");
  tooltip.replaceChildren(...children);
  tooltip.hidden = false;
  positionSpreadScrollTooltip(tooltip, wrap, point);
}

function positionSpreadScrollTooltip(tooltip, wrap, point) {
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

function appendSpreadScrollSimpleDetails(lines, assignments, time) {
  const state = spreadScrollChartState;

  if (state.dom?.spreadScrollShowLimits?.checked) {
    const limits = assignments
      .map(assignment => ({
        name: getDifficultyNameText(assignment.result.fileName),
        value: getSpreadTooFastScrollRule(assignment.category)
      }))
      .filter(item => Number.isFinite(item.value));

    if (limits.length) {
      lines.push("", state.t("spreadScrollGraphLimit"));
      for (const limit of limits) {
        lines.push(
          `${limit.name}: ${formatSpreadScrollDisplayValue(limit.value)} ` +
          getSpreadScrollDisplayUnit()
        );
      }
    }
  }

  if (state.dom?.spreadScrollShowRapidChanges?.checked) {
    const rapidChanges = assignments.filter(assignment =>
      (assignment.result.scrollSpeed?.rapidChanges ?? []).some(change =>
        getSpreadRapidScrollLevel(change, assignment.category) === "warn" &&
        change.fromTime <= time &&
        time < change.toTime
      )
    );

    if (rapidChanges.length) {
      lines.push("", state.t("spreadScrollGraphRapidChange"));
      for (const assignment of rapidChanges) {
        lines.push(getDifficultyNameText(assignment.result.fileName));
      }
    }
  }
}

function getSpreadScrollDeltaIssueTooltipLines(
  time,
  toleranceMs,
  results
) {
  const state = spreadScrollChartState;
  const issueDisplay = getSpreadScrollDeltaIssueDisplay(results);
  if (!issueDisplay.mode) return [];

  const group = issueDisplay.groups.reduce((nearest, item) => {
    const distance = Math.abs(item.time - time);
    if (distance > toleranceMs) return nearest;
    if (!nearest || distance < nearest.distance) {
      return { item, distance };
    }
    return nearest;
  }, null)?.item;

  if (!group) return [];

  const lines = [];

  if (issueDisplay.mode === "progression") {
    lines.push(state.t("spreadScrollProgressionIssue"));

    const byFileName = new Map(
      group.items.map(item => [item.fileName, item.event])
    );
    const progression = results
      .map(result => {
        const event = byFileName.get(result.fileName);
        if (!event) return null;
        return (
          `${getDifficultyNameText(result.fileName)} ` +
          formatSpreadScrollDisplayValue(event.afterSpeed)
        );
      })
      .filter(Boolean);

    if (progression.length) {
      lines.push(
        `${progression.join(" → ")} ${getSpreadScrollDisplayUnit()}`
      );
    }

    for (const issue of group.issues) {
      lines.push(
        `${getDifficultyNameText(issue.prev.fileName)} → ` +
        `${getDifficultyNameText(issue.cur.fileName)}: ` +
        `${formatSpreadScrollDirection(issue.prevDirection)} → ` +
        `${formatSpreadScrollDirection(issue.curDirection)}`
      );
    }
    return lines;
  }

  lines.push(state.t("spreadScrollConsistencyIssue"));
  for (const issue of group.issues) {
    const lowerName = getDifficultyNameText(issue.lower.fileName);
    const higherName = getDifficultyNameText(issue.higher.fileName);
    const lowerDelta = formatSpreadScrollSignedDelta(
      convertSpreadScrollDisplayValue(issue.lower.event.delta)
    );
    const higherDelta = formatSpreadScrollSignedDelta(
      convertSpreadScrollDisplayValue(issue.higher.event.delta)
    );
    const reason = issue.type === "directionMismatch"
      ? state.t("spreadScrollOppositeDirection")
      : state.t("spreadScrollStrongerLowerDiff");

    lines.push(
      `${lowerName} ${lowerDelta} / ${higherName} ${higherDelta} ` +
      getSpreadScrollDisplayUnit()
    );
    lines.push(reason);
  }

  return lines;
}

function formatSpreadScrollDirection(direction) {
  const t = spreadScrollChartState.t;
  if (direction === "up") return t("spreadScrollDirectionUp");
  if (direction === "down") return t("spreadScrollDirectionDown");
  return t("spreadScrollDirectionFlat");
}

function formatSpreadScrollSignedDelta(value) {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function hideSpreadScrollTooltips() {
  const state = spreadScrollChartState;
  const tooltips = [
    state.dom?.spreadScrollChartTooltip,
    state.dom?.spreadScrollDeltaChartTooltip
  ];

  for (const tooltip of tooltips) {
    if (tooltip) tooltip.hidden = true;
  }
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
