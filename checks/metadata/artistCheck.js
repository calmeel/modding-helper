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
    )
  };
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