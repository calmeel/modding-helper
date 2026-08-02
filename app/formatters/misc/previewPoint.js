/** その他：プレビューポイント */
function formatPreviewPointResult(results, t) {
  if (!results || !results.length) {
    return t("noOsuFiles");
  }

  const missingResults = results.filter(result => result.previewTime === null);
  const validResults = results.filter(result => result.previewTime !== null);
  const groups = groupPreviewPointResults(validResults);
  const audioWarnings = getPreviewPointAudioWarnings(results);
  const lines = [];

  lines.push(formatSectionTitle(t("previewPointConsistencyTitle")));

  if (!validResults.length) {
    lines.push(t("previewPointConsistencyUnavailable"));
  } else if (validResults.length === 1) {
    lines.push(t("previewPointConsistencySingle"));
  } else if (groups.length === 1) {
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
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("previewPointSnapTitle")));

  if (missingResults.length) {
    lines.push(`<span class="result-error">${escapeHtml(t("previewPointMissingError"))}</span>`);
    lines.push(
      missingResults
        .map(result => getDifficultyName(result.fileName))
        .join(" ")
    );
    lines.push("");
  }

  for (const group of groupPreviewPointSnapResults(validResults)) {
    lines.push(formatPreviewPointSingleResult(group.items[0], t));
    lines.push(
      group.items
        .map(result => escapeHtml(getDifficultyNameText(result.fileName)))
        .join(", ")
    );
    lines.push("");
  }

  appendPreviewPointAudioSection(lines, audioWarnings, t);

  return lines.join("\n").trimEnd();
}

function appendPreviewPointAudioSection(lines, audioWarnings, t) {
  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("previewPointAudioTitle")));

  if (!audioWarnings.length) {
    lines.push(t("previewPointVbrOk"));
    return;
  }

  for (const warning of audioWarnings) {
    lines.push(
      `<span class="result-warn">${escapeHtml(t("previewPointVbrWarning"))}</span>`
    );
    lines.push(escapeHtml(warning.displayName));
    lines.push("");
  }
}

function getPreviewPointAudioWarnings(results) {
  const warnings = [];
  const seen = new Set();

  for (const result of results ?? []) {
    const audio = result.audioBitrate;
    if (!audio?.isVbr) continue;

    const displayName = audio.audioEntryName || audio.audioFileName || "mp3";
    const key = displayName.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    warnings.push({ displayName });
  }

  return warnings;
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

function groupPreviewPointSnapResults(results) {
  const groups = new Map();

  for (const result of sortResultsForDisplay(results)) {
    const key = [
      result.previewTime,
      result.snap,
      result.diff,
      result.level
    ].join("|");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(result);
  }

  return [...groups.values()].map(items => ({ items }));
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
