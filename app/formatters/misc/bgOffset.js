/** BG Offset */
function formatBgOffsetResult(results, t) {
  const bgResults = results ?? [];

  if (!bgResults.length) {
    return t("noOsuFiles");
  }

  const rows = [];

  for (const result of sortResultsForDisplay(bgResults)) {
    if (!result.backgrounds?.length) {
      rows.push({
        mapFileName: result.fileName,
        diff: getDifficultyNameText(result.fileName),
        bgFileName: "-",
        missingBackground: true,
        xOffset: "-",
        yOffset: "-"
      });
      continue;
    }

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

  const groups = groupBgOffsetRows(rows);
  const issueGroups = groups.filter(group => group.offsetKeys.size > 1);
  const nonZeroXOffsetRows = rows.filter(row => Number.isFinite(row.xOffset) && row.xOffset !== 0);
  const pngGroups = groups.filter(group => group.imageType === "png");
  const mismatchRows = rows.filter(row => row.imageTypeMismatch);

  const lines = [];

  lines.push(formatBgOffsetTable(rows));
  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("bgOffsetCheckTitle")));
  lines.push("");

  if (!groups.length) {
    lines.push(t("bgOffsetNoBackgrounds"));
  } else if (!issueGroups.length && !nonZeroXOffsetRows.length) {
    lines.push(t("bgOffsetNoIssues"));
  }

  const offsetDetails = [];

  for (const group of issueGroups) {
    const xMismatch = new Set(group.rows.map(row => row.xOffset)).size > 1;
    const yMismatch = new Set(group.rows.map(row => row.yOffset)).size > 1;
    offsetDetails.push(
      `<span class="result-warn">${escapeHtml(t("bgOffsetDifferentOffsets"))}</span>\n\n` +
      formatBgOffsetDetailGroups(group.rows, true, xMismatch, yMismatch)
    );
  }

  if (nonZeroXOffsetRows.length) {
    offsetDetails.push(
      `<span class="result-warn">${escapeHtml(t("bgOffsetNonZeroXWarning"))}</span>\n\n` +
      formatBgOffsetDetailGroups(nonZeroXOffsetRows, false, true, false)
    );
  }

  if (offsetDetails.length) {
    lines.push(offsetDetails.join("\n\n"));
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("bgExtensionCheckTitle")));
  lines.push("");

  if (!groups.length) {
    lines.push(t("bgOffsetNoBackgrounds"));
  } else if (!pngGroups.length && !mismatchRows.length) {
    lines.push(t("bgExtensionNoIssues"));
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
      `<span class="result-warn">` +
      `${escapeHtml(row.bgFileName)} | ` +
      `${escapeHtml(t("bgOffsetImageTypeMismatch"))}: ` +
      `${escapeHtml(formatBgImageType(row.imageType))} -> ` +
      `${escapeHtml(formatBgImageType(row.actualImageType))}` +
      `</span>`
    );
  }

  return lines.join("\n");
}

function formatBgOffsetDetailGroups(rows, includeY, xMismatch, yMismatch) {
  const groups = new Map();

  for (const row of rows) {
    const key = JSON.stringify([row.normalizedFileName, row.xOffset, includeY ? row.yOffset : null]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.values()].map(items => {
    const row = items[0];
    const diffNames = [...new Set(items.map(item => item.mapFileName))]
      .map(fileName => getDifficultyName(fileName)).join(", ");
    const xWarning = xMismatch || (Number.isFinite(row.xOffset) && row.xOffset !== 0);
    const xHtml = formatBgTableCell(row.xOffset, 0, xWarning ? "warn" : null);
    const yHtml = formatBgTableCell(row.yOffset, 0, yMismatch ? "warn" : null);

    return `${diffNames}\n` +
      `File: ${escapeHtml(row.bgFileName)} | xOffset: ${xHtml}` +
      (includeY ? ` | yOffset: ${yHtml}` : "");
  }).join("\n\n");
}

function groupBgOffsetRows(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!row.normalizedFileName) continue;

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
  const offsetMismatches = new Map(groupBgOffsetRows(rows).map(group => [
    group.normalizedFileName,
    {
      x: new Set(group.rows.map(row => row.xOffset)).size > 1,
      y: new Set(group.rows.map(row => row.yOffset)).size > 1
    }
  ]));
  const headers = {
    diff: "Diff",
    file: "File",
    type: "Type",
    actual: "Actual",
    xOffset: "xOffset",
    yOffset: "yOffset",
    status: "Status"
  };

  const widths = {
    diff: Math.max(4, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    file: Math.max(4, visibleWidth(headers.file), ...rows.map(r => visibleWidth(r.bgFileName))),
    type: Math.max(4, visibleWidth(headers.type), ...rows.map(r => visibleWidth(formatBgImageType(r.imageType)))),
    actual: Math.max(6, visibleWidth(headers.actual), ...rows.map(r => visibleWidth(formatBgImageType(r.actualImageType)))),
    xOffset: Math.max(7, visibleWidth(headers.xOffset), ...rows.map(r => visibleWidth(String(r.xOffset)))),
    yOffset: Math.max(7, visibleWidth(headers.yOffset), ...rows.map(r => visibleWidth(String(r.yOffset)))),
    status: 7
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padEndVisual(headers.file, widths.file)} | ` +
    `${padEndVisual(headers.type, widths.type)} | ` +
    `${padEndVisual(headers.actual, widths.actual)} | ` +
    `${padStartVisual(headers.xOffset, widths.xOffset)} | ` +
    `${padStartVisual(headers.yOffset, widths.yOffset)} | ` +
    `${padEndVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.file)}-+-` +
    `${"-".repeat(widths.type)}-+-` +
    `${"-".repeat(widths.actual)}-+-` +
    `${"-".repeat(widths.xOffset)}-+-` +
    `${"-".repeat(widths.yOffset)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const mismatch = offsetMismatches.get(row.normalizedFileName);
    const xWarning = mismatch?.x || (Number.isFinite(row.xOffset) && row.xOffset !== 0);
    const yWarning = mismatch?.y;
    const typeWarning = row.imageType === "png" || row.imageTypeMismatch;
    const hasWarning = xWarning || yWarning || typeWarning;
    const status = row.missingBackground ? "error" : hasWarning ? "warning" : "ok";
    const level = row.missingBackground ? "error" : hasWarning ? "warn" : null;
    const typeText = formatBgImageType(row.imageType);
    const actualText = formatBgImageType(row.actualImageType);

    lines.push(
      `${getDifficultyName(row.mapFileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${formatBgTableCell(row.bgFileName, widths.file, row.missingBackground ? "error" : null)} | ` +
      `${formatBgTableCell(typeText, widths.type, typeWarning ? "warn" : null)} | ` +
      `${formatBgTableCell(actualText, widths.actual, row.imageTypeMismatch ? "warn" : null)} | ` +
      `${formatBgTableCell(row.xOffset, widths.xOffset, xWarning ? "warn" : null, true)} | ` +
      `${formatBgTableCell(row.yOffset, widths.yOffset, yWarning ? "warn" : null, true)} | ` +
      `${formatBgTableCell(status, widths.status, level)}`
    );
  }

  return lines.join("\n");
}

function formatBgTableCell(value, width, level, alignRight = false) {
  const text = String(value);
  const padding = " ".repeat(Math.max(0, width - visibleWidth(text)));
  const html = level
    ? `<span class="result-${level}">${escapeHtml(text)}</span>`
    : escapeHtml(text);
  return alignRight ? padding + html : html + padding;
}

function formatBgImageType(imageType) {
  return imageType ? imageType.toUpperCase() : "-";
}
