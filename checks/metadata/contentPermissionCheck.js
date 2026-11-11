function normalizeContentPermissionText(text) {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function runContentPermissionCheck(text, fileName) {
  const artistLine = findMetadataLine(text, "Artist");
  const artistUnicodeLine = findMetadataLine(text, "ArtistUnicode");

  const titleLine = findMetadataLine(text, "Title");
  const titleUnicodeLine = findMetadataLine(text, "TitleUnicode");

  const sourceLine = findMetadataLine(text, "Source");
  const tagsLine = findMetadataLine(text, "Tags");

  const artist =
    normalizeContentPermissionText(
      artistLine?.value ?? ""
    );

  const artistUnicode =
    normalizeContentPermissionText(
      artistUnicodeLine?.value ?? ""
    );

  const title =
    normalizeContentPermissionText(
      titleLine?.value ?? ""
    );

  const titleUnicode =
    normalizeContentPermissionText(
      titleUnicodeLine?.value ?? ""
    );

  const source =
    normalizeContentPermissionText(
      sourceLine?.value ?? ""
    );

  const tags =
    normalizeContentPermissionText(
      tagsLine?.value ?? ""
    );

  const results = [];

  for (const rule of CONTENT_PERMISSION_RULES) {
    const matchedFields = [];

    for (const field of rule.fields) {
      const targetText =
        field === "artist"
          ? artist
          : field === "artistUnicode"
            ? artistUnicode
            : field === "title"
              ? title
              : field === "titleUnicode"
                ? titleUnicode
                : field === "source"
                  ? source
                  : field === "tags"
                    ? tags
                    : "";

      const matchedKeywords = rule.keywords.filter(keyword =>
        matchesContentPermissionKeyword(
          targetText,
          keyword,
          rule.keywordMatchModes?.[keyword] ?? rule.matchMode
        )
      );

      if (matchedKeywords.length) {
        matchedFields.push({
          field,
          keywords: matchedKeywords
        });
      }
    }

    if (!matchedFields.length) continue;

    results.push({
      category: rule.category,
      level: rule.level,
      title: rule.title,
      messageJa: rule.messageJa,
      messageEn: rule.messageEn,
      link: rule.link,
      links: rule.links ?? [],
      matchedFields,
      matchedKeywords: matchedFields.flatMap(item => item.keywords)
    });
  }

  return {
    fileName,
    results
  };
}

function matchesContentPermissionKeyword(targetText, keyword, matchMode = "contains") {
  const normalizedKeyword = normalizeContentPermissionText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  if (matchMode === "word") {
    return matchesContentPermissionWord(targetText, normalizedKeyword);
  }

  return targetText.includes(normalizedKeyword);
}

function matchesContentPermissionWord(targetText, keyword) {
  let index = 0;

  while (index < targetText.length) {
    const foundIndex = targetText.indexOf(keyword, index);
    if (foundIndex === -1) return false;

    const before = foundIndex > 0 ? targetText[foundIndex - 1] : "";
    const afterIndex = foundIndex + keyword.length;
    const after = afterIndex < targetText.length ? targetText[afterIndex] : "";

    if (!isContentPermissionWordChar(before) && !isContentPermissionWordChar(after)) {
      return true;
    }

    index = foundIndex + keyword.length;
  }

  return false;
}

function isContentPermissionWordChar(char) {
  return /[a-z0-9]/.test(char);
}
