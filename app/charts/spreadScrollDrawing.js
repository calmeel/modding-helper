// スクロール速度・変化量グラフの描画。spreadScrollChartStateを参照する。
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
  /* 分離ウィンドウでは親要素(=ウィンドウ)の高さいっぱいに広げる。
     web ツールでは data-chart-fill が無いので従来どおり固定高さ。 */
  const chartWrap = canvas.parentElement;
  const cssHeight = chartWrap && chartWrap.dataset.chartFill
    ? Math.max(160, chartWrap.clientHeight) : 340;
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
    viewStart,
    viewEnd,
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

  ctx.restore();

  canvas._spreadScrollPlot = plot;
  canvas.__playheadGeom = { plot, viewStart, viewEnd };
  canvas._spreadScrollVisibleAssignments = visibleAssignments;

  // 再生ヘッド用: 指定時刻・現在Diffのスクロール速度とy座標
  canvas.__markerAt = function (timeMs, diffFile) {
    if (!diffFile || timeMs < viewStart || timeMs > viewEnd) return null;
    const base = String(diffFile).split(/[\\/]/).pop();
    const asg = visibleAssignments.find(
      a => String(a.result.fileName || "").split(/[\\/]/).pop() === base
    );
    if (!asg || !asg.result.scrollSpeed || !asg.result.scrollSpeed.samples) return null;
    const sample = getSpreadScrollSampleAtTime(asg.result.scrollSpeed.samples, timeMs);
    if (!sample || sample.pxPerSecond == null) return null;
    return {
      y: yForSpeed(sample.pxPerSecond),
      color: asg.color,
      label: formatSpreadScrollDisplayValue(sample.pxPerSecond) + " " + getSpreadScrollDisplayUnit(),
    };
  };
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
  /* 分離ウィンドウでは親要素(=ウィンドウ)の高さいっぱいに広げる。
     web ツールでは data-chart-fill が無いので従来どおり固定高さ。 */
  const chartWrap = canvas.parentElement;
  const cssHeight = chartWrap && chartWrap.dataset.chartFill
    ? Math.max(160, chartWrap.clientHeight) : 300;
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
  const maxAbsDelta = getSpreadScrollDeltaMaximum(
    visibleAssignments,
    viewStart,
    viewEnd
  );
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

  ctx.restore();

  canvas._spreadScrollPlot = plot;
  canvas.__playheadGeom = { plot, viewStart, viewEnd };
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

function getSpreadScrollDeltaMaximum(assignments, viewStart, viewEnd) {
  const max = Math.max(
    0,
    ...assignments.flatMap(assignment =>
      (assignment.result.scrollSpeed?.rapidChanges ?? [])
        .filter(change =>
          change.toTime >= viewStart &&
          change.toTime <= viewEnd
        )
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

  const timeTicks = getChartTimeTicks(viewStart, viewEnd, plot.width);
  for (const time of timeTicks.values) {
    const x = xForTime(time);
    const label = formatChartTimeTick(time, timeTicks.step);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = getChartTimeTickTextAlign(ctx, label, x, plot);
    ctx.textBaseline = "top";
    ctx.fillText(label, x, plot.bottom + 10);
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

  const timeTicks = getChartTimeTicks(viewStart, viewEnd, plot.width);
  for (const time of timeTicks.values) {
    const x = xForTime(time);
    const label = formatChartTimeTick(time, timeTicks.step);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "#aeb8c8";
    ctx.textAlign = getChartTimeTickTextAlign(ctx, label, x, plot);
    ctx.textBaseline = "top";
    ctx.fillText(label, x, plot.bottom + 10);
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

function isAfterLastSpreadScrollSample(canvas, time) {
  const assignments = canvas?._spreadScrollVisibleAssignments ?? [];
  const lastTime = Math.max(
    -Infinity,
    ...assignments.map(assignment => {
      const samples = assignment.result?.scrollSpeed?.samples ?? [];
      return samples[samples.length - 1]?.time ?? -Infinity;
    })
  );

  return Number.isFinite(lastTime) && time > lastTime;
}

function getSpreadScrollEndTime(results) {
  return Math.max(
    0,
    ...(results ?? []).map(result => {
      const samples = result.scrollSpeed?.samples ?? [];
      return Math.max(
        result.audioDurationMs ?? 0,
        samples[samples.length - 1]?.time ?? 0
      );
    })
  );
}

function getSpreadScrollChartMaxSpeed(
  results,
  viewStart,
  viewEnd,
  extraValues = []
) {
  const max = Math.max(
    0,
    ...(results ?? []).flatMap(result =>
      getSpreadScrollSamplesInView(
        result.scrollSpeed?.samples,
        viewStart,
        viewEnd
      ).map(sample => sample.pxPerSecond)
    ),
    ...extraValues.filter(Number.isFinite)
  );

  return getSpreadScrollNiceMaximum(max);
}

function getSpreadScrollSamplesInView(samples, viewStart, viewEnd) {
  if (!samples?.length) return [];

  const visibleSamples = samples.filter(sample =>
    sample.time >= viewStart &&
    sample.time <= viewEnd &&
    Number.isFinite(sample.pxPerSecond)
  );
  const activeSample = getSpreadScrollSampleAtTime(samples, viewStart);
  const lastSampleTime = samples[samples.length - 1].time;

  if (
    activeSample &&
    viewStart <= lastSampleTime &&
    Number.isFinite(activeSample.pxPerSecond) &&
    !visibleSamples.includes(activeSample)
  ) {
    visibleSamples.unshift(activeSample);
  }

  return visibleSamples;
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

