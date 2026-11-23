const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const text = html => html.replace(/<[^>]*>/g, "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").replace(/。\s+/g, "。").trim();

const withoutPrompts = message => message
  .replace(/(?:当該ポストを|使用前に|ガイドラインを)?確認して(?:ください|下さい)。/g, "")
  .replace(/こちらから当該リストを確認できます。/g, "")
  .replace(/ Please check (?:the linked post|before use|the guidelines|the requirements)\./g, "")
  .replace(/ You can view the list here\./g, "")
  .replace(/。\s+/g, "。").trim();

test("official HTML and check messages agree except for the HTML-only Featured Artist note", () => {
  const context = vm.createContext({
    window: {}, escapeHtml,
    sortResultsForDisplay: results => results,
    getDifficultyNameText: value => value,
    formatSectionTitle: value => value,
    formatSeparator: () => "---"
  });
  for (const file of [
    "app/i18n.js", "data/tagRules.js", "checks/metadata/tagCheck.js",
    "data/contentPermissionRules.js", "checks/metadata/contentPermissionCheck.js",
    "app/formatters/metadata/contentPermission.js"
  ]) vm.runInContext(read(file), context);
  const rules = vm.runInContext("CONTENT_PERMISSION_RULES", context)
    .filter(rule => ["disallowedArtist", "conditionalArtist", "conditionalLabel"].includes(rule.category));

  for (const lang of ["ja", "en"]) {
    context.localStorage = { getItem: () => lang };
    const html = read(`docs/contentPermissionList${lang === "en" ? ".en" : ""}.html`);
    const table = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) => {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
      return {
        keywords: [...cells[cells.length - 3].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
          .map(m => text(m[1]).toLowerCase()),
        description: cells[cells.length - 2]
      };
    });
    assert.equal(rows.length, 8);
    assert.equal((table.match(/Featured Artist/g) || []).length, 1);
    const note = lang === "ja"
      ? "Mameyudoufu / rejection は Featured Artist 楽曲一覧に含まれる場合は使用できます。"
      : "Mameyudoufu / rejection tracks may be used if they are included in the Featured Artist listing.";
    assert.ok(table.includes(note));

    for (const rule of rules) {
      const row = rows.find(row => rule.keywords.some(keyword => row.keywords.some(display =>
        display === keyword.toLowerCase() || display.endsWith(` - ${keyword.toLowerCase()}`)
      )));
      assert.ok(row, rule.keywords[0]);
      const field = rule.fields[0][0].toUpperCase() + rule.fields[0].slice(1);
      const checked = context.runContentPermissionCheck(`[Metadata]\n${field}:${rule.keywords[0]}\n`, "test.osu");
      const item = checked.results.find(item => item.messageJa === rule.messageJa);
      assert.ok(item, rule.keywords[0]);
      const output = context.formatMultipleContentPermissionResults(
        [{ fileName: checked.fileName, results: [item] }],
        key => context.window.i18n[lang][key] || ""
      );
      const message = output.match(/<span class="result-(?:warn|error)">([\s\S]*?)<\/span>/)[1];
      assert.equal(text(message), text(row.description.replace(note, "")), `${lang}: ${rule.keywords[0]}`);
      assert.ok(!message.includes("Featured Artist"));
    }
    assert.equal(rules.length, 9);
  }
});

test("guideline HTML retains check details while omitting prompts and self-links", () => {
  const context = vm.createContext({
    window: {}, escapeHtml,
    sortResultsForDisplay: results => results,
    getDifficultyNameText: value => value,
    formatSectionTitle: value => value,
    formatSeparator: () => "---"
  });
  for (const file of [
    "app/i18n.js", "data/tagRules.js", "checks/metadata/tagCheck.js",
    "data/contentPermissionRules.js", "checks/metadata/contentPermissionCheck.js",
    "app/formatters/metadata/contentPermission.js"
  ]) vm.runInContext(read(file), context);
  const rules = vm.runInContext("CONTENT_PERMISSION_RULES", context);

  for (const lang of ["ja", "en"]) {
    context.localStorage = { getItem: () => lang };
    const page = lang === "en" ? "contentPermissionList.en.html" : "contentPermissionList.html";
    const html = read(`docs/${page}`);
    const headings = [...html.matchAll(/<h2>\s*([\s\S]*?)\s*<\/h2>/g)];
    const section = html.slice(headings[1].index, headings[2].index);
    let count = 0;
    let linkedCount = 0;

    for (const [, row] of section.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
      if (!cells.length) continue;
      const keywords = [...cells[2].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)]
        .map(m => text(m[1]).toLowerCase());
      const rule = rules.find(rule =>
        ["personalBan", "permissionRequired"].includes(rule.category) &&
        rule.title !== "Past DMCA notice" &&
        rule.keywords.some(keyword => keywords.includes(keyword.toLowerCase()))
      );
      assert.ok(rule, text(cells[0]));
      const metadataField = rule.fields[0][0].toUpperCase() + rule.fields[0].slice(1);
      const checked = context.runContentPermissionCheck(
        `[Metadata]\n${metadataField}:${rule.keywords[0]}\n`, "test.osu"
      );
      const item = checked.results.find(item => item.messageJa === rule.messageJa);
      assert.ok(item, text(cells[0]));
      const hasListLink = rule.messageJa.includes("{contentPermissionListLink}");
      if (hasListLink) {
        linkedCount++;
      }
      assert.equal(withoutPrompts(text(cells[3])), text(cells[3]));
      assert.ok(!cells[3].includes("<a "));

      for (const electron of [false, true]) {
        context.window.electronAPI = electron ? {} : undefined;
        const output = context.formatMultipleContentPermissionResults(
          [{ fileName: checked.fileName, results: [item] }],
          key => context.window.i18n[lang][key] || ""
        );
        const message = output.match(/<span class="result-warn">([\s\S]*?)<\/span>/);
        assert.ok(message, text(cells[0]));
        assert.equal(withoutPrompts(text(message[1])), text(cells[3]), `${lang}: ${text(cells[0])}`);
        const fullMessage = rule[lang === "en" ? "messageEn" : "messageJa"]
          .replace("{contentPermissionListLink}", lang === "en" ? "here" : "こちら");
        assert.equal(text(message[1]), text(fullMessage), "check output retains the full message");
        assert.ok(!message[1].includes("{contentPermissionListLink}"));
        if (hasListLink) {
          const base = electron ? "https://calmeel.github.io/modding-helper/docs/" : "docs/";
          assert.ok(message[1].includes(lang === "en" ? ".\nCertain songs" : "。\nまた、特定楽曲"));
          assert.ok(message[1].includes(lang === "en" ? ".\nYou can view the list" : "。\n<a "));
          assert.ok(message[1].includes(`href="${base}${page}"`));
          assert.ok(message[1].includes(`>${lang === "en" ? "here" : "こちら"}</a>`));
        }
        if (rule.keywords.includes("オーガスト")) {
          assert.ok(output.includes('href="https://august-soft.com/about/terms_guideline"'));
          assert.ok(cells[4].includes('href="https://august-soft.com/about/terms_guideline"'));
        }
      }
      count++;
    }
    assert.equal(count, 17);
    assert.equal(linkedCount, 7);
  }
});
