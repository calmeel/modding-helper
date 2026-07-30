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

  const allItems = result.groups.flatMap(group => group.items);

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...allItems.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const svTexts = allItems.map(item => `SV x${formatSvValue(item.beatLength)}`);
  const svWidth = Math.max(
    visibleWidth("SV"),
    ...svTexts.map(text => visibleWidth(text))
  );

  const volumeTexts = allItems.map(item => `vol ${item.volume}`);
  const volumeWidth = Math.max(
    visibleWidth("Volume"),
    ...volumeTexts.map(text => visibleWidth(text))
  );

  for (const group of result.groups) {
    for (const item of group.items) {
      const timeText = formatTimestampLink(item.time);
      const plainTime = msToTimestamp(item.time);

      const svText = `SV x${formatSvValue(item.beatLength)}`;
      const volumeText = `vol ${item.volume}`;

      const timePadding =
        " ".repeat(timeWidth - visibleWidth(plainTime));

      lines.push(
        `${timeText}${timePadding} | ` +
        `${padEndVisual(svText, svWidth)} | ` +
        `${padEndVisual(volumeText, volumeWidth)}`
      );
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
