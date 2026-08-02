/** Slider設定 */
function formatMultipleSliderSettingsResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const lines = [];

  lines.push(formatSliderSettingsSummaryTable(sortedResults, t));

  const issueResults = sortedResults.filter(result => result.issues.length > 0);

  lines.push("");
  lines.push(formatSeparator());

  if (!issueResults.length) {
    lines.push(t("noSliderSettingsIssues"));
    return lines.join("\n");
  }

  lines.push(t("sliderSettingsIssueDetails"));
  lines.push("");

  lines.push(
    issueResults
      .map(result => formatSliderSettingsIssueDetail(result, t))
      .join("\n\n")
  );

  return lines.join("\n").trimEnd();
}

function formatSliderSettingsSummaryTable(results, t) {
  const rows = results.map(result => {
    const diff = getDifficultyNameText(result.fileName);
    const ratio = `${(result.tripletRatio * 100).toFixed(1)}%`;
    const smValue = formatSliderSettingValue(result.sliderMultiplier);
    const smSuffix = ` (${t("expected")}: 1.4)`;
    const sm = `${smValue}${smSuffix}`;
    const strValue = formatSliderSettingValue(result.sliderTickRate);
    const strSuffix = ` (${t("expected")}: ${result.expectedTickRate})`;
    const str = `${strValue}${strSuffix}`;
    const hasSmIssue = result.issues.some(issue => issue.type === "sliderMultiplier");
    const hasStrIssue = result.issues.some(issue => issue.type === "sliderTickRate");
    const status = result.issues.length ? t("warning") : "OK";

    return {
      result,
      diff,
      ratio,
      sm,
      smValue,
      smSuffix,
      hasSmIssue,
      str,
      strValue,
      strSuffix,
      hasStrIssue,
      status
    };
  });

  const headers = {
    diff: "Diff",
    ratio: t("tripletSnapRatio"),
    sm: "SliderMultiplier",
    str: "SliderTickRate",
    status: t("status")
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    ratio: Math.max(10, visibleWidth(headers.ratio), ...rows.map(r => visibleWidth(r.ratio))),
    sm: Math.max(16, visibleWidth(headers.sm), ...rows.map(r => visibleWidth(r.sm))),
    str: Math.max(14, visibleWidth(headers.str), ...rows.map(r => visibleWidth(r.str))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.status)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.ratio, widths.ratio)} | ` +
    `${padStartVisual(headers.sm, widths.sm)} | ` +
    `${padStartVisual(headers.str, widths.str)} | ` +
    `${padStartVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.ratio)}-+-` +
    `${"-".repeat(widths.sm)}-+-` +
    `${"-".repeat(widths.str)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const diffText = getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const statusPadded = padStartVisual(row.status, widths.status);
    const statusText = row.result.issues.length
      ? `<span class="result-warn">${escapeHtml(statusPadded)}</span>`
      : `<span class="ok">${escapeHtml(statusPadded)}</span>`;
    const smText = formatSliderSettingsSummaryValue(
      row.smValue,
      row.smSuffix,
      widths.sm,
      row.hasSmIssue
    );
    const strText = formatSliderSettingsSummaryValue(
      row.strValue,
      row.strSuffix,
      widths.str,
      row.hasStrIssue
    );

    lines.push(
      `${diffText} | ` +
      `${padStartVisual(row.ratio, widths.ratio)} | ` +
      `${smText} | ` +
      `${strText} | ` +
      `${statusText}`
    );
  }

  return lines.join("\n");
}

function formatSliderSettingsSummaryValue(value, suffix, width, isWarning) {
  const plainText = `${value}${suffix}`;
  const padding = " ".repeat(Math.max(0, width - visibleWidth(plainText)));
  const valueText = isWarning
    ? `<span class="result-warn">${escapeHtml(value)}</span>`
    : escapeHtml(value);

  return `${padding}${valueText}${escapeHtml(suffix)}`;
}

function formatSliderSettingsIssueDetail(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  for (const issue of result.issues) {
    if (issue.type === "sliderMultiplier") {
      lines.push(
        `<span class="result-warn">${t("sliderMultiplierIssue")} | ${formatSliderSettingValue(issue.value)} (${t("expected")}: ${issue.expected})</span>`
      );
    }

    if (issue.type === "sliderTickRate") {
      lines.push(
        `<span class="result-warn">${t("sliderTickRateIssue")} | ${formatSliderSettingValue(issue.value)} (${t("expected")}: ${issue.expected})</span>`
      );
    }
  }

  return lines.join("\n");
}

function formatSliderSettingValue(value) {
  return value === null || value === undefined ? "N/A" : String(value);
}
