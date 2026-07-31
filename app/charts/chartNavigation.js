const CHART_NAVIGATION_MIN_SPAN_MS = 10;
const CHART_NAVIGATION_WHEEL_SENSITIVITY = 0.0015;

function beginChartPointerInteraction(state, event, canvas, x) {
  if (event.button !== 0 && event.button !== 2) return false;

  if (event.button === 2) {
    event.preventDefault();
  }

  state.dragStartX = x;
  state.dragCurrentX = x;
  state.dragButton = event.button;
  if ("dragCanvas" in state) {
    state.dragCanvas = canvas;
  }
  canvas.setPointerCapture?.(event.pointerId);
  canvas.classList.toggle("is-panning", event.button === 0);
  return true;
}

function updateChartPointerPan(state, x, plot, fullEnd) {
  if (state.dragButton !== 0 || state.dragCurrentX === null) return false;

  const deltaX = x - state.dragCurrentX;
  state.dragCurrentX = x;

  if (!Number.isFinite(deltaX) || deltaX === 0) return false;

  const range = getChartPanRange(
    state.viewStart,
    state.viewEnd,
    fullEnd,
    deltaX,
    plot.width
  );
  state.viewStart = range.start;
  state.viewEnd = range.end;
  return true;
}

function finishChartPointerInteraction(state, event, canvas, x) {
  if (state.dragStartX === null) return null;

  const interaction = {
    button: state.dragButton,
    distance: Math.abs(x - state.dragStartX)
  };

  canvas.releasePointerCapture?.(event.pointerId);
  resetChartPointerInteraction(state, canvas);
  return interaction;
}

function resetChartPointerInteraction(state, canvas) {
  state.dragStartX = null;
  state.dragCurrentX = null;
  state.dragButton = null;
  if ("dragCanvas" in state) {
    state.dragCanvas = null;
  }
  canvas?.classList.remove("is-panning");
}

function updateChartViewForWheel(state, event, x, plot, fullEnd) {
  const delta = normalizeChartWheelDelta(event);
  if (!delta) return false;

  const ratio = Math.max(
    0,
    Math.min(1, (x - plot.left) / Math.max(1, plot.width))
  );
  const range = getChartWheelZoomRange(
    state.viewStart,
    state.viewEnd,
    fullEnd,
    ratio,
    delta
  );

  if (range.start === state.viewStart && range.end === state.viewEnd) {
    return false;
  }

  state.viewStart = range.start;
  state.viewEnd = range.end;
  return true;
}

function getChartWheelZoomRange(
  viewStart,
  viewEnd,
  fullEnd,
  anchorRatio,
  delta
) {
  const domainEnd = Math.max(0, Number(fullEnd) || 0);
  if (domainEnd <= 0) return { start: 0, end: 0 };

  const start = Math.max(0, Math.min(Number(viewStart) || 0, domainEnd));
  const end = Math.max(start, Math.min(Number(viewEnd) || domainEnd, domainEnd));
  const fullSpan = domainEnd;
  const currentSpan = Math.max(
    Math.min(CHART_NAVIGATION_MIN_SPAN_MS, fullSpan),
    end - start
  );
  const zoomFactor = Math.exp(
    Math.max(-1000, Math.min(1000, delta)) *
      CHART_NAVIGATION_WHEEL_SENSITIVITY
  );
  const targetSpan = Math.max(
    Math.min(CHART_NAVIGATION_MIN_SPAN_MS, fullSpan),
    Math.min(fullSpan, currentSpan * zoomFactor)
  );

  if (targetSpan >= fullSpan - 0.001) {
    return { start: 0, end: domainEnd };
  }

  const ratio = Math.max(0, Math.min(1, anchorRatio));
  const anchorTime = start + currentSpan * ratio;
  let targetStart = anchorTime - targetSpan * ratio;
  targetStart = Math.max(0, Math.min(targetStart, domainEnd - targetSpan));

  return {
    start: targetStart,
    end: targetStart + targetSpan
  };
}

function getChartPanRange(viewStart, viewEnd, fullEnd, deltaX, plotWidth) {
  const domainEnd = Math.max(0, Number(fullEnd) || 0);
  const start = Math.max(0, Math.min(Number(viewStart) || 0, domainEnd));
  const end = Math.max(start, Math.min(Number(viewEnd) || domainEnd, domainEnd));
  const span = end - start;

  if (domainEnd <= 0 || span <= 0 || span >= domainEnd) {
    return { start: 0, end: domainEnd };
  }

  const shift = -(deltaX / Math.max(1, plotWidth)) * span;
  const targetStart = Math.max(0, Math.min(start + shift, domainEnd - span));

  return {
    start: targetStart,
    end: targetStart + span
  };
}

function normalizeChartWheelDelta(event) {
  let delta = Number(event.deltaY) || 0;

  if (event.deltaMode === 1) {
    delta *= 16;
  } else if (event.deltaMode === 2) {
    delta *= window.innerHeight || 800;
  }

  return delta;
}

function preventChartContextMenu(event) {
  event.preventDefault();
}
