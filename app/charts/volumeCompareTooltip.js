// 音量比較グラフのツールチップ内容と表示位置。
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
