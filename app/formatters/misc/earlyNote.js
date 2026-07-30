/** プチフリ */
function formatMultipleEarlyNoteResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const lines = [];

  lines.push(formatEarlyNoteSummaryTable(sortedResults, t));

  const issueResults = sortedResults.filter(result =>
    result.level === "warn" || result.level === "error"
  );

  lines.push("");
  lines.push(formatSeparator());

  if (!issueResults.length) {
    lines.push(t("noEarlyNoteIssues"));
    return lines.join("\n");
  }

  lines.push(formatSectionTitle(t("earlyNoteIssueDetails")));
  lines.push("");

  lines.push(
    issueResults
      .map(result => formatEarlyNoteIssueDetail(result, t))
      .join("\n\n")
  );

  return lines.join("\n").trimEnd();
}

function formatEarlyNoteSummaryTable(results, t) {
  const rows = results.map(result => {
    const diff = getDifficultyNameText(result.fileName);

    const firstNote =
      result.firstHitTime === null
        ? "N/A"
        : msToTimestamp(result.firstHitTime);

    const bpm =
      result.bpm === null
        ? "N/A"
        : result.bpm.toFixed(3);

    const sv =
      result.sv === null
        ? "N/A"
        : result.sv.toFixed(3);

    const visibleTime =
      result.visibleTime === null
        ? "N/A"
        : `${Math.round(result.visibleTime)} ms`;

    const position =
      result.positionPercent === null
        ? "N/A"
        : `${result.positionPercent.toFixed(1)}%`;

    const status =
      result.level === "error"
        ? "Error"
        : result.level === "warn"
          ? "Warning"
          : "OK";

    return {
      result,
      diff,
      firstNote,
      bpm,
      sv,
      visibleTime,
      position,
      status
    };
  });

  const headers = {
    diff: "Diff",
    firstNote: "First Note",
    bpm: "BPM",
    sv: "SV",
    visibleTime: "Visible",
    position: "Remain",
    status: "Status"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    firstNote: Math.max(10, visibleWidth(headers.firstNote), ...rows.map(r => visibleWidth(r.firstNote))),
    bpm: Math.max(7, visibleWidth(headers.bpm), ...rows.map(r => visibleWidth(r.bpm))),
    sv: Math.max(6, visibleWidth(headers.sv), ...rows.map(r => visibleWidth(r.sv))),
    visibleTime: Math.max(10, visibleWidth(headers.visibleTime), ...rows.map(r => visibleWidth(r.visibleTime))),
    position: Math.max(10, visibleWidth(headers.position), ...rows.map(r => visibleWidth(r.position))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.status)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.firstNote, widths.firstNote)} | ` +
    `${padStartVisual(headers.bpm, widths.bpm)} | ` +
    `${padStartVisual(headers.sv, widths.sv)} | ` +
    `${padStartVisual(headers.visibleTime, widths.visibleTime)} | ` +
    `${padStartVisual(headers.position, widths.position)} | ` +
    `${padStartVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.firstNote)}-+-` +
    `${"-".repeat(widths.bpm)}-+-` +
    `${"-".repeat(widths.sv)}-+-` +
    `${"-".repeat(widths.visibleTime)}-+-` +
    `${"-".repeat(widths.position)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const diffText =
      getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const statusPadded = padStartVisual(row.status, widths.status);

    const statusText =
      row.result.level === "error"
        ? `<span class="result-error">${escapeHtml(statusPadded)}</span>`
        : row.result.level === "warn"
          ? `<span class="result-warn">${escapeHtml(statusPadded)}</span>`
          : `<span class="ok">${escapeHtml(statusPadded)}</span>`;

    lines.push(
      `${diffText} | ` +
      `${padStartVisual(row.firstNote, widths.firstNote)} | ` +
      `${padStartVisual(row.bpm, widths.bpm)} | ` +
      `${padStartVisual(row.sv, widths.sv)} | ` +
      `${padStartVisual(row.visibleTime, widths.visibleTime)} | ` +
      `${padStartVisual(row.position, widths.position)} | ` +
      `${statusText}`
    );
  }

  return lines.join("\n");
}

function formatEarlyNoteIssueDetail(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  const cls =
    result.level === "error"
      ? "result-error"
      : "result-warn";

  lines.push(`${t("earlyNoteFirstNote")}: ${formatTimestampLink(result.firstHitTime)}`);

  if (result.reason === "firstNoteBeforeFirstRedLine") {
    lines.push(
      `<span class="${cls}">${escapeHtml(t("earlyNoteBeforeFirstRedLine"))}</span>`
    );
    lines.push(`BPM: N/A`);
    lines.push(`SV: N/A`);
    lines.push(`${t("earlyNoteEstimatedVisibleTime")}: N/A`);
    lines.push(`${t("earlyNotePosition")}: N/A`);
    lines.push("");
    lines.push(
      `<span class="${cls}">${escapeHtml(t("earlyNoteRecommendation"))}</span>`
    );

    return lines.join("\n");
  }

  lines.push(`${t("earlyNoteBpm")}: ${result.bpm === null ? "N/A" : result.bpm.toFixed(3)}`);
  lines.push(`${t("earlyNoteSv")}: ${result.sv === null ? "N/A" : result.sv.toFixed(3)}`);
  lines.push(`${t("earlyNoteEstimatedVisibleTime")}: ${result.visibleTime === null ? "N/A" : `${Math.round(result.visibleTime)} ms`}`);

  const positionText =
    result.positionPercent === null
      ? "N/A"
      : `${t("earlyNotePositionSuffix")} ${result.positionPercent.toFixed(1)}%`;

  lines.push(
    `<span class="${cls}">${t("earlyNotePosition")}: ${positionText}</span>`
  );

  lines.push("");
  lines.push(
    `<span class="${cls}">${escapeHtml(t("earlyNoteRecommendation"))}</span>`
  );

  return lines.join("\n");
}
