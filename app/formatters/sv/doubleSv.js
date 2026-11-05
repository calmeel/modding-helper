/** Double SV系の表示関数 */
function formatMultipleDoubleSvResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatSortedResults(results, formatDoubleSvResult, t);
}

function formatDoubleSvResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.groups.length) {
    lines.push(t("noDoubleSv"));
    return lines.join("\n");
  }

  const rowGroups = result.groups.map(group => {
    const counts = new Map();
    for (const item of group.items) {
      counts.set(item.time, (counts.get(item.time) ?? 0) + 1);
    }
    return group.items.map(item => ({
      time: item.time,
      count: counts.get(item.time),
      svText: `SV x${formatSvValue(item.beatLength)}`,
      volumeText: `vol ${item.volume}`
    }));
  });
  const allItems = rowGroups.flat();

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...allItems.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const svTexts = allItems.map(item => item.svText);
  const svWidth = Math.max(
    visibleWidth("SV"),
    ...svTexts.map(text => visibleWidth(text))
  );

  const volumeTexts = allItems.map(item => item.volumeText);
  const volumeWidth = Math.max(
    visibleWidth("Volume"),
    ...volumeTexts.map(text => visibleWidth(text))
  );

  for (const rows of rowGroups) {
    for (const item of rows) {
      const timeText = formatTimestampLink(item.time);
      const plainTime = msToTimestamp(item.time);

      const svText = item.svText;
      const volumeText = item.volumeText;
      const message = item.count > 1
        ? ` | ${escapeHtml(t("doubleSvSameTime").replace("{count}", String(item.count)))}`
        : "";

      const timePadding =
        " ".repeat(timeWidth - visibleWidth(plainTime));

      lines.push(
        `<span class="${item.count > 1 ? "result-error" : "result-warn"}">` +
        `${timeText}${timePadding} | ` +
        `${padEndVisual(svText, svWidth)} | ` +
        `${padEndVisual(volumeText, volumeWidth)}${message}</span>`
      );
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
