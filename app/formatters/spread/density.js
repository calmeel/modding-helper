const SPREAD_DENSITY_GROUP_TOLERANCE_MS = 10;

function formatSpreadDensityResult(results, t, diffOrder = null, manualCategories = {}, minDiff = 1) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const analysis = analyzeSpreadDensityInversions(sortedResults, manualCategories, minDiff);

  const lines = [];

  lines.push(t("spreadDensityInversions"));

  if (!analysis.issueGroups.length) {
    lines.push("");
    lines.push(t("spreadNoDensityInversions"));
    return lines.join("\n");
  }

  for (const group of analysis.issueGroups) {
    lines.push("");
    lines.push(`${formatTimestampLink(group.start)} - ${formatTimestampLink(group.end)}`);
    lines.push(formatSpreadDensityGroupTable(group, sortedResults));

    lines.push("");
    lines.push(t("spreadDensityReview"));

    for (const issue of group.issues) {
      lines.push(
        `<span class="result-warn">` +
        `${getDifficultyName(issue.lower.fileName)} ${t("spreadHasMoreNotesThan")} ${getDifficultyName(issue.higher.fileName)} ` +
        `(${issue.lower.count} > ${issue.higher.count})` +
        `</span>`
      );
    }
  }

  return lines.join("\n");
}

function analyzeSpreadDensityInversions(results, manualCategories = {}, minDiff = 1) {
  const comparableResults = results.filter(result => {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    return category !== "unknown";
  });

  const groups = createSpreadDensityComparisonGroups(comparableResults);
  const issueGroups = [];

  for (const group of groups) {
    const issues = [];

    for (let i = 1; i < comparableResults.length; i++) {
      const lower = comparableResults[i - 1];
      const higher = comparableResults[i];

      const lowerMeasure = group.measuresByFileName.get(lower.fileName);
      const higherMeasure = group.measuresByFileName.get(higher.fileName);

      if (!lowerMeasure || !higherMeasure) continue;

      if (lowerMeasure.noteCount - higherMeasure.noteCount >= minDiff) {
        issues.push({
          lower: {
            fileName: lower.fileName,
            count: lowerMeasure.noteCount
          },
          higher: {
            fileName: higher.fileName,
            count: higherMeasure.noteCount
          }
        });
      }
    }

    if (issues.length) {
      issueGroups.push({
        ...group,
        issues
      });
    }
  }

  return {
    groups,
    issueGroups
  };
}

function createSpreadDensityComparisonGroups(results) {
  const rawItems = [];

  for (const result of results) {
    for (const measure of result.density?.measures ?? []) {
      rawItems.push({
        fileName: result.fileName,
        start: measure.start,
        end: measure.end,
        noteCount: measure.noteCount
      });
    }
  }

  rawItems.sort((a, b) => a.start - b.start);

  const groups = [];

  for (const item of rawItems) {
    const last = groups[groups.length - 1];

    if (
      last &&
      Math.abs(item.start - last.start) <= SPREAD_DENSITY_GROUP_TOLERANCE_MS
    ) {
      last.items.push(item);
      last.start = Math.round(
        last.items.reduce((sum, x) => sum + x.start, 0) / last.items.length
      );
      last.end = Math.round(
        last.items.reduce((sum, x) => sum + x.end, 0) / last.items.length
      );
    } else {
      groups.push({
        start: item.start,
        end: item.end,
        items: [item]
      });
    }
  }

  return groups.map(group => ({
    ...group,
    measuresByFileName: new Map(
      group.items.map(item => [item.fileName, item])
    )
  }));
}

function formatSpreadDensityGroupTable(group, results) {
  const rows = results.map(result => {
    const measure = group.measuresByFileName.get(result.fileName);

    return {
      fileName: result.fileName,
      diff: getDifficultyNameText(result.fileName),
      count: measure ? String(measure.noteCount) : "-"
    };
  });

  const headers = {
    diff: "Diff",
    count: "Notes / measure"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    count: Math.max(15, visibleWidth(headers.count), ...rows.map(r => visibleWidth(r.count)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.count, widths.count)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.count)}`
  );

  for (const row of rows) {
    lines.push(
      `${getDifficultyName(row.fileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${padStartVisual(row.count, widths.count)}`
    );
  }

  return lines.join("\n");
}
