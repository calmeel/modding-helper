/** Kiai Snap系の表示関数 */
function formatMultipleKiaiSnapResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatSortedResults(results, formatKiaiSnapResult, t);
}

function formatKiaiSnapResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  const wheelResults = result.wheelResults ?? [];
  if (wheelResults.length) {
    lines.push(`【${t("offsetResnapHeading")}】`);
  }
  if (!result.results.length) {
    lines.push(t("noKiaiSnap"));
  } else {
    lines.push(...formatKiaiSnapItems(result.results, t));
  }

  if (wheelResults.length) {
    lines.push("", `【${t("offsetWheelHeading")}】`);
    lines.push(...formatKiaiSnapItems(wheelResults, t));
  }
  return lines.join("\n");
}

function formatKiaiSnapItems(items, t) {
  const lines = [];
  // 列幅計算
  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...items.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const typeTexts = items.map(item => `Kiai ${item.type}`);
  const typeWidth = Math.max(
    visibleWidth("Type"),
    ...typeTexts.map(text => visibleWidth(text))
  );

  const snapTexts = items.map(item => item.snap ? `${item.snap} snap` : "-");
  const snapWidth = Math.max(
    visibleWidth("Snap"),
    ...snapTexts.map(text => visibleWidth(text))
  );

  const diffTexts = items.map(item =>
    item.diff === null
      ? "-"
      : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`
  );

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...diffTexts.map(text => visibleWidth(text))
  );

  // 本体
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const timeText = formatTimestampLink(item.time);

    const plainTime = msToTimestamp(item.time);

    const typeText = `Kiai ${item.type}`;
    const snapText = snapTexts[i];

    const diffText =
      item.diff === null
        ? "-"
        : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`;

    const timePadding =
      " ".repeat(timeWidth - visibleWidth(plainTime));

    const note = item.timingUnavailable ? t("timingSnapUnavailable") : formatSnapCompatibility(item, t);
    const supplemental = formatSnapSupplemental(item, t);
    const line =
      `${timeText}${timePadding} | ` +
      `${padEndVisual(typeText, typeWidth)} | ` +
      `${padEndVisual(snapText, snapWidth)} | ` +
      `${padEndVisual(diffText, diffWidth)}` +
      (note ? ` | ${escapeHtml(note)}` : "") +
      (supplemental ? ` ${escapeHtml(supplemental)}` : "");

    const className = item.level === "error" ? "result-error"
      : item.level === "warn" ? "result-warn" : "";
    lines.push(`<span${className ? ` class="${className}"` : ""}>${line}</span>`);
  }

  return lines;
}
