function runTagCheck(text, fileName) {
  const tagsLine = findMetadataTagsLine(text);
  const results = [];

  if (!tagsLine) {
    return {
      fileName,
      tags: "",
      results: [
        {
          type: "missing",
          message: "Tags line not found"
        }
      ]
    };
  }

  const tags = tagsLine.value;

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

function getTagIssueContextAroundSpace(tags, index) {
  const left = tags.slice(0, index);
  const right = tags.slice(index);

  const leftMatch = left.match(/[^\s　]+$/);
  const rightMatch = right.match(/^[\s　]+[^\s　]+/);

  const leftWord = leftMatch ? leftMatch[0] : "";
  const rightPart = rightMatch ? rightMatch[0] : "";

  return `${leftWord}${rightPart}`.trim();
}