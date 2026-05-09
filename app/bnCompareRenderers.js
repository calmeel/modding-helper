function renderBnCompareResult(result, dom, t, options = {}) {
  if (!result) {
    if (dom.bnNotesOutput) dom.bnNotesOutput.innerHTML = t("bnNoResult");
    if (dom.bnTimelineOutput) dom.bnTimelineOutput.innerHTML = t("bnNoResult");
    if (dom.bnTimingOutput) dom.bnTimingOutput.innerHTML = t("bnNoResult");
    if (dom.bnMetadataOutput) dom.bnMetadataOutput.innerHTML = t("bnNoResult");
    if (dom.bnDifficultyOutput) {dom.bnDifficultyOutput.innerHTML = formatBnDifficultyTable(options.resultsByPair ?? [], t);
  }
    return;
  }

  if (dom.bnNotesOutput) {
    dom.bnNotesOutput.innerHTML = formatBnNotesResult(result.notes, t);
  }

  if (dom.bnTimelineOutput) {
    dom.bnTimelineOutput.innerHTML = formatBnTimelineResult(result.timeline, t);
  }

  if (dom.bnTimingOutput) {
    dom.bnTimingOutput.innerHTML = formatBnTimingResult(result.timing, t, options);
  }

  if (dom.bnMetadataOutput) {
    dom.bnMetadataOutput.innerHTML = formatBnMetadataResult(result.metadata, t);
  }

  if (dom.bnDifficultyOutput) {
    dom.bnDifficultyOutput.innerHTML =
      formatBnDifficultyTable(
        options.resultsByPair ?? [],
        t
      );
  }
}

function formatBnNotesResult(items, t) {
  if (!items.length) return t("bnNoNoteChanges");

  const lines = [];

  for (const item of items) {
    if (item.type === "added") {
      lines.push(`${formatTimestampLink(item.time)} ${formatBnObjectLabel(item.object.kind, t)} ${t("bnAdded")}`);
    } else if (item.type === "deleted") {
      lines.push(`${formatTimestampLink(item.time)} ${formatBnObjectLabel(item.object.kind, t)} ${t("bnDeleted")}`);
    } else if (item.type === "changed") {
      lines.push(
        `${formatTimestampLink(item.time)} ${formatBnObjectLabel(item.beforeObject.kind, t)} -> ${formatBnObjectLabel(item.afterObject.kind, t)} ${t("bnChanged")}`
      );
    } else if (item.type === "moved") {
      lines.push(
        `${formatTimestampLink(item.beforeTime)} -> ${formatTimestampLink(item.afterTime)} ${formatBnObjectLabel(item.object.kind, t)} ${t("bnMoved")}`
      );
    } else if (item.type === "tailMoved") {
      const label = item.objectKind === "slider"
        ? `${formatBnObjectLabel("slider", t)}${escapeHtml(t("bnTail"))}`
        : `${formatBnObjectLabel("spinner", t)}${escapeHtml(t("bnTail"))}`;

      lines.push(
        `${formatTimestampLink(item.beforeTime)} -> ${formatTimestampLink(item.afterTime)} ${label} ${t("bnMoved")}`
      );
    }
  }

  return lines.join("\n");
}

function formatBnTimingResult(result, t, options = {}) {
  if (!result) return t("bnNoTimingChanges");

  const lines = [];

  lines.push(`<div class="bn-section-title">${t("bnLineChanges")}</div>`);
  lines.push(formatBnTimingLineChanges(result.lineChanges, t, options));

  lines.push("");
  lines.push(`<div class="bn-section-title">${t("bnVolumeSections")}</div>`);
  lines.push(formatBnTimingVolumeSections(result.volumeSections, t));

  lines.push("");
  lines.push(`<div class="bn-section-title">${t("bnKiaiSections")}</div>`);
  lines.push(formatBnTimingKiaiSections(result.kiaiSections, t));

  return lines.join("\n").trim();
}

function formatBnTimingLineChanges(items, t, options = {}) {
  if (!items || !items.length) return t("bnNoLineChanges");

  const threshold = options.svChangeThreshold ?? "all";
  const thresholdValue = threshold === "all" ? 0 : parseFloat(threshold);

  const lines = [];

  for (const item of items) {
    if (item.type === "changed") {
      // 緑線のSV変更だけフィルタ対象
      if (item.afterPoint.uninherited === 0 && threshold !== "all") {
        const beforeSv = -100 / item.beforePoint.beatLength;
        const afterSv = -100 / item.afterPoint.beatLength;

        if (Math.abs(afterSv - beforeSv) < thresholdValue) {
          continue;
        }
      }

      lines.push(
        `${formatTimestampLink(item.afterPoint.time)} ` +
        `${formatBnTimingChange(item.beforePoint, item.afterPoint, t)} ${t("bnChanged")}`
      );

    } else if (item.type === "added") {
      lines.push(
        `${formatTimestampLink(item.point.time)} ` +
        `${formatBnTimingPoint(item.point, t)} ${t("bnAdded")}`
      );

    } else if (item.type === "deleted") {
      lines.push(
        `${formatTimestampLink(item.point.time)} ` +
        `${formatBnTimingPoint(item.point, t)} ${t("bnDeleted")}`
      );
    }
  }

  return lines.length ? lines.join("\n") : t("bnNoLineChanges");
}

function formatBnTimingVolumeSections(items, t) {
  if (!items || !items.length) return t("bnNoVolumeSections");

  return items.map(item =>
    `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)} | ` +
    `${t("bnBefore")} ${formatBnNullableValue(item.beforeValue)}% / ` +
    `${t("bnAfter")} ${formatBnNullableValue(item.afterValue)}%`
  ).join("\n");
}

function formatBnTimingKiaiSections(items, t) {
  if (!items || !items.length) return t("bnNoKiaiSections");

  return items.map(item =>
    `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)} | ` +
    `${t("bnBefore")} ${formatBnKiaiValue(item.beforeValue)} / ` +
    `${t("bnAfter")} ${formatBnKiaiValue(item.afterValue)}`
  ).join("\n");
}

function formatBnNullableValue(value) {
  return value === null || value === undefined ? "N/A" : value;
}

function formatBnKiaiValue(value) {
  if (value === null || value === undefined) return "N/A";
  return value ? "ON" : "OFF";
}

function formatBnTimingPoint(point, t) {
  const type = point.uninherited === 1 ? t("bnRedLine") : t("bnGreenLine");

  if (point.uninherited === 1) {
    const bpm = point.beatLength === 0 ? "N/A" : (60000 / point.beatLength).toFixed(3).replace(/\.?0+$/, "");
    return `${type} | BPM ${bpm}`;
  }

  return `${type} | SV ${formatSvValue(point.beatLength)}`;
}

function formatBnTimingChange(beforePoint, afterPoint, t) {
  const type = afterPoint.uninherited === 1 ? t("bnRedLine") : t("bnGreenLine");
  const parts = [type];

  if (beforePoint.beatLength !== afterPoint.beatLength) {
    if (afterPoint.uninherited === 1) {
      const beforeBpm = beforePoint.beatLength === 0 ? "N/A" : (60000 / beforePoint.beatLength).toFixed(3).replace(/\.?0+$/, "");
      const afterBpm = afterPoint.beatLength === 0 ? "N/A" : (60000 / afterPoint.beatLength).toFixed(3).replace(/\.?0+$/, "");
      parts.push(`BPM ${beforeBpm} -> ${afterBpm}`);
    } else {
      parts.push(`SV ${formatSvValue(beforePoint.beatLength)} -> ${formatSvValue(afterPoint.beatLength)}`);
    }
  }

  return parts.join(" | ");
}

function formatBnMetadataResult(items, t) {
  if (!items.length) return t("bnNoMetadataChanges");

  const normalItems = items.filter(item => item.field !== "Tags");
  const tagsItem = items.find(item => item.field === "Tags");

  const rows = normalItems.map(item => {
    const beforeText = escapeHtml(item.beforeValue ?? "");
    const afterText = escapeHtml(item.afterValue ?? "");

    if (item.type === "same") {
      return `
        <tr>
          <th>${escapeHtml(item.label)}</th>
          <td class="bn-meta-same">${beforeText}</td>
          <td class="bn-meta-same">${afterText}</td>
        </tr>
      `;
}

    return `
      <tr>
        <th>${escapeHtml(item.label)}</th>
        <td>${beforeText}</td>
        <td>${afterText}</td>
      </tr>
    `;
  }).join("");

  const tagsHtml = tagsItem
    ? formatBnTagsMetadataBlock(tagsItem, t)
    : "";

  return `
    <table class="bn-meta-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    ${tagsHtml}
  `;
}

function formatBnTagsMetadataBlock(item, t) {
  if (!item) return "";

  const beforeTags = splitBnMetadataTags(item.beforeValue ?? "");
  const afterTags = splitBnMetadataTags(item.afterValue ?? "");

  const beforeHtml = beforeTags.length
    ? beforeTags.map(tag => `<span class="bn-tag">${escapeHtml(tag)}</span>`).join(" ")
    : `<span class="bn-meta-same">${t("none")}</span>`;

  const afterHtml = afterTags.length
    ? afterTags.map(tag => `<span class="bn-tag">${escapeHtml(tag)}</span>`).join(" ")
    : `<span class="bn-meta-same">${t("none")}</span>`;

  if (item.type === "same") {
    return `
      <div class="bn-tags-block">
        <h4>Tags</h4>

        <div class="bn-tags-row">
          <span class="bn-tags-label">Before:</span>
          <div class="bn-tags-list">${beforeHtml}</div>
        </div>

        <div class="bn-tags-row">
          <span class="bn-tags-label">After:</span>
          <div class="bn-tags-list">${afterHtml}</div>
        </div>
      </div>
    `;
  }

  const removed = item.removed?.length
    ? item.removed.map(tag => `<span class="bn-tag bn-tag-removed">${escapeHtml(tag)}</span>`).join(" ")
    : `<span class="bn-meta-same">${t("none")}</span>`;

  const added = item.added?.length
    ? item.added.map(tag => `<span class="bn-tag bn-tag-added">${escapeHtml(tag)}</span>`).join(" ")
    : `<span class="bn-meta-same">${t("none")}</span>`;

  return `
    <div class="bn-tags-block">
      <h4>Tags</h4>

      <div class="bn-tags-row">
        <span class="bn-tags-label">Before:</span>
        <div class="bn-tags-list">${beforeHtml}</div>
      </div>

      <div class="bn-tags-row">
        <span class="bn-tags-label">After:</span>
        <div class="bn-tags-list">${afterHtml}</div>
      </div>

      <div class="bn-tags-row">
        <span class="bn-tags-label">${t("bnDeleted")}:</span>
        <div class="bn-tags-list">${removed}</div>
      </div>

      <div class="bn-tags-row">
        <span class="bn-tags-label">${t("bnAdded")}:</span>
        <div class="bn-tags-list">${added}</div>
      </div>
    </div>
  `;
}

function splitBnMetadataTags(tags) {
  return String(tags)
    .trim()
    .split(/ +/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function formatBnObjectLabel(kind, t) {
  if (kind === "d" || kind === "D") {
    return `<span class="bn-note bn-d">${kind}</span>`;
  }

  if (kind === "k" || kind === "K") {
    return `<span class="bn-note bn-k">${kind}</span>`;
  }

  if (kind === "slider") {
    return `<span class="bn-note bn-slider">${escapeHtml(t("bnSlider"))}</span>`;
  }

  if (kind === "spinner") {
    return `<span class="bn-note bn-spinner">${escapeHtml(t("bnSpinner"))}</span>`;
  }

  return `<span class="bn-note">${escapeHtml(kind)}</span>`;
}

/** OD/HP */
function formatBnDifficultyTable(resultsByPair, t) {
  if (!resultsByPair?.length) {
    return t("bnNoResult");
  }

  const rows = resultsByPair.map(result => {
    const before = result.difficulty.before;
    const after = result.difficulty.after;

    const beforeOd = before.od ?? "-";
    const afterOd = after.od ?? "-";
    const beforeHp = before.hp ?? "-";
    const afterHp = after.hp ?? "-";

    const odChanged = beforeOd !== afterOd;
    const hpChanged = beforeHp !== afterHp;

    return `
      <tr>
        <td>${escapeHtml(result.label)}</td>
        <td>
          ${escapeHtml(String(beforeOd))} →
          ${odChanged
            ? `<span class="result-info">${escapeHtml(String(afterOd))}</span>`
            : escapeHtml(String(afterOd))}
        </td>
        <td>
          ${escapeHtml(String(beforeHp))} →
          ${hpChanged
            ? `<span class="result-info">${escapeHtml(String(afterHp))}</span>`
            : escapeHtml(String(afterHp))}
        </td>
      </tr>
    `;
  }).join("");

  return `
    <table class="bn-difficulty-table">
      <thead>
        <tr>
          <th>Diff</th>
          <th>OD</th>
          <th>HP</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/** タイムライン表示 */
const BN_TIMELINE_WRAP_CELLS = 48;

function chunkBnTimelineCells(cells, size = BN_TIMELINE_WRAP_CELLS) {
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

function formatBnTimelineResult(items, t) {
  if (!items || !items.length) {
    return t("bnNoTimelineChanges");
  }

  return items.map(item => {
    if (item.unsupported) {
      return `
        <div class="bn-timeline-block">
          <div class="bn-timeline-header">
            ${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)}
          </div>
          <div class="bn-timeline-warning">${escapeHtml(t("bnTimelineUnsupported"))}</div>
        </div>
      `;
    }

    const beforeChunks = chunkBnTimelineCells(item.before);
    const afterChunks = chunkBnTimelineCells(item.after);
    const chunkCount = Math.max(beforeChunks.length, afterChunks.length);

    const rows = [];

    for (let i = 0; i < chunkCount; i++) {
      const beforeChunk = beforeChunks[i] ?? { start: i * BN_TIMELINE_WRAP_CELLS, end: i * BN_TIMELINE_WRAP_CELLS, cells: [] };
      const afterChunk = afterChunks[i] ?? { start: i * BN_TIMELINE_WRAP_CELLS, end: i * BN_TIMELINE_WRAP_CELLS, cells: [] };

      if (chunkCount > 1) {
        rows.push(`
          <div class="bn-timeline-chunk-label">
            [cells ${beforeChunk.start + 1}-${beforeChunk.end} / ${item.grid}]
          </div>
        `);
      }

      rows.push(`
        <div class="bn-timeline-row">
          <span class="bn-timeline-label">Before</span>
          <span class="bn-timeline-cells">${formatBnTimelineCells(beforeChunk.cells, t)}</span>
        </div>

        <div class="bn-timeline-row">
          <span class="bn-timeline-label">After</span>
          <span class="bn-timeline-cells">${formatBnTimelineCells(afterChunk.cells, t)}</span>
        </div>
      `);
    }

    return `
      <div class="bn-timeline-block">
        <div class="bn-timeline-header">
          ${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)}
          <span class="bn-timeline-grid">[snap: 1/${item.snap}]</span>
          <span class="bn-timeline-grid">[cells: ${item.grid}]</span>
          ${item.grid > BN_TIMELINE_WRAP_CELLS
            ? `<span class="bn-timeline-grid">[wrapped]</span>`
            : ""}
        </div>

        ${rows.join("")}
      </div>
    `;
  }).join("");
}

function formatBnTimelineCells(cells, t) {
  return cells.map(cell => {
    if (cell.overflow) {
      return `<span class="bn-timeline-cell bn-overflow">!</span>`;
    }

    if (!cell.kind) {
      return `<span class="bn-timeline-cell bn-empty">-</span>`;
    }

    return `<span class="bn-timeline-cell">${formatBnTimelineKind(cell.kind, t)}</span>`;
  }).join("");
}

function formatBnTimelineKind(kind, t) {
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
