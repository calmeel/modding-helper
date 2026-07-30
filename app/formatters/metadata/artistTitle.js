/** Artistチェック */
function formatMultipleArtistResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareArtistsAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatMetadataFieldView(sortedResults, t, [
    { key: "artist", label: "Artist" },
    { key: "artistUnicode", label: "ArtistUnicode" }
  ]));
  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("artistConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("artistNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("artistMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(getDifficultyNameText(mismatch.fileName));

      if (mismatch.artistMismatch) {
        lines.push(`  ${escapeHtml(t("baseArtist"))}: <code>${escapeHtml(mismatch.baseArtist)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentArtist"))}:</span> <code>${escapeHtml(mismatch.artist)}</code>`);
      }

      if (mismatch.unicodeMismatch) {
        lines.push(`  ${escapeHtml(t("baseRomanisedArtist"))}: <code>${escapeHtml(mismatch.baseArtistUnicode)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentRomanisedArtist"))}:</span> <code>${escapeHtml(mismatch.artistUnicode)}</code>`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("metadataSymbolRomanisationCheck")));
  lines.push("");

  const groupedSymbolIssues = groupArtistSymbolIssues(sortedResults);

  if (!groupedSymbolIssues.length) {
    lines.push(t("metadataNoSymbolRomanisationIssues"));
  } else {
    for (const group of groupedSymbolIssues) {
      const issue = group.issue;

      lines.push(formatMetadataSymbolIssueMessage(issue, t));

      lines.push(`  ${escapeHtml(t("metadataOriginal"))}: <code>${escapeHtml(issue.original)}</code>`);
      lines.push(`  ${escapeHtml(t("metadataRomanised"))}: <code>${escapeHtml(issue.romanised)}</code>`);

      if (group.fileNames.length < sortedResults.length) {
        lines.push(
          `  Diff: ` +
          group.fileNames.map(name => getDifficultyName(name)).join(" ")
        );
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("artistSpacingCheck")));
  lines.push("");

  const spacingIssueResults = sortedResults.filter(result =>
    result.spacingIssues?.length > 0
  );

  if (!spacingIssueResults.length) {
    lines.push(t("artistNoSpacingIssues"));
  } else {
    for (const result of spacingIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.spacingIssues) {
        lines.push(formatMetadataSpacingIssue(issue, t));
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("artistFormattingCheck")));
  lines.push("");

  const formattingIssueResults = sortedResults.filter(result =>
    result.formattingIssues?.length > 0
  );

  if (!formattingIssueResults.length) {
    lines.push(t("artistNoFormattingIssues"));
  } else {
    for (const result of formattingIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.formattingIssues) {
        lines.push(formatArtistFormattingIssue(issue, t));
        lines.push(`  ${escapeHtml(t("detected"))}: <code>${escapeHtml(issue.context)}</code>`);
        lines.push("");
      }
    }
  }

  return lines.join("\n").trimEnd();
}

function groupArtistSymbolIssues(results) {
  const map = new Map();

  for (const result of results) {
    for (const issue of result.symbolIssues ?? []) {
      const key = [
        issue.fieldName,
        issue.type,
        issue.symbol,
        issue.original,
        issue.romanised,
        issue.suggestedRomanised,
        (issue.expectedList ?? []).join("/")
      ].join("::");

      if (!map.has(key)) {
        map.set(key, {
          issue,
          fileNames: []
        });
      }

      map.get(key).fileNames.push(result.fileName);
    }
  }

  return [...map.values()];
}

/** Titleチェック */
function formatMetadataSymbolIssueMessage(issue, t) {
  const messageKey =
    issue.type === "metadataSymbolMultipleReplacement"
      ? "metadataSymbolRomanisationMultiple"
      : issue.type === "metadataSymbolMissingReplacement"
        ? "metadataSymbolRomanisationMissing"
        : "metadataSymbolRomanisationIssue";
  const expectedText = issue.expectedList
    .map(v => `<code>${escapeHtml(v)}</code>`)
    .join(" / ");

  return (
    `<span class="result-warn">${escapeHtml(t(messageKey))}:</span> ` +
    `<code>${escapeHtml(issue.symbol)}</code> → ${expectedText}`
  );
}
function formatMultipleTitleResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareTitlesAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatMetadataFieldView(sortedResults, t, [
    { key: "title", label: "Title" },
    { key: "titleUnicode", label: "TitleUnicode" }
  ]));
  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("titleConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("titleNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("titleMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(getDifficultyNameText(mismatch.fileName));

      if (mismatch.titleMismatch) {
        lines.push(`  ${escapeHtml(t("baseTitle"))}: <code>${escapeHtml(mismatch.baseTitle)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentTitle"))}:</span> <code>${escapeHtml(mismatch.title)}</code>`);
      }

      if (mismatch.unicodeMismatch) {
        lines.push(`  ${escapeHtml(t("baseRomanisedTitle"))}: <code>${escapeHtml(mismatch.baseTitleUnicode)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentRomanisedTitle"))}:</span> <code>${escapeHtml(mismatch.titleUnicode)}</code>`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("metadataSymbolRomanisationCheck")));
  lines.push("");

  const groupedSymbolIssues =
    groupMetadataSymbolIssues(sortedResults);

  if (!groupedSymbolIssues.length) {
    lines.push(t("metadataNoSymbolRomanisationIssues"));
  } else {
    for (const group of groupedSymbolIssues) {
      const issue = group.issue;

      lines.push(formatMetadataSymbolIssueMessage(issue, t));

      lines.push(
        `  ${escapeHtml(t("metadataOriginal"))}: ` +
        `<code>${escapeHtml(issue.original)}</code>`
      );

      lines.push(
        `  ${escapeHtml(t("metadataCurrentRomanised"))}: ` +
        `<code>${escapeHtml(issue.romanised)}</code>`
      );

      if (group.fileNames.length < sortedResults.length) {
        lines.push(
          `  Diff: ` +
          group.fileNames.map(name => getDifficultyName(name)).join(" ")
        );
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("titleSpacingCheck")));
  lines.push("");

  const spacingIssueResults = sortedResults.filter(result =>
    result.spacingIssues?.length > 0
  );

  if (!spacingIssueResults.length) {
    lines.push(t("titleNoSpacingIssues"));
  } else {
    for (const result of spacingIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.spacingIssues) {
        lines.push(formatMetadataSpacingIssue(issue, t));
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push(formatSectionTitle(t("titleMarkerCheck")));
  lines.push("");

  const markerIssueGroups = groupTitleMarkerIssues(sortedResults);

  if (!markerIssueGroups.length) {
    lines.push(t("titleNoMarkerIssues"));
  } else {
    for (const group of markerIssueGroups) {
      const issue = group.issue;

      lines.push(
        `<span class="result-warn">${escapeHtml(t("titleMarkerIssue"))}:</span> ` +
        `<code>${escapeHtml(issue.marker)}</code> → <code>${escapeHtml(issue.expected)}</code>`
      );

      lines.push(
        `  ${escapeHtml(t("field"))}: ` +
        group.fieldNames.map(v => `<code>${escapeHtml(v)}</code>`).join(" / ")
      );

      lines.push(
        `  Diff: ` +
        group.fileNames.map(v => getDifficultyName(v)).join(" ")
      );

      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}

function formatArtistFormattingIssue(issue, t) {
  const message = issue.descriptionKey
    ? t(issue.descriptionKey)
    : t("artistFormattingIssue");

  return (
    `<span class="result-warn">${escapeHtml(message)}:</span> ` +
    `<code>${escapeHtml(issue.marker)}</code> → ` +
    `<code>${escapeHtml(issue.expected)}</code>`
  );
}

function groupTitleMarkerIssues(results) {
  const map = new Map();

  for (const result of results) {
    for (const issue of result.markerIssues ?? []) {
      const key = [
        issue.type,
        issue.marker,
        issue.expected,
        issue.context
      ].join("::");

      if (!map.has(key)) {
        map.set(key, {
          issue,
          fileNames: [],
          fieldNames: []
        });
      }

      const group = map.get(key);

      if (!group.fileNames.includes(result.fileName)) {
        group.fileNames.push(result.fileName);
      }

      if (issue.fieldName && !group.fieldNames.includes(issue.fieldName)) {
        group.fieldNames.push(issue.fieldName);
      }
    }
  }

  return [...map.values()];
}

/** タイトル用 */
function groupMetadataSymbolIssues(results) {
  const map = new Map();

  for (const result of results) {
    for (const issue of result.symbolIssues ?? []) {
      const key = [
        issue.type,
        issue.symbol,
        issue.original,
        issue.romanised,
        issue.suggestedRomanised
      ].join("::");

      if (!map.has(key)) {
        map.set(key, {
          issue,
          fileNames: []
        });
      }

      const group = map.get(key);

      if (!group.fileNames.includes(result.fileName)) {
        group.fileNames.push(result.fileName);
      }
    }
  }

  return [...map.values()];
}

/** メタデータ表示の共通関数 */
function formatMetadataFieldView(results, t, fields) {
  const lines = [];

  lines.push(formatSectionTitle(t("metadataFieldView")));
  lines.push("");

  for (const field of fields) {
    const values = [
      ...new Set(
        results
          .map(r => (r[field.key] ?? "").trim())
          .filter(Boolean)
      )
    ];

    lines.push(field.label);
    lines.push("");

    if (!values.length) {
      lines.push(`<code>-</code>`);
      lines.push("");
      continue;
    }

    lines.push(
      `<div class="tag-token-list">` +
      values
        .map(v =>
          `<span class="tag-token">${escapeHtml(v)}</span>`
        )
        .join(" ") +
      `</div>`
    );

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
