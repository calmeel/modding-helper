/** sampleSet */
function formatMultipleSampleSetResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatSortedResults(results, formatSampleSetResult, t);
}

function formatSampleSetResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.timingIssues.length && !result.objectIssues.length) {
    lines.push(t("noSampleSetIssues"));
    return lines.join("\n");
  }

  if (result.timingIssues.length) {
    lines.push(t("timingPoints"));
    for (const item of result.timingIssues) {
      lines.push(
        `<span class="result-warn">` +
        `${formatTimestampLink(item.time)} | ${item.lineType} | ${formatSampleSetIssueText(item)}` +
        `</span>`
      );
    }
    lines.push("");
  }

  if (result.objectIssues.length) {
    lines.push(t("hitObjects"));
    for (const item of result.objectIssues) {
      lines.push(
        `<span class="result-warn">` +
        `${formatTimestampLink(item.time)} | ${item.objectType} | ${formatSampleSetIssueText(item)}` +
        `</span>`
      );
    }
  }

  return lines.join("\n").trimEnd();
}

/** sampleindexの際の処理 */
function formatSampleSetIssueText(item) {
  if (item.field === "sampleIndex") {
    return `sampleIndex: ${item.sampleIndex}`;
  }

  if (item.field === "customFileName") {
    return `custom file: ${escapeHtml(item.customFileName)}`;
  }

  if (item.field === "edgeSounds") {
    return `edgeSounds[${item.edgeIndex}]: ${item.edgeSound}`;
  }

  if (
    item.field === "sampleSet" ||
    item.field === "normalSet" ||
    item.field === "additionSet" ||
    item.field === "edgeSets.normalSet" ||
    item.field === "edgeSets.additionSet"
  ) {
    const edgePrefix = item.edgeIndex !== undefined
      ? `[${item.edgeIndex}] `
      : "";

    return `${edgePrefix}${item.field}: ${item.sampleSet} (${item.sampleSetName})`;
  }

  return item.field;
}
