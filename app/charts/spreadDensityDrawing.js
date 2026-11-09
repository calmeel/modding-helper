// 密度比較グラフの段差表示、逆転帯、軸と再生ヘッド用ジオメトリ。
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
