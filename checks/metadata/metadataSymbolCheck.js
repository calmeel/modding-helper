const METADATA_SYMBOL_ROMANISATION_RULES = {
  "★": ["*"],
  "☆": ["*"],
  "⚝": ["*"],
  "✪": ["*"],
  "✻": ["*"],

  "♥": ["<3"],
  "♡": ["<3"],

  "「": ['"'],
  "」": ['"'],
  "『": ['"'],
  "』": ['"'],

  "…": ["..."],
  "。": ["."],

  "→": ["->", "-->"],
  "←": ["<-", "<--"],

  "《": ["<", "<<", '"'],
  "》": [">", ">>", '"'],

  "【": ['"', "(", "["],
  "】": ['"', ")", "]"],

  "≠": ["=/=", "!="],

  "・": [".", ","],

  "×": ["x"],

  "～": ["~"],
  "〜": ["~"],

  "−": ["-"],
  "–": ["-"],
  "—": ["-"],
  "―": ["-"],

  "／": ["/"],
  "＆": ["&"],
  "＋": ["+"],
  "＝": ["="],

  "！": ["!"],
  "？": ["?"],
  "：": [":"],
  "；": [";"],

  "（": ["("],
  "）": [")"],

  "［": ["["],
  "］": ["]"],

  "｛": ["{"],
  "｝": ["}"],

  "＜": ["<"],
  "＞": [">"],

  "“": ['"'],
  "”": ['"'],

  "※": ["*"],

};

function findMetadataSymbolRomanisationIssues(original, romanised, fieldName) {
  const issues = [];

  const originalText = String(original ?? "");
  const romanisedText = String(romanised ?? "");

  const originalSymbols = collectOriginalMetadataSymbols(originalText);

  if (!originalSymbols.length) {
    return issues;
  }

  const suggestedRomanised = buildSuggestedRomanisedSequence(originalText);
  const suggestedRomanisedCandidates = buildSuggestedRomanisedCandidates(originalText);
  const normalizedRomanised = normalizeMetadataRomanisedForSymbolCompare(romanisedText);

  const hasMatchingCandidate = suggestedRomanisedCandidates.some(candidate =>
    normalizeMetadataRomanisedForSymbolCompare(candidate) === normalizedRomanised
  );

  if (hasMatchingCandidate) {
    return issues;
  }

  const firstOriginalSymbol = originalSymbols[0];

  issues.push({
    fieldName,
    type: "metadataSymbolMismatch",

    // formatters.js display
    symbol: firstOriginalSymbol?.char ?? "",
    expectedList: firstOriginalSymbol
      ? METADATA_SYMBOL_ROMANISATION_RULES[firstOriginalSymbol.char] ?? []
      : [],

    original: originalText,
    romanised: romanisedText,
    suggestedRomanised
  });

  return dedupeMetadataSymbolIssues(issues);
}

function collectOriginalMetadataSymbols(text) {
  const symbols = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (METADATA_SYMBOL_ROMANISATION_RULES[char]) {
      symbols.push({
        char,
        index: i
      });
    }
  }

  return symbols;
}

function getAllRomanisedMetadataSymbols() {
  return [...new Set(
    Object.values(METADATA_SYMBOL_ROMANISATION_RULES).flat()
  )].sort((a, b) => b.length - a.length);
}

function buildSuggestedRomanisedSequence(originalText) {
  let result = String(originalText ?? "");

  for (const [originalSymbol, expectedList] of Object.entries(METADATA_SYMBOL_ROMANISATION_RULES)) {
    const replacement = expectedList[0];

    result = result.split(originalSymbol).join(replacement);
  }

  return result;
}

function buildSuggestedRomanisedCandidates(originalText) {
  const text = String(originalText ?? "");
  const candidates = [""];

  for (const char of text) {
    const replacements = METADATA_SYMBOL_ROMANISATION_RULES[char] ?? [char];
    const nextCandidates = [];

    for (const candidate of candidates) {
      for (const replacement of replacements) {
        nextCandidates.push(candidate + replacement);
      }
    }

    candidates.splice(0, candidates.length, ...nextCandidates);
  }

  return candidates;
}

function normalizeMetadataRomanisedForSymbolCompare(text) {
  return removeSpacesAroundRomanisedSymbols(String(text ?? ""));
}

function removeSpacesAroundRomanisedSymbols(text) {
  const symbols = getAllRomanisedMetadataSymbols()
    .map(escapeRegExp)
    .join("|");

  if (!symbols) return text;

  const regex = new RegExp(`\\s*(${symbols})\\s*`, "g");

  return text.replace(regex, "$1");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeMetadataSymbolIssues(issues) {
  const seen = new Set();
  const deduped = [];

  for (const issue of issues) {
    const key = [
      issue.fieldName,
      issue.type,
      issue.symbol,
      issue.original,
      issue.romanised,
      issue.suggestedRomanised
    ].join("::");

    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(issue);
  }

  return deduped;
}

function buildSuggestedRomanised(original, romanised, symbol, replacement) {
  const originalText = String(original ?? "");
  const romanisedText = String(romanised ?? "");

  if (!symbol || !replacement) {
    return romanisedText;
  }

  if (originalText.startsWith(symbol)) {
    return replacement + romanisedText;
  }

  if (originalText.endsWith(symbol)) {
    return romanisedText + replacement;
  }

  return romanisedText;
}

/** ダブル半角スペース・全角スペースの検知 */
function findMetadataSpacingIssues(value, fieldName) {
  const text = String(value ?? "");
  const issues = [];

  if (!text) return issues;

  for (const match of text.matchAll(/ {2,}/g)) {
    issues.push({
      fieldName,
      type: "multipleHalfWidthSpaces",
      marker: match[0],
      expected: "single half-width space",
      context: getMetadataSpacingIssueContext(text, match.index)
    });
  }

  for (const match of text.matchAll(/　/g)) {
    issues.push({
      fieldName,
      type: "fullWidthSpace",
      marker: "　",
      expected: "half-width space",
      context: getMetadataSpacingIssueContext(text, match.index)
    });
  }

  return issues;
}

function getMetadataSpacingIssueContext(text, index) {
  const start = Math.max(0, index - 16);
  const end = Math.min(text.length, index + 24);
  return text.slice(start, end);
}
