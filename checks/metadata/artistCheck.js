function runArtistCheck(text, fileName) {
  const artist = parseMetadataValue(text, "Artist");
  const artistUnicode = parseMetadataValue(text, "ArtistUnicode");

  return {
    fileName,
    artist,
    artistUnicode,

    symbolIssues: findMetadataSymbolRomanisationIssues(
      artistUnicode,
      artist,
      "Artist"
    ),

    formattingIssues: [
      ...findArtistFormattingIssues(artist, "Artist"),
      ...findArtistFormattingIssues(artistUnicode, "ArtistUnicode")
    ]
  };
}

function findArtistFormattingIssues(artist, fieldName) {
  const text = String(artist ?? "");
  const issues = [];

  if (!text.trim()) return issues;

  const casing = getArtistFieldCasing(text);

  issues.push(...findCommaSpacingIssues(text, fieldName));
  issues.push(...findVsMarkerIssues(text, casing, fieldName));
  issues.push(...findFeatMarkerIssues(text, casing, fieldName));
  issues.push(...findCvVoMarkerIssues(text, fieldName));

  return issues;
}

function getArtistFieldCasing(text) {
  const letters = text.match(/[A-Za-z]/g);
  if (!letters || !letters.length) return "mixed";

  const joined = letters.join("");

  if (joined === joined.toUpperCase()) return "upper";
  if (joined === joined.toLowerCase()) return "lower";

  return "mixed";
}

function getExpectedMarker(marker, casing) {
  if (casing === "upper") return marker.toUpperCase();
  if (casing === "lower") return marker.toLowerCase();
  return marker;
}

function findCommaSpacingIssues(text, fieldName) {
  const issues = [];

  const matches = [...text.matchAll(/,(?=\S)/g)];

  for (const match of matches) {
    issues.push({
      fieldName,
      type: "commaSpacing",
      marker: ",",
      expected: ", ",
      context: getArtistIssueContext(text, match.index)
    });
  }

  return issues;
}

function findVsMarkerIssues(text, casing, fieldName) {
  const issues = [];

  const expected = getExpectedMarker("vs.", casing);

  const regex = /\b(?:versus|vs\.?|VS\.?|Vs\.?)\b\.?/g;

  for (const match of text.matchAll(regex)) {
    const found = match[0];

    if (found === expected && hasValidMarkerSpacing(text, match.index, found.length)) {
      continue;
    }

    issues.push({
      fieldName,
      type: "vsMarker",
      marker: found,
      expected,
      context: getArtistIssueContext(text, match.index)
    });
  }

  return issues;
}

function findFeatMarkerIssues(text, casing, fieldName) {
  const issues = [];

  const expected = getExpectedMarker("feat.", casing);

  const regex = /\b(?:featuring|feat\.?|ft\.?|FEAT\.?|Feat\.?|FT\.?|Ft\.?)\b\.?/g;

  for (const match of text.matchAll(regex)) {
    const found = match[0];

    if (found === expected && hasValidMarkerSpacing(text, match.index, found.length)) {
      continue;
    }

    issues.push({
      fieldName,
      type: "featMarker",
      marker: found,
      expected,
      context: getArtistIssueContext(text, match.index)
    });
  }

  return issues;
}

function findCvVoMarkerIssues(text, fieldName) {
  const issues = [];

  const regex = /(?:c\.v\.|v\.o\.|CV\.|VO\.|cv\.|vo\.|~cv~|~vo~|CV:|VO:|cv:|vo:)/g;

  for (const match of text.matchAll(regex)) {
    const found = match[0];
    const index = match.index;
    const upper = found.toUpperCase();

    const expectedMarker =
      upper.includes("VO")
        ? "VO:"
        : "CV:";

    const format = analyzeCvVoFormat(text, index, found.length, expectedMarker);

    if (found === expectedMarker && format.ok) {
      continue;
    }

    issues.push({
      fieldName,
      type: "cvVoMarker",
      marker: found,
      expected: format.expected,
      context: getArtistIssueContext(text, index)
    });
  }

  return issues;
}

function analyzeCvVoFormat(text, index, length, expectedMarker) {
  const found = text.slice(index, index + length);

  const before = text[index - 1] ?? "";
  const after = text[index + length] ?? "";

  const openParenIndex = text.lastIndexOf("(", index);
  const closeParenIndex = text.indexOf(")", index + length);

  const hasOpenParen = openParenIndex !== -1;
  const hasCloseParen = closeParenIndex !== -1;

  const hasSpaceBeforeOpenParen =
    hasOpenParen &&
    (
      openParenIndex === 0 ||
      text[openParenIndex - 1] === " "
    );

  const markerImmediatelyAfterOpenParen =
    hasOpenParen &&
    openParenIndex + 1 === index;

  const hasSpaceAfterMarker =
    after === " ";

  const ok =
    found === expectedMarker &&
    hasOpenParen &&
    hasCloseParen &&
    hasSpaceBeforeOpenParen &&
    markerImmediatelyAfterOpenParen &&
    hasSpaceAfterMarker;

  return {
    ok,
    expected: buildExpectedCvVoFormat(text, index, length, expectedMarker)
  };
}

function buildExpectedCvVoFormat(text, index, length, expectedMarker) {
  const openParenIndex = text.lastIndexOf("(", index);
  const closeParenIndex = text.indexOf(")", index + length);

  const characterPart =
    openParenIndex !== -1
      ? text.slice(0, openParenIndex).trim()
      : text.slice(0, index).trim();

  const voiceActorPart =
    closeParenIndex !== -1
      ? text.slice(index + length, closeParenIndex).trim()
      : text.slice(index + length).trim();

  const character =
    characterPart || "Character";

  const voiceActor =
    voiceActorPart || "Voice Actor";

  return `${character} (${expectedMarker} ${voiceActor})`;
}

function hasValidMarkerSpacing(text, index, length) {
  const before = text[index - 1];
  const after = text[index + length];

  const hasWordBefore = before && /\S/.test(before);
  const hasWordAfter = after && /\S/.test(after);

  if (hasWordBefore && before !== " ") return false;
  if (hasWordAfter && after !== " ") return false;

  return true;
}

function hasValidCvVoSpacing(text, index, length) {
  const after = text[index + length];

  if (after && /\S/.test(after)) {
    return false;
  }

  return true;
}

function getArtistIssueContext(text, index) {
  const start = Math.max(0, index - 16);
  const end = Math.min(text.length, index + 24);
  return text.slice(start, end);
}

function compareArtistsAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      mismatches: []
    };
  }

  const base = results[0];

  const mismatches = [];

  for (const result of results.slice(1)) {
    const artistMismatch =
      (result.artist ?? "") !== (base.artist ?? "");

    const unicodeMismatch =
      (result.artistUnicode ?? "") !== (base.artistUnicode ?? "");

    if (!artistMismatch && !unicodeMismatch) {
      continue;
    }

    mismatches.push({
      fileName: result.fileName,

      artistMismatch,
      unicodeMismatch,

      artist: result.artist ?? "",
      baseArtist: base.artist ?? "",

      artistUnicode: result.artistUnicode ?? "",
      baseArtistUnicode: base.artistUnicode ?? ""
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}