function runTitleCheck(text, fileName) {
  const title = parseMetadataValue(text, "Title");
  const titleUnicode = parseMetadataValue(text, "TitleUnicode");

  return {
    fileName,
    title,
    titleUnicode,

    symbolIssues: findMetadataSymbolRomanisationIssues(
      titleUnicode,
      title,
      "Title"
    ),

    spacingIssues: [
      ...findMetadataSpacingIssues(title, "Title"),
      ...findMetadataSpacingIssues(titleUnicode, "TitleUnicode")
    ],

    markerIssues: [
      ...findTitleMarkerIssues(title, "Title"),
      ...findTitleMarkerIssues(titleUnicode, "TitleUnicode"),

      ...findTitleFeatMarkerIssues(title, "Title"),
      ...findTitleFeatMarkerIssues(titleUnicode, "TitleUnicode")
    ]
  };
}

const TITLE_MARKER_RULES = [
  {
    expected: "(TV Size)",
    patterns: [
      /\bTV\s*size\b/gi,
      /\bTV\s*ver\.?\b/gi,
      /\bTV\s*version\b/gi,
      /\banime\s*OP\b/gi,
      /\bOP\s*version\b/gi
    ]
  },
  {
    expected: "(Cut Ver.)",
    patterns: [
      /\bcut\s*ver\.?\b/gi,
      /\bcut\s*version\b/gi,
      /\bcut\s*edit\b/gi
    ]
  },
  {
    expected: "(Extended Edit)",
    patterns: [
      /\bextended\s*edit\.?\b/gi
    ]
  },
  {
    expected: "(Extended Ver.)",
    patterns: [
      /\bextended\s*version\b/gi,
      /\bextended\s*ver\b/gi,
      /\bextended\s*ver\.\b/gi
    ]
  },
  {
    expected: "(Sped Up Ver.)",
    patterns: [
      /\bsped\s*up\b/gi,
      /\bspeed\s*up\b/gi,
      /\bsped\s*up\s*ver\.?\b/gi,
      /\bspeed\s*up\s*ver\.?\b/gi
    ]
  },
  {
    expected: "(Nightcore Mix)",
    patterns: [
      /\bnightcore\b/gi,
      /\bnightcore\s*ver\.?\b/gi,
      /\bnightcore\s*version\.?\b/gi,
      /\bnightcore\s*mix\.?\b/gi
    ]
  },
  {
    expected: "(Short Ver.)",
    patterns: [
      /\bshort\b/gi,
      /\bshort\s*ver\.?\b/gi,
      /\bshort\s*version\b/gi
    ]
  },
  {
    expected: "(Long Ver.)",
    patterns: [
      /\blong\b/gi,
      /\blong\s*version\b/gi,
      /\blong\s*ver\b/gi,
      /\blong\s*ver\.\b/gi
    ]
  },
  {
    expected: "(Game Ver.)",
    patterns: [
      /\bgame\s*size\b/gi,
      /\bgame\s*ver\.?\b/gi,
      /\bgame\s*version\b/gi,
      /\bgame\s*OP\s*edit\b/gi,
      /\bOP\s*version\b/gi
    ]
  },
  {
    expected: "(Movie Ver.)",
    patterns: [
      /\bmovie\s*edit\b/gi,
      /\bmovie\s*size\b/gi,
      /\bmovie\s*cut\b/gi,
      /\bmovie\s*ver\.?\b/gi,
      /\bmovie\s*version\b/gi
    ]
  },
  {
    expected: "(Sped Up & Cut Ver.)",
    patterns: [
      /\bsped\s*up\s*(?:&|and)?\s*cut\s*ver\.?\b/gi,
      /\bsped\s*up\s*(?:&|and)?\s*cut\s*version\.?\b/gi,
      /\bsped\s*up\s*(?:&|and)?\s*cut\b/gi,

      /\bspeed\s*up\s*(?:&|and)?\s*cut\s*ver\.?\b/gi,
      /\bspeed\s*up\s*(?:&|and)?\s*cut\s*version\.?\b/gi,
      /\bspeed\s*up\s*(?:&|and)?\s*cut\b/gi
    ]
  },
  {
    expected: "(Nightcore & Cut Ver.)",
    patterns: [
      /\bnightcore\s*(?:&|and)?\s*cut\s*ver\.?\b/gi,
      /\bnightcore\s*(?:&|and)?\s*cut\s*version\.?\b/gi,
      /\bnightcore\s*(?:&|and)?\s*cut\b/gi
    ]
  },
];

function findTitleMarkerIssues(title, fieldName) {
  const text = String(title ?? "");
  const candidates = [];

  if (!text.trim()) return candidates;

  for (const rule of TITLE_MARKER_RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;

      for (const match of text.matchAll(pattern)) {
        const markerRange = extractTitleMarkerRange(text, match.index, match[0].length);
        const marker = text.slice(markerRange.start, markerRange.end);

        const beforeMarker = text[markerRange.start - 1];

        const needsSpaceBeforeMarker =
          markerRange.start > 0 &&
          marker.startsWith("(") &&
          beforeMarker !== " ";

        if (needsSpaceBeforeMarker) {
          candidates.push({
            fieldName,
            type: "titleMarkerSpacing",
            marker,
            expected: " " + marker,
            context: getTitleMarkerIssueContext(text, markerRange.start),
            index: markerRange.start,
            length: markerRange.end - markerRange.start
          });
        }

        // 括弧 marker 全体が許容表記なら、その中の部分一致は全て無視
        if (isAllowedStandardTitleMarker(marker, text)) {
          continue;
        }

        candidates.push({
          fieldName,
          type: "titleMarker",
          marker,
          expected: rule.expected,
          context: getTitleMarkerIssueContext(text, markerRange.start),
          index: markerRange.start,
          length: markerRange.end - markerRange.start
        });
      }
    }
  }

  return dedupeTitleMarkerIssues(
    keepMostSpecificTitleMarkerIssues(candidates)
  );
}

function extractTitleMarkerRange(text, index, length) {
  const left = text.lastIndexOf("(", index);
  const right = text.indexOf(")", index);

  if (left !== -1 && right !== -1 && left < index && index < right) {
    return {
      start: left,
      end: right + 1
    };
  }

  return {
    start: index,
    end: index + length
  };
}

function isAllowedStandardTitleMarker(marker, fullText) {
  const casing = getTitleFieldCasing(fullText);

  for (const rule of TITLE_MARKER_RULES) {
    const variants = getAllowedTitleMarkerVariants(rule.expected, casing);

    if (variants.includes(marker)) {
      return true;
    }
  }

  return false;
}

function getAllowedTitleMarkerVariants(expected, casing) {
  const variants = [expected];

  if (casing === "lower") {
    variants.push(expected.toLowerCase());
  }

  if (casing === "upper") {
    variants.push(expected.toUpperCase());
  }

  return variants;
}

function keepMostSpecificTitleMarkerIssues(issues) {
  return issues.filter(issue => {
    return !issues.some(other => {
      if (issue === other) return false;

      const sameRange =
        issue.index === other.index &&
        issue.length === other.length;

      if (!sameRange) return false;

      return other.expected.length > issue.expected.length;
    });
  });
}

function dedupeTitleMarkerIssues(issues) {
  const seen = new Set();
  const deduped = [];

  for (const issue of issues) {
    const key = `${issue.fieldName}::${issue.marker}->${issue.expected}::${issue.context}`;
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(issue);
  }

  return deduped;
}

function findTitleFeatMarkerIssues(title, fieldName) {
  const text = String(title ?? "");
  const issues = [];

  if (!text.trim()) return issues;

  const casing = getTitleFieldCasing(text);

  const expected =
    casing === "upper"
      ? "FEAT."
      : "feat.";

  // 1. 括弧付き feat 表記
  const parenRegex =
    /\((?:feat\.?|ft\.?|featuring|FEAT\.?|FT\.?|Feat\.?|Ft\.?)\s*[^\)]*\)/g;

  for (const match of text.matchAll(parenRegex)) {
    const found = match[0];
    const index = match.index;

    const beforeParen = text[index - 1];

    const needsSpaceBeforeParen =
      index > 0 &&
      beforeParen !== " ";

    const normalized =
      found.replace(
        /\((?:feat\.?|ft\.?|featuring|FEAT\.?|FT\.?|Feat\.?|Ft\.?)/,
        `(${expected}`
      ).replace(
        /^\((feat\.|FEAT\.)(?=\S)/,
        `($1 `
      );

    if (found !== normalized) {
      issues.push({
        fieldName,
        type: "titleFeatMarker",
        marker: found,
        expected: normalized,
        context: found
      });
    }

    if (needsSpaceBeforeParen) {
      issues.push({
        fieldName,
        type: "titleFeatSpacing",
        marker: found,
        expected: " " + normalized,
        context: getTitleMarkerIssueContext(text, index)
      });
    }
  }

  // 2. 括弧なし feat 表記
  // OK: 爆弾魔 feat. A
  // NG: 爆弾魔 feat.A
  const plainRegex =
    /\b(?:feat\.?|ft\.?|featuring|FEAT\.?|FT\.?|Feat\.?|Ft\.?)(?=\s*\S)/g;

  for (const match of text.matchAll(plainRegex)) {
    const marker = match[0];
    const index = match.index;

    // 既に括弧付き処理で検出される範囲は除外
    if (isInsideParentheses(text, index)) {
      continue;
    }

    const afterMarker =
      text.slice(index + marker.length);

    const spaceMatch =
      afterMarker.match(/^\s*/);

    const spaces =
      spaceMatch ? spaceMatch[0] : "";

    const nextTokenMatch =
      afterMarker
        .slice(spaces.length)
        .match(/^\S+/);

    const nextToken =
      nextTokenMatch ? nextTokenMatch[0] : "";

    const found =
      marker + spaces + nextToken;

    const normalizedMarker =
      expected;

    const expectedFound =
      `${normalizedMarker} ${nextToken}`;

    if (found !== expectedFound) {
      issues.push({
        fieldName,
        type: "titleFeatSpacing",
        marker: found,
        expected: expectedFound,
        context: getTitleMarkerIssueContext(text, index)
      });
    }
  }

  return issues;
}

function isInsideParentheses(text, index) {
  const left = text.lastIndexOf("(", index);
  const right = text.indexOf(")", index);

  return left !== -1 && right !== -1 && left < index && index < right;
}

function getTitleFieldCasing(text) {
  const letters = text.match(/[A-Za-z]/g);

  if (!letters || !letters.length) {
    return "mixed";
  }

  const joined = letters.join("");

  if (joined === joined.toUpperCase()) {
    return "upper";
  }

  if (joined === joined.toLowerCase()) {
    return "lower";
  }

  return "mixed";
}

function getTitleMarkerIssueContext(text, index) {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + 32);
  return text.slice(start, end);
}

function compareTitlesAcrossDiffs(results) {
  if (!results || results.length < 2) {
    return {
      hasMismatch: false,
      base: results?.[0] ?? null,
      mismatches: []
    };
  }

  const base = results[0];
  const mismatches = [];

  for (const result of results.slice(1)) {
    const titleMismatch =
      (result.title ?? "") !== (base.title ?? "");

    const unicodeMismatch =
      (result.titleUnicode ?? "") !== (base.titleUnicode ?? "");

    if (!titleMismatch && !unicodeMismatch) continue;

    mismatches.push({
      fileName: result.fileName,

      titleMismatch,
      unicodeMismatch,

      title: result.title ?? "",
      baseTitle: base.title ?? "",

      titleUnicode: result.titleUnicode ?? "",
      baseTitleUnicode: base.titleUnicode ?? ""
    });
  }

  return {
    hasMismatch: mismatches.length > 0,
    base,
    mismatches
  };
}