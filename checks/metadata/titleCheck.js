function runTitleCheck(text, fileName) {
  const title = parseMetadataValue(text, "Title");
  const titleUnicode = parseMetadataValue(text, "TitleUnicode");

  return {
    fileName,
    title,
    titleUnicode,
    symbolIssues: findMetadataSymbolRomanisationIssues(
      titleUnicode,
      title,
      "Title"
    )
  };
}

function compareTitlesAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      base: results?.[0] ?? null,
      mismatches: []
    };
  }

  const base = results[0];
  const mismatches = [];

  for (const result of results.slice(1)) {
    const titleMismatch =
      (result.title ?? "") !== (base.title ?? "");

    const unicodeMismatch =
      (result.titleUnicode ?? "") !== (base.titleUnicode ?? "");

    if (!titleMismatch && !unicodeMismatch) continue;

    mismatches.push({
      fileName: result.fileName,

      titleMismatch,
      unicodeMismatch,

      title: result.title ?? "",
      baseTitle: base.title ?? "",

      titleUnicode: result.titleUnicode ?? "",
      baseTitleUnicode: base.titleUnicode ?? ""
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}