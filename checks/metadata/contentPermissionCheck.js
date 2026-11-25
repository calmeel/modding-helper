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
          rule.keywordMatchModes?.[keyword] ?? rule.matchMode,
          rule.keywordExcludedPhrases?.[keyword]
        ) && (!rule.keywordArtists?.[keyword] || rule.keywordArtists[keyword].some(name =>
          matchesContentPermissionKeyword(artist, name, "word") ||
          matchesContentPermissionKeyword(artistUnicode, name, "word")
        ))
      );

      if (matchedKeywords.length) {
        matchedFields.push({
          field,
          keywords: matchedKeywords
        });
      }
    }

    if (!matchedFields.length) continue;

    if (rule.keywordArtists) {
      const names = [...new Set(matchedFields.flatMap(matched =>
        matched.keywords.flatMap(keyword => rule.keywordArtists[keyword] ?? [])
      ))];
      for (const [field, value] of [["artist", artist], ["artistUnicode", artistUnicode]]) {
        const keywords = names.filter(name => matchesContentPermissionKeyword(value, name, "word"));
        if (keywords.length) matchedFields.push({ field, keywords });
      }
    }

    results.push({
      category: rule.category,
      level: rule.fieldLevels
        ? (matchedFields.some(item => (rule.fieldLevels[item.field] ?? rule.level) === "error")
          ? "error" : "warn")
        : rule.level,
      title: rule.title,
      messageJa: rule.messageJa,
      messageEn: rule.messageEn,
      removedSongsPage: rule.removedSongsPage,
      removedSongsPageEn: rule.removedSongsPageEn,
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

function matchesContentPermissionKeyword(targetText, keyword, matchMode = "contains", excludedPhrases = []) {
  const normalizedKeyword = normalizeContentPermissionText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  // Mask only the allowed name for this keyword, preserving other occurrences
  // of the keyword and matches for every other artist in the same field.
  for (const phrase of excludedPhrases) {
    const normalizedPhrase = normalizeContentPermissionText(phrase);
    if (!normalizedPhrase) continue;
    let index = 0;
    while (index < targetText.length) {
      const start = targetText.indexOf(normalizedPhrase, index);
      if (start === -1) break;
      const end = start + normalizedPhrase.length;
      if (!isContentPermissionWordChar(targetText[start - 1] ?? "") &&
          !isContentPermissionWordChar(targetText[end] ?? "")) {
        targetText = targetText.slice(0, start) + " ".repeat(normalizedPhrase.length) + targetText.slice(end);
      }
      index = end;
    }
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
