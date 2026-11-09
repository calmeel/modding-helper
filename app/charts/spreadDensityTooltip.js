// 密度比較グラフの小節グループ、逆転情報とツールチップの表示位置。
function showSpreadDensityTooltip(point, time) {
  const state = spreadDensityChartState;
  const tooltip = state.dom?.spreadDensityChartTooltip;
  const wrap = state.dom?.spreadDensityChartWrap;
  const canvas = state.dom?.spreadDensityChart;
  const visibleResults = canvas?._spreadDensityVisibleResults ?? [];
  if (!tooltip || !wrap) return;

  const group = findSpreadDensityGroupAtTime(
    createSpreadDensityComparisonGroups(getSpreadDensityChartResults()),
    time
  );
  if (!group) {
    hideSpreadDensityTooltip();
    return;
  }

  const lines = [
    `${msToTimestamp(group.start)} - ${msToTimestamp(group.end)}`
  ];

  for (const result of visibleResults) {
    const measure = group.measuresByFileName.get(result.fileName);
    lines.push(
      `${getDifficultyNameText(result.fileName)}: ` +
      `${measure ? measure.noteCount : "-"} ` +
      state.t("spreadDensityGraphNotes")
    );
  }

  const issueGroup = (canvas?._spreadDensityIssueGroups ?? []).find(item =>
    Math.abs(item.start - group.start) <=
      SPREAD_DENSITY_CHART_GROUP_TOLERANCE_MS
  );
  if (issueGroup) {
    lines.push("", state.t("spreadDensityInversions"));
    for (const issue of issueGroup.issues) {
      lines.push(
        `${getDifficultyNameText(issue.lower.fileName)} ` +
        `${issue.lower.count} > ` +
        `${getDifficultyNameText(issue.higher.fileName)} ` +
        `${issue.higher.count}`
      );
    }
  }

  tooltip.classList.add("is-simple");
  tooltip.textContent = lines.join("\n");
  tooltip.hidden = false;
  positionSpreadDensityTooltip(tooltip, wrap, point);
}

function findSpreadDensityGroupAtTime(groups, time) {
  const containing = groups.find(group =>
    time >= group.start &&
    time < group.end
  );
  if (containing) return containing;

  return groups.reduce((nearest, group) => {
    const distance = Math.min(
      Math.abs(time - group.start),
      Math.abs(time - group.end)
    );
    if (!nearest || distance < nearest.distance) {
      return { group, distance };
    }
    return nearest;
  }, null)?.group ?? null;
}

function positionSpreadDensityTooltip(tooltip, wrap, point) {
  const gap = 14;
  const edgePadding = 8;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  let left = point.x + gap;
  let top = point.y + gap;

  if (left + tooltipWidth > wrap.clientWidth - edgePadding) {
    left = point.x - tooltipWidth - gap;
  }
  if (top + tooltipHeight > wrap.clientHeight - edgePadding) {
    top = point.y - tooltipHeight - gap;
  }

  tooltip.style.left =
    `${Math.max(edgePadding, Math.min(left, wrap.clientWidth - tooltipWidth - edgePadding))}px`;
  tooltip.style.top =
    `${Math.max(edgePadding, Math.min(top, wrap.clientHeight - tooltipHeight - edgePadding))}px`;
}

function hideSpreadDensityTooltip() {
  const tooltip = spreadDensityChartState.dom?.spreadDensityChartTooltip;
  if (tooltip) tooltip.hidden = true;
}
