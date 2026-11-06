/** 1ms Offset系の表示関数 */
function formatMultipleShiftResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const summary = formatOffsetSnapSummary(results, t);
  const details = formatSortedResults(results, formatShiftResult, t);
  return summary ? [summary, formatSeparator(), details].join("\n\n") : details;
}

function formatOffsetSnapSummary(results, t) {
  const headers = ["offsetSummaryDifficulty", "offsetSummarySnapped",
    "offsetSummaryShifted", "offsetSummaryUnknown", "offsetSummaryAction"];
  const rows = sortResultsForDisplay(results).map(result => {
    const summary = result.summary;
    if (!summary) return null;
    const actionKey = {
      snapped: "offsetSummaryAllSnapped",
      resnap: summary.usedSnaps.length === 1
        ? "offsetSummaryResnapSingle" : "offsetSummaryResnap",
      unknown: "offsetSummaryUnknownAction",
      unavailable: "offsetSummaryUnavailable",
      empty: "offsetSummaryEmpty",
      review: "offsetSummaryReview"
    }[summary.status];
    let action = t(actionKey)
      .replace("{snaps}", summary.usedSnaps.map(snap => `1/${snap}`).join(", "))
      .replace("{snap}", `1/${summary.resnapDivisor}`);
    if (summary.compatibility) action += " " + t("offsetSummaryCompatibility");
    return {
      cells: [getDifficultyNameText(result), String(summary.snapped),
        String(summary.shifted), String(summary.unknown), action],
      actionClass: ["unknown", "unavailable", "review"].includes(summary.status)
        ? "result-error" : summary.status === "resnap" ? "result-warn" : ""
    };
  }).filter(Boolean);
  if (!rows.length) return "";
  const labels = headers.map(key => t(key));
  const widths = labels.map((label, index) => Math.max(
    visibleWidth(label),
    ...rows.map(row => index === 4 ? 0 : visibleWidth(row.cells[index]))
  ));
  const formatRow = (row, isHeader = false, actionClass = "") => row.map((cell, index) => {
    const padded = index === 0 ? padEndVisual(cell, widths[index])
      : index < 4 ? padStartVisual(cell, widths[index]) : cell;
    const text = escapeHtml(padded);
    if (index === 4 && actionClass) return `<span class="${actionClass}">${text}</span>`;
    if (!isHeader && (index === 2 || index === 3) && Number(cell) > 0) {
      const className = index === 2 ? "result-warn" : "result-error";
      return `${" ".repeat(padded.length - cell.length)}<span class="${className}">${escapeHtml(cell)}</span>`;
    }
    return index === 0 && !isHeader ? `<span class="diff-name">${text}</span>` : text;
  }).join(" | ");
  return [
    formatRow(labels, true),
    widths.map(width => "-".repeat(width)).join("-+-"),
    ...rows.map(row => formatRow(row.cells, false, row.actionClass))
  ].join("\n");
}

function formatShiftResult(result, t) {
  const lines = [];
  const wheelResults = result.wheelResults || [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.results.length && !wheelResults.length) {
    lines.push(t("noOffset"));
    return lines.join("\n");
  }

  if (!wheelResults.length) {
    lines.push(...formatShiftItems(result.results, t));
    return lines.join("\n");
  }

  lines.push(`【${t("offsetResnapHeading")}】`);

  if (!result.results.length) {
    lines.push(t("noOffsetResnap"));
  } else {
    lines.push(...formatShiftItems(result.results, t));
  }

  lines.push("");
  lines.push(`【${t("offsetWheelHeading")}】`);
  lines.push(...formatShiftItems(wheelResults, t));

  return lines.join("\n");
}

function formatShiftItems(items, t) {
  const lines = [];

  for (const item of items) {
    const sign = item.diff > 0 ? "+" : "";
    const className =
      item.level === "warn"
        ? "result-warn"
        : item.level === "error"
          ? "result-error"
          : "";
    const classAttribute = className ? ` class="${className}"` : "";
    const objectText =
      item.target === "sliderTail"
        ? t("sliderTail")
        : item.target === "spinnerTail"
          ? t("spinnerTail")
          : getOffsetObjectTypeLabel(item, t);
    const compatibilityKey = {
      stableOnly: "offsetStableOnly",
      lazerOnly: "offsetLazerOnly",
      stableWheelOnly: "offsetStableWheelOnly",
      lazerWheelOnly: "offsetLazerWheelOnly"
    }[item.compatibility];
    const compatibilityText = compatibilityKey
      ? t(compatibilityKey).replace("{diff}", `${sign}${item.diff} ms`)
      : null;
    const supplementalText = (item.supplementalSnaps || []).map(match => {
      const key = match.diff === 0 ? "offsetSupplementalExact" : "offsetSupplementalNear";
      return t(key)
        .replace("{snap}", `1/${match.snap}`)
        .replace("{diff}", `${match.diff > 0 ? "+" : ""}${match.diff} ms`);
    }).join(", ");

    lines.push(
      `<span${classAttribute}>${formatTimestampLink(item.time)} | ` +
      `${escapeHtml(objectText)} ` +
      `${compatibilityText
        ? escapeHtml(compatibilityText)
        : `${escapeHtml(t("offsetUnsnappedBy"))} ${sign}${item.diff} ms`} ` +
      `[1/${item.snap} ${escapeHtml(t("snap"))}]` +
      (supplementalText
        ? ` ${escapeHtml(t("offsetSupplementalNote").replace("{matches}", supplementalText))}`
        : "") +
      `</span>`
    );
  }

  return lines;
}

function getOffsetObjectTypeLabel(item, t) {
  if (item.objectType === "slider") return t("offsetObjectSlider");
  if (item.objectType === "spinner") return t("offsetObjectSpinner");
  return t("offsetObjectCircle");
}
