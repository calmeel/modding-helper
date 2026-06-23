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
  const normalizedRomanised = normalizeMetadataRomanisedForSymbolCompare(romanisedText);

  const originalSymbols = collectOriginalMetadataSymbols(originalText);

  if (!originalSymbols.length) {
    return issues;
  }

  const suggestedRomanised = buildSuggestedRomanisedSequence(originalText);
  const originalSymbolCounts = countOriginalMetadataSymbols(originalSymbols);

  for (const [symbol, originalCount] of originalSymbolCounts) {
    const expectedList = METADATA_SYMBOL_ROMANISATION_RULES[symbol] ?? [];
    const replacementCount = countRomanisedSymbolGroupOccurrences(
      normalizedRomanised,
      expectedList
    );

    if (replacementCount === originalCount) {
      continue;
    }

    issues.push({
      fieldName,
      type: replacementCount < originalCount
        ? "metadataSymbolMissingReplacement"
        : "metadataSymbolMultipleReplacement",

      symbol,
      expectedList,
      originalCount,
      replacementCount,

      original: originalText,
      romanised: romanisedText,
      suggestedRomanised
    });
  }

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

function countOriginalMetadataSymbols(symbols) {
  const counts = new Map();

  for (const symbol of symbols) {
    counts.set(symbol.char, (counts.get(symbol.char) ?? 0) + 1);
  }

  return counts;
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

function normalizeMetadataRomanisedForSymbolCompare(text) {
  return removeSpacesAroundRomanisedSymbols(String(text ?? ""));
}

function countRomanisedSymbolGroupOccurrences(text, symbols) {
  const sortedSymbols = [...new Set(symbols)]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!sortedSymbols.length) return 0;

  let count = 0;
  let index = 0;

  while (index < text.length) {
    const matched = sortedSymbols.find(symbol =>
      text.slice(index, index + symbol.length) === symbol
    );

    if (matched) {
      count++;
      index += matched.length;
      continue;
    }

    index++;
  }

  return count;
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

  for (const match of text.matchAll(/\u3000/g)) {
    issues.push({
      fieldName,
      type: "fullWidthSpace",
      marker: "\u3000",
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
