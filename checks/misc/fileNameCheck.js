const OSU_FILE_NAME_INVALID_CHARACTERS = /[\\/:*?"<>|]/g;

function runOsuFileNameCheck(text, fileName) {
  const metadata = {
    artist: parseMetadataValue(text, "Artist"),
    title: parseMetadataValue(text, "Title"),
    creator: parseMetadataValue(text, "Creator"),
    version: parseMetadataValue(text, "Version")
  };
  const missingFields = Object.entries(metadata)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  const actualFileName = getOsuFileBaseName(fileName);
  const expectedFileName = missingFields.length
    ? ""
    : sanitizeOsuFileName(
      `${metadata.artist} - ${metadata.title} (${metadata.creator}) [${metadata.version}].osu`
    );

  return {
    fileName,
    actualFileName,
    expectedFileName,
    missingFields,
    matches: Boolean(expectedFileName) && actualFileName === expectedFileName,
    level: missingFields.length || actualFileName !== expectedFileName ? "warn" : "ok"
  };
}

function sanitizeOsuFileName(value) {
  return String(value ?? "")
    .replace(OSU_FILE_NAME_INVALID_CHARACTERS, "")
    .replace(/[. ]+(?=\.osu$)/i, "");
}

function getOsuFileBaseName(fileName) {
  return String(fileName ?? "").split(/[\\/]/).pop() ?? "";
}
