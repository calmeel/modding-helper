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

  for (const [symbol, expectedList] of Object.entries(METADATA_SYMBOL_ROMANISATION_RULES)) {
    if (!originalText.includes(symbol)) continue;

    const hasExpected = expectedList.some(expected =>
      romanisedText.includes(expected)
    );

    if (hasExpected) continue;

    const suggestedRomanised = buildSuggestedRomanised(
      originalText,
      romanisedText,
      symbol,
      expectedList[0]
    );

    issues.push({
      fieldName,
      symbol,
      expectedList,
      original: originalText,
      romanised: romanisedText,
      suggestedRomanised
    });
  }

  return issues;
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