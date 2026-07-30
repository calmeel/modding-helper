/** volume比較 */
function formatVolumeCompareResult(result, t) {
  const lines = [];

  if (!result) {
    return t("noFileLoaded");
  }

  if (result.needTwoDiffs) {
    lines.push(t("needTwoDiffs"));
    return lines.join("\n");
  }

  if (!result.results.length) {
    lines.push(t("noVolumeCompareMismatch"));
    return lines.join("\n");
  }

  const allStates = result.results.flatMap(item => item.states ?? []);
  const sortedStates = sortResultsForDisplay(allStates);

  const uniqueFileNames = [];
  for (const state of sortedStates) {
    if (!uniqueFileNames.includes(state.fileName)) {
      uniqueFileNames.push(state.fileName);
    }
  }

  const diffHeaders = uniqueFileNames.map(fileName => ({
    fileName,
    plain: getDifficultyNameText(fileName),
    html: getDifficultyName(fileName)
  }));

  const rows = result.results.map(item => {
    const timePlain =
      `${msToTimestamp(item.start)} - ${msToTimestamp(item.end)}`;

    const timeHtml =
      `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)}`;

    const diffText = `diff ${item.diff}%`;

    const values = diffHeaders.map(header => {
      const state = item.states.find(s => s.fileName === header.fileName);
      return state?.volume === null || state?.volume === undefined
        ? "N/A"
        : `${state.volume}%`;
    });

    return {
      timePlain,
      timeHtml,
      diffText,
      values
    };
  });

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...rows.map(row => visibleWidth(row.timePlain))
  );

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...rows.map(row => visibleWidth(row.diffText))
  );

  const colWidths = diffHeaders.map((header, index) => {
    let maxWidth = visibleWidth(header.plain);

    for (const row of rows) {
      maxWidth = Math.max(maxWidth, visibleWidth(row.values[index]));
    }

    return Math.max(maxWidth, 3);
  });

  lines.push(
    `${padEndVisual("Time", timeWidth)} | ` +
    `${padEndVisual("Diff", diffWidth)} | ` +
    diffHeaders.map((header, index) => {
      const padding = " ".repeat(colWidths[index] - visibleWidth(header.plain));
      return header.html + padding;
    }).join(" | ")
  );

  lines.push(
    `${"-".repeat(timeWidth)}-+-` +
    `${"-".repeat(diffWidth)}-+-` +
    colWidths.map(width => "-".repeat(width)).join("-+-")
  );

  for (const row of rows) {
    const timePadding =
      " ".repeat(timeWidth - visibleWidth(row.timePlain));

    lines.push(
      `${row.timeHtml}${timePadding} | ` +
      `${padEndVisual(row.diffText, diffWidth)} | ` +
      row.values.map((value, index) =>
        padEndVisual(value, colWidths[index])
      ).join(" | ")
    );
  }

  return lines.join("\n");
}
