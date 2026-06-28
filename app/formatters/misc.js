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

/** その他：プレビューポイント */
function formatPreviewPointResult(results, t) {
  if (!results || !results.length) {
    return t("noOsuFiles");
  }

  const missingResults = results.filter(result => result.previewTime === null);
  const validResults = results.filter(result => result.previewTime !== null);
  const groups = groupPreviewPointResults(validResults);
  const lines = [];

  lines.push(formatSectionTitle(t("previewPointConsistencyTitle")));

  if (missingResults.length) {
    lines.push(`<span class="result-warn">${escapeHtml(t("previewPointMissingWarning"))}</span>`);
    lines.push(
      missingResults
        .map(result => getDifficultyName(result.fileName))
        .join(" ")
    );
  }

  if (!validResults.length) {
    lines.push("");
    lines.push(formatSectionTitle(t("previewPointSnapTitle")));
    lines.push(t("previewPointNotFound"));
    return lines.join("\n");
  }

  if (groups.length === 1 && !missingResults.length) {
    lines.push(t("previewPointConsistencyOk"));
  } else if (groups.length > 1) {
    lines.push(`<span class="result-error">${escapeHtml(t("previewPointMismatch"))}</span>`);
    lines.push("");

    for (const group of groups) {
      lines.push(formatPreviewPointConsistencyGroup(group));
      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSectionTitle(t("previewPointSnapTitle")));

  for (const result of sortResultsForDisplay(validResults)) {
    lines.push(formatPreviewPointSingleResult(result, t));
    lines.push(getDifficultyNameText(result.fileName));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatPreviewPointConsistencyGroup(group) {
  const item = group.items[0];
  const diffNames = group.items
    .map(result => getDifficultyNameText(result.fileName))
    .join(", ");

  return `${formatTimestampLink(item.previewTime)} | ${escapeHtml(diffNames)}`;
}

function groupPreviewPointResults(results) {
  const map = new Map();

  for (const result of results) {
    const key = String(result.previewTime);

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(result);
  }

  return [...map.values()].map(items => ({ items }));
}

function formatPreviewPointSingleResult(item, t) {
  const diffText =
    item.diff === null
      ? "-"
      : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`;

  const levelClass =
    item.level === "warn"
      ? "result-warn"
      : "";

  const status =
    item.level === "warn"
      ? t("warning")
      : t("sourceOk");
  const message =
    item.level === "warn"
      ? ` | ${escapeHtml(t("previewPointSnapWarning"))}`
      : "";

  return `<span class="${levelClass}">` +
    `${formatTimestampLink(item.previewTime)} | ` +
    `${item.snap} snap | ` +
    `${diffText} | ` +
    `${status}` +
    `${message}` +
    `</span>`;
}

/** その他：てんかん警告 */
function formatMultipleEpilepsyWarningResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatEpilepsyWarningResult, t);
}

function formatEpilepsyWarningResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  const flashIssues = result.flashIssues ?? [];
  const bpmIssues = result.bpmIssues ?? [];

  if (!flashIssues.length && !bpmIssues.length) {
    lines.push(t("noEpilepsyWarningIssues"));
    return lines.join("\n");
  }

  lines.push(
    `<span class="note-subtext">` +
    `${t("epilepsyWarningNotice")}` +
    `</span>`
  );

  if (flashIssues.length) {
    lines.push(t("epilepsyKiaiFlashIssues"));
    lines.push("");

    for (const item of flashIssues) {
      const cls = item.level === "warn" ? "result-warn" : "ok";
      const hzText = item.hz.toFixed(2);
      const intervalText = `${Math.round(item.intervalMs)} ms`;

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(item.prevTime)} -> ${formatTimestampLink(item.time)} | ` +
        `${hzText} Hz | ${intervalText}` +
        `</span>`
      );
    }

    lines.push("");
  }

  if (bpmIssues.length) {
    lines.push(t("epilepsyHighBpmKiaiIssues"));
    lines.push("");

    for (const item of bpmIssues) {
      const cls = item.level === "warn" ? "result-warn" : "ok";
      const bpmText = item.bpm.toFixed(3);
      const hzText = item.hz.toFixed(2);

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)} | ` +
        `${bpmText} BPM | ${hzText} Hz` +
        `</span>`
      );
    }
  }

  return lines.join("\n").trimEnd();
}

/** タイムライン表示 */
const TIMELINE_WRAP_CELLS = 36;

function chunkTimelineCells(cells, size = TIMELINE_WRAP_CELLS) {
  const chunks = [];

  for (let i = 0; i < cells.length; i += size) {
    chunks.push({
      start: i,
      end: Math.min(i + size, cells.length),
      cells: cells.slice(i, i + size)
    });
  }

  return chunks;
}

function formatTimelineResult(result, t) {
  if (!result || !result.measures.length) {
    return t("timelineNoData");
  }

  return result.measures.map(measure => {
    const lines = [];

    lines.push(
      `<div class="timeline-measure">` +
      `<div class="timeline-measure-title">` +
      `${formatTimestampLink(measure.start)} - ${formatTimestampLink(measure.end)} ` +
      `<span class="bn-timeline-grid">[snap: 1/${measure.snap}]</span> ` +
      `<span class="bn-timeline-grid">[display grid: 1/${measure.displaySnap}]</span> ` +
      `<span class="bn-timeline-grid">[cells: ${measure.resolution}]</span>` +
      (measure.resolution > TIMELINE_WRAP_CELLS
        ? ` <span class="bn-timeline-grid">[wrapped]</span>`
        : "") +
      `</div><pre>`
    );

    const diffNames = measure.rows.map(row => getDifficultyNameText(row.fileName));
    const diffWidth = Math.max(
      10,
      ...diffNames.map(name => visibleWidth(name))
    );

    const chunkCount =
      Math.max(
        1,
        ...measure.rows.map(row =>
          row.supported && Array.isArray(row.cells)
            ? Math.ceil(row.cells.length / TIMELINE_WRAP_CELLS)
            : 1
        )
      );

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
      if (chunkCount > 1) {
        const startCell = chunkIndex * TIMELINE_WRAP_CELLS + 1;
        const endCell = Math.min(
          (chunkIndex + 1) * TIMELINE_WRAP_CELLS,
          measure.resolution
        );

        lines.push(
          `<span class="bn-timeline-grid">[cells ${startCell}-${endCell} / ${measure.resolution}]</span>`
        );
      }

      for (const row of measure.rows) {
        const nameText = getDifficultyNameText(row.fileName);
        const nameHtml = getDifficultyName(row.fileName);
        const padding = " ".repeat(diffWidth - visibleWidth(nameText));

        if (!row.supported) {
          lines.push(
            `${nameHtml}${padding} | ` +
            `<span class="timeline-unsupported">${escapeHtml(t("timelineUnsupported"))}</span>`
          );
          continue;
        }

        const chunk = row.cells.slice(
          chunkIndex * TIMELINE_WRAP_CELLS,
          (chunkIndex + 1) * TIMELINE_WRAP_CELLS
        );

        lines.push(
          `${nameHtml}${padding} | ${formatTimelineCells(chunk)}`
        );
      }

      if (chunkIndex < chunkCount - 1) {
        lines.push("");
      }
    }

    lines.push(`</pre></div>`);

    return lines.join("\n");
  }).join("\n");
}

function formatTimelineKind(kind) {
  if (kind === "d" || kind === "D") {
    return `<span class="bn-note bn-d">${kind}</span>`;
  }

  if (kind === "k" || kind === "K") {
    return `<span class="bn-note bn-k">${kind}</span>`;
  }

  if (kind === "slider") {
    return `<span class="bn-note bn-slider">S</span>`;
  }

  if (kind === "spinner") {
    return `<span class="bn-note bn-spinner">S</span>`;
  }

  return `<span class="bn-note">${escapeHtml(kind)}</span>`;
}

function formatTimelineCells(cells) {
  return cells.map(cell => {
    const kiaiClass = cell.kiai ? " timeline-kiai" : "";

    if (!cell.kind) {
      return `<span class="timeline-cell timeline-empty${kiaiClass}">-</span>`;
    }

    return `<span class="timeline-cell${kiaiClass}">${formatTimelineKind(cell.kind)}</span>`;
  }).join("");
}
