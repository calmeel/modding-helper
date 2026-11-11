function findSourceFormattingSuggestion(source) {
  const normalized = String(source ?? "").trim();
  const lower = normalized.toLowerCase();

  if (
    normalized !== BLUE_ARCHIVE_SOURCE &&
    (normalized === "ブルーアーカイブ" || lower === "blue archive")
  ) {
    return { expected: BLUE_ARCHIVE_SOURCE };
  }

  if (
    normalized !== PROJECT_SEKAI_SOURCE &&
    (
      normalized.includes("プロジェクトセカイ") ||
      lower.includes("project sekai")
    )
  ) {
    return { expected: PROJECT_SEKAI_SOURCE };
  }

  if (
    normalized !== UMA_MUSUME_SOURCE &&
    normalized.includes("ウマ娘")
  ) {
    return { expected: UMA_MUSUME_SOURCE };
  }

  return null;
}

function normalizeTouhouSourceLoose(source) {
  return String(source ?? "")
    .trim()
    .toLowerCase()
    .replace(/[　\s]/g, "")
    .replace(/[～〜~]/g, "～")
    .replace(/[.。]/g, "");
}

function runSourceCheck(text, fileName) {
  const source = parseSource(text);

  if (!source) {
    return {
      fileName,
      level: "none",
      message: "Source not found"
    };
  }

  const normalized = source.trim();
  const sourceFormatting = findSourceFormattingSuggestion(normalized);
  const finalize = result => {
    if (!sourceFormatting) return result;

    return {
      ...result,
      level: result.level === "error" ? "error" : "warn",
      sourceFormatting
    };
  };

  const looseNormalized = normalizeTouhouSourceLoose(normalized);

  // 汎用ワードだけ
  if (/^(東方|東方project|東方 project|touhou|touhou project)$/i.test(normalized)) {
    return finalize({
      fileName,
      level: "warn",
      source,
      type: "generic"
    });
  }

  // 完全一致
  const exact = TOUHOU_SOURCE_LIST.find(
    item => item.name === normalized
  );

  if (exact) {
    return finalize({
      fileName,
      level: "ok",
      source,
      type: "exact",
      link: exact.link
    });
  }

  // ゆるい一致
  const partial = TOUHOU_SOURCE_LIST.find(item =>
    normalizeTouhouSourceLoose(item.name) === looseNormalized
  );

  if (partial) {
    return finalize({
      fileName,
      level: "error",
      source,
      type: "partial",
      expected: partial.name,
      link: partial.link
    });
  }

  // 東方っぽい文字列 or 東方作品候補
  const looksTouhou =
    /東方|touhou/i.test(normalized) ||
    TOUHOU_SOURCE_LIST.some(item => {
      const itemNormalized = normalizeTouhouSourceLoose(item.name);

      return (
        itemNormalized.includes(looseNormalized) ||
        looseNormalized.includes(itemNormalized)
      );
    });

  if (!looksTouhou) {
    return finalize({
      fileName,
      level: "none",
      source,
      type: "notTouhou"
    });
  }

  // 不明な東方作品っぽい
  return finalize({
    fileName,
    level: "warn",
    source,
    type: "unknown"
  });
}

function parseSource(text) {
  const lines = text.split(/\r?\n/);
  let inMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Metadata]") {
      inMetadata = true;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("Source:")) {
        return line.slice(line.indexOf(":") + 1).trim();
      }
    }
  }

  return "";
}

function normalizeSourceForCompare(source) {
  return String(source ?? "")
    .trim()
    .replace(/　/g, " ")
    .replace(/\s+/g, " ");
}

function compareSourcesAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      base: results?.[0] ?? null,
      mismatches: []
    };
  }

  const base = results[0];
  const baseSource = normalizeSourceForCompare(base.source ?? "");

  const mismatches = [];

  for (const result of results.slice(1)) {
    const source = normalizeSourceForCompare(result.source ?? "");

    if (source === baseSource) continue;

    mismatches.push({
      fileName: result.fileName,
      baseFileName: base.fileName,
      source: result.source ?? "",
      baseSource: base.source ?? ""
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}
