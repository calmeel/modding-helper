// スクロールグラフのツールチップと座標変換。spreadScrollChartStateを参照する。
function showSpreadScrollTooltip(point, time) {
  const state = spreadScrollChartState;
  const tooltip = state.dom?.spreadScrollChartTooltip;
  const wrap = state.dom?.spreadScrollChartWrap;
  const assignments =
    state.dom?.spreadScrollChart?._spreadScrollVisibleAssignments ?? [];
  if (!tooltip || !wrap) return;
  const simple = !(state.dom?.spreadScrollDetailedTooltip?.checked ?? false);

  if (simple) {
    const lines = [msToTimestamp(Math.round(time))];

    for (const assignment of assignments) {
      const result = assignment.result;
      const sample = getSpreadScrollSampleAtTime(
        result.scrollSpeed?.samples,
        time
      );
      const diffName = getDifficultyNameText(result.fileName);
      lines.push(
        `${diffName}: ` +
        `${sample
          ? `${formatSpreadScrollDisplayValue(sample.pxPerSecond)} ${getSpreadScrollDisplayUnit()}`
          : "N/A"}`
      );
    }

    appendSpreadScrollSimpleDetails(lines, assignments, time);
    tooltip.classList.remove("is-dense");
    tooltip.classList.add("is-simple");
    tooltip.textContent = lines.join("\n");
    tooltip.hidden = false;
    positionSpreadScrollTooltip(tooltip, wrap, point);
    return;
  }

  const timeElement = document.createElement("div");
  timeElement.className = "spread-scroll-delta-tooltip-time";
  timeElement.textContent = msToTimestamp(Math.round(time));

  const grid = document.createElement("div");
  grid.className = "spread-scroll-delta-tooltip-grid";
  if (assignments.length >= 4) {
    grid.classList.add("is-multicolumn");
  }

  for (const assignment of assignments) {
    const result = assignment.result;
    const sample = getSpreadScrollSampleAtTime(
      result.scrollSpeed?.samples,
      time
    );
    const diffName = getDifficultyNameText(result.fileName);

    const item = document.createElement("div");
    item.className = "spread-scroll-delta-tooltip-item";

    const name = document.createElement("div");
    name.className = "spread-scroll-delta-tooltip-diff";
    name.textContent = diffName;
    name.title = diffName;

    const values = document.createElement("div");
    values.className = "spread-scroll-delta-tooltip-values";
    values.textContent = sample
      ? `${isSpreadScrollVisualBpmEnabled()
          ? `${state.t("spreadScrollVisualBpmValue")} `
          : ""}` +
        `${formatSpreadScrollDisplayValue(sample.pxPerSecond)} ` +
        `${getSpreadScrollDisplayUnit()} | ` +
        `BPM ${formatSpreadScrollTooltipNumber(sample.bpm, 3)} | ` +
        `SV ${formatSpreadScrollTooltipNumber(sample.sv, 3)} | ` +
        `SM ${formatSpreadScrollTooltipNumber(sample.sliderMultiplier, 2)}`
      : "N/A";

    item.append(name, values);
    grid.appendChild(item);
  }

  const detailLines = [];

  if (state.dom?.spreadScrollShowLimits?.checked) {
    const limits = assignments
      .map(assignment => ({
        name: getDifficultyNameText(assignment.result.fileName),
        value: getSpreadTooFastScrollRule(assignment.category)
      }))
      .filter(item => Number.isFinite(item.value));

    if (limits.length) {
      detailLines.push(state.t("spreadScrollGraphLimit"));
      for (const limit of limits) {
        detailLines.push(
          `${limit.name}: ${formatSpreadScrollDisplayValue(limit.value)} ` +
          getSpreadScrollDisplayUnit()
        );
      }
    }
  }

  if (state.dom?.spreadScrollShowRapidChanges?.checked) {
    const rapidChanges = assignments.filter(assignment =>
      (assignment.result.scrollSpeed?.rapidChanges ?? []).some(change =>
        getSpreadRapidScrollLevel(change, assignment.category) === "warn" &&
        change.fromTime <= time &&
        time < change.toTime
      )
    );

    if (rapidChanges.length) {
      if (detailLines.length) detailLines.push("");
      detailLines.push(state.t("spreadScrollGraphRapidChange"));
      for (const assignment of rapidChanges) {
        detailLines.push(getDifficultyNameText(assignment.result.fileName));
      }
    }
  }

  const children = [timeElement, grid];
  if (detailLines.length) {
    const details = document.createElement("div");
    details.className = "spread-scroll-delta-tooltip-issue";
    details.textContent = detailLines.join("\n");
    children.push(details);
  }

  tooltip.classList.toggle("is-dense", assignments.length >= 9);
  tooltip.classList.remove("is-simple");
  tooltip.replaceChildren(...children);
  tooltip.hidden = false;
  positionSpreadScrollTooltip(tooltip, wrap, point);
}

function showSpreadScrollDeltaTooltip(point, time) {
  const state = spreadScrollChartState;
  const tooltip = state.dom?.spreadScrollDeltaChartTooltip;
  const wrap = state.dom?.spreadScrollDeltaChartWrap;
  const canvas = state.dom?.spreadScrollDeltaChart;
  const assignments = canvas?._spreadScrollVisibleAssignments ?? [];
  const plot = canvas?._spreadScrollPlot;
  if (!tooltip || !wrap || !plot) return;
  const simple = !(state.dom?.spreadScrollDetailedTooltip?.checked ?? false);

  const toleranceMs =
    ((state.viewEnd - state.viewStart) / Math.max(1, plot.width)) * 9;
  const matches = assignments
    .map(assignment => {
      const change = (assignment.result.scrollSpeed?.rapidChanges ?? [])
        .filter(item =>
          Number.isFinite(item.delta) &&
          Math.abs(item.delta) > 0.01
        )
        .reduce((nearest, item) => {
          const distance = Math.abs(item.toTime - time);
          if (distance > toleranceMs) return nearest;
          if (!nearest || distance < nearest.distance) {
            return { item, distance };
          }
          return nearest;
        }, null);

      return change ? { assignment, change: change.item } : null;
    })
    .filter(Boolean);

  if (simple) {
    const lines = [msToTimestamp(Math.round(time))];

    for (const { assignment, change } of matches) {
      const diffName = getDifficultyNameText(assignment.result.fileName);
      const delta = Math.round(convertSpreadScrollDisplayValue(change.delta));
      const deltaText = delta > 0 ? `+${delta}` : String(delta);
      lines.push(
        `${diffName}: Δ ${deltaText} ${getSpreadScrollDisplayUnit()}`
      );
    }

    const issueLines = getSpreadScrollDeltaIssueTooltipLines(
      time,
      toleranceMs,
      getSpreadScrollChartResults()
    );
    if (issueLines.length) {
      lines.push("", ...issueLines);
    }

    tooltip.classList.remove("is-dense");
    tooltip.classList.add("is-simple");
    tooltip.textContent = lines.join("\n");
    tooltip.hidden = false;
    positionSpreadScrollTooltip(tooltip, wrap, point);
    return;
  }

  const timeElement = document.createElement("div");
  timeElement.className = "spread-scroll-delta-tooltip-time";
  timeElement.textContent = msToTimestamp(Math.round(time));

  const grid = document.createElement("div");
  grid.className = "spread-scroll-delta-tooltip-grid";
  if (matches.length >= 4) {
    grid.classList.add("is-multicolumn");
  }

  for (const { assignment, change } of matches) {
    const diffName = getDifficultyNameText(assignment.result.fileName);
    const delta = Math.round(convertSpreadScrollDisplayValue(change.delta));
    const deltaText = delta > 0 ? `+${delta}` : String(delta);

    const item = document.createElement("div");
    item.className = "spread-scroll-delta-tooltip-item";

    const name = document.createElement("div");
    name.className = "spread-scroll-delta-tooltip-diff";
    name.textContent = diffName;
    name.title = diffName;

    const values = document.createElement("div");
    values.className = "spread-scroll-delta-tooltip-values";
    const valueParts = [
      `${formatSpreadScrollDisplayValue(change.beforeSpeed)} → ` +
      `${formatSpreadScrollDisplayValue(change.afterSpeed)} ` +
      getSpreadScrollDisplayUnit(),
      `Δ ${deltaText} ${getSpreadScrollDisplayUnit()}`
    ];
    if (Number.isFinite(change.ratio)) {
      valueParts.push(
        `${formatSpreadScrollTooltipNumber(change.ratio, 2)}x`
      );
    }
    if (Number.isFinite(change.gapMs)) {
      valueParts.push(`${Math.round(change.gapMs)} ms`);
    }
    values.textContent = valueParts.join(" | ");

    item.append(name, values);
    grid.appendChild(item);
  }

  const issueLines = getSpreadScrollDeltaIssueTooltipLines(
    time,
    toleranceMs,
    getSpreadScrollChartResults()
  );

  const children = [timeElement, grid];
  if (issueLines.length) {
    const issue = document.createElement("div");
    issue.className = "spread-scroll-delta-tooltip-issue";
    issue.textContent = issueLines.join("\n");
    children.push(issue);
  }

  tooltip.classList.toggle("is-dense", matches.length >= 9);
  tooltip.classList.remove("is-simple");
  tooltip.replaceChildren(...children);
  tooltip.hidden = false;
  positionSpreadScrollTooltip(tooltip, wrap, point);
}

function positionSpreadScrollTooltip(tooltip, wrap, point) {
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

function appendSpreadScrollSimpleDetails(lines, assignments, time) {
  const state = spreadScrollChartState;

  if (state.dom?.spreadScrollShowLimits?.checked) {
    const limits = assignments
      .map(assignment => ({
        name: getDifficultyNameText(assignment.result.fileName),
        value: getSpreadTooFastScrollRule(assignment.category)
      }))
      .filter(item => Number.isFinite(item.value));

    if (limits.length) {
      lines.push("", state.t("spreadScrollGraphLimit"));
      for (const limit of limits) {
        lines.push(
          `${limit.name}: ${formatSpreadScrollDisplayValue(limit.value)} ` +
          getSpreadScrollDisplayUnit()
        );
      }
    }
  }

  if (state.dom?.spreadScrollShowRapidChanges?.checked) {
    const rapidChanges = assignments.filter(assignment =>
      (assignment.result.scrollSpeed?.rapidChanges ?? []).some(change =>
        getSpreadRapidScrollLevel(change, assignment.category) === "warn" &&
        change.fromTime <= time &&
        time < change.toTime
      )
    );

    if (rapidChanges.length) {
      lines.push("", state.t("spreadScrollGraphRapidChange"));
      for (const assignment of rapidChanges) {
        lines.push(getDifficultyNameText(assignment.result.fileName));
      }
    }
  }
}

function getSpreadScrollDeltaIssueTooltipLines(
  time,
  toleranceMs,
  results
) {
  const state = spreadScrollChartState;
  const issueDisplay = getSpreadScrollDeltaIssueDisplay(results);
  if (!issueDisplay.mode) return [];

  const group = issueDisplay.groups.reduce((nearest, item) => {
    const distance = Math.abs(item.time - time);
    if (distance > toleranceMs) return nearest;
    if (!nearest || distance < nearest.distance) {
      return { item, distance };
    }
    return nearest;
  }, null)?.item;

  if (!group) return [];

  const lines = [];

  if (issueDisplay.mode === "progression") {
    lines.push(state.t("spreadScrollProgressionIssue"));

    const byFileName = new Map(
      group.items.map(item => [item.fileName, item.event])
    );
    const progression = results
      .map(result => {
        const event = byFileName.get(result.fileName);
        if (!event) return null;
        return (
          `${getDifficultyNameText(result.fileName)} ` +
          formatSpreadScrollDisplayValue(event.afterSpeed)
        );
      })
      .filter(Boolean);

    if (progression.length) {
      lines.push(
        `${progression.join(" → ")} ${getSpreadScrollDisplayUnit()}`
      );
    }

    for (const issue of group.issues) {
      lines.push(
        `${getDifficultyNameText(issue.prev.fileName)} → ` +
        `${getDifficultyNameText(issue.cur.fileName)}: ` +
        `${formatSpreadScrollDirection(issue.prevDirection)} → ` +
        `${formatSpreadScrollDirection(issue.curDirection)}`
      );
    }
    return lines;
  }

  lines.push(state.t("spreadScrollConsistencyIssue"));
  for (const issue of group.issues) {
    const lowerName = getDifficultyNameText(issue.lower.fileName);
    const higherName = getDifficultyNameText(issue.higher.fileName);
    const lowerDelta = formatSpreadScrollSignedDelta(
      convertSpreadScrollDisplayValue(issue.lower.event.delta)
    );
    const higherDelta = formatSpreadScrollSignedDelta(
      convertSpreadScrollDisplayValue(issue.higher.event.delta)
    );
    const reason = issue.type === "directionMismatch"
      ? state.t("spreadScrollOppositeDirection")
      : state.t("spreadScrollStrongerLowerDiff");

    lines.push(
      `${lowerName} ${lowerDelta} / ${higherName} ${higherDelta} ` +
      getSpreadScrollDisplayUnit()
    );
    lines.push(reason);
  }

  return lines;
}

function formatSpreadScrollDirection(direction) {
  const t = spreadScrollChartState.t;
  if (direction === "up") return t("spreadScrollDirectionUp");
  if (direction === "down") return t("spreadScrollDirectionDown");
  return t("spreadScrollDirectionFlat");
}

function formatSpreadScrollSignedDelta(value) {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function hideSpreadScrollTooltips() {
  const state = spreadScrollChartState;
  const tooltips = [
    state.dom?.spreadScrollChartTooltip,
    state.dom?.spreadScrollDeltaChartTooltip
  ];

  for (const tooltip of tooltips) {
    if (tooltip) tooltip.hidden = true;
  }
}

function formatSpreadScrollTooltipNumber(value, maximumFractionDigits) {
  if (!Number.isFinite(value)) return "N/A";
  return Number(value.toFixed(maximumFractionDigits)).toString();
}

function getSpreadScrollPointerPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isSpreadScrollPointInPlot(point, plot) {
  return (
    point.x >= plot.left &&
    point.x <= plot.right &&
    point.y >= plot.top &&
    point.y <= plot.bottom
  );
}

function clampSpreadScrollX(x, plot) {
  return Math.max(plot.left, Math.min(plot.right, x));
}

function spreadScrollXToTime(x, plot) {
  const state = spreadScrollChartState;
  const ratio =
    (clampSpreadScrollX(x, plot) - plot.left) / Math.max(1, plot.width);
  return state.viewStart + ratio * (state.viewEnd - state.viewStart);
}
