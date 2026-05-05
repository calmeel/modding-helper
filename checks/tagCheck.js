function runTagCheck(text, fileName) {
  const tagsLine = findMetadataTagsLine(text);
  const results = [];

  if (!tagsLine) {
    return {
      fileName,
      tags: "",
      normalizedTags: "",
      results: [
        {
          type: "missing",
          message: "Tags line not found"
        }
      ]
    };
  }

  const tags = tagsLine.value;
  const normalizedTags = normalizeTagsForCompare(tags);

  const multiSpaceMatches = [...tags.matchAll(/ {2,}/g)];
  for (const match of multiSpaceMatches) {
    const index = match.index;
    const context = getTagIssueContextAroundSpace(tags, index);

    results.push({
      type: "multipleSpaces",
      label: "2つ以上の半角スペース",
      context
    });
  }

  const fullWidthSpaceMatches = [...tags.matchAll(/　/g)];
  for (const match of fullWidthSpaceMatches) {
    const index = match.index;
    const context = getTagIssueContextAroundSpace(tags, index);

    results.push({
      type: "fullWidthSpace",
      label: "全角スペース",
      context
    });
  }

  return {
    fileName,
    tags,
    normalizedTags,
    results
  };
}

function findMetadataTagsLine(text) {
  const lines = text.split(/\r?\n/);

  let inMetadata = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === "[Metadata]") {
      inMetadata = true;
      continue;
    }

    if (inMetadata) {
      if (trimmed.startsWith("[")) break;

      if (trimmed.startsWith("Tags:")) {
        return {
          lineNo: i + 1,
          value: lines[i].slice(lines[i].indexOf(":") + 1)
        };
      }
    }
  }

  return null;
}

function normalizeTagsForCompare(tags) {
  return String(tags)
    .trim()
    .replace(/　/g, " ")
    .replace(/\s+/g, " ");
}

function getTagWords(tags) {
  const normalized = normalizeTagsForCompare(tags);

  if (!normalized) return [];

  return normalized.split(" ");
}

function compareTagsAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      base: results?.[0] ?? null,
      mismatches: []
    };
  }

  const validResults = results.filter(result => result.normalizedTags !== undefined);

  if (validResults.length < 2) {
    return {
      hasMismatch: false,
      base: validResults[0] ?? null,
      mismatches: []
    };
  }

  const base = validResults[0];
  const baseWords = getTagWords(base.tags);
  const baseSet = new Set(baseWords);

  const mismatches = [];

  for (const result of validResults.slice(1)) {
    if (result.normalizedTags === base.normalizedTags) continue;

    const words = getTagWords(result.tags);
    const set = new Set(words);

    const removed = baseWords.filter(tag => !set.has(tag));
    const added = words.filter(tag => !baseSet.has(tag));

    mismatches.push({
      fileName: result.fileName,
      baseFileName: base.fileName,
      removed,
      added,
      tags: result.tags,
      baseTags: base.tags
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}

function getTagIssueContextAroundSpace(tags, index) {
  const left = tags.slice(0, index);
  const right = tags.slice(index);

  const leftMatch = left.match(/[^\s　]+$/);
  const rightMatch = right.match(/^[\s　]+[^\s　]+/);

  const leftWord = leftMatch ? leftMatch[0] : "";
  const rightPart = rightMatch ? rightMatch[0] : "";

  return `${leftWord}${rightPart}`.trim();
}