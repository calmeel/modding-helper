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
