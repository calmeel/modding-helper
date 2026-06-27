function formatMultipleTagResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareTagsAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatTagTokenView(sortedResults, t));
  lines.push("");
  lines.push(formatSeparator());
  lines.push("");

  lines.push(formatSectionTitle(t("tagConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("tagNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("tagMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(`${getDifficultyNameText(mismatch.fileName)}`);

      if (mismatch.removed.length) {
        lines.push(`  <span class="result-error">${escapeHtml(t("tagRemoved"))}:</span> ${mismatch.removed.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`);
      }

      if (mismatch.added.length) {
        lines.push(`  <span class="result-error">${escapeHtml(t("tagAdded"))}:</span> ${mismatch.added.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagSpacingCheck")));
  lines.push("");

  const spacingGroups = groupTagSpacingResults(sortedResults);

  if (!spacingGroups.length) {
    lines.push(t("noTagIssues"));
  } else {
    lines.push(
      spacingGroups
        .map(group => formatTagSpacingGroupResult(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagDuplicateCheck")));
  lines.push("");

  const duplicateGroups = groupTagResultsByNormalizedTags(sortedResults)
    .filter(group => group.representative.duplicateTags?.length > 0);

  if (!duplicateGroups.length) {
    lines.push(t("noDuplicateTags"));
  } else {
    lines.push(
      duplicateGroups
        .map(group => formatTagDuplicateResult(group.representative, t, group))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagMetadataDuplicateCheck")));
  lines.push("");

  const metadataDuplicateGroups = groupTagMetadataDuplicateTags(sortedResults);

  if (!metadataDuplicateGroups.length) {
    lines.push(t("noTagMetadataDuplicateTags"));
  } else {
    lines.push(
      metadataDuplicateGroups
        .map(group => formatTagMetadataDuplicateGroup(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagSpellingCheck")));
  lines.push("");

  const spellingGroups = groupTagResultsByNormalizedTags(sortedResults)
    .filter(group => group.representative.spellingSuggestions?.length > 0);

  if (!spellingGroups.length) {
    lines.push(t("noTagSpellingSuggestions"));
  } else {
    lines.push(
      spellingGroups
        .map(group => formatTagSpellingResult(group.representative, t, group))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagRelatedCheck")));
  lines.push("");

  const relatedGroups = groupTagResultsByNormalizedTags(sortedResults)
    .filter(group => group.representative.relatedSuggestions?.length > 0);

  if (!relatedGroups.length) {
    lines.push(t("noTagRelatedSuggestions"));
  } else {
    lines.push(
      relatedGroups
        .map(group => formatTagRelatedResult(group.representative, t, group))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagMetadataRelatedCheck")));
  lines.push("");

  const metadataGroups = groupTagMetadataSuggestions(sortedResults);

  if (!metadataGroups.length) {
    lines.push(t("noTagMetadataSuggestions"));
  } else {
    lines.push(
      metadataGroups
        .map(group => formatTagMetadataSuggestionGroup(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagSourceRelatedCheck")));
  lines.push("");

  const sourceGroups = groupTagSourceSuggestions(sortedResults);

  if (!sourceGroups.length) {
    lines.push(t("noTagSourceSuggestions"));
  } else {
    lines.push(
      sourceGroups
        .map(group => formatTagSourceSuggestionGroup(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  return lines.join("\n").trimEnd();
}

/** Tagを一覧表示 */
function formatTagTokenView(results, t) {
  const groups = groupTagResultsByNormalizedTags(results);

  const lines = [];

  lines.push(formatSectionTitle(t("tagTokenView")));
  lines.push("");

  for (const group of groups) {
    const result = group.representative;
    const tags = getTagWords(result.tags);

    lines.push(formatGroupedTagHeader(group));
    lines.push("");

    if (!tags.length) {
      lines.push(t("tagTokenViewEmpty"));
      lines.push("");
      continue;
    }

    lines.push(
      `<div class="tag-token-list">` +
      tags
        .map(tag => `<span class="tag-token">${escapeHtml(tag)}</span>`)
        .join(" ") +
      `</div>`
    );

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** アーティストとタイトルのスペース問題感知用の共通関数 */
function formatMetadataSpacingIssue(issue, t) {
  const message =
    issue.type === "multipleHalfWidthSpaces"
      ? t("metadataMultipleHalfWidthSpaces")
      : issue.type === "fullWidthSpace"
        ? t("metadataFullWidthSpace")
        : "Spacing issue";

  return (
    `<span class="result-error">${escapeHtml(message)}</span>` +
    ` | ${escapeHtml(t("metadataField"))}: <code>${escapeHtml(issue.fieldName)}</code>` +
    ` | ${escapeHtml(t("metadataContext"))}: <code>${escapeHtml(issue.context)}</code>`
  );
}

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
  lines.push("");


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
  lines.push("");
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
  lines.push("");
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
  lines.push("");
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
  lines.push("");

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
  lines.push("");
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
  lines.push("");
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
  lines.push("");
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

/** タグ */
function formatTagSpacingGroupResult(group, t) {
  const lines = [];

  lines.push(formatGroupedTagHeader(group));
  lines.push("");

  for (const item of group.items) {
    if (item.type === "missing") {
      lines.push(`<span class="result-error">${escapeHtml(t("tagMissing"))}</span>`);
      continue;
    }

    const label =
      item.type === "multipleSpaces"
        ? t("tagMultipleSpaces")
        : t("tagFullWidthSpace");

    lines.push(`<span class="result-error">${escapeHtml(label)}: ${escapeHtml(t("detected"))}</span>`);
    lines.push(`  <code>${escapeHtml(item.context)}</code>`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function groupTagSpacingResults(results) {
  const groups = new Map();

  for (const result of results) {
    for (const item of result.results ?? []) {
      const key = getTagSpacingGroupKey(item);

      if (!groups.has(key)) {
        groups.set(key, {
          representative: result,
          fileNames: [],
          items: []
        });
      }

      const group = groups.get(key);

      group.fileNames.push(result.fileName);

      if (!group.items.length) {
        group.items.push(item);
      }
    }
  }

  return [...groups.values()];
}

function getTagSpacingGroupKey(item) {
  if (item.type === "missing") {
    return "missing";
  }

  return [
    item.type,
    item.context ?? ""
  ].join("::");
}

function groupTagResultsByNormalizedTags(results) {
  const groups = new Map();

  for (const result of results) {
    const key = result.normalizedTags ?? "";

    if (!groups.has(key)) {
      groups.set(key, {
        representative: result,
        fileNames: []
      });
    }

    groups.get(key).fileNames.push(result.fileName);
  }

  return [...groups.values()];
}

function formatGroupedTagHeader(group) {
  const names = group.fileNames.map(fileName => getDifficultyNameText(fileName));

  if (names.length === 1) {
    return names[0];
  }

  return names.join(", ");
}

function formatTagSpellingResult(result, t, group = null) {
  const lines = [];

  lines.push(group ? formatGroupedTagHeader(group) : getDifficultyNameText(result.fileName));
  lines.push("");

  for (const item of result.spellingSuggestions) {
    lines.push(
      `<span class="result-error">${escapeHtml(t("tagPossibleTypo"))}:</span> <code>${escapeHtml(item.tag)}</code> → <code>${escapeHtml(item.suggestion)}</code>`
    );
  }

  return lines.join("\n").trimEnd();
}

function formatTagDuplicateResult(result, t, group = null) {
  const lines = [];

  lines.push(group ? formatGroupedTagHeader(group) : getDifficultyNameText(result.fileName));
  lines.push("");

  for (const item of result.duplicateTags ?? []) {
    const variants = (item.variants ?? [item.tag])
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    lines.push(
      `<span class="result-warn">${escapeHtml(t("tagDuplicateFound"))}:</span> ` +
      `${variants} ` +
      `<span class="result-note">(${escapeHtml(t("tagDuplicateCount"))}: ${escapeHtml(String(item.count))})</span>`
    );
  }

  return lines.join("\n").trimEnd();
}

function groupTagMetadataDuplicateTags(results) {
  const map = new Map();

  for (const result of results) {
    for (const item of result.metadataDuplicateTags ?? []) {
      const fields = [...new Set(item.fields ?? [])].sort();
      const variants = [...new Set(item.metadataVariants ?? [])].sort();
      if (!fields.length) continue;

      const key = [
        normalizeTagToken(item.tag),
        fields.join("|"),
        variants.join("|")
      ].join("::");

      if (!map.has(key)) {
        map.set(key, {
          tag: item.tag,
          fields,
          metadataVariants: variants,
          fileNames: []
        });
      }

      map.get(key).fileNames.push(result.fileName);
    }
  }

  return [...map.values()];
}

function formatTagMetadataDuplicateGroup(group, t) {
  const lines = [];

  lines.push(
    group.fileNames
      .map(fileName => getDifficultyNameText(fileName))
      .join(", ")
  );

  lines.push("");
  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagMetadataDuplicateFound"))}:</span> ` +
    `<code>${escapeHtml(group.tag)}</code>`
  );
  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagMetadataFields"))}:</span> ` +
    group.fields
      .map(field => `<code>${escapeHtml(field)}</code>`)
      .join(" ")
  );

  if (group.metadataVariants?.length) {
    lines.push(
      `<span class="result-warn">${escapeHtml(t("tagMetadataDuplicateSourceWords"))}:</span> ` +
      group.metadataVariants
        .map(tag => `<code>${escapeHtml(tag)}</code>`)
        .join(" ")
    );
  }

  return lines.join("\n");
}

function formatTagRelatedResult(result, t, group = null) {
  const lines = [];

  lines.push(group ? formatGroupedTagHeader(group) : getDifficultyNameText(result.fileName));
  lines.push("");

  for (const item of result.relatedSuggestions) {
    const present = item.present
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    const alreadyIncluded = (item.presentSuggestions ?? [])
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    const alreadyIncludedInSource = (item.presentSourceSuggestions ?? [])
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    const suggestions = item.suggestions
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    lines.push(`<span class="result-warn">${escapeHtml(t("tagRelatedTrigger"))}:</span> ${present}`);

    if (alreadyIncluded) {
      lines.push(`<span class="result-warn">${escapeHtml(t("tagAlreadyIncluded"))}:</span> ${alreadyIncluded}`);
    }
    if (alreadyIncludedInSource) {
      lines.push(
        `<span class="result-warn">${escapeHtml(t("tagAlreadyIncludedInSource"))}:</span> ${alreadyIncludedInSource}`
      );
    }

    lines.push(`<span class="result-warn">${escapeHtml(t("tagSuggestedAdditions"))}:</span> ${suggestions}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function groupTagSourceSuggestions(results) {
  const map = new Map();

  for (const result of results) {
    const tagSet = new Set(getNormalizedTagWords(result.tags ?? ""));

    for (const item of result.sourceSuggestions ?? []) {
      const suggestions = [...new Set(item.suggestions ?? [])].sort();
      if (!suggestions.length) continue;

      const alreadyIncluded = [...new Set(item.expectedTags ?? [])]
        .map(normalizeTagToken)
        .filter(tag => tagSet.has(tag))
        .sort();

      const key = [
        item.source,
        alreadyIncluded.join("|"),
        suggestions.join("|")
      ].join("::");

      if (!map.has(key)) {
        map.set(key, {
          source: item.source,
          alreadyIncluded,
          suggestions,
          fileNames: []
        });
      }

      map.get(key).fileNames.push(result.fileName);
    }
  }

  return [...map.values()];
}

function groupTagMetadataSuggestions(results) {
  const map = new Map();

  for (const result of results) {
    for (const item of result.metadataSuggestions ?? []) {
      const fields = [...new Set(item.fields ?? [])].sort();
      const suggestions = [...new Set(item.suggestions ?? [])].sort();
      if (!fields.length || !suggestions.length) continue;

      const key = [
        fields.join("|"),
        item.marker ?? "",
        suggestions.join("|")
      ].join("::");

      if (!map.has(key)) {
        map.set(key, {
          fields,
          marker: item.marker,
          suggestions,
          fileNames: []
        });
      }

      map.get(key).fileNames.push(result.fileName);
    }
  }

  return [...map.values()];
}

function formatTagMetadataSuggestionGroup(group, t) {
  const lines = [];

  lines.push(
    group.fileNames
      .map(fileName => getDifficultyNameText(fileName))
      .join(", ")
  );

  lines.push("");
  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagMetadataFields"))}:</span> ` +
    group.fields
      .map(field => `<code>${escapeHtml(field)}</code>`)
      .join(" ")
  );
  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagMetadataMarker"))}:</span> ` +
    `<code>${escapeHtml(group.marker)}</code>`
  );
  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagSuggestedAdditions"))}:</span> ` +
    group.suggestions
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ")
  );

  return lines.join("\n");
}

function formatTagSourceSuggestionGroup(group, t) {
  const lines = [];

  lines.push(
    group.fileNames
      .map(fileName => getDifficultyNameText(fileName))
      .join(", ")
  );

  lines.push("");

  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagSource"))}:</span> ` +
    `<code>${escapeHtml(group.source)}</code>`
  );

  if (group.alreadyIncluded?.length) {
    lines.push(
      `<span class="result-warn">${escapeHtml(t("tagAlreadyIncluded"))}:</span> ` +
      group.alreadyIncluded
        .map(tag => `<code>${escapeHtml(tag)}</code>`)
        .join(" ")
    );
  }

  lines.push(
    `<span class="result-warn">${escapeHtml(t("tagSuggestedAdditions"))}:</span> ` +
    group.suggestions
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ")
  );

  return lines.join("\n");
}

/** メタデータ：東方チェック */
function formatMultipleSourceResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareSourcesAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatMetadataFieldView(sortedResults, t, [
    { key: "source", label: "Source" }
  ]));
  lines.push("");
  lines.push(formatSeparator());
  lines.push("");

  lines.push(formatSectionTitle(t("sourceConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("sourceNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("sourceMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(`${getDifficultyNameText(mismatch.fileName)}`);
      lines.push(`  ${escapeHtml(t("sourceBase"))}: <code>${escapeHtml(mismatch.baseSource)}</code>`);
      lines.push(`  <span class="result-error">${escapeHtml(t("sourceCurrent"))}:</span> <code>${escapeHtml(mismatch.source)}</code>`);
      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("sourceCheckTitle")));
  lines.push("");

  const groups = groupSourceResults(sortedResults);

  if (!groups.length) {
    lines.push(t("noSourceIssues"));
  } else {
    lines.push(
      groups
        .map(group => formatSourceGroupResult(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  return lines.join("\n").trimEnd();
}

function groupSourceResults(results) {
  const groups = new Map();

  for (const result of results) {
    const key = getSourceGroupKey(result);

    if (!groups.has(key)) {
      groups.set(key, {
        representative: result,
        fileNames: [],
        results: []
      });
    }

    const group = groups.get(key);

    group.fileNames.push(result.fileName);

    // 同じ内容は1回だけ保持
    if (!group.results.length) {
      group.results.push(result);
    }
  }

  return [...groups.values()];
}

function getSourceGroupKey(result) {
  return [
    result.level,
    result.type,
    result.source ?? "",
    result.expected ?? "",
    result.link ?? ""
  ].join("::");
}

function formatSourceGroupResult(group, t) {
  const result = group.results[0];
  const lines = [];

  // Diff一覧
  lines.push(
    group.fileNames
      .map(name => getDifficultyNameText(name))
      .join(", ")
  );

  lines.push("");

  if (result.source) {
    lines.push(`Source: <code>${escapeHtml(result.source)}</code>`);
    lines.push("");
  }

  if (result.level === "ok") {
    lines.push(`<span class="ok">${escapeHtml(t("sourceOk"))}</span>`);

    if (result.link) {
      lines.push(
        `<a href="${escapeHtml(result.link)}" target="_blank">${escapeHtml(result.link)}</a>`
      );
    }

    return lines.join("\n");
  }

  if (result.type === "generic") {
    lines.push(`<span class="result-warn">${escapeHtml(t("sourceGenericTouhou"))}</span>`);
    return lines.join("\n");
  }

  if (result.type === "recommended") {
    lines.push(
      `<span class="result-warn">${escapeHtml(t("sourceRecommendedFormatting"))}</span>`
    );
    lines.push(
      `${escapeHtml(t("sourceExpected"))}: ` +
      `<code>${escapeHtml(result.expected)}</code>`
    );
    return lines.join("\n");
  }

  if (result.type === "partial") {
    lines.push(
      `<span class="result-error">${escapeHtml(t("sourceInvalidTouhou"))}</span>`
    );

    lines.push(
      `${escapeHtml(t("sourceExpected"))}: ` +
      `<code>${escapeHtml(result.expected)}</code>`
    );

    lines.push("");

    lines.push(
      `<span class="result-note">` +
      `${escapeHtml(t("sourcePartialNote"))}` +
      `</span>`
    );

    if (result.link) {
      lines.push(
        `<a href="${escapeHtml(result.link)}" target="_blank">` +
        `${escapeHtml(result.link)}` +
        `</a>`
      );
    }

    return lines.join("\n");
  }

  if (result.type === "unknown") {
    lines.push(`<span class="result-warn">${escapeHtml(t("sourceUnknownTouhou"))}</span>`);
    return lines.join("\n");
  }

  // 東方作品ではない場合
  lines.push(
    `<span class="result-info">${escapeHtml(t("sourceNotTouhou"))}</span>`
  );

  return lines.join("\n");
}

/** コンテンツ使用許可 */
const CONTENT_PERMISSION_CATEGORY_ORDER = [
  "conditionalArtist",
  "disallowedArtist",
  "conditionalLabel",
  "permissionRequired",
  "pastDmca",
  "personalBan"
];

function getContentPermissionCategoryTitle(category, t) {
  const keyMap = {
    conditionalArtist: "contentPermissionConditionalArtists",
    disallowedArtist: "contentPermissionDisallowedArtists",
    conditionalLabel: "contentPermissionConditionalLabels",
    pastDmca: "contentPermissionPastDmca",
    personalBan: "contentPermissionPersonalBans",
    permissionRequired: "contentPermissionPermissionRequired"
  };

  return t(keyMap[category] ?? "contentPermissionOther");
}

function formatMultipleContentPermissionResults(results, t) {
  const matchedResults = results.filter(result =>
    result.results?.length
  );

  if (!matchedResults.length) {
    return escapeHtml(t("noContentPermissionIssues"));
  }

  const rows = [];

  for (const result of matchedResults) {
    for (const item of result.results) {
      rows.push({
        fileName: result.fileName,
        item
      });
    }
  }

  const lines = [];

  for (const category of CONTENT_PERMISSION_CATEGORY_ORDER) {
    const categoryRows = rows.filter(row =>
      row.item.category === category
    );

    if (!categoryRows.length) continue;

    lines.push(formatSectionTitle(
      getContentPermissionCategoryTitle(category, t)
    ));
    lines.push("");

    const groupedRows = groupContentPermissionRows(categoryRows);

    for (const group of groupedRows) {
      const item = group.item;

      const cls =
        item.level === "error"
          ? "result-error"
          : "result-warn";

      lines.push(
        group.fileNames
          .map(fileName => getDifficultyNameText(fileName))
          .join(", ")
      );

      lines.push("");

      const lang = localStorage.getItem("moddingHelperLang") || "ja";

      const message =
        t(item.messageKey) ||
        (lang === "en" ? item.messageEn : item.messageJa) ||
        item.messageJa ||
        item.messageEn ||
        item.title;

      lines.push(
        `<span class="${cls}">` +
        `${escapeHtml(message)}` +
        `</span>`
      );

      if (item.matchedFields?.length) {
        lines.push("");

        for (const matched of item.matchedFields) {
          lines.push(
            `${escapeHtml(t("matchedField"))}: ` +
            `<code>${escapeHtml(matched.field)}</code> | ` +
            `${escapeHtml(t("matchedKeywords"))}: ` +
            matched.keywords
              .map(keyword => `<code>${escapeHtml(keyword)}</code>`)
              .join(" ")
          );
        }
      }

      const links = item.links?.length
        ? item.links
        : item.link
          ? [{ label: "Reference", url: item.link }]
          : [];

      if (links.length) {
        lines.push("");

        for (const link of links) {
          lines.push(
            `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">` +
            `${escapeHtml(link.label)}` +
            `</a>`
          );
        }
      }

      lines.push("");
    }

    lines.push(formatSeparator());
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function groupContentPermissionRows(rows) {
  const map = new Map();

  for (const row of rows) {
    const item = row.item;

    const matchedKey = (item.matchedFields ?? [])
      .map(field =>
        `${field.field}:${[...(field.keywords ?? [])].sort().join(",")}`
      )
      .sort()
      .join("|");

      const linkKey = item.links?.length
        ? item.links.map(link => `${link.label}:${link.url}`).join("|")
        : item.link || "";

      const key = [
        item.category,
        item.level,
        item.title,
        item.messageJa,
        item.messageEn,
        linkKey,
        matchedKey
      ].join("::");

    if (!map.has(key)) {
      map.set(key, {
        item,
        fileNames: []
      });
    }

    map.get(key).fileNames.push(row.fileName);
  }

  return [...map.values()];
}
