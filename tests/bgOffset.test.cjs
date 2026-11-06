const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({ window: {} });
for (const file of [
  "app/i18n.js", "app/formatters/common.js",
  "app/formatters/misc/bgOffset.js", "app/issues/tabs.js"
]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
}
const t = key => context.window.i18n.ja[key];
const plain = html => html.replace(/<[^>]*>/g, "");
const warn = text => `<span class="result-warn">${text}</span>`;
const error = text => `<span class="result-error">${text}</span>`;
function map(diff, overrides = {}) {
  return {
    fileName: `song [${diff}].osu`,
    backgrounds: [{
      fileName: "bg.jpg", normalizedFileName: "bg.jpg", imageType: "jpg",
      actualImageType: "jpeg", xOffset: 0, yOffset: 0, ...overrides
    }]
  };
}
function render(results) {
  const output = context.formatBgOffsetResult(results, t);
  const table = output.split(context.formatSeparator())[0].trimEnd().split("\n");
  return { output, table, cells: table.slice(2).map(line => line.split("|").map(cell => cell.trim())) };
}

test("BG status ends the table and equivalent JPG/JPEG types are ok", () => {
  const { table, cells } = render([map("Oni")]);
  assert.deepEqual(table[0].split("|").map(cell => cell.trim()),
    ["Diff", "File", "Type", "Actual", "xOffset", "yOffset", "Status"]);
  assert.equal(cells[0][6], "ok");
  assert.equal(context.getBgOffsetIssueLevel([map("Oni")]), "none");
});

test("missing BG marks status and file red and takes priority on the tab", () => {
  const missing = { fileName: "song [Kantan].osu", backgrounds: [] };
  const { cells } = render([map("Oni", { imageType: "png" }), missing]);
  assert.equal(cells[0][6], error("error"));
  assert.equal(cells[0][1], error("-"));
  assert.equal(cells[0][4], "-");
  for (const results of [[missing], [map("Oni", { xOffset: 10 }), missing], [missing, map("Oni")]]) {
    assert.equal(context.getBgOffsetIssueLevel(results), "error");
  }
  assert.equal(context.getBgOffsetIssueLevel([{ fileName: "missing.osu" }]), "error");
});

test("offset differences highlight only the differing axis within the same BG", () => {
  const results = [map("Oni"), map("Inner Oni", { yOffset: 20 }),
    map("Hell Oni", { fileName: "other.jpg", normalizedFileName: "other.jpg" })];
  const { cells, table } = render(results);
  for (const [index, value] of [[0, "0"], [1, "20"]]) {
    assert.equal(cells[index][6], warn("warning"));
    assert.equal(cells[index][4], "0");
    assert.equal(cells[index][5], warn(value));
  }
  assert.equal(cells[2][6], "ok");
  assert.equal(context.getBgOffsetIssueLevel(results), "warn");
  const separatorPositions = line => [...plain(line)].flatMap((char, index) => char === "|" ? [index] : []);
  for (const line of table.slice(2)) assert.deepEqual(separatorPositions(line), separatorPositions(table[0]));
  const xOnly = render([map("Oni"), map("Inner Oni", { xOffset: 12 })]);
  assert.equal(xOnly.cells[0][4], warn("0"));
  assert.equal(xOnly.cells[1][4], warn("12"));
  assert.equal(xOnly.cells[0][5], "0");
});

test("matching nonzero xOffsets still warn, while a yOffset alone does not", () => {
  for (const value of [-12, 12]) {
    const results = [map("Oni", { xOffset: value }), map("Inner Oni", { xOffset: value })];
    const { cells, output } = render(results);
    assert.ok(cells.every(row => row[6] === warn("warning") && row[4] === warn(String(value))));
    assert.ok(!output.includes(t("bgOffsetNoIssues")));
    assert.equal(context.getBgOffsetIssueLevel(results), "warn");
  }
  assert.equal(render([map("Oni", { yOffset: 12 })]).cells[0][6], "ok");
});

test("PNG and type mismatches warn and color only the applicable type cells", () => {
  const png = [map("Oni", { imageType: "png", actualImageType: "png" })];
  const { cells } = render(png);
  assert.equal(cells[0][6], warn("warning"));
  assert.equal(cells[0][2], warn("PNG"));
  assert.equal(cells[0][3], "PNG");
  assert.equal(context.getBgOffsetIssueLevel(png), "warn");
  const mismatch = [map("Oni", { actualImageType: "png", imageTypeMismatch: { expected: "jpeg", actual: "png" } })];
  const rendered = render(mismatch);
  assert.equal(rendered.cells[0][6], warn("warning"));
  assert.equal(rendered.cells[0][2], warn("JPG"));
  assert.equal(rendered.cells[0][3], warn("PNG"));
  assert.ok(!rendered.output.includes('class="result-error"'));
  assert.equal(context.getBgOffsetIssueLevel(mismatch), "warn");
});

test("offset details place warnings before grouped difficulty names and values in both languages", () => {
  const results = [map("Kantan"), map("Oni", { xOffset: 1 }), map("Inner Oni", { xOffset: 1 })];
  for (const lang of ["ja", "en"]) {
    const translate = key => context.window.i18n[lang][key];
    const output = context.formatBgOffsetResult(results, translate);
    const mismatchStart = output.indexOf(warn(translate("bgOffsetDifferentOffsets")));
    const nonZeroStart = output.indexOf(warn(translate("bgOffsetNonZeroXWarning")));
    const extensionStart = output.indexOf(context.formatSectionTitle(translate("bgExtensionCheckTitle")));
    assert.ok(mismatchStart > 0 && nonZeroStart > mismatchStart && extensionStart > nonZeroStart);
    const mismatch = output.slice(mismatchStart, nonZeroStart);
    const nonZero = output.slice(nonZeroStart, extensionStart);
    const names = `${context.getDifficultyName(results[1].fileName)}, ${context.getDifficultyName(results[2].fileName)}`;
    assert.ok(mismatch.includes(`${context.getDifficultyName(results[0].fileName)}\nFile: bg.jpg | xOffset: ${warn("0")} | yOffset: 0`));
    assert.ok(mismatch.includes(`${names}\nFile: bg.jpg | xOffset: ${warn("1")} | yOffset: 0`));
    assert.ok(nonZero.includes(`${warn(translate("bgOffsetNonZeroXWarning"))}\n\n${names}\nFile: bg.jpg | xOffset: ${warn("1")}`));
    assert.ok(!nonZero.includes("yOffset:"));
    assert.equal((mismatch.match(/File: bg.jpg/g) || []).length, 2);
    assert.equal((nonZero.match(/File: bg.jpg/g) || []).length, 1);
    assert.ok(!mismatch.includes(context.formatSeparator()));
  }
});

test("offset detail grouping keeps different backgrounds separate and escapes file and difficulty names", () => {
  const results = [
    map("Oni", { xOffset: -1, yOffset: 0 }),
    map("Inner Oni", { xOffset: -1, yOffset: 20 }),
    map("Hell <Oni>", { fileName: "other<&>.jpg", normalizedFileName: "other<&>.jpg", xOffset: -1 })
  ];
  const { output } = render(results);
  const mismatch = output.slice(output.indexOf(warn(t("bgOffsetDifferentOffsets"))), output.indexOf(warn(t("bgOffsetNonZeroXWarning"))));
  assert.ok(mismatch.includes(`xOffset: ${warn("-1")} | yOffset: ${warn("0")}`));
  assert.ok(mismatch.includes(`xOffset: ${warn("-1")} | yOffset: ${warn("20")}`));
  const nonZero = output.slice(output.indexOf(warn(t("bgOffsetNonZeroXWarning"))));
  assert.equal((nonZero.match(/File:/g) || []).length, 2);
  assert.ok(nonZero.includes("File: other&lt;&amp;&gt;.jpg"));
  assert.ok(nonZero.includes("[Hell &lt;Oni&gt;]"));
  assert.ok(!output.includes("other<&>.jpg"));
});
