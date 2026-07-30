/** SV volume */
function formatMultipleSvVolumeResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatSortedResults(results, formatSvVolumeResult, t);
}

function formatSvVolumeResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.results.length) {
    lines.push(t("noSvVolumeIssues"));
    return lines.join("\n");
  }

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...result.results.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const hitTexts = result.results.map(item =>
    `hitobject ${msToTimestamp(item.hitTime)}`
  );

  const hitWidth = Math.max(
    visibleWidth("HitObject"),
    ...hitTexts.map(text => visibleWidth(text))
  );

  const diffTexts = result.results.map(item => {
    const sign = item.diff >= 0 ? "+" : "-";
    return `${sign}${Math.abs(item.diff)} ms`;
  });

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...diffTexts.map(text => visibleWidth(text))
  );

  const volumeTexts = result.results.map(item =>
    `vol ${item.oldVolume} -> ${item.newVolume}`
  );

  const volumeWidth = Math.max(
    visibleWidth("Volume"),
    ...volumeTexts.map(text => visibleWidth(text))
  );

  for (let i = 0; i < result.results.length; i++) {
    const item = result.results[i];

    const timeText = formatTimestampLink(item.time);
    const plainTime = msToTimestamp(item.time);

    const hitText = hitTexts[i];
    const diffText = diffTexts[i];
    const volumeText = volumeTexts[i];

    const timePadding =
      " ".repeat(timeWidth - visibleWidth(plainTime));

    lines.push(
      `${timeText}${timePadding} | ` +
      `${padEndVisual(hitText, hitWidth)} | ` +
      `${padEndVisual(diffText, diffWidth)} | ` +
      `${padEndVisual(volumeText, volumeWidth)}`
    );
  }

  return lines.join("\n");
}
