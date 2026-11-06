function formatMultipleCoordinateResults(results, t) {
  if (!results.length) return t("noOsuFiles");

  const sorted = sortResultsForDisplay(results);
  const diffWidth = Math.max(10, ...sorted.map(result =>
    visibleWidth(getDifficultyNameText(result.fileName))
  ));
  const centerHeader = t("coordinateCenter");
  const otherHeader = t("coordinateOther");
  const centerWidth = Math.max(12, visibleWidth(centerHeader));
  const otherWidth = Math.max(12, visibleWidth(otherHeader));
  const lines = [
    `${padEndVisual("Diff", diffWidth)} | ${padStartVisual(centerHeader, centerWidth)} | ${padStartVisual(otherHeader, otherWidth)}`,
    `${"-".repeat(diffWidth)}-+-${"-".repeat(centerWidth)}-+-${"-".repeat(otherWidth)}`
  ];

  for (const result of sorted) {
    const padding = " ".repeat(diffWidth - visibleWidth(getDifficultyNameText(result.fileName)));
    lines.push(
      `${getDifficultyName(result.fileName)}${padding} | ` +
      `${padStartVisual(result.counts.center, centerWidth)} | ` +
      `${formatWarningCount(result.counts.other, otherWidth, true)}`
    );
  }

  lines.push("", formatSeparator(), "");
  for (const result of sorted) {
    lines.push(getDifficultyName(result.fileName), "");
    if (!result.issues.length) {
      lines.push(escapeHtml(t("coordinateNoIssues")));
    } else {
      for (const item of result.issues) {
        const label = t(item.objectType === "slider" ? "coordinateSlider" : "coordinateNote");
        lines.push(
          `<span class="result-warn">${formatTimestampLink(item.time)} | ` +
          `${escapeHtml(label)} | X=${item.x} / Y=${item.y}</span>`
        );
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
