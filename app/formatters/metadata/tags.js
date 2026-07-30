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

    lines.push(`<span class="result-warn">${escapeHtml(label)}: ${escapeHtml(t("detected"))}</span>`);
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
