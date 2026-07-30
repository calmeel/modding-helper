/** BG Offset */
function formatBgOffsetResult(results, t) {
  const bgResults = results ?? [];

  if (!bgResults.length) {
    return t("noOsuFiles");
  }

  const rows = [];

  for (const result of sortResultsForDisplay(bgResults)) {
    for (const bg of result.backgrounds ?? []) {
      rows.push({
        mapFileName: result.fileName,
        diff: getDifficultyNameText(result.fileName),
        bgFileName: bg.fileName,
        normalizedFileName: bg.normalizedFileName,
        imageType: bg.imageType,
        actualImageType: bg.actualImageType,
        imageTypeMismatch: bg.imageTypeMismatch,
        xOffset: bg.xOffset,
        yOffset: bg.yOffset
      });
    }
  }

  if (!rows.length) {
    return t("bgOffsetNoBackgrounds");
  }

  const groups = groupBgOffsetRows(rows);
  const issueGroups = groups.filter(group => group.offsetKeys.size > 1);
  const pngGroups = groups.filter(group => group.imageType === "png");
  const mismatchRows = rows.filter(row => row.imageTypeMismatch);

  const lines = [];

  lines.push(t("bgOffsetComparison"));
  lines.push("");

  lines.push(formatBgOffsetTable(rows));

  if (!issueGroups.length) {
    lines.push("");
    lines.push(t("bgOffsetNoIssues"));
  }

  if (issueGroups.length || pngGroups.length || mismatchRows.length) {
    lines.push("");
    lines.push(`<span class="result-warn">${t("warning")}:</span>`);
  }

  for (const group of issueGroups) {
    const displayName = group.rows[0]?.bgFileName ?? group.normalizedFileName;

    lines.push(
      `<span class="result-warn">` +
      `${escapeHtml(displayName)} ${t("bgOffsetDifferentOffsets")}` +
      `</span>`
    );
  }

  for (const group of pngGroups) {
    const displayName = group.rows[0]?.bgFileName ?? group.normalizedFileName;

    lines.push(
      `<span class="result-warn">` +
      `${escapeHtml(displayName)} | ${escapeHtml(t("bgOffsetPngWarning"))}` +
      `</span>`
    );
  }

  for (const row of mismatchRows) {
    lines.push(
      `<span class="result-error">` +
      `${escapeHtml(row.bgFileName)} | ` +
      `${escapeHtml(t("bgOffsetImageTypeMismatch"))}: ` +
      `${escapeHtml(formatBgImageType(row.imageType))} -> ` +
      `${escapeHtml(formatBgImageType(row.actualImageType))}` +
      `</span>`
    );
  }

  return lines.join("\n");
}

function groupBgOffsetRows(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.normalizedFileName)) {
      map.set(row.normalizedFileName, {
        normalizedFileName: row.normalizedFileName,
        imageType: row.imageType,
        rows: [],
        offsetKeys: new Set()
      });
    }

    const group = map.get(row.normalizedFileName);
    group.rows.push(row);
    group.offsetKeys.add(`${row.xOffset},${row.yOffset}`);
  }

  return [...map.values()];
}

function formatBgOffsetTable(rows) {
  const headers = {
    file: "File",
    type: "Type",
    actual: "Actual",
    diff: "Diff",
    xOffset: "xOffset",
    yOffset: "yOffset"
  };

  const widths = {
    file: Math.max(4, visibleWidth(headers.file), ...rows.map(r => visibleWidth(r.bgFileName))),
    type: Math.max(4, visibleWidth(headers.type), ...rows.map(r => visibleWidth(formatBgImageType(r.imageType)))),
    actual: Math.max(6, visibleWidth(headers.actual), ...rows.map(r => visibleWidth(formatBgImageType(r.actualImageType)))),
    diff: Math.max(4, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    xOffset: Math.max(7, visibleWidth(headers.xOffset), ...rows.map(r => visibleWidth(String(r.xOffset)))),
    yOffset: Math.max(7, visibleWidth(headers.yOffset), ...rows.map(r => visibleWidth(String(r.yOffset))))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.file, widths.file)} | ` +
    `${padEndVisual(headers.type, widths.type)} | ` +
    `${padEndVisual(headers.actual, widths.actual)} | ` +
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.xOffset, widths.xOffset)} | ` +
    `${padStartVisual(headers.yOffset, widths.yOffset)}`
  );

  lines.push(
    `${"-".repeat(widths.file)}-+-` +
    `${"-".repeat(widths.type)}-+-` +
    `${"-".repeat(widths.actual)}-+-` +
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.xOffset)}-+-` +
    `${"-".repeat(widths.yOffset)}`
  );

  for (const row of rows) {
    const typeText = formatBgImageType(row.imageType);
    const actualText = formatBgImageType(row.actualImageType);
    const typeCell = padEndVisual(typeText, widths.type);
    const actualCell = padEndVisual(actualText, widths.actual);
    const typeHtml = row.imageTypeMismatch
      ? `<span class="result-error">${escapeHtml(typeCell)}</span>`
      : escapeHtml(typeCell);
    const actualHtml = row.imageTypeMismatch
      ? `<span class="result-error">${escapeHtml(actualCell)}</span>`
      : escapeHtml(actualCell);

    lines.push(
      `${escapeHtml(row.bgFileName)}${" ".repeat(widths.file - visibleWidth(row.bgFileName))} | ` +
      `${typeHtml} | ` +
      `${actualHtml} | ` +
      `${getDifficultyName(row.mapFileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${padStartVisual(String(row.xOffset), widths.xOffset)} | ` +
      `${padStartVisual(String(row.yOffset), widths.yOffset)}`
    );
  }

  return lines.join("\n");
}

function formatBgImageType(imageType) {
  return imageType ? imageType.toUpperCase() : "-";
}
