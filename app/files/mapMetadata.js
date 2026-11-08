// ファイルからメタデータと背景画像を抽出する。画面の状態には依存しない。
// .osu テキストからメタデータを取り出す
function metaFromOsuText(text, bgDataUrl) {
  return {
    artist:        parseMetadataValue(text, "Artist"),
    artistUnicode: parseMetadataValue(text, "ArtistUnicode"),
    title:         parseMetadataValue(text, "Title"),
    titleUnicode:  parseMetadataValue(text, "TitleUnicode"),
    creator:       parseMetadataValue(text, "Creator"),
    beatmapSetId:  parseMetadataValue(text, "BeatmapSetID"),
    beatmapId:     parseMetadataValue(text, "BeatmapID"),
    source:        parseMetadataValue(text, "Source"),
    tags:          parseMetadataValue(text, "Tags"),
    bgDataUrl:     bgDataUrl || null
  };
}

function parseBgFilename(text) {
  const m = text.match(/^\s*0\s*,\s*0\s*,\s*"(.+?)"/m);
  return m ? m[1] : "";
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

// 読み込んだ File からメタデータ（+ .osz なら BG）を抽出
async function extractMapMetaFromFile(file) {
  if (!file) return null;
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".osu")) {
    const text = await file.text();
    return metaFromOsuText(text, null);
  }

  if (lower.endsWith(".osz")) {
    const zip = await loadOszZip(file);
    const osuEntries = Object.values(zip.files)
      .filter(e => !e.dir && e.name.toLowerCase().endsWith(".osu"));

    let chosenEntry = null;
    let chosenText  = null;
    for (const entry of osuEntries) {
      const text = await entry.async("text");
      if (parseMode(text) === 1) { chosenEntry = entry; chosenText = text; break; }
      if (!chosenEntry) { chosenEntry = entry; chosenText = text; }  // taiko が無ければ先頭
    }
    if (!chosenText) return null;

    let bgDataUrl = null;
    const bgName = parseBgFilename(chosenText);
    if (bgName && typeof findOszImageEntry === "function") {
      const imgEntry = findOszImageEntry(zip, chosenEntry.name, bgName);
      if (imgEntry) {
        try { bgDataUrl = await blobToDataUrl(await imgEntry.async("blob")); } catch {}
      }
    }
    return metaFromOsuText(chosenText, bgDataUrl);
  }

  return null;
}

