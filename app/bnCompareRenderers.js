function renderBnCompareResult(result, dom, t, options = {}) {
  if (!result) {
    if (dom.bnNotesOutput) dom.bnNotesOutput.innerHTML = t("bnNoResult");
    if (dom.bnTimingOutput) dom.bnTimingOutput.innerHTML = t("bnNoResult");
    if (dom.bnMetadataOutput) dom.bnMetadataOutput.innerHTML = t("bnNoResult");
    return;
  }

  if (dom.bnNotesOutput) {
    dom.bnNotesOutput.innerHTML = formatBnNotesResult(result.notes, t);
  }

  if (dom.bnTimingOutput) {
    dom.bnTimingOutput.innerHTML = formatBnTimingResult(result.timing, t, options);
  }

  if (dom.bnMetadataOutput) {
    dom.bnMetadataOutput.innerHTML = formatBnMetadataResult(result.metadata, t);
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
          <td colspan="2" class="bn-meta-same">${t("bnNoChange")}</td>
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
  if (!item || item.type === "same") {
    return `
      <div class="bn-tags-block">
        <h4>Tags</h4>
        <div class="bn-meta-same">${t("bnNoChange")}</div>
      </div>
    `;
  }

  const removed = item.removed.length
    ? item.removed.map(tag => `<span class="bn-tag bn-tag-removed">${escapeHtml(tag)}</span>`).join(" ")
    : `<span class="bn-meta-same">${t("none")}</span>`;

  const added = item.added.length
    ? item.added.map(tag => `<span class="bn-tag bn-tag-added">${escapeHtml(tag)}</span>`).join(" ")
    : `<span class="bn-meta-same">${t("none")}</span>`;

  return `
    <div class="bn-tags-block">
      <h4>Tags</h4>

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