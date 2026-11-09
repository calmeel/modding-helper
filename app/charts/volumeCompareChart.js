// 音量比較グラフの状態、初期化、表示切替とポインター操作。
const volumeCompareChartState = {
  result: null,
  dom: null,
  t: null,
  signature: "",
  hiddenFiles: new Set(),
  viewStart: 0,
  viewEnd: 0,
  hoverTime: null,
  dragStartX: null,
  dragCurrentX: null,
  dragButton: null,
  initialized: false,
  resizeObserver: null
};

function renderVolumeCompareChart(result, dom, t) {
  const state = volumeCompareChartState;
  state.result = result;
  state.dom = dom;
  state.t = t;

  initializeVolumeCompareChart();

  const canRender =
    result &&
    result.series?.length >= 1 &&
    getVolumeCompareChartEndTime(result) > 0;

  if (!canRender) {
    if (dom.volumeCompareChartWrap) dom.volumeCompareChartWrap.hidden = true;
    if (dom.volumeCompareDiffToggles) dom.volumeCompareDiffToggles.replaceChildren();

    if (dom.volumeCompareChartEmpty) {
      dom.volumeCompareChartEmpty.hidden = false;
      dom.volumeCompareChartEmpty.textContent = result
        ? t("volumeCompareGraphNoData")
        : t("noFileLoaded");
    }
    return;
  }

  const sortedSeries = sortResultsForDisplay(result.series);
  const chartEndTime = getVolumeCompareChartEndTime(result);
  const signature =
    sortedSeries.map(series => series.fileName).join("|") +
    `::${chartEndTime}`;

  if (signature !== state.signature) {
    state.signature = signature;
    state.hiddenFiles.clear();
    state.viewStart = 0;
    state.viewEnd = chartEndTime;
    state.hoverTime = null;
  } else {
    state.viewEnd = Math.min(state.viewEnd || chartEndTime, chartEndTime);
  }

  if (dom.volumeCompareChartEmpty) dom.volumeCompareChartEmpty.hidden = true;
  if (dom.volumeCompareChartWrap) dom.volumeCompareChartWrap.hidden = false;

  renderVolumeCompareDiffToggles(sortedSeries);
  drawVolumeCompareChart();
}

function initializeVolumeCompareChart() {
  const state = volumeCompareChartState;
  if (state.initialized || !state.dom?.volumeCompareChart) return;

  const canvas = state.dom.volumeCompareChart;
  const backgroundToggles = [
    state.dom.volumeCompareShowDifferences,
    state.dom.volumeCompareShowKiai,
    state.dom.volumeCompareShowBreaks
  ];

  canvas.addEventListener("pointerdown", handleVolumeComparePointerDown);
  canvas.addEventListener("pointermove", handleVolumeComparePointerMove);
  canvas.addEventListener("pointerup", handleVolumeComparePointerUp);
  canvas.addEventListener("pointercancel", handleVolumeComparePointerCancel);
  canvas.addEventListener("pointerleave", handleVolumeComparePointerLeave);
  canvas.addEventListener("wheel", handleVolumeCompareWheel, { passive: false });
  canvas.addEventListener("contextmenu", preventChartContextMenu);

  for (const toggle of backgroundToggles) {
    if (toggle) {
      toggle.addEventListener("change", () => {
        if (toggle.checked) {
          for (const otherToggle of backgroundToggles) {
            if (otherToggle && otherToggle !== toggle) {
              otherToggle.checked = false;
            }
          }
        }

        drawVolumeCompareChart();
      });
    }
  }

  if (typeof ResizeObserver !== "undefined" && state.dom.volumeCompareChartWrap) {
    state.resizeObserver = new ResizeObserver(() => {
      if (!state.dom.volumeCompareChartWrap.hidden) {
        drawVolumeCompareChart();
      }
    });
    state.resizeObserver.observe(state.dom.volumeCompareChartWrap);
  } else {
    window.addEventListener("resize", drawVolumeCompareChart);
  }

  state.initialized = true;
}

function renderVolumeCompareDiffToggles(sortedSeries) {
  const state = volumeCompareChartState;
  const container = state.dom?.volumeCompareDiffToggles;
  if (!container) return;

  const assignments = getVolumeCompareVirtualSrAssignments(sortedSeries);
  const fragment = document.createDocumentFragment();
  fragment.appendChild(createVolumeCompareDiffActions(sortedSeries));

  for (const assignment of assignments) {
    const label = document.createElement("label");
    label.className = "volume-compare-diff-toggle";
    label.title = `Virtual SR ${assignment.virtualSr}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !state.hiddenFiles.has(assignment.series.fileName);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.hiddenFiles.delete(assignment.series.fileName);
      } else {
        state.hiddenFiles.add(assignment.series.fileName);
      }

      drawVolumeCompareChart();
    });

    const swatch = document.createElement("span");
    swatch.className = "volume-compare-diff-swatch";
    swatch.style.backgroundColor = assignment.color;

    const name = document.createElement("span");
    name.textContent = getDifficultyNameText(assignment.series.fileName);

    label.append(checkbox, swatch, name);
    fragment.appendChild(label);
  }

  container.replaceChildren(fragment);
}

function createVolumeCompareDiffActions(sortedSeries) {
  const state = volumeCompareChartState;
  const actions = document.createElement("div");
  actions.className = "graph-diff-toggle-actions";

  const selectAll = document.createElement("button");
  selectAll.type = "button";
  selectAll.textContent = state.t("graphSelectAllDiffs");
  selectAll.addEventListener("click", () => {
    state.hiddenFiles.clear();
    renderVolumeCompareDiffToggles(sortedSeries);
    hideVolumeCompareTooltip();
    drawVolumeCompareChart();
  });

  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.textContent = state.t("graphClearAllDiffs");
  clearAll.addEventListener("click", () => {
    state.hiddenFiles = new Set(
      sortedSeries.map(series => series.fileName)
    );
    renderVolumeCompareDiffToggles(sortedSeries);
    hideVolumeCompareTooltip();
    drawVolumeCompareChart();
  });

  actions.append(selectAll, clearAll);
  return actions;
}

function getVolumeCompareChartEndTime(result) {
  return Math.max(
    0,
    result?.displayEndTime ?? 0,
    result?.audioDurationMs ?? 0,
    result?.endTime ?? 0
  );
}

function handleVolumeComparePointerDown(event) {
  const state = volumeCompareChartState;
  const canvas = state.dom?.volumeCompareChart;
  if (!canvas?._volumeComparePlot) return;

  const point = getVolumeComparePointerPosition(event, canvas);
  const plot = canvas._volumeComparePlot;
  if (!isVolumeComparePointInPlot(point, plot)) return;

  if (!beginChartPointerInteraction(state, event, canvas, point.x)) return;

  hideVolumeCompareTooltip();
  drawVolumeCompareChart();
}

function handleVolumeComparePointerMove(event) {
  const state = volumeCompareChartState;
  const canvas = state.dom?.volumeCompareChart;
  const plot = canvas?._volumeComparePlot;
  if (!canvas || !plot) return;

  const point = getVolumeComparePointerPosition(event, canvas);

  if (state.dragStartX !== null) {
    if (state.dragButton === 0) {
      updateChartPointerPan(
        state,
        point.x,
        plot,
        getVolumeCompareChartEndTime(state.result)
      );
      state.hoverTime = null;
      hideVolumeCompareTooltip();
      drawVolumeCompareChart();
    }
    return;
  }

  if (!isVolumeComparePointInPlot(point, plot)) {
    state.hoverTime = null;
    hideVolumeCompareTooltip();
    drawVolumeCompareChart();
    return;
  }

  state.hoverTime = volumeCompareXToTime(point.x, plot);
  showVolumeCompareTooltip(point, state.hoverTime);
  drawVolumeCompareChart();
}

function handleVolumeComparePointerUp(event) {
  const state = volumeCompareChartState;
  const canvas = state.dom?.volumeCompareChart;
  const plot = canvas?._volumeComparePlot;
  if (!canvas || !plot || state.dragStartX === null) return;

  const point = getVolumeComparePointerPosition(event, canvas);
  const interaction = finishChartPointerInteraction(
    state,
    event,
    canvas,
    point.x
  );

  if (interaction?.button === 2 && interaction.distance < 8) {
    const time = volumeCompareXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.hoverTime = null;
  hideVolumeCompareTooltip();
  drawVolumeCompareChart();
}

function handleVolumeComparePointerCancel() {
  const state = volumeCompareChartState;
  resetChartPointerInteraction(state, state.dom?.volumeCompareChart);
  hideVolumeCompareTooltip();
  drawVolumeCompareChart();
}

function handleVolumeComparePointerLeave() {
  const state = volumeCompareChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideVolumeCompareTooltip();
  drawVolumeCompareChart();
}

function handleVolumeCompareWheel(event) {
  const state = volumeCompareChartState;
  const canvas = state.dom?.volumeCompareChart;
  const plot = canvas?._volumeComparePlot;
  if (!canvas || !plot) return;

  const point = getVolumeComparePointerPosition(event, canvas);
  if (!isVolumeComparePointInPlot(point, plot)) return;

  event.preventDefault();
  if (
    updateChartViewForWheel(
      state,
      event,
      point.x,
      plot,
      getVolumeCompareChartEndTime(state.result)
    )
  ) {
    state.hoverTime = null;
    hideVolumeCompareTooltip();
    drawVolumeCompareChart();
  }
}

function getVolumeComparePointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isVolumeComparePointInPlot(point, plot) {
  return (
    point.x >= plot.left &&
    point.x <= plot.right &&
    point.y >= plot.top &&
    point.y <= plot.bottom
  );
}

function clampVolumeCompareX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function volumeCompareXToTime(x, plot) {
  const state = volumeCompareChartState;
  const clampedX = clampVolumeCompareX(x, plot);
  const ratio = (clampedX - plot.left) / plot.width;
  return state.viewStart + (state.viewEnd - state.viewStart) * ratio;
}
