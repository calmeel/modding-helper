const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({});
for (const file of ["tagCheck.js", "contentPermissionCheck.js"]) {
  vm.runInContext(fs.readFileSync(
    path.join(__dirname, "..", "checks", "metadata", file), "utf8"
  ), context);
}

function detects(field, value, keyword) {
  return context.runContentPermissionCheck(
    `[Metadata]\n${field}:${value}\n`, "test.osu"
  ).results.some(item => item.matchedKeywords.some(
    matched => matched.toLowerCase() === keyword.toLowerCase()
  ));
}

test("selected artist keywords require boundaries in every configured field", () => {
  for (const keyword of ["NOMA", "Avans", "Zekk", "tyDi", "lapix", "Frums", "ak+q", "Ado"]) {
    const fields = ["Artist", "ArtistUnicode", "Tags"];
    if (!["tyDi", "Ado"].includes(keyword)) fields.push("Title", "TitleUnicode");
    for (const field of fields) {
      for (const value of [keyword.toUpperCase(), `(${keyword})`, `Someone feat. ${keyword}`, `${keyword}_remix`]) {
        assert.equal(detects(field, value, keyword), true, `${field}: ${value}`);
      }
      for (const value of [`x${keyword}`, `${keyword}x`, `2${keyword}`, `${keyword}2`]) {
        assert.equal(detects(field, value, keyword), false, `${field}: ${value}`);
      }
    }
  }
});

test("NOMA and Avans do not match inside unrelated names or words", () => {
  assert.equal(detects("Artist", "Tsunomaki Watame", "NOMA"), false);
  assert.equal(detects("Title", "caravans", "Avans"), false);
});

test("other keywords in shared rules and work titles retain substring matching", () => {
  for (const [field, value, keyword] of [
    ["Artist", "xkozato2", "kozato"],
    ["Artist", "xPSYQUI2", "PSYQUI"],
    ["Artist", "xSynthion2", "Synthion"],
    ["Source", "Cytus2", "cytus"],
    ["Source", "DEEMO2", "deemo"],
    ["Source", "beatmania2", "beatmania"],
    ["Title", "櫻ノ詩 (Remix)", "櫻ノ詩"]
  ]) {
    assert.equal(detects(field, value, keyword), true, `${field}: ${value}`);
  }
});
