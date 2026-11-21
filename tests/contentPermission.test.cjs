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
        assert.ok(html.includes(lang === "ja" ? ">こちら</a>から確認できます。" : ">here</a>."));
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
  for (const [field, value] of [["Source", "ケロQ"], ["Tags", "枕"]]) {
    const item = context.runContentPermissionCheck(
      `[Metadata]\n${field}:${value}\n`, "test.osu"
    ).results.find(result => result.links.some(link => link.url === guideline));
    assert.ok(item, `${field}: ${value}`);
    assert.equal(item.links.length, 1);
    assert.ok(!item.messageJa.includes("DMCA"));
    assert.ok(!item.messageEn.includes("DMCA"));
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
      url: "https://august-soft.com/about/fanfic_guideline",
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
