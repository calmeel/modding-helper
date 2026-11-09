// 波形のパン・ズーム、時刻表示と右クリックによる手動ピーク指定。
function handleOffsetWaveformPointerDown(event) {
  const state = offsetWaveformChartState;
  const plot = state.dom?.offsetWaveformCanvas?._offsetWaveformPlot;
  if (!plot) return;

  const x = clampOffsetWaveformX(event.offsetX, plot);
  if (!beginChartPointerInteraction(state, event, state.dom.offsetWaveformCanvas, x)) {
    return;
  }

  hideOffsetWaveformTooltip();
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerMove(event) {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const plot = canvas?._offsetWaveformPlot;
  if (!plot) return;

  const x = clampOffsetWaveformX(event.offsetX, plot);
  const time = offsetWaveformTimeForX(x, plot);

  if (state.dragStartX !== null) {
    if (state.dragButton === 0) {
      updateChartPointerPan(
        state,
        event.offsetX,
        plot,
        getOffsetWaveformDurationMs()
      );
      state.hoverTime = null;
      hideOffsetWaveformTooltip();
      drawOffsetWaveformChart();
    }
    return;
  }

  state.hoverTime = Math.round(time);
  showOffsetWaveformTooltip(event, state.hoverTime);
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerUp(event) {
  const state = offsetWaveformChartState;
  const plot = state.dom?.offsetWaveformCanvas?._offsetWaveformPlot;
  if (!plot || state.dragStartX === null || state.dragCurrentX === null) {
    resetOffsetWaveformDrag();
    return;
  }

  const canvas = state.dom?.offsetWaveformCanvas;
  const endX = clampOffsetWaveformX(event.offsetX, plot);
  const interaction = finishChartPointerInteraction(
    state,
    event,
    canvas,
    endX
  );

  if (interaction?.button === 2 && interaction.distance < 4) {
    handleOffsetWaveformManualPeakClick(endX);
  }

  state.hoverTime = null;
  hideOffsetWaveformTooltip();
  drawOffsetWaveformChart();
}

function handleOffsetWaveformManualPeakClick(x) {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const plot = canvas?._offsetWaveformPlot;
  const source = getOffsetWaveformSource(
    sortResultsForDisplay(state.sources ?? [])
  );

  if (!plot || !source?.offsetWaveformBarlines?.length) return;

  const peakTime = Math.round(offsetWaveformTimeForX(x, plot));
  const nearestBarline = findNearestOffsetWaveformBarline(
    source.offsetWaveformBarlines,
    peakTime
  );

  if (!nearestBarline) return;

  const recommendedOffsetTime = peakTime - OFFSET_WAVEFORM_MANUAL_PEAK_OFFSET_MS;
  const result = {
    peakTime,
    nearestBarlineTime: nearestBarline.time,
    barlineGap: peakTime - nearestBarline.time,
    recommendedOffsetTime,
    recommendedDelta: recommendedOffsetTime - nearestBarline.time
  };

  state.manualOffsetResult = result;
  renderOffsetManualResult(result);
}

function findNearestOffsetWaveformBarline(barlines, time) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const barline of barlines) {
    const distance = Math.abs(barline.time - time);
    if (distance < nearestDistance) {
      nearest = barline;
      nearestDistance = distance;
    }

    if (barline.time > time && distance > nearestDistance) break;
  }

  return nearest;
}

function handleOffsetWaveformPointerCancel(event) {
  resetOffsetWaveformDrag();
  hideOffsetWaveformTooltip();
  drawOffsetWaveformChart();
}

function handleOffsetWaveformPointerLeave() {
  const state = offsetWaveformChartState;
  if (state.dragStartX !== null) return;
  state.hoverTime = null;
  hideOffsetWaveformTooltip();
  drawOffsetWaveformChart();
}

function resetOffsetWaveformDrag() {
  const state = offsetWaveformChartState;
  resetChartPointerInteraction(state, state.dom?.offsetWaveformCanvas);
}

function handleOffsetWaveformWheel(event) {
  const state = offsetWaveformChartState;
  const canvas = state.dom?.offsetWaveformCanvas;
  const plot = canvas?._offsetWaveformPlot;
  if (!canvas || !plot) return;

  if (
    event.offsetX < plot.left ||
    event.offsetX > plot.right ||
    event.offsetY < plot.top ||
    event.offsetY > plot.bottom
  ) {
    return;
  }

  event.preventDefault();
  if (
    updateChartViewForWheel(
      state,
      event,
      event.offsetX,
      plot,
      getOffsetWaveformDurationMs()
    )
  ) {
    state.hoverTime = null;
    hideOffsetWaveformTooltip();
    drawOffsetWaveformChart();
  }
}

function offsetWaveformTimeForX(x, plot) {
  const state = offsetWaveformChartState;
  const viewStart = Math.max(0, Math.floor(state.viewStart));
  const viewEnd = Math.max(viewStart + 1, Math.ceil(state.viewEnd || getOffsetWaveformDurationMs()));
  const ratio = (x - plot.left) / plot.width;
  return viewStart + ratio * (viewEnd - viewStart);
}

function clampOffsetWaveformX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function showOffsetWaveformTooltip(event, time) {
  const state = offsetWaveformChartState;
  const tooltip = state.dom?.offsetWaveformTooltip;
  if (!tooltip) return;

  tooltip.hidden = false;
  tooltip.textContent = msToTimestamp(time);
  tooltip.style.left = `${event.offsetX + 14}px`;
  tooltip.style.top = `${event.offsetY + 14}px`;
}

function hideOffsetWaveformTooltip() {
  const tooltip = offsetWaveformChartState.dom?.offsetWaveformTooltip;
  if (tooltip) tooltip.hidden = true;
}
