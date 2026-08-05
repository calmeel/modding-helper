function formatFileCheckResult(results, t) {
  if (!results || !results.length) return t("noOsuFiles");

  const sortedResults = sortResultsForDisplay(results);
  const lines = [formatSectionTitle(t("osuFileNameCheckTitle"))];
  const issues = sortedResults.filter(result => !result.matches);

  lines.push(formatOsuFileNameSummaryTable(sortedResults, t));
  lines.push("");
  lines.push(formatSeparator());

  if (!issues.length) {
    lines.push(t("osuFileNameNoIssues"));
    return lines.join("\n");
  }

  for (const result of issues) {
    lines.push(`<span class="result-warn">${escapeHtml(t("osuFileNameMismatch"))}</span>`);
    lines.push(`${escapeHtml(t("osuFileNameActual"))}: ${escapeHtml(result.actualFileName)}`);

    if (result.expectedFileName) {
      lines.push(`${escapeHtml(t("osuFileNameExpected"))}: ${escapeHtml(result.expectedFileName)}`);
    } else {
      const fields = result.missingFields
        .map(field => t(`osuFileNameField_${field}`))
        .join(", ");
      lines.push(`${escapeHtml(t("osuFileNameMetadataMissing"))}: ${escapeHtml(fields)}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatOsuFileNameSummaryTable(results, t) {
  const rows = results.map(result => ({
    result,
    diff: getDifficultyNameText(result.fileName),
    fileName: result.actualFileName,
    status: result.matches ? t("sourceOk") : t("warning")
  }));
  const headers = {
    diff: "Diff",
    fileName: t("osuFileNameColumn"),
    status: t("status")
  };
  const widths = {
    diff: Math.max(4, visibleWidth(headers.diff), ...rows.map(row => visibleWidth(row.diff))),
    fileName: Math.max(14, visibleWidth(headers.fileName), ...rows.map(row => visibleWidth(row.fileName))),
    status: Math.max(6, visibleWidth(headers.status), ...rows.map(row => visibleWidth(row.status)))
  };
  const lines = [
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padEndVisual(headers.fileName, widths.fileName)} | ` +
    `${padEndVisual(headers.status, widths.status)}`,
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.fileName)}-+-` +
    `${"-".repeat(widths.status)}`
  ];

  for (const row of rows) {
    const diffCell = escapeHtml(padEndVisual(row.diff, widths.diff));
    const fileNameCell = escapeHtml(padEndVisual(row.fileName, widths.fileName));
    const statusCell = escapeHtml(padEndVisual(row.status, widths.status));
    const formattedFileName = row.result.matches
      ? fileNameCell
      : `<span class="result-warn">${fileNameCell}</span>`;
    const formattedStatus = row.result.matches
      ? `<span class="ok">${statusCell}</span>`
      : `<span class="result-warn">${statusCell}</span>`;

    lines.push(
      `${diffCell} | ${formattedFileName} | ${formattedStatus}`
    );
  }

  return lines.join("\n");
}
