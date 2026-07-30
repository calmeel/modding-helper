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
