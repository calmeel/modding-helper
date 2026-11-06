const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function suggestions(metadata, tags = "") {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(
    path.join(__dirname, "..", "checks/metadata/tagCheck.js"), "utf8"
  ), context);
  context.text = "[Metadata]\n" + Object.entries(metadata)
    .map(([field, value]) => `${field}:${value}`).join("\n") + `\nTags:${tags}\n`;
  return JSON.parse(vm.runInContext(
    'JSON.stringify(runTagCheck(text, "test.osu").metadataSuggestions)', context
  ));
}

test("rmx suggests remix in either title field regardless of case or spacing", () => {
  for (const value of ["Song rmx", "Song RMX", "Song(RmX)", "Songrmx"]) {
    assert.deepEqual(suggestions({ Title: value, TitleUnicode: value }), [{
      fields: ["Title", "TitleUnicode"], marker: "rmx", suggestions: ["remix"]
    }]);
  }
  assert.deepEqual(suggestions({ Artist: "RMX", ArtistUnicode: "rmx", Source: "rmx" }), []);
});

test("ampersand suggests and in title and artist fields but not source", () => {
  assert.deepEqual(suggestions({
    Title: "A&B", TitleUnicode: "A & B", Artist: "A&B", ArtistUnicode: "A & B",
    Source: "A&B"
  }), [{
    fields: ["Title", "TitleUnicode", "Artist", "ArtistUnicode"],
    marker: "&", suggestions: ["and"]
  }]);
  assert.deepEqual(suggestions({ Source: "A&B" }), []);
  assert.deepEqual(suggestions({ Title: "A＆B" }), []);
});

test("existing tags suppress only the matching candidate regardless of case", () => {
  const metadata = { Title: "A&B (RMX)" };
  assert.deepEqual(suggestions(metadata, "REMIX AND"), []);
  assert.deepEqual(suggestions(metadata, "Remix"), [{
    fields: ["Title"], marker: "&", suggestions: ["and"]
  }]);
  assert.deepEqual(suggestions(metadata, "And"), [{
    fields: ["Title"], marker: "rmx", suggestions: ["remix"]
  }]);
  assert.equal(suggestions(metadata, "remixed band").length, 2);
});

test("new suggestions coexist with feat and version suggestions", () => {
  const result = suggestions({ Title: "A&B feat. C (RMX Ver.)" });
  assert.deepEqual(result.map(item => item.marker), ["feat.", "Ver.", "rmx", "&"]);
  assert.deepEqual(suggestions({ Title: "Song", Artist: "Artist" }), []);
});
