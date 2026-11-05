const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function check(times, maxGapMs = 2, sameValues = false) {
  const context = vm.createContext({ window: {} });
  for (const file of [
    "parsers/osuParser.js", "checks/sv/doubleSvCheck.js", "app/i18n.js",
    "app/formatters/common.js", "app/formatters/sv/doubleSv.js", "app/issues/tabs.js"
  ]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
  }
  context.text = "[TimingPoints]\n" + times.map((time, index) =>
    `${time},${!sameValues && index % 2 ? -50 : -100},4,1,0,100,0,0`
  ).join("\n");
  context.maxGapMs = maxGapMs;
  return JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const result = runDoubleSvCheck(text, "[Oni].osu", { maxGapMs });
    return {
      result, level: getDoubleSvIssueLevel([result]),
      html: formatDoubleSvResult(result, key => i18n.en[key])
    };
  })())`, context));
}

test("exact timestamp duplicates are red errors regardless of their SV values", () => {
  for (const times of [[1000, 1000], [1000, 1000, 1000]]) {
    const { result, level, html } = check(times);
    assert.equal(level, "error");
    assert.equal(result.groups[0].level, "error");
    assert.ok(result.groups[0].items.every(item => item.level === "error"));
    assert.equal((html.match(/class="result-error"/g) ?? []).length, times.length);
    assert.ok(html.includes(`There are ${times.length} SV lines at the same timestamp. Correction is required.`));
    assert.match(html, /SV x1\s*\|/);
    assert.match(html, /SV x2\s*\|/);
    assert.equal((html.match(/Correction is required\./g) ?? []).length, times.length);
    assert.doesNotMatch(html, /result-warn/);
  }
});

test("1 and 2 ms gaps remain yellow warnings", () => {
  for (const gap of [1, 2]) {
    const { level, html } = check([1000, 1000 + gap]);
    assert.equal(level, "warn");
    assert.equal((html.match(/class="result-warn"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /result-error/);
  }
});

test("mixed groups only color the exact duplicates red", () => {
  const { result, level, html } = check([1000, 1001, 1001, 1003]);
  assert.equal(level, "error");
  assert.deepEqual(result.groups[0].items.map(item => item.level), ["warn", "error", "error", "warn"]);
  assert.equal((html.match(/class="result-error"/g) ?? []).length, 2);
  assert.equal((html.match(/class="result-warn"/g) ?? []).length, 2);
});

test("identical duplicates retain both rows and show the duplicate count on each", () => {
  const { html } = check([243984, 243984], 2, true);
  assert.equal((html.match(/class="timestamp-link"/g) ?? []).length, 2);
  assert.equal((html.match(/There are 2 SV lines/g) ?? []).length, 2);
  assert.match(html, /SV x1\s*\| vol 100\s*\| There are 2 SV lines/);
  assert.doesNotMatch(html, /SV x1 \/ x1|vol 100 \/ 100/);
});

test("no duplicates and configurable proximity retain their existing behavior", () => {
  for (const times of [[], [1000], [1000, 1003]]) {
    assert.equal(check(times).level, "none");
  }
  assert.equal(check([1000, 1005], 5).level, "warn");
  assert.equal(check([1000, 1000], 1).level, "error");
});
