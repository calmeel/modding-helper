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
  dragButton: null,
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
  canvas.addEventListener("pointercancel", event =>
    handleSpreadScrollPointerCancel(event, canvas)
  );
  canvas.addEventListener("pointerleave", () =>
    handleSpreadScrollPointerLeave()
  );
  canvas.addEventListener("wheel", event =>
    handleSpreadScrollWheel(event, canvas),
  { passive: false });
  canvas.addEventListener("contextmenu", preventChartContextMenu);
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

function handleSpreadScrollPointerDown(event, canvas) {
  const state = spreadScrollChartState;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);
  if (!isSpreadScrollPointInPlot(point, plot)) return;

  if (!beginChartPointerInteraction(state, event, canvas, point.x)) return;

  hideSpreadScrollTooltips();
  drawSpreadScrollCharts();
}

function handleSpreadScrollPointerMove(event, canvas) {
  const state = spreadScrollChartState;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);

  if (state.dragStartX !== null && state.dragCanvas === canvas) {
    if (state.dragButton === 0) {
      updateChartPointerPan(
        state,
        point.x,
        plot,
        getSpreadScrollEndTime(getSpreadScrollChartResults())
      );
      state.hoverTime = null;
      hideSpreadScrollTooltips();
      drawSpreadScrollCharts();
    }
    return;
  }

  if (!isSpreadScrollPointInPlot(point, plot)) {
    state.hoverTime = null;
    hideSpreadScrollTooltips();
    drawSpreadScrollCharts();
    return;
  }

  const hoverTime = spreadScrollXToTime(point.x, plot);
  const isDeltaChart = canvas === state.dom?.spreadScrollDeltaChart;

  if (!isDeltaChart && isAfterLastSpreadScrollSample(canvas, hoverTime)) {
    state.hoverTime = null;
    hideSpreadScrollTooltips();
    drawSpreadScrollCharts();
    return;
  }

  state.hoverTime = hoverTime;
  hideSpreadScrollTooltips();
  if (isDeltaChart) {
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
  const interaction = finishChartPointerInteraction(
    state,
    event,
    canvas,
    point.x
  );

  if (interaction?.button === 2 && interaction.distance < 8) {
    const time = spreadScrollXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.hoverTime = null;
  hideSpreadScrollTooltips();
  drawSpreadScrollCharts();
}

function handleSpreadScrollPointerCancel(event, canvas) {
  const state = spreadScrollChartState;
  if (state.dragCanvas !== canvas) return;

  resetChartPointerInteraction(state, canvas);
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

function handleSpreadScrollWheel(event, canvas) {
  const state = spreadScrollChartState;
  const plot = canvas?._spreadScrollPlot;
  if (!canvas || !plot) return;

  const point = getSpreadScrollPointerPosition(event, canvas);
  if (!isSpreadScrollPointInPlot(point, plot)) return;

  event.preventDefault();
  if (
    updateChartViewForWheel(
      state,
      event,
      point.x,
      plot,
      getSpreadScrollEndTime(getSpreadScrollChartResults())
    )
  ) {
    state.hoverTime = null;
    hideSpreadScrollTooltips();
    drawSpreadScrollCharts();
  }
}
