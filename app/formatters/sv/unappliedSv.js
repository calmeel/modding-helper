function formatMultipleUnappliedSvResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const lines = [];

  lines.push(formatSectionTitle(t("unappliedSvNoteTitle")));
  lines.push(...formatUnappliedSvResultsByDiff(
    sortedResults,
    "noteIssues",
    "unappliedSvNoNoteIssues",
    t
  ));

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("unappliedSvBarlineTitle")));
  lines.push(...formatUnappliedSvResultsByDiff(
    sortedResults,
    "barlineIssues",
    "unappliedSvNoBarlineIssues",
    t
  ));

  return lines.join("\n").trimEnd();
}

function formatUnappliedSvResultsByDiff(results, issueKey, noIssueKey, t) {
  const lines = [];

  for (const result of results) {
    lines.push(getDifficultyName(result));

    const issues = result[issueKey] ?? [];
    if (!issues.length) {
      lines.push(t(noIssueKey));
    } else {
      for (const issue of issues) {
        lines.push(formatUnappliedSvIssueLine(issue, t));
      }
    }

    lines.push("");
  }

  return lines;
}

function formatUnappliedSvIssueLine(issue, t) {
  const targetSvLabel =
    issue.targetType === "barline"
      ? t("unappliedSvBarlineSvLabel")
      : t("unappliedSvNoteSvLabel");
  const targetSv = getUnappliedSvNumericValue(issue.targetGreenLine);
  const followingSv = getUnappliedSvNumericValue(issue.greenLine);
  const targetSvText = `${targetSvLabel} x${formatUnappliedSvNumber(targetSv)}`;
  const followingSvText = `${t("unappliedSvFollowingSvLabel")} x${formatUnappliedSvNumber(followingSv)}`;
  const deltaText = `${t("unappliedSvDeltaLabel")} ${formatUnappliedSvDelta(followingSv - targetSv)}`;
  const svText = `${targetSvText} -> ${followingSvText} (${deltaText})`;
  const offsetText = `+${formatBarlinePreciseNumber(issue.offset)} ms`;
  const clientScope = issue.targetType === "barline"
    ? formatBarlineClientScope(issue, t)
    : "";
  const targetTimeLink = issue.targetType === "barline"
    ? formatBarlineTimestampLink(issue.targetTime)
    : formatTimestampLink(issue.targetTime);

  return `<span class="result-warn">` +
    `${clientScope}${targetTimeLink} -> ` +
    `${formatTimestampLink(issue.greenTime)} | ` +
    `${offsetText} | ` +
    `${escapeHtml(svText)}` +
    `</span>`;
}

function getUnappliedSvNumericValue(greenLine) {
  if (!greenLine) return 1;
  return greenLine.beatLength < 0 ? -100 / greenLine.beatLength : 1;
}

function formatUnappliedSvNumber(value) {
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 1000) / 1000).toString();
}

function formatUnappliedSvDelta(value) {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = Math.round(value * 1000) / 1000;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}
