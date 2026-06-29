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
  initialized: false,
  resizeObserver: null
};

const VOLUME_COMPARE_SR_COLOR_STOPS = [
  { sr: 0, color: [66, 144, 251] },
  { sr: 1, color: [79, 192, 255] },
  { sr: 2, color: [79, 255, 213] },
  { sr: 3, color: [246, 240, 92] },
  { sr: 4, color: [255, 128, 104] },
  { sr: 5, color: [255, 78, 111] },
  { sr: 6, color: [198, 69, 184] },
  { sr: 7, color: [101, 99, 222] },
  { sr: 8, color: [24, 21, 142] },
  { sr: 9, color: [0, 0, 0] }
];

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
  const resetButton = state.dom.volumeCompareResetZoom;
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

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const result = state.result;
      if (!result) return;

      state.viewStart = 0;
      state.viewEnd = getVolumeCompareChartEndTime(result);
      state.hoverTime = null;
      hideVolumeCompareTooltip();
      drawVolumeCompareChart();
    });
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

function getVolumeCompareVirtualSrAssignments(sortedSeries) {
  return sortedSeries.map((series, index) => {
    const virtualSr = index + 1;
    return {
      series,
      virtualSr,
      color: getVolumeCompareSrColor(virtualSr)
    };
  });
}

function getVolumeCompareSrColor(sr) {
  const stops = VOLUME_COMPARE_SR_COLOR_STOPS;
  const clamped = Math.max(stops[0].sr, Math.min(stops[stops.length - 1].sr, sr));

  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].sr && clamped <= stops[i + 1].sr) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.sr - lower.sr;
  const ratio = range === 0 ? 0 : (clamped - lower.sr) / range;
  const rgb = lower.color.map((value, index) =>
    Math.round(value + (upper.color[index] - value) * ratio)
  );
  const readableRgb = getVolumeCompareReadableSrRgb(rgb);

  return `rgb(${readableRgb[0]}, ${readableRgb[1]}, ${readableRgb[2]})`;
}

function getVolumeCompareReadableSrRgb(rgb) {
  if (rgb.every(value => value === 0)) {
    return [255, 255, 255];
  }

  const luminance = getVolumeCompareRelativeLuminance(rgb);
  const start = 0.24;
  const end = 0.06;

  if (luminance >= start) {
    return rgb;
  }

  const amount = Math.max(
    0,
    Math.min(1, (start - luminance) / (start - end))
  ) * 0.9;
  const target = [216, 214, 255];

  return rgb.map((value, index) =>
    Math.round(value + (target[index] - value) * amount)
  );
}

function getVolumeCompareRelativeLuminance(rgb) {
  const linear = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function getVolumeCompareChartEndTime(result) {
  return Math.max(
    0,
    result?.displayEndTime ?? 0,
    result?.audioDurationMs ?? 0,
    result?.endTime ?? 0
  );
}

function drawVolumeCompareChart() {
  const state = volumeCompareChartState;
  const canvas = state.dom?.volumeCompareChart;
  const result = state.result;

  if (
    !canvas ||
    !result ||
    !result.series?.length ||
    state.dom?.volumeCompareChartWrap?.hidden
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
    left: 54,
    top: 18,
    right: cssWidth - 18,
    bottom: cssHeight - 42
  };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);

  const viewStart = Math.max(0, state.viewStart);
  const chartEndTime = getVolumeCompareChartEndTime(result);
  const viewEnd = Math.max(viewStart + 1, state.viewEnd || chartEndTime);
  const sortedSeries = sortResultsForDisplay(result.series);
  const assignments = getVolumeCompareVirtualSrAssignments(sortedSeries);
  const visibleAssignments = assignments.filter(
    assignment => !state.hiddenFiles.has(assignment.series.fileName)
  );

  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;
  const yForVolume = volume =>
    plot.bottom - (volume / 100) * plot.height;

  drawVolumeCompareBackgroundBands(
    ctx,
    result,
    visibleAssignments,
    plot,
    viewStart,
    viewEnd,
    xForTime
  );
  drawVolumeCompareGrid(ctx, plot, viewStart, viewEnd, xForTime, yForVolume);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  for (const assignment of visibleAssignments) {
    drawVolumeCompareSeries(
      ctx,
      assignment.series,
      assignment.color,
      viewStart,
      viewEnd,
      xForTime,
      yForVolume
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
    const startX = clampVolumeCompareX(state.dragStartX, plot);
    const endX = clampVolumeCompareX(state.dragCurrentX, plot);
    ctx.fillStyle = "rgba(159, 220, 255, 0.16)";
    ctx.fillRect(
      Math.min(startX, endX),
      plot.top,
      Math.abs(endX - startX),
      plot.height
    );
  }

  ctx.restore();

  canvas._volumeComparePlot = plot;
  canvas.__playheadGeom = { plot, viewStart, viewEnd };
  canvas._volumeCompareVisibleAssignments = visibleAssignments;

  // 再生ヘッド用: 指定時刻・現在Diffの値とy座標（リアルタイム強調マーカー用）
  canvas.__markerAt = function (timeMs, diffFile) {
    if (!diffFile || timeMs < viewStart || timeMs > viewEnd) return null;
    const base = String(diffFile).split(/[\\/]/).pop();
    const asg = visibleAssignments.find(
      a => String(a.series.fileName || "").split(/[\\/]/).pop() === base
    );
    if (!asg) return null;
    const vol = getVolumeCompareVolumeAtTime(asg.series, timeMs);
    if (vol === null || vol === undefined) return null;
    return { y: yForVolume(vol), color: asg.color, label: Math.round(vol) + "%" };
  };
}

function drawVolumeCompareBackgroundBands(
  ctx,
  result,
  visibleAssignments,
  plot,
  viewStart,
  viewEnd,
  xForTime
) {
  const visibleFiles = new Set(
    visibleAssignments.map(assignment => assignment.series.fileName)
  );
  const bands = [];

  if (volumeCompareChartState.dom?.volumeCompareShowDifferences?.checked) {
    bands.push({
      intervals: getVisibleVolumeCompareSections(result, visibleFiles),
      color: "rgba(255, 107, 107, 0.28)"
    });
  }

  if (volumeCompareChartState.dom?.volumeCompareShowKiai?.checked) {
    bands.push({
      intervals: collectVisibleVolumeCompareUnionIntervals(
        visibleAssignments,
        "kiaiIntervals"
      ),
      color: "rgba(255, 216, 107, 0.24)"
    });
  }

  if (volumeCompareChartState.dom?.volumeCompareShowBreaks?.checked) {
    bands.push({
      intervals: collectVisibleVolumeCompareUnionIntervals(
        visibleAssignments,
        "breakIntervals"
      ),
      color: "rgba(86, 170, 255, 0.24)"
    });
  }

  if (bands.length === 0) return;

  const rowHeight = plot.height / bands.length;

  bands.forEach((band, index) => {
    drawVolumeCompareIntervalBands(
      ctx,
      band.intervals,
      plot.top + rowHeight * index,
      rowHeight,
      band.color,
      viewStart,
      viewEnd,
      xForTime
    );
  });
}

function drawVolumeCompareIntervalBands(
  ctx,
  intervals,
  top,
  height,
  color,
  viewStart,
  viewEnd,
  xForTime
) {
  ctx.fillStyle = color;

  for (const interval of intervals) {
    if (interval.end < viewStart || interval.start > viewEnd) continue;

    const startX = xForTime(Math.max(interval.start, viewStart));
    const endX = xForTime(Math.min(interval.end, viewEnd));
    ctx.fillRect(startX, top, Math.max(1, endX - startX), height);
  }
}

function collectVisibleVolumeCompareUnionIntervals(assignments, key) {
  const intervals = assignments
    .flatMap(assignment => assignment.series[key] ?? [])
    .filter(interval =>
      Number.isFinite(interval.start) &&
      Number.isFinite(interval.end) &&
      interval.end > interval.start
    )
    .sort((a, b) => a.start - b.start);

  const merged = [];

  for (const interval of intervals) {
    const last = merged[merged.length - 1];

    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function getVisibleVolumeCompareSections(result, visibleFiles) {
  if (visibleFiles.size < 2) return [];

  const options = result.options ?? {};
  const sections = [];

  for (const interval of result.intervals ?? []) {
    const visibleStates = interval.states
      .filter(state => visibleFiles.has(state.fileName));
    const volumes = visibleStates
      .map(state => state.volume)
      .filter(volume => volume !== null && volume !== undefined);

    if (volumes.length < 2) continue;

    const diff = Math.max(...volumes) - Math.min(...volumes);
    if (diff === 0) continue;
    if (options.thresholdOnly && diff < options.thresholdPercent) continue;

    sections.push({
      start: interval.start,
      end: interval.end,
      diff
    });
  }

  const filtered = filterVolumeCompareSectionsByOptions(sections, options);

  return mergeVolumeCompareSectionsAsBands(filtered);
}

function drawVolumeCompareGrid(ctx, plot, viewStart, viewEnd, xForTime, yForVolume) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  for (let volume = 0; volume <= 100; volume += 20) {
    const y = yForVolume(volume);
    ctx.strokeStyle = volume === 0
      ? "rgba(255, 255, 255, 0.35)"
      : "rgba(255, 255, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${volume}%`, plot.left - 8, y);
  }

  const tickCount = Math.max(3, Math.min(8, Math.floor(plot.width / 110)));

  for (let i = 0; i <= tickCount; i++) {
    const ratio = i / tickCount;
    const time = viewStart + (viewEnd - viewStart) * ratio;
    const x = xForTime(time);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = i === 0 ? "left" : i === tickCount ? "right" : "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatVolumeCompareAxisTime(time), x, plot.bottom + 10);
  }
}

function drawVolumeCompareSeries(
  ctx,
  series,
  color,
  viewStart,
  viewEnd,
  xForTime,
  yForVolume
) {
  if (!series.points?.length) return;

  const points = series.points;
  let currentVolume = getVolumeCompareVolumeAtTime(series, viewStart);
  if (currentVolume === null) return;

  let currentTime = viewStart;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.25;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(xForTime(currentTime), yForVolume(currentVolume));

  for (const point of points) {
    if (point.time <= viewStart) continue;
    if (point.time > viewEnd) break;
    if (point.volume === null) continue;

    ctx.lineTo(xForTime(point.time), yForVolume(currentVolume));
    ctx.lineTo(xForTime(point.time), yForVolume(point.volume));

    currentTime = point.time;
    currentVolume = point.volume;
  }

  ctx.lineTo(xForTime(viewEnd), yForVolume(currentVolume));
  ctx.stroke();
}

function getVolumeCompareVolumeAtTime(series, time) {
  let volume = series.points?.[0]?.volume ?? null;

  for (const point of series.points ?? []) {
    if (point.time > time) break;
    volume = point.volume;
  }

  return volume;
}

function handleVolumeComparePointerDown(event) {
  const state = volumeCompareChartState;
  const canvas = state.dom?.volumeCompareChart;
  if (!canvas?._volumeComparePlot) return;

  const point = getVolumeComparePointerPosition(event, canvas);
  const plot = canvas._volumeComparePlot;
  if (!isVolumeComparePointInPlot(point, plot)) return;

  canvas.setPointerCapture(event.pointerId);
  state.dragStartX = point.x;
  state.dragCurrentX = point.x;
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
    state.dragCurrentX = point.x;
    drawVolumeCompareChart();
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
  const distance = Math.abs(point.x - state.dragStartX);

  if (distance >= 8) {
    const startTime = volumeCompareXToTime(state.dragStartX, plot);
    const endTime = volumeCompareXToTime(point.x, plot);
    state.viewStart = Math.max(0, Math.min(startTime, endTime));
    state.viewEnd = Math.min(
      getVolumeCompareChartEndTime(state.result),
      Math.max(startTime, endTime)
    );
  } else {
    const time = volumeCompareXToTime(point.x, plot);
    window.location.href = `osu://edit/${msToTimestamp(Math.round(time))}`;
  }

  state.dragStartX = null;
  state.dragCurrentX = null;
  state.hoverTime = null;
  hideVolumeCompareTooltip();
  drawVolumeCompareChart();
}

function handleVolumeComparePointerCancel() {
  const state = volumeCompareChartState;
  state.dragStartX = null;
  state.dragCurrentX = null;
  drawVolumeCompareChart();
}

function handleVolumeComparePointerLeave() {
  const state = volumeCompareChartState;
  if (state.dragStartX !== null) return;

  state.hoverTime = null;
  hideVolumeCompareTooltip();
  drawVolumeCompareChart();
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

function showVolumeCompareTooltip(point, time) {
  const state = volumeCompareChartState;
  const tooltip = state.dom?.volumeCompareChartTooltip;
  const wrap = state.dom?.volumeCompareChartWrap;
  const assignments =
    state.dom?.volumeCompareChart?._volumeCompareVisibleAssignments ?? [];

  if (!tooltip || !wrap) return;

  const lines = [msToTimestamp(Math.round(time))];

  for (const assignment of assignments) {
    const volume = getVolumeCompareVolumeAtTime(assignment.series, time);
    lines.push(
      `${getDifficultyNameText(assignment.series.fileName)}: ` +
      `${volume === null ? "N/A" : `${volume}%`}`
    );
  }

  const visibleFiles = new Set(
    assignments.map(assignment => assignment.series.fileName)
  );
  const section = getVisibleVolumeCompareSections(state.result, visibleFiles)
    .find(item => time >= item.start && time < item.end);

  if (section) {
    lines.push("");
    lines.push(`${state.t("volumeCompareGraphDifference")}: ${section.diff}%`);
    lines.push(
      `${state.t("volumeCompareGraphDuration")}: ` +
      `${Math.round(section.end - section.start)} ms`
    );
  }

  const kiaiDiffs = assignments
    .filter(assignment =>
      isVolumeCompareTimeInIntervals(assignment.series.kiaiIntervals, time)
    )
    .map(assignment => getDifficultyNameText(assignment.series.fileName));

  const breakDiffs = assignments
    .filter(assignment =>
      isVolumeCompareTimeInIntervals(assignment.series.breakIntervals, time)
    )
    .map(assignment => getDifficultyNameText(assignment.series.fileName));

  if (
    state.dom?.volumeCompareShowKiai?.checked &&
    kiaiDiffs.length
  ) {
    lines.push("");
    lines.push(`${state.t("volumeCompareGraphKiai")}: ${kiaiDiffs.join(", ")}`);
  }

  if (
    state.dom?.volumeCompareShowBreaks?.checked &&
    breakDiffs.length
  ) {
    lines.push("");
    lines.push(`${state.t("volumeCompareGraphBreak")}: ${breakDiffs.join(", ")}`);
  }

  tooltip.textContent = lines.join("\n");
  tooltip.hidden = false;

  const gap = 14;
  const edgePadding = 8;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const spaceRight = wrap.clientWidth - point.x;

  const left = spaceRight >= tooltipWidth + gap + edgePadding
    ? point.x + gap
    : point.x - tooltipWidth - gap;

  const top = point.y >= tooltipHeight + gap + edgePadding
    ? point.y - tooltipHeight - gap
    : point.y + gap;

  tooltip.style.left =
    `${Math.max(edgePadding, Math.min(left, wrap.clientWidth - tooltipWidth - edgePadding))}px`;
  tooltip.style.top =
    `${Math.max(edgePadding, Math.min(top, wrap.clientHeight - tooltipHeight - edgePadding))}px`;
}

function isVolumeCompareTimeInIntervals(intervals, time) {
  return (intervals ?? []).some(interval =>
    interval.start <= time && time < interval.end
  );
}

function hideVolumeCompareTooltip() {
  const tooltip = volumeCompareChartState.dom?.volumeCompareChartTooltip;
  if (tooltip) tooltip.hidden = true;
}

function formatVolumeCompareAxisTime(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
