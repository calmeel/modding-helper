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

  if (!result.results.length) {
    lines.push(t("noKiaiSnap"));
    return lines.join("\n");
  }

  // 列幅計算
  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...result.results.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const typeTexts = result.results.map(item => `Kiai ${item.type}`);
  const typeWidth = Math.max(
    visibleWidth("Type"),
    ...typeTexts.map(text => visibleWidth(text))
  );

  const snapTexts = result.results.map(item => `${item.snap} snap`);
  const snapWidth = Math.max(
    visibleWidth("Snap"),
    ...snapTexts.map(text => visibleWidth(text))
  );

  const diffTexts = result.results.map(item =>
    item.diff === null
      ? "-"
      : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`
  );

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...diffTexts.map(text => visibleWidth(text))
  );

  // 本体
  for (let i = 0; i < result.results.length; i++) {
    const item = result.results[i];

    const timeText = formatTimestampLink(item.time);

    const plainTime = msToTimestamp(item.time);

    const typeText = `Kiai ${item.type}`;
    const snapText = `${item.snap} snap`;

    const diffText =
      item.diff === null
        ? "-"
        : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`;

    const timePadding =
      " ".repeat(timeWidth - visibleWidth(plainTime));

    const line =
      `${timeText}${timePadding} | ` +
      `${padEndVisual(typeText, typeWidth)} | ` +
      `${padEndVisual(snapText, snapWidth)} | ` +
      `${padEndVisual(diffText, diffWidth)}`;

    const isError =
      item.snap === "unknown" ||
      item.diff !== 0;

    lines.push(
      isError
        ? `<span class="result-error">${line}</span>`
        : `<span class="result-warn">${line}</span>`
    );
  }

  return lines.join("\n");
}
