const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({ window: {} });
for (const file of [
  "app/i18n.js", "data/tagRules.js", "checks/metadata/tagCheck.js",
  "app/formatters/common.js", "app/formatters/metadata/tags.js"
]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
}
context.sortResultsForDisplay = results => results;

function check(tags, name) {
  return context.runTagCheck(`[Metadata]\nTags:${tags}\n`, `test [${name}].osu`);
}

function compare(base, current) {
  return context.compareTagsAcrossDiffs([check(base, "Base"), check(current, "Current")]);
}

for (const [name, base, current, types] of [
  ["capitalization", "REINCARNATION", "REINCARNATIOn", ["case"]],
  ["order", "胡桃坂庵 REINCARNATION", "REINCARNATION 胡桃坂庵", ["order"]],
  ["multiple spaces", "胡桃坂庵 REINCARNATION", "胡桃坂庵  REINCARNATION", ["spacing"]],
  ["full-width space", "胡桃坂庵 REINCARNATION", "胡桃坂庵　REINCARNATION", ["spacing"]],
  ["tab", "a b", "a\tb", ["spacing"]],
  ["leading space", "a b", " a b", ["spacing"]],
  ["trailing space", "a b", "a b ", ["spacing"]],
  ["moved space", " a b", "a b ", ["spacing"]],
  ["duplicate count", "a b", "a a b", ["count"]],
  ["combined changes", "A b", "b  a", ["case", "order", "spacing"]]
]) {
  test(`Tag comparison reports ${name} with both original values`, () => {
    const result = compare(base, current);
    assert.equal(result.hasMismatch, true);
    assert.equal(result.mismatches.length, 1);
    const mismatch = result.mismatches[0];
    assert.deepEqual(Array.from(mismatch.differenceTypes), types);
    assert.equal(mismatch.baseTags, base);
    assert.equal(mismatch.tags, current);
  });
}

test("Tag comparison preserves missing/extra details and handles empty or identical inputs", () => {
  const mismatch = compare("a b", "a c").mismatches[0];
  assert.deepEqual(Array.from(mismatch.removed), ["b"]);
  assert.deepEqual(Array.from(mismatch.added), ["c"]);
  for (const value of ["", "a b", "A　 b "]) {
    assert.equal(compare(value, value).hasMismatch, false);
  }
  assert.equal(context.compareTagsAcrossDiffs([]).hasMismatch, false);
  assert.equal(context.compareTagsAcrossDiffs([check("a", "Only")]).hasMismatch, false);
  assert.equal(compare("", " ").hasMismatch, true);
});

test("Tag spacing checks and token normalization still work independently", () => {
  const result = check("a  b　c", "Spacing");
  assert.equal(result.normalizedTags, "a b c");
  assert.deepEqual(Array.from(result.results, item => item.type), ["multipleSpaces", "fullWidthSpace"]);
});

function translate(lang) {
  return key => {
    assert.ok(context.window.i18n[lang][key], `${lang}: ${key}`);
    return context.window.i18n[lang][key];
  };
}

function renderConsistency(base, current, lang = "ja") {
  const t = translate(lang);
  const output = context.formatMultipleTagResults([check(base, "Base"), check(current, "Current")], t);
  return output.slice(output.indexOf(t("tagConsistencyCheck")), output.indexOf(t("tagSpacingCheck")));
}

test("Tag mismatch rendering shows local details in both languages with Source highlighting", () => {
  for (const lang of ["ja", "en"]) {
    const t = translate(lang);
    for (const [base, current, reason, detail] of [
      ["REINCARNATION", "REINCARNATIOn", "tagCaseDifference", '<span class="source-text-diff">n</span>'],
      ["胡桃坂庵 REINCARNATION", "REINCARNATION 胡桃坂庵", "tagOrderDifference", '<span class="source-text-diff">胡桃坂庵</span>'],
      ["a b", "a  b", "tagSpacingDifference", t("tagWhitespaceHalf").replace("{count}", "2")],
      ["a b", "a　b", "tagSpacingDifference", t("tagWhitespaceFull").replace("{count}", "1")]
    ]) {
      const output = renderConsistency(base, current, lang);
      assert.ok(output.includes(t(reason)));
      assert.ok(output.includes(t("tagBaseValue")));
      assert.ok(output.includes(t("tagCurrentValue")));
      assert.ok(output.includes(detail), output);
      assert.ok(!/<mark>|[·□⇥]/u.test(output));
    }
  }
});

test("Missing and extra tags keep the original list without repeating entire Tags", () => {
  const output = renderConsistency("unchanged a b", "unchanged a c");
  assert.ok(output.includes("基準diffと比べて不足"));
  assert.ok(output.includes("<code>b</code>"));
  assert.ok(output.includes("<code>c</code>"));
  assert.ok(!output.includes("unchanged"));
  assert.ok(!output.includes("対象 diff:"));
});

test("Case changes display only affected tokens even alongside missing or extra tags", () => {
  const output = renderConsistency("unchanged REINCARNATION old", "unchanged REINCARNATIOn new");
  assert.ok(output.includes('REINCARNATIO<span class="source-text-diff">n</span>'));
  assert.ok(output.includes("<code>old</code>"));
  assert.ok(output.includes("<code>new</code>"));
  assert.ok(!output.includes("unchanged"));
});

test("Order details are bounded and mark omitted context", () => {
  const prefix = Array.from({ length: 20 }, (_, i) => `prefix${i}`).join(" ");
  const suffix = Array.from({ length: 20 }, (_, i) => `suffix${i}`).join(" ");
  const output = renderConsistency(`${prefix} a b ${suffix}`, `${prefix} b a ${suffix}`);
  assert.ok(output.includes("…"));
  assert.ok(!output.includes("prefix0"));
  assert.ok(!output.includes("suffix19"));
  assert.ok(output.includes('class="source-text-diff">b</span>'));
  assert.ok(output.length < 1000, output);
});

test("Whitespace differences explain position, types, and counts without substituted symbols", () => {
  for (const [base, current, expected] of [
    ["a b", "a  b", ["「a」と「b」の間", "半角スペース1個", "半角スペース2個"]],
    ["a b", "a　b", ["「a」と「b」の間", "全角スペース1個"]],
    ["a b", " a b", ["Tags の先頭", "スペースなし", "半角スペース1個"]],
    ["a b", "a b ", ["Tags の末尾", "スペースなし"]],
    ["a b", "a \t　b", ["半角スペース1個＋タブ1個＋全角スペース1個"]],
    ["", " ", ["Tags 全体", "半角スペース1個"]]
  ]) {
    const output = renderConsistency(base, current);
    for (const value of expected) assert.ok(output.includes(value), output);
    assert.ok(!/[·□⇥]/u.test(output));
  }
});

test("Duplicate count details identify the tag and both counts", () => {
  const output = renderConsistency("a b", "a a b");
  assert.ok(output.includes("<code>a</code>"));
  assert.ok(output.includes("基準 diff: 1個"));
  assert.ok(output.includes("対象 diff: 2個"));
});

test("Local difference details escape HTML and preserve Unicode characters", () => {
  const output = renderConsistency("😀 <OLD>", "😀 <old>");
  assert.ok(output.includes('&lt;<span class="source-text-diff">old</span>&gt;'));
  assert.ok(!output.includes("<old>"));
  const whitespace = renderConsistency("😀 <tag>", "😀　<tag>");
  assert.ok(whitespace.includes("😀"));
  assert.ok(whitespace.includes("&lt;tag&gt;"));
});
