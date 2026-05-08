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

  // TitleUnicode側に変換対象記号がない場合は、Romanised側の記号もチェックしない
  if (!originalSymbols.length) {
    return issues;
  }

  const romanisedSymbols = collectRomanisedMetadataSymbols(romanisedText);

  if (!originalSymbols.length && !romanisedSymbols.length) {
    return issues;
  }

  const suggestedRomanised = buildSuggestedRomanisedSequence(originalText);

  // 1. 記号の数が違う
  if (originalSymbols.length !== romanisedSymbols.length) {
    const firstOriginalSymbol = originalSymbols[0];

    issues.push({
      fieldName,
      type: "metadataSymbolCountMismatch",

      // formatters.js 互換用
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

  for (let i = 0; i < originalSymbols.length; i++) {
    const originalSymbol = originalSymbols[i];
    const romanisedSymbol = romanisedSymbols[i];

    const expectedList =
      METADATA_SYMBOL_ROMANISATION_RULES[originalSymbol.char] ?? [];

    // 2. 記号の種類・順番が違う
    if (!expectedList.includes(romanisedSymbol.char)) {
      issues.push({
        fieldName,
        type: "metadataSymbolMismatch",

        // formatters.js 互換用
        symbol: originalSymbol.char,
        expectedList,

        original: originalText,
        romanised: romanisedText,
        suggestedRomanised
      });

      continue;
    }

    // 3. 位置が大きく違う
    const originalRatio =
      originalSymbol.index / Math.max(1, originalText.length - 1);

    const romanisedRatio =
      romanisedSymbol.index / Math.max(1, romanisedText.length - 1);

    if (Math.abs(originalRatio - romanisedRatio) > 0.25) {
      issues.push({
        fieldName,
        type: "metadataSymbolPositionMismatch",

        // formatters.js 互換用
        symbol: originalSymbol.char,
        expectedList,

        original: originalText,
        romanised: romanisedText,
        suggestedRomanised
      });
    }

    // 4. 記号の前後に半角スペースがある
    const before = romanisedText[romanisedSymbol.index - 1];
    const after = romanisedText[romanisedSymbol.index + romanisedSymbol.char.length];

    if (before === " " || after === " ") {
      issues.push({
        fieldName,
        type: "metadataSymbolSpacing",

        // formatters.js 互換用
        symbol: originalSymbol.char,
        expectedList,

        original: originalText,
        romanised: romanisedText,
        suggestedRomanised: removeSpacesAroundRomanisedSymbols(romanisedText)
      });
    }
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

function collectRomanisedMetadataSymbols(text, originalSymbols) {
  const symbols = [];

  const allowedSymbols = getRomanisedSymbolsForOriginalSymbols(originalSymbols);

  for (let i = 0; i < text.length; i++) {
    for (const symbol of allowedSymbols) {
      if (text.slice(i, i + symbol.length) === symbol) {
        symbols.push({
          char: symbol,
          index: i
        });

        i += symbol.length - 1;
        break;
      }
    }
  }

  return symbols;
}

function getRomanisedSymbolsForOriginalSymbols(originalSymbols) {
  return [...new Set(
    originalSymbols.flatMap(symbol =>
      METADATA_SYMBOL_ROMANISATION_RULES[symbol.char] ?? []
    )
  )].sort((a, b) => b.length - a.length);
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