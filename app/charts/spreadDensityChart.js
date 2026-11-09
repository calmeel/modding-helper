// 密度比較グラフの状態、Diffフィルター、初期化とポインター操作。
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
  dragButton: null,
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
  const inversionToggle = state.dom.spreadDensityShowInversions;

  canvas.addEventListener("pointerdown", handleSpreadDensityPointerDown);
  canvas.addEventListener("pointermove", handleSpreadDensityPointerMove);
  canvas.addEventListener("pointerup", handleSpreadDensityPointerUp);
  canvas.addEventListener("pointercancel", handleSpreadDensityPointerCancel);
  canvas.addEventListener("pointerleave", handleSpreadDensityPointerLeave);
  canvas.addEventListener("wheel", handleSpreadDensityWheel, { passive: false });
  canvas.addEventListener("contextmenu", preventChartContextMenu);

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

  if (!beginChartPointerInteraction(state, event, canvas, point.x)) return;

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
    if (state.dragButton === 0) {
      updateChartPointerPan(
        state,
        point.x,
        plot,
        getSpreadDensityEndTime(getSpreadDensityChartResults())
      );
      state.hoverTime = null;
      hideSpreadDensityTooltip();
      drawSpreadDensityChart();
    }
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
  const interaction = finishChartPointerInteraction(
    state,
    event,
    canvas,
    point.x
  );

  if (interaction?.button === 2 && interaction.distance < 8) {
    const time = spreadDensityXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.hoverTime = null;
  hideSpreadDensityTooltip();
  drawSpreadDensityChart();
}

function handleSpreadDensityPointerCancel() {
  const state = spreadDensityChartState;
  resetChartPointerInteraction(state, state.dom?.spreadDensityChart);
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

function handleSpreadDensityWheel(event) {
  const state = spreadDensityChartState;
  const canvas = state.dom?.spreadDensityChart;
  const plot = canvas?._spreadDensityPlot;
  if (!canvas || !plot) return;

  const point = getSpreadDensityPointerPosition(event, canvas);
  if (!isSpreadDensityPointInPlot(point, plot)) return;

  event.preventDefault();
  if (
    updateChartViewForWheel(
      state,
      event,
      point.x,
      plot,
      getSpreadDensityEndTime(getSpreadDensityChartResults())
    )
  ) {
    state.hoverTime = null;
    hideSpreadDensityTooltip();
    drawSpreadDensityChart();
  }
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
