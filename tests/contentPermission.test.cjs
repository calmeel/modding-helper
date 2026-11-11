const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({});
for (const file of [
  "data/tagRules.js",
  "checks/metadata/tagCheck.js",
  "data/contentPermissionRules.js",
  "checks/metadata/contentPermissionCheck.js"
]) {
  vm.runInContext(fs.readFileSync(
    path.join(__dirname, "..", file), "utf8"
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
    const fields = ["Artist", "ArtistUnicode"];
    if (keyword !== "Ado") fields.push("Tags");
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

test("Rayark iL requires word boundaries only in title fields", () => {
  for (const field of ["Title", "TitleUnicode"]) {
    for (const value of ["iL", "IL", "(il)", "iL (Remix)", "iL_remix"]) {
      assert.equal(detects(field, value, "iL"), true, `${field}: ${value}`);
    }
    for (const value of ["Silentroom", "Lilac for Anabel", "xiL", "iLx", "2iL", "iL2"]) {
      assert.equal(detects(field, value, "iL"), false, `${field}: ${value}`);
    }
    assert.equal(detects(field, "xEntrance2", "Entrance"), true);
    assert.equal(detects(field, "xWings of Piano2", "Wings of Piano"), true);
  }
  for (const field of ["Artist", "ArtistUnicode", "Source", "Tags"]) {
    for (const keyword of ["Entrance", "iL", "Wings of Piano"]) {
      assert.equal(detects(field, keyword, keyword), false, `${field}: ${keyword}`);
    }
  }
});

test("NOMA and Avans do not match inside unrelated names or words", () => {
  assert.equal(detects("Artist", "Tsunomaki Watame", "NOMA"), false);
  assert.equal(detects("Title", "caravans", "Avans"), false);
});

test("RIAJ Ado notice restricts artist and song keywords to their configured fields", () => {
  const url = "https://gist.githubusercontent.com/peppy/418364abd1b74b95150b87b7c831001a/raw/dmca_20221208.txt";
  for (const keyword of ["Ado", "新時代", "踊", "うっせぇわ", "阿修羅ちゃん"]) {
    const allowedFields = keyword === "Ado"
      ? ["Artist", "ArtistUnicode"] : ["Title", "TitleUnicode"];
    for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Source", "Tags"]) {
      const matches = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${keyword}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(matches.length, allowedFields.includes(field) ? 1 : 0, `${field}: ${keyword}`);
      if (matches.length) {
        assert.equal(matches[0].category, "pastDmca");
        assert.equal(matches[0].links[0].labelJa, "DMCA通知（2022年）");
      }
    }
  }
});

test("Million Live DMCA notice matches the specific source and its song titles", () => {
  const url = "https://gist.githubusercontent.com/peppy/6b91dea9835cd49ddee13794f6deeb5a/raw/dmca_20221005.txt";
  for (const keyword of ["アイドルマスター", "アイドルマスター ミリオンライブ！", "百花は月下に散りぬるを", "Brand New Theater!", "Flyers!!!", "Dreaming!"]) {
    const allowedFields = keyword === "アイドルマスター" ? []
      : keyword === "アイドルマスター ミリオンライブ！" ? ["Source", "Tags"]
        : ["Title", "TitleUnicode"];
    for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Source", "Tags"]) {
      const matches = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${keyword.toLowerCase()}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(matches.length, allowedFields.includes(field) ? 1 : 0, `${field}: ${keyword}`);
      if (matches.length) {
        assert.equal(matches[0].category, "pastDmca");
        assert.equal(matches[0].links[0].labelJa, "DMCA通知（2022年）");
      }
    }
  }
});

test("KeroQ DMCA titles no longer duplicate guideline warnings", () => {
  const guideline = "https://www.keromakura.net/support/support/guideline.html";
  for (const title of ["櫻ノ詩", "空気力学少女と少年の詩", "刻ト詩", "終末の微笑"]) {
    for (const field of ["Title", "TitleUnicode"]) {
      const results = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${title}\n`, "test.osu"
      ).results;
      assert.equal(results.length, 1, `${field}: ${title}`);
      assert.equal(results[0].category, "pastDmca");
      assert.equal(results[0].links[0].labelJa, "DMCA通知（2023年）");
    }
  }
  for (const [field, value] of [["Source", "ケロQ"], ["Tags", "枕"], ["Title", "ナグルファルの船上にて"], ["TitleUnicode", "機械人形"]]) {
    const item = context.runContentPermissionCheck(
      `[Metadata]\n${field}:${value}\n`, "test.osu"
    ).results.find(result => result.links.some(link => link.url === guideline));
    assert.ok(item, `${field}: ${value}`);
    assert.equal(item.links.length, 1);
    assert.ok(!item.messageJa.includes("DMCA"));
    assert.ok(!item.messageEn.includes("DMCA"));
  }
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
