function formatFileCheckResult(results, t) {
  if (!results || !results.length) return t("noOsuFiles");

  const sortedResults = sortResultsForDisplay(results);
  const lines = [formatSectionTitle(t("osuFileNameCheckTitle"))];
  const issues = sortedResults.filter(result => !result.matches);

  lines.push(formatOsuFileNameSummaryTable(sortedResults, t));
  lines.push("");
  lines.push(formatSeparator());

  if (!issues.length) {
    lines.push(t("osuFileNameNoIssues"));
    return lines.join("\n");
  }

  for (const result of issues) {
    lines.push(`<span class="result-warn">${escapeHtml(t("osuFileNameMismatch"))}</span>`);

    if (result.expectedFileName) {
      const difference = formatOsuFileNameDiffPair(
        result.actualFileName,
        result.expectedFileName
      );
      lines.push(`${escapeHtml(t("osuFileNameActual"))}: ${difference.actual}`);
      lines.push(`${escapeHtml(t("osuFileNameExpected"))}: ${difference.expected}`);
    } else {
      lines.push(`${escapeHtml(t("osuFileNameActual"))}: ${escapeHtml(result.actualFileName)}`);
      const fields = result.missingFields
        .map(field => t(`osuFileNameField_${field}`))
        .join(", ");
      lines.push(`${escapeHtml(t("osuFileNameMetadataMissing"))}: ${escapeHtml(fields)}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatOsuFileNameDiffPair(actualValue, expectedValue) {
  const actualChars = [...String(actualValue ?? "")];
  const expectedChars = [...String(expectedValue ?? "")];
  const actualMatched = new Array(actualChars.length).fill(false);
  const expectedMatched = new Array(expectedChars.length).fill(false);
  const lcs = Array.from(
    { length: actualChars.length + 1 },
    () => new Uint16Array(expectedChars.length + 1)
  );

  for (let i = actualChars.length - 1; i >= 0; i--) {
    for (let j = expectedChars.length - 1; j >= 0; j--) {
      lcs[i][j] = actualChars[i] === expectedChars[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  let actualIndex = 0;
  let expectedIndex = 0;

  while (
    actualIndex < actualChars.length &&
    expectedIndex < expectedChars.length
  ) {
    if (actualChars[actualIndex] === expectedChars[expectedIndex]) {
      actualMatched[actualIndex] = true;
      expectedMatched[expectedIndex] = true;
      actualIndex++;
      expectedIndex++;
    } else if (
      lcs[actualIndex + 1][expectedIndex] >=
      lcs[actualIndex][expectedIndex + 1]
    ) {
      actualIndex++;
    } else {
      expectedIndex++;
    }
  }

  return {
    actual: formatOsuFileNameDiffValue(actualChars, actualMatched),
    expected: formatOsuFileNameDiffValue(expectedChars, expectedMatched)
  };
}

function formatOsuFileNameDiffValue(chars, matched) {
  const parts = [];
  let start = 0;

  while (start < chars.length) {
    const isDifferent = !matched[start];
    let end = start + 1;

    while (end < chars.length && !matched[end] === isDifferent) {
      end++;
    }

    const text = escapeHtml(chars.slice(start, end).join(""));
    parts.push(
      isDifferent
        ? `<span class="result-warn">${text}</span>`
        : text
    );
    start = end;
  }

  return parts.join("");
}

function formatOsuFileNameSummaryTable(results, t) {
  const rows = results.map(result => ({
    result,
    diff: getDifficultyNameText(result.fileName),
    fileName: result.actualFileName,
    status: result.matches ? "OK" : "Warning"
  }));
  const headers = {
    diff: "Diff",
    fileName: ".osu File Name",
    status: "Status"
  };
  const widths = {
    diff: Math.max(4, visibleWidth(headers.diff), ...rows.map(row => visibleWidth(row.diff))),
    fileName: Math.max(14, visibleWidth(headers.fileName), ...rows.map(row => visibleWidth(row.fileName))),
    status: Math.max(6, visibleWidth(headers.status), ...rows.map(row => visibleWidth(row.status)))
  };
  const lines = [
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padEndVisual(headers.fileName, widths.fileName)} | ` +
    `${padEndVisual(headers.status, widths.status)}`,
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.fileName)}-+-` +
    `${"-".repeat(widths.status)}`
  ];

  for (const row of rows) {
    const diffCell = escapeHtml(padEndVisual(row.diff, widths.diff));
    const fileNameCell = escapeHtml(padEndVisual(row.fileName, widths.fileName));
    const statusCell = escapeHtml(padEndVisual(row.status, widths.status));
    const formattedFileName = row.result.matches
      ? fileNameCell
      : `<span class="result-warn">${fileNameCell}</span>`;
    const formattedStatus = row.result.matches
      ? `<span class="ok">${statusCell}</span>`
      : `<span class="result-warn">${statusCell}</span>`;

    lines.push(
      `${diffCell} | ${formattedFileName} | ${formattedStatus}`
    );
  }

  return lines.join("\n");
}
