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
  const issues = [];

  if (!text.trim()) return issues;

  for (const rule of TITLE_MARKER_RULES) {
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;

      for (const match of text.matchAll(pattern)) {
        const found = match[0];

        if (isExactStandardTitleMarker(text, match.index, found.length, rule.expected)) {
          continue;
        }

        issues.push({
          fieldName,
          type: "titleMarker",
          marker: found,
          expected: rule.expected,
          context: getTitleMarkerIssueContext(text, match.index)
        });
      }
    }
  }

  return dedupeTitleMarkerIssues(issues);
}

function isExactStandardTitleMarker(text, index, length, expected) {
  const foundText = text.slice(index, index + length);

  // 完全一致している標準markerは問題なし
  if (
    foundText.toLowerCase() ===
    expected.toLowerCase()
  ) {
    return foundText === expected;
  }

  // matchが marker の中身だけに当たっている場合も考慮
  const start = Math.max(0, index - 2);
  const end = Math.min(text.length, index + length + 2);

  const surrounding = text
    .slice(start, end)
    .trim();

  return surrounding === expected;
}

function dedupeTitleMarkerIssues(issues) {
  const seen = new Set();
  const deduped = [];

  for (const issue of issues) {
    const key = `${issue.marker}->${issue.expected}::${issue.context}`;
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

  const regex =
    /\((?:feat\.?|ft\.?|featuring|FEAT\.?|FT\.?|Feat\.?|Ft\.?)\s*[^\)]*\)/g;

  for (const match of text.matchAll(regex)) {
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

  return issues;
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