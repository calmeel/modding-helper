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

function detects(field, value, keyword, artist = "") {
  return context.runContentPermissionCheck(
    `[Metadata]\n${artist ? `Artist:${artist}\n` : ""}${field}:${value}\n`, "test.osu"
  ).results.some(item => item.matchedKeywords.some(
    matched => matched.toLowerCase() === keyword.toLowerCase()
  ));
}

test("Disallowed artist severity follows the matched metadata fields", () => {
  const keywords = ["40mP", "40㍍P", "a_hisa", "Draw the Emotional", "Enter Shikari",
    "EZFG", "Hatsuki Yura", "葉月ゆら", "kamome sano", "kozato", "NOMA"];
  const check = metadata => context.runContentPermissionCheck(`[Metadata]\n${metadata}\n`, "test.osu");
  for (const keyword of keywords) {
    for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Tags"]) {
      const result = check(`${field}:${keyword}`);
      const matched = result.results.filter(item => item.category === "disallowedArtist");
      assert.equal(matched.length, 1, `${field}: ${keyword}`);
      assert.equal(matched[0].level, field.startsWith("Artist") ? "error" : "warn", `${field}: ${keyword}`);
    }
    for (const metadata of [
      `Artist:${keyword}\nTitle:${keyword}\nTags:${keyword}`,
      `ArtistUnicode:${keyword}\nTitleUnicode:${keyword}`
    ]) {
      assert.equal(check(metadata).results.find(item => item.category === "disallowedArtist").level, "error");
    }
    assert.ok(!check(`Source:${keyword}`).results.some(item => item.category === "disallowedArtist"));
  }
  for (const field of ["Title", "TitleUnicode"]) {
    const result = check(`Artist:アビドス高等学校対策委員会\n${field}:青春のアーカイブ\nTags:40mP`);
    assert.ok(result.results.some(item => item.messageJa.includes("作詞・作曲・編曲") && item.level === "error"));
    assert.ok(result.results.some(item => item.matchedKeywords.includes("40mP") && item.level === "warn"));
  }
});

test("Content permission message colors and tab levels follow field-based severity", () => {
  const display = vm.createContext({ window: {}, localStorage: { getItem: () => "ja" } });
  for (const file of ["app/i18n.js", "app/formatters/common.js",
    "app/formatters/metadata/contentPermission.js", "app/issues/tabs.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), display);
  }
  display.sortResultsForDisplay = results => results;
  for (const [metadata, level] of [
    ["Tags:40mP", "warn"],
    ["Title:葉月ゆら", "warn"],
    ["Artist:Hatsuki Yura\nTags:40mP", "error"],
    ["ArtistUnicode:NOMA\nTitle:40mP", "error"],
    ["Artist:アビドス高等学校対策委員会\nTitle:青春のアーカイブ", "error"]
  ]) {
    const results = [context.runContentPermissionCheck(`[Metadata]\n${metadata}\n`, "test.osu")];
    assert.equal(display.getContentPermissionIssueLevel(results), level);
    const html = display.formatMultipleContentPermissionResults(results, key => display.window.i18n.ja[key] || "");
    assert.ok(html.includes(`<span class="result-${level}">`), metadata);
    if (level === "warn") assert.ok(!html.includes('class="result-error"'), metadata);
  }
});

test("removed music labels no longer produce content permission warnings", () => {
  for (const keyword of ["HARDCORE TANO*C", "OpenTracks", "DOVA-SYNDROME"]) {
    for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Source", "Tags"]) {
      const results = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${keyword}\n`, "test.osu"
      ).results;
      assert.equal(results.length, 0, `${field}: ${keyword}`);
    }
  }
});

test("Koronba credit and redistribution warning matches either alias in the five specified fields", () => {
  const url = "https://dic.pixiv.net/a/%E3%81%93%E3%82%8D%E3%82%93%E3%81%B0";
  for (const keyword of ["ころんば", "Koronba", "KORONBA", "koronba"]) {
    for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Tags", "Source"]) {
      const items = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${keyword}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(items.length, field === "Source" ? 0 : 1, `${field}: ${keyword}`);
      if (items.length) {
        assert.equal(items[0].category, "personalBan");
        assert.equal(items[0].level, "warn");
        assert.ok(items[0].messageJa.includes("\nまた、"));
        assert.ok(items[0].messageJa.includes("「　.　」"));
        assert.ok(items[0].messageEn.includes("\nReuploads"));
      }
    }
  }
});

test("OctagonCollaboration songs remain disabled while permission is under discussion", () => {
  for (const title of ["The Glorious Octagon of Destiny", "8 Awesome Angles of YouTube"]) {
    for (const field of ["Title", "TitleUnicode", "Artist", "ArtistUnicode", "Source", "Tags"]) {
      assert.equal(context.runContentPermissionCheck(
        `[Metadata]\n${field}:${title}\n`, "test.osu"
      ).results.length, 0, `${field}: ${title}`);
    }
  }
});

// Restore this test together with the temporarily disabled rule.
test.skip("OctagonCollaboration songs are disallowed by title without an artist requirement", () => {
  const url = "https://osu.ppy.sh/beatmapsets/2556596/discussion/-/generalAll#/5860913";
  for (const title of ["The Glorious Octagon of Destiny", "8 Awesome Angles of YouTube"]) {
    for (const field of ["Title", "TitleUnicode", "Artist", "ArtistUnicode", "Source", "Tags"]) {
      const matches = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${title.toUpperCase()} (Remix)\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(matches.length, ["Title", "TitleUnicode"].includes(field) ? 1 : 0, `${field}: ${title}`);
      if (matches.length) {
        assert.equal(matches[0].category, "disallowedArtist");
        assert.equal(matches[0].level, "error");
        assert.equal(matches[0].messageJa, "NOMA が作曲しているため使用できません。");
        assert.equal(matches[0].matchedKeywords[0], title);
      }
    }
  }
});

test("Seishun no Archive is disallowed by title without requiring the credited artist", () => {
  const url = "https://osu.ppy.sh/beatmapsets/2163686/discussion/-/generalAll#/4302139";
  for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Source", "Tags"]) {
    for (const value of ["青春のアーカイブ", "青春のアーカイブ (TV Size)"]) {
      const matches = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${value}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(matches.length, ["Title", "TitleUnicode"].includes(field) ? 1 : 0, `${field}: ${value}`);
      if (matches.length) {
        assert.equal(matches[0].category, "disallowedArtist");
        assert.equal(matches[0].level, "error");
        assert.equal(matches[0].messageJa, "40mPが作詞・作曲・編曲しているため使用できません。");
        assert.equal(matches[0].matchedKeywords[0], "青春のアーカイブ");
      }
    }
  }
});

test("KONAMI and RIAJ warnings link to localized song pages in both app modes", () => {
  const formatterContext = vm.createContext({
    escapeHtml: value => String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char])),
    sortResultsForDisplay: results => results,
    getDifficultyNameText: value => value,
    formatSectionTitle: value => value,
    formatSeparator: () => "---",
    window: {}
  });
  vm.runInContext(fs.readFileSync(path.join(
    __dirname, "..", "app/formatters/metadata/contentPermission.js"
  ), "utf8"), formatterContext);
  for (const [metadata, pageName] of [["Source:beatmania", "dmca/dmcaBeatmania"], ["Title:future gazer", "dmca/dmcaRiaj"]]) {
    const result = context.runContentPermissionCheck(`[Metadata]\n${metadata}\n`, "test.osu");
    assert.equal(result.results[0].removedSongsPage, `${pageName}.html`);
    assert.equal(result.results[0].removedSongsPageEn, `${pageName}.en.html`);
    for (const lang of ["ja", "en"]) {
      formatterContext.localStorage = { getItem: () => lang };
      for (const electron of [false, true]) {
        formatterContext.window.electronAPI = electron ? {} : undefined;
        const html = formatterContext.formatMultipleContentPermissionResults([result], () => "");
        const base = electron ? "https://calmeel.github.io/modding-helper/docs/" : "docs/";
        const page = lang === "en" ? `${pageName}.en.html` : `${pageName}.html`;
        assert.ok(html.includes(`href="${base}${page}"`));
        assert.ok(html.includes(lang === "ja" ? ">削除された楽曲のリスト</a>" : ">List of removed songs</a>"));
        const lines = html.split("\n");
        const listIndex = lines.findIndex(line => line.includes(`href="${base}${page}"`));
        assert.ok(lines[listIndex - 1].includes(`href="${result.results[0].links[0].url}"`));
        assert.ok(!html.includes("実際に削除された楽曲のリストは"));
        assert.ok(!html.includes("You can view the list of songs that were actually removed"));
      }
    }
  }
  const unrelated = context.runContentPermissionCheck("[Metadata]\nArtist:Ado\n", "other.osu");
  assert.ok(!formatterContext.formatMultipleContentPermissionResults([unrelated], () => "").includes("dmcaBeatmania.html"));
});

test("RIAJ listed song titles replace series detection and match only title fields", () => {
  const url = "https://gist.githubusercontent.com/peppy/eef03a270bcb776f7a5503b8217dfcc6/raw";
  const titles = fs.readFileSync(path.join(__dirname, "..", "docs/dmca/DMCA_RIAJ.txt"), "utf8")
    .replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith("https://"))
    .map(line => line.slice(line.indexOf(" - ") + 3));
  const matches = metadata => context.runContentPermissionCheck(
    `[Metadata]\n${metadata}`, "test.osu"
  ).results.filter(item => item.links.some(link => link.url === url));
  for (const title of titles) {
    for (const field of ["Title", "TitleUnicode"]) {
      const results = matches(`${field}:${title.toUpperCase()} (Remix)\n`);
      assert.equal(results.length, 1, `${field}: ${title}`);
      assert.equal(results[0].category, "pastDmca");
      assert.ok(results[0].matchedKeywords.includes(title));
    }
    for (const field of ["Artist", "ArtistUnicode", "Source", "Tags"]) {
      assert.equal(matches(`${field}:${title}\n`).length, 0, `${field}: ${title}`);
    }
  }
  for (const series of ["とある科学の超電磁砲", "涼宮ハルヒの憂鬱", "艦隊これくしょん"]) {
    for (const field of ["Title", "TitleUnicode", "Source", "Tags"]) {
      assert.equal(matches(`${field}:${series}\n`).length, 0, `${field}: ${series}`);
    }
  }
});

test("COVER Palette DMCA notice requires Tokoyami Towa and the song title", () => {
  const url = "https://gist.githubusercontent.com/peppy/129db574a72b4510eba096049835d6c5/raw";
  const matches = metadata => context.runContentPermissionCheck(
    `[Metadata]\n${metadata}`, "test.osu"
  ).results.filter(item => item.links.some(link => link.url === url));
  for (const artistField of ["Artist", "ArtistUnicode"]) {
    for (const titleField of ["Title", "TitleUnicode"]) {
      for (const title of ["Palette", "PALETTE", "Palette (Remix)"]) {
        const results = matches(`${artistField}:常闇トワ\n${titleField}:${title}\n`);
        assert.equal(results.length, 1);
        assert.equal(results[0].category, "pastDmca");
        assert.ok(results[0].matchedKeywords.includes("常闇トワ"));
        assert.ok(results[0].matchedKeywords.includes("Palette"));
        assert.equal(results[0].links[0].labelJa, "DMCA通知（2021年）");
      }
      for (const artist of ["", "Other Artist"]) {
        assert.equal(matches(`${artistField}:${artist}\n${titleField}:Palette\nTags:常闇トワ\n`).length, 0);
      }
      assert.equal(matches(`${artistField}:常闇トワ\n${titleField}:Other Song\n`).length, 0);
    }
  }
  for (const field of ["Artist", "ArtistUnicode", "Source", "Tags"]) {
    assert.equal(matches(`${field}:常闇トワ - Palette\n`).length, 0);
  }
});

test("ALcot 2015 notice checks Clover Days sources and song titles without artist requirements", () => {
  const url = "https://gist.githubusercontent.com/peppy/74435fabd5b8b0da3eff947e2fa69cf2/raw";
  for (const [keyword, fields] of [
    ["Clover Day’s", ["Source", "Tags", "Title", "TitleUnicode"]],
    ["しあわせがたり", ["Title", "TitleUnicode"]]
  ]) {
    for (const field of ["Source", "Tags", "Title", "TitleUnicode", "Artist", "ArtistUnicode"]) {
      const results = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${keyword}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(results.length, fields.includes(field) ? 1 : 0, `${field}: ${keyword}`);
      if (results.length) {
        assert.equal(results[0].category, "pastDmca");
        assert.ok(results[0].links.some(link => link.url === url && link.labelJa === "DMCA通知（2015年）"));
        assert.ok(results[0].matchedKeywords.includes(keyword));
        const shortVersion = keyword === "Clover Day’s" && ["Title", "TitleUnicode"].includes(field);
        assert.equal(results[0].messageJa.includes("Short Ver. の利用は黙認されています。"), shortVersion);
        assert.equal(results[0].messageEn.includes("use of the Short Ver. is tacitly permitted."), shortVersion);
        assert.equal(results[0].links.some(link => link.labelJa === "DMCA通知（2014年）"), shortVersion);
      }
    }
  }
  for (const title of ["CLOVER DAY’S (Remix)", "しあわせがたり (Remix)"]) {
    assert.ok(context.runContentPermissionCheck(
      `[Metadata]\nArtist:Other Artist\nTitle:${title}\n`, "test.osu"
    ).results.some(item => item.links.some(link => link.url === url)));
  }
});

test("AUGUST Akai Yakusoku notice matches title fields without requiring Lia", () => {
  const url = "https://gist.githubusercontent.com/peppy/6ce590aee2b91bb630f4c25ab85d0aa7/raw";
  for (const field of ["Title", "TitleUnicode", "Artist", "ArtistUnicode", "Source", "Tags"]) {
    const results = context.runContentPermissionCheck(
      `[Metadata]\n${field}:赤い約束\n`, "test.osu"
    ).results.filter(item => item.links.some(link => link.url === url));
    assert.equal(results.length, ["Title", "TitleUnicode"].includes(field) ? 1 : 0, field);
    if (results.length) {
      assert.equal(results[0].category, "pastDmca");
      assert.equal(results[0].links[0].labelJa, "DMCA通知（2015年）");
    }
  }
  assert.ok(context.runContentPermissionCheck(
    "[Metadata]\nArtist:Other Artist\nTitle:赤い約束 (Remix)\n", "test.osu"
  ).results.some(item => item.links.some(link => link.url === url)));
});

test("Eyal Golan notice matches the Hebrew keyword only in the configured fields", () => {
  const url = "https://web.archive.org/web/20250820195303/https://gist.githubusercontent.com/peppy/884920598cbc3b9e4b08/raw/2b8ed13ac10c2111862b8bd547d6e892f4d78960/dmca_2015-06-14_eyal.txt";
  for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Tags", "Source"]) {
    for (const value of ["אייל גולן", "Someone feat. אייל גולן (Remix)", "Eyal Golan", "Other Artist"]) {
      const results = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${value}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      const expected = field !== "Source" && value.includes("אייל גולן");
      assert.equal(results.length, expected ? 1 : 0, `${field}: ${value}`);
      if (results.length) {
        assert.equal(results[0].category, "pastDmca");
        assert.equal(results[0].links[0].labelJa, "DMCA通知（2015年）");
        assert.ok(results[0].matchedKeywords.includes("אייל גולן"));
      }
    }
  }
});

test("EZ2ON notice checks source tags and listed titles without requiring artists", () => {
  const url = "https://gist.githubusercontent.com/peppy/84f4cf009fe88a9d61b13b58dc53dea8/raw/dmca_20260922.txt";
  const matches = metadata => context.runContentPermissionCheck(
    `[Metadata]\n${metadata}`, "test.osu"
  ).results.filter(item => item.links.some(link => link.url === url));
  const titles = ["AIR (EZ2ON Ver.)", "Holic", "LIMBO", "Le grand Bleu", "Minus 2", "The back of Beyond", "The Prince of Darkness", "Energy Flower 3007", "G.O.A", "Fallen Angel", "Zeroize", "開花"];
  for (const field of ["Source", "Tags", "Title", "TitleUnicode", "Artist", "ArtistUnicode"]) {
    assert.equal(matches(`${field}:ez2on\n`).length, ["Source", "Tags"].includes(field) ? 1 : 0, field);
  }
  for (const title of titles) {
    for (const field of ["Title", "TitleUnicode"]) {
      const results = matches(`Artist:Other Artist\n${field}:${title.toUpperCase()} (Remix)\n`);
      assert.equal(results.length, 1, `${field}: ${title}`);
      assert.ok(results[0].matchedKeywords.includes(title));
      assert.equal(results[0].links[0].labelJa, "DMCA通知（2026年）");
      assert.ok(results[0].messageJa.includes("SHIKI - AIR は削除対象ではありませんでした。"));
    }
    for (const field of ["Artist", "ArtistUnicode", "Source", "Tags"]) {
      const results = matches(`${field}:${title}\n`);
      assert.ok(!results.some(item => item.matchedKeywords.includes(title)), `${field}: ${title}`);
    }
  }
  for (const field of ["Title", "TitleUnicode"]) {
    for (const title of ["AIR", "AIR (Original Mix)", "AIR (Remix)"]) {
      assert.equal(matches(`Artist:SHIKI\n${field}:${title}\n`).length, 0, title);
    }
  }
});

test("Alon Mor notice matches only the five configured fields with case-insensitive substrings", () => {
  const url = "https://gist.githubusercontent.com/peppy/3cc5a15a3be9f2a01336ae93322033f0/raw";
  for (const field of ["Artist", "ArtistUnicode", "Title", "TitleUnicode", "Tags", "Source"]) {
    for (const value of ["Alon Mor", "ALON MOR", "Someone feat. alon mor", "xAlon Mor2", "Other Artist"]) {
      const results = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${value}\n`, "test.osu"
      ).results.filter(item => item.links.some(link => link.url === url));
      assert.equal(results.length, field !== "Source" && value !== "Other Artist" ? 1 : 0, `${field}: ${value}`);
      if (results.length) {
        assert.equal(results[0].category, "pastDmca");
        assert.equal(results[0].links[0].labelJa, "DMCA通知");
        assert.ok(results[0].matchedKeywords.includes("Alon Mor"));
      }
    }
  }
});

test("Kagami no Sekai notice checks only titles without requiring monet", () => {
  const url = "https://osu.ppy.sh/beatmapsets/685725#osu/1478540";
  for (const field of ["Title", "TitleUnicode", "Artist", "ArtistUnicode", "Source", "Tags"]) {
    const results = context.runContentPermissionCheck(
      `[Metadata]\n${field}:鏡の世界には私しかいない\n`, "test.osu"
    ).results.filter(item => item.links.some(link => link.url === url));
    assert.equal(results.length, ["Title", "TitleUnicode"].includes(field) ? 1 : 0, field);
    if (results.length) {
      assert.equal(results[0].category, "pastDmca");
      assert.equal(results[0].links[0].labelJa, "osu! ビートマップ");
    }
  }
  assert.ok(context.runContentPermissionCheck(
    "[Metadata]\nArtist:Other Artist\nTitle:鏡の世界には私しかいない (Remix)\n", "test.osu"
  ).results.some(item => item.links.some(link => link.url === url)));
});

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
      assert.equal(detects(field, value, "iL", "Ice"), true, `${field}: ${value}`);
    }
    for (const value of ["Silentroom", "Lilac for Anabel", "xiL", "iLx", "2iL", "iL2"]) {
      assert.equal(detects(field, value, "iL", "Ice"), false, `${field}: ${value}`);
    }
    assert.equal(detects(field, "xEntrance2", "Entrance", "Ice"), true);
    assert.equal(detects(field, "xWings of Piano2", "Wings of Piano", "V.K"), true);
  }
  for (const field of ["Artist", "ArtistUnicode", "Source", "Tags"]) {
    for (const keyword of ["Entrance", "iL", "Wings of Piano"]) {
      assert.equal(detects(field, keyword, keyword), false, `${field}: ${keyword}`);
    }
  }
});

test("Rayark DMCA songs require their corresponding artist in either artist field", () => {
  const url = "https://gist.githubusercontent.com/peppy/55e7ee271342766a80f3596d8e5c83fa/raw/dmca_20220328.txt";
  for (const [name, song] of [["Ice", "Entrance"], ["Ice", "iL"], ["V.K", "Wings of Piano"]]) {
    for (const artistField of ["Artist", "ArtistUnicode"]) {
      for (const titleField of ["Title", "TitleUnicode"]) {
        for (const artist of [name.toUpperCase(), `Someone feat. ${name}`]) {
          const results = context.runContentPermissionCheck(
            `[Metadata]\n${artistField}:${artist}\n${titleField}:${song}\n`, "test.osu"
          ).results.filter(item => item.links.some(link => link.url === url));
          assert.equal(results.length, 1, `${artistField}: ${artist}, ${titleField}: ${song}`);
          assert.ok(results[0].matchedFields.some(item => item.field === artistField.charAt(0).toLowerCase() + artistField.slice(1) && item.keywords.includes(name)));
        }
        for (const artist of ["", "Other Artist", name === "Ice" ? "V.K" : "Ice", `x${name}`, `${name}x`]) {
          const results = context.runContentPermissionCheck(
            `[Metadata]\n${artistField}:${artist}\n${titleField}:${song}\nTags:${name}\n`, "test.osu"
          ).results;
          assert.ok(!results.some(item => item.links.some(link => link.url === url)), `${artist}: ${song}`);
        }
      }
    }
  }
});

test("NEXON DMCA songs require the matching artist and retain MapleStory detection", () => {
  const url = "https://gist.githubusercontent.com/peppy/86c30346d749ae39c2ab6bcb4e906442/raw/dmca-20240419.txt";
  const matches = metadata => context.runContentPermissionCheck(
    `[Metadata]\n${metadata}`, "test.osu"
  ).results.filter(item => item.links.some(link => link.url === url));
  for (const [artist, song] of [["보라", "Shine"], ["타루", "Catch Your Dreams!"]]) {
    for (const artistField of ["Artist", "ArtistUnicode"]) {
      for (const titleField of ["Title", "TitleUnicode"]) {
        const result = matches(`${artistField}:${artist}\n${titleField}:${song.toUpperCase()}\n`);
        assert.equal(result.length, 1);
        assert.ok(result[0].matchedKeywords.includes(artist));
        assert.ok(result[0].matchedKeywords.includes(song));
        for (const wrongArtist of ["", "Other", artist === "보라" ? "타루" : "보라"]) {
          assert.equal(matches(`${artistField}:${wrongArtist}\n${titleField}:${song}\nTags:${artist}\n`).length, 0);
        }
        assert.equal(matches(`${artistField}:${artist}\n${titleField}:x${song}x\n`).length, 0);
      }
    }
    assert.equal(matches(`Artist:${artist}\nTags:${song}\n`).length, 0);
    assert.equal(matches(`Artist:${artist}\nSource:${song}\n`).length, 0);
  }
  for (const field of ["Source", "Tags"]) {
    for (const source of ["MapleStory", "メイプルストーリー"]) {
      assert.equal(matches(`${field}:${source}\n`).length, 1);
    }
  }
});

test("Muzzle-lab song rules require the corresponding artist in either metadata field", () => {
  for (const [artist, song] of [["C.I.L. Café", "Just a fool loves you"], ["まずらぼ", "SELFISH"]]) {
    const songMatches = metadata => context.runContentPermissionCheck(
      `[Metadata]\n${metadata}`, "test.osu"
    ).results.filter(item => item.matchedKeywords.includes(song));
    for (const artistField of ["Artist", "ArtistUnicode"]) {
      for (const titleField of ["Title", "TitleUnicode"]) {
        for (const name of [artist, artist.toUpperCase(), `Someone feat. ${artist}`]) {
          const results = songMatches(`${artistField}:${name}\n${titleField}:${song.toUpperCase()}\n`);
          assert.equal(results.length, 1);
          assert.ok(results[0].matchedKeywords.includes(artist));
        }
        for (const name of ["", "Other Artist", artist === "まずらぼ" ? "C.I.L. Café" : "まずらぼ", `x${artist}`, `${artist}x`]) {
          assert.equal(songMatches(`${artistField}:${name}\n${titleField}:${song}\n`).length, 0);
        }
      }
    }
    assert.equal(songMatches(`Title:${song}\nTags:${artist}\n`).length, 0);
    assert.equal(songMatches(`Artist:${artist}\nTags:${song}\n`).length, 0);
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
  for (const [field, value] of [["Source", "ケロQ"], ["Tags", "枕"], ["Source", "KeroQ"], ["Tags", "keroq"], ["Source", "KEROQ"]]) {
    const item = context.runContentPermissionCheck(
      `[Metadata]\n${field}:${value}\n`, "test.osu"
    ).results.find(result => result.links.some(link => link.url === guideline));
    assert.ok(item, `${field}: ${value}`);
    assert.equal(item.links.length, 1);
    assert.equal(item.category, "personalBan");
    assert.notEqual(item.title, "Past DMCA notice");
    assert.ok(item.messageJa.includes("{contentPermissionListLink}"));
    assert.ok(item.messageEn.includes("{contentPermissionListLink}"));
  }
});

test("disabled guideline titles and AUGUST works no longer trigger their guideline rules", () => {
  const groups = [
    {
      url: "https://www.hook-net.jp/htm/about.htm",
      fields: ["Title", "TitleUnicode"],
      values: ["Love Loading!!!", "サニスコープ", "Girls’ Carnival", "ハレノヒステップ"]
    },
    {
      url: "https://www.keromakura.net/support/support/guideline.html",
      fields: ["Title", "TitleUnicode"],
      values: ["ナグルファルの船上にて", "登れない坂道", "片翼のイカロス", "カザハネ", "スイッチ・オン♪", "機械人形"]
    },
    {
      url: "https://august-soft.com/about/terms_guideline",
      fields: ["Source", "Tags"],
      values: ["あいりすミスティリア！", "千の刃濤、桃花染の皇姫", "大図書館の羊飼い", "穢翼のユースティア", "FORTUNE ARTERIAL", "夜明け前より瑠璃色な", "月は東に日は西に", "Princess Holiday", "バイナリィ・ポット"]
    }
  ];
  for (const { url, fields, values } of groups) {
    for (const field of fields) {
      for (const value of values) {
        const results = context.runContentPermissionCheck(
          `[Metadata]\n${field}:${value}\n`, "test.osu"
        ).results;
        assert.ok(!results.some(item => item.links.some(link => link.url === url)), `${field}: ${value}`);
      }
    }
  }
  for (const [value, url] of [
    ["HOOKSOFT", groups[0].url], ["ケロQ", groups[1].url],
    ["株式会社葉月", groups[2].url], ["オーガスト", groups[2].url], ["AUGUST", groups[2].url]
  ]) {
    for (const field of ["Source", "Tags"]) {
      const results = context.runContentPermissionCheck(
        `[Metadata]\n${field}:${value}\n`, "test.osu"
      ).results;
      assert.ok(results.some(item => item.links.some(link => link.url === url)), `${field}: ${value}`);
    }
  }
  for (const title of ["オープニングセレモニー", "Asphodelus", "櫻ノ詩"]) {
    assert.ok(context.runContentPermissionCheck(
      `[Metadata]\nTitle:${title}\n`, "test.osu"
    ).results.some(item => item.category === "pastDmca"), title);
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
