const OSU_FILE_NAME_INVALID_CHARACTERS = /[\\/:*?"<>|]/g;
const OSU_SONG_FOLDER_INVALID_CHARACTERS = /[\\/:*?"<>|]/g;

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

function runSongFolderNameCheck(text, folderName) {
  const actualFolderName = String(folderName ?? "");

  if (!actualFolderName) {
    return {
      checked: false,
      actualFolderName: "",
      expectedFolderName: "",
      missingFields: [],
      matches: null,
      level: "ok"
    };
  }

  const artist = parseMetadataValue(text, "Artist");
  const title = parseMetadataValue(text, "Title");
  const beatmapSetId = parseSongFolderBeatmapSetId(
    parseMetadataValue(text, "BeatmapSetID")
  );
  const missingFields = [];

  if (!artist) missingFields.push("artist");
  if (!title) missingFields.push("title");

  const idPrefix = beatmapSetId === null ? "" : `${beatmapSetId} `;
  const expectedFolderName = missingFields.length
    ? ""
    : sanitizeOsuSongFolderName(`${idPrefix}${artist} - ${title}`);

  return {
    checked: true,
    actualFolderName,
    expectedFolderName,
    missingFields,
    matches: Boolean(expectedFolderName) && actualFolderName === expectedFolderName,
    level: missingFields.length || actualFolderName !== expectedFolderName ? "warn" : "ok"
  };
}

function runOszFileNameCheck(text, fileName) {
  const actualFileName = String(fileName ?? "");
  const artist = parseMetadataValue(text, "Artist");
  const title = parseMetadataValue(text, "Title");
  const beatmapSetId = parseSongFolderBeatmapSetId(
    parseMetadataValue(text, "BeatmapSetID")
  );
  const missingFields = [];

  if (!artist) missingFields.push("artist");
  if (!title) missingFields.push("title");

  const idPrefix = beatmapSetId === null ? "" : `${beatmapSetId} `;
  const expectedFileName = missingFields.length
    ? ""
    : `${idPrefix}${artist} - ${title}`
        .replace(OSU_FILE_NAME_INVALID_CHARACTERS, "_") + ".osz";
  // Only the extension is case-insensitive; preserve capitalization in metadata.
  const normalizedActual = actualFileName.replace(/\.osz$/i, ".osz");
  const matches = Boolean(expectedFileName) && normalizedActual === expectedFileName;

  return {
    nameSource: "osz",
    checked: Boolean(actualFileName),
    actualFileName,
    expectedFileName,
    missingFields,
    matches,
    level: matches ? "ok" : "warn"
  };
}

function parseSongFolderBeatmapSetId(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeOsuSongFolderName(value) {
  return String(value ?? "")
    .replace(/\./g, "")
    .replace(OSU_SONG_FOLDER_INVALID_CHARACTERS, "_");
}
