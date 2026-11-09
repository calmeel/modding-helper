// オフセット波形、小節線、手動補正ガイドと再生ヘッド用ジオメトリ。
const OFFSET_WAVEFORM_FILL_COLOUR = "rgba(120, 215, 255, 0.9)";

function drawOffsetWaveformChart() {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const audioBuffer = state.audioBuffer;
  const waveformData = state.waveformData;
  const source = getOffsetWaveformSource(
    sortResultsForDisplay(state.sources ?? [])
  );

  if (
    !canvas ||
    !audioBuffer ||
    !waveformData ||
    !source ||
    state.dom?.offsetWaveformChartWrap?.hidden
  ) {
    return;
  }

  const durationMs = getOffsetWaveformDurationMs();
  const cssWidth = Math.max(360, canvas.parentElement?.clientWidth ?? 0);
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
    top: 20,
    right: cssWidth - 18,
    bottom: cssHeight - 42
  };
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);

  const viewStart = Math.max(0, Math.floor(state.viewStart));
  const viewEnd = Math.min(
    durationMs,
    Math.max(viewStart + 1, Math.ceil(state.viewEnd || durationMs))
  );
  const xForTime = time =>
    plot.left + ((time - viewStart) / (viewEnd - viewStart)) * plot.width;

  drawOffsetWaveformGrid(ctx, plot, viewStart, viewEnd, xForTime);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();

  drawOffsetWaveformData(ctx, waveformData, plot, viewStart, viewEnd);
  drawOffsetWaveformBarlines(
    ctx,
    source.offsetWaveformBarlines ?? [],
    plot,
    viewStart,
    viewEnd,
    xForTime
  );
  drawEstimatedOffsetWaveformBarlines(
    ctx,
    OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED
      ? source.estimatedOffsetWaveformBarlines ?? []
      : [],
    plot,
    viewStart,
    viewEnd,
    xForTime
  );
  drawOffsetPeakWaveformBarlines(
    ctx,
    OFFSET_WAVEFORM_ESTIMATE_DISPLAY_ENABLED
      ? source.offsetPeakWaveformBarlines ?? []
      : [],
    plot,
    viewStart,
    viewEnd,
    xForTime
  );
  drawManualOffsetResult(ctx, state.manualOffsetResult, plot, viewStart, viewEnd, xForTime);

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

  canvas._offsetWaveformPlot = plot;
  canvas.__playheadGeom = { plot, viewStart, viewEnd };
}

function drawOffsetWaveformGrid(ctx, plot, viewStart, viewEnd, xForTime) {
  ctx.font = "12px Arial, sans-serif";
  ctx.lineWidth = 1;

  const centerY = plot.top + plot.height / 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.moveTo(plot.left, centerY);
  ctx.lineTo(plot.right, centerY);
  ctx.stroke();

  const timeTicks = getChartTimeTicks(viewStart, viewEnd, plot.width);
  for (const tick of timeTicks.values) {
    const x = xForTime(tick);
    const label = formatChartTimeTick(tick, timeTicks.step);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(221, 231, 255, 0.82)";
    ctx.textAlign = getChartTimeTickTextAlign(ctx, label, x, plot);
    ctx.textBaseline = "top";
    ctx.fillText(label, x, plot.bottom + 10);
  }

  ctx.fillStyle = "rgba(221, 231, 255, 0.82)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("amp", plot.left, 2);
}

function drawOffsetWaveformData(ctx, waveformData, plot, viewStart, viewEnd) {
  const centerY = plot.top + plot.height / 2;
  const halfHeight = plot.height / 2;
  const pointCount = Math.max(2, Math.ceil(plot.width));
  const resampled = resampleOffsetWaveformData(
    waveformData,
    viewStart,
    viewEnd,
    pointCount
  );
  const points = resampled.points;

  if (points.length < 2) return;

  const separation = plot.width / (points.length - 1);

  ctx.fillStyle = OFFSET_WAVEFORM_FILL_COLOUR;
  ctx.beginPath();
  ctx.moveTo(
    plot.left,
    centerY - points[0].amplitudeLeft * halfHeight
  );

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(
      plot.left + i * separation,
      centerY - points[i].amplitudeLeft * halfHeight
    );
  }

  for (let i = points.length - 1; i >= 0; i--) {
    ctx.lineTo(
      plot.left + i * separation,
      centerY + points[i].amplitudeRight * halfHeight
    );
  }

  ctx.closePath();
  ctx.fill();
}

function drawOffsetWaveformBarlines(ctx, barlines, plot, viewStart, viewEnd, xForTime) {
  ctx.lineWidth = 1;

  for (const barline of barlines) {
    if (barline.time < viewStart || barline.time > viewEnd) continue;

    const x = Math.round(xForTime(barline.time)) + 0.5;
    ctx.strokeStyle = "rgba(255, 92, 112, 0.72)";
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }
}

function drawEstimatedOffsetWaveformBarlines(ctx, barlines, plot, viewStart, viewEnd, xForTime) {
  ctx.lineWidth = 1;

  for (const barline of barlines) {
    if (barline.time < viewStart || barline.time > viewEnd) continue;

    const x = Math.round(xForTime(barline.time)) + 0.5;
    ctx.strokeStyle = "rgba(255, 207, 92, 0.7)";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawOffsetPeakWaveformBarlines(ctx, barlines, plot, viewStart, viewEnd, xForTime) {
  ctx.lineWidth = 1;

  for (const barline of barlines) {
    if (barline.time < viewStart || barline.time > viewEnd) continue;

    const x = Math.round(xForTime(barline.time)) + 0.5;
    ctx.strokeStyle = "rgba(194, 126, 255, 0.72)";
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawManualOffsetResult(ctx, result, plot, viewStart, viewEnd, xForTime) {
  if (!result) return;

  drawOffsetWaveformGuideLine(
    ctx,
    result.peakTime,
    plot,
    viewStart,
    viewEnd,
    xForTime,
    "rgba(178, 132, 255, 0.9)",
    []
  );
  drawOffsetWaveformGuideLine(
    ctx,
    result.recommendedOffsetTime,
    plot,
    viewStart,
    viewEnd,
    xForTime,
    "rgba(255, 207, 92, 0.9)",
    [6, 4]
  );
}

function drawOffsetWaveformGuideLine(ctx, time, plot, viewStart, viewEnd, xForTime, colour, dash) {
  if (!Number.isFinite(time) || time < viewStart || time > viewEnd) return;

  const x = Math.round(xForTime(time)) + 0.5;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x, plot.top);
  ctx.lineTo(x, plot.bottom);
  ctx.stroke();
  ctx.restore();
}
