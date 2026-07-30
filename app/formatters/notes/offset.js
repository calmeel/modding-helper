/** 1ms Offset系の表示関数 */
function formatMultipleShiftResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatSortedResults(results, formatShiftResult, t);
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
    const objectText = getOffsetObjectTypeLabel(item, t);
    const targetText =
      item.target === "sliderTail"
        ? ` | ${t("sliderTail")}`
        : item.target === "spinnerTail"
          ? ` | ${t("spinnerTail")}`
          : "";
    const compatibilityKey = {
      stableOnly: "offsetStableOnly",
      lazerOnly: "offsetLazerOnly",
      stableWheelOnly: "offsetStableWheelOnly",
      lazerWheelOnly: "offsetLazerWheelOnly"
    }[item.compatibility];
    const compatibilityText = compatibilityKey
      ? t(compatibilityKey).replace("{diff}", `${sign}${item.diff} ms`)
      : null;

    lines.push(
      `<span${classAttribute}>${formatTimestampLink(item.time)} | ` +
      `${escapeHtml(objectText)}${targetText} ` +
      `${compatibilityText
        ? escapeHtml(compatibilityText)
        : `${escapeHtml(t("offsetUnsnappedBy"))} ${sign}${item.diff} ms`} ` +
      `[1/${item.snap} ${escapeHtml(t("snap"))}]</span>`
    );
  }

  return lines;
}

function getOffsetObjectTypeLabel(item, t) {
  if (item.objectType === "slider") return t("offsetObjectSlider");
  if (item.objectType === "spinner") return t("offsetObjectSpinner");
  return t("offsetObjectCircle");
}
