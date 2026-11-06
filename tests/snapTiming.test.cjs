const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
function runtime() {
  const context = vm.createContext({ window: {} });
  for (const file of [
    "parsers/osuParser.js", "checks/common/snapTiming.js",
    "checks/notes/offset1msCheck.js", "checks/kiai/kiaiSnapCheck.js",
    "checks/misc/previewPointCheck.js", "app/i18n.js",
    "app/formatters/common.js", "app/formatters/snapTiming.js",
    "app/formatters/notes/offset.js", "app/formatters/kiai/snap.js",
    "app/formatters/misc/previewPoint.js", "app/issues/tabs.js"
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return (expression, input = {}) => {
    Object.assign(context, input);
    const result = vm.runInContext(expression, context);
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  };
}

function beatmap(time, { red = 0, beat = 500, timing = true, preview = time } = {}) {
  return `[General]\nPreviewTime:${preview}\n[TimingPoints]\n` +
    (timing ? `${red},${beat},4,1,0,100,1,0\n` : "") +
    `${time},-100,4,1,0,100,0,1\n[HitObjects]\n256,192,${time},1,0\n`;
}

function analyze(time, options) {
  const run = runtime();
  const results = run(`({
    kiai: runKiaiSnapCheck(text, "[Oni].osu"),
    preview: runPreviewPointCheck(text, "[Oni].osu"),
    offset: runOffset1msCheck(text, "[Oni].osu")
  })`, { text: beatmap(time, options) });
  return { run, ...results };
}

function offsetSummaryMap(objects, beat = 480) {
  return `[Difficulty]\nSliderMultiplier:1.4\n[TimingPoints]\n0,${beat},4,1,0,100,1,0\n` +
    `[HitObjects]\n${objects.join("\n")}\n`;
}

test("offset summary counts each basic snap and its 1ms offsets once", () => {
  const run = runtime();
  const times = [480, 240, 160, 120, 80, 60, 40, 30];
  const text = offsetSummaryMap(times.flatMap(time => [time, time + 1, time - 1])
    .map(time => `256,192,${time},1,0`));
  const summary = run('runOffset1msCheck(text, "[Oni].osu").summary', { text });
  assert.equal(summary.snapped, 8);
  assert.equal(summary.shifted, 16);
  assert.equal(summary.unknown, 0);
  assert.equal(summary.resnapDivisor, 48);
  assert.equal(summary.status, "resnap");
  for (const row of summary.snaps) {
    assert.equal(row.snapped, 1);
    assert.equal(row.shifted, 2);
  }
});

test("offset summary derives the common divisor from exact and shifted positions", () => {
  const run = runtime();
  for (const [times, divisor] of [
    [[480, 240, 121], 4],
    [[480, 240, 160, 120, 81], 12],
    [[480, 240, 160, 120, 80, 61], 24]
  ]) {
    const summary = run('runOffset1msCheck(text, "[Oni].osu").summary', {
      text: offsetSummaryMap(times.map(time => `256,192,${time},1,0`))
    });
    assert.equal(summary.resnapDivisor, divisor);
    assert.equal(summary.status, "resnap");
  }
});

test("advanced snaps update summary counts while larger offsets stay unknown", () => {
  const run = runtime();
  const text = offsetSummaryMap([96, 98, 482, 481].map(time => `256,192,${time},1,0`));
  const basic = run('runOffset1msCheck(text, "[Oni].osu").summary', { text });
  const advanced = run('runOffset1msCheck(text, "[Oni].osu", { includeAdvancedSnaps: true }).summary');
  assert.equal(basic.unknown, 3);
  assert.equal(basic.shifted, 1);
  assert.equal(basic.status, "unknown");
  assert.equal(advanced.snapped, 1);
  assert.equal(advanced.unknown, 2);
  assert.equal(advanced.shifted, 1);
  assert.equal(advanced.status, "unknown");
  assert.deepEqual(advanced.usedSnaps, [1, 5]);
  assert.equal(advanced.resnapDivisor, 5);
  assert.deepEqual(run('runOffset1msCheck(text, "[Oni].osu", { includeAdvancedSnaps: false }).summary'), basic);
});

test("advanced snap summary counts exact and 1ms matches and derives their LCM", () => {
  const run = runtime();
  const text = offsetSummaryMap([504, 505, 360, 361, 280, 281]
    .map(time => `256,192,${time},1,0`), 2520);
  const result = run('runOffset1msCheck(text, "[Oni].osu", { includeAdvancedSnaps: true })', { text });
  assert.equal(result.summary.snapped, 3);
  assert.equal(result.summary.shifted, 3);
  assert.equal(result.summary.unknown, 0);
  assert.deepEqual(result.summary.usedSnaps, [5, 7, 9]);
  assert.equal(result.summary.resnapDivisor, 315);
  assert.equal(result.summary.status, "resnap");
  for (const snap of [5, 7, 9]) {
    assert.deepEqual(result.summary.snaps.find(row => row.snap === snap),
      { snap, snapped: 1, shifted: 1 });
  }
  const html = run('formatOffsetSnapSummary([result], k => i18n.en[k] || k)', { result });
  assert.match(html, /1\/315 snap \(1\/5, 1\/7, 1\/9 snaps are used\)/);
  assert.match(html, /class="result-warn"/);
});

test("advanced snaps still calculate the LCM when slider offsets require individual review", () => {
  const run = runtime();
  const result = run('runOffset1msCheck(text, "[Oni].osu", { includeAdvancedSnaps: true })', {
    text: offsetSummaryMap([
      "256,192,504,1,0", "256,192,360,1,0", "256,192,280,1,0",
      "256,192,1,2,0,B|300:192,1,140"
    ], 2520)
  });
  assert.equal(result.summary.unknown, 0);
  assert.equal(result.summary.shifted, 2);
  assert.deepEqual(result.summary.usedSnaps, [1, 5, 7, 9]);
  assert.equal(result.summary.resnapDivisor, 315);
  assert.equal(result.summary.status, "review");
  for (const lang of ["ja", "en"]) {
    const html = run(`formatOffsetSnapSummary([result], k => i18n.${lang}[k] || k)`, { result });
    assert.match(html, /<span class="result-error">Check individually<\/span>/);
    assert.doesNotMatch(html, /unknown \(check individually\)/);
  }
});

test("offset summary includes slider and spinner tails, including shared timestamps", () => {
  const run = runtime();
  const summary = run('runOffset1msCheck(text, "[Oni].osu").summary', {
    text: offsetSummaryMap([
      "256,192,480,2,0,B|300:192,1,140",
      "256,192,960,8,0,1441",
      "256,192,960,1,0"
    ])
  });
  assert.equal(summary.snapped, 4);
  assert.equal(summary.shifted, 1);
  assert.equal(summary.status, "resnap");
  const tailOffset = run('runOffset1msCheck(text, "[Oni].osu").summary', {
    text: offsetSummaryMap(["256,192,480,2,0,B|300:192,1,140.4"])
  });
  assert.equal(tailOffset.snapped, 1);
  assert.equal(tailOffset.shifted, 1);
  assert.equal(tailOffset.status, "review");
});

test("offset summary separates missing timing, empty maps and editor compatibility", () => {
  const run = runtime();
  const unavailable = run('runOffset1msCheck(text, "[Oni].osu").summary', {
    text: beatmap(100, { timing: false })
  });
  assert.equal(unavailable.unavailable, 1);
  assert.equal(unavailable.unknown, 0);
  assert.equal(unavailable.status, "unavailable");
  const empty = run('runOffset1msCheck(text, "[Oni].osu").summary', { text: offsetSummaryMap([]) });
  assert.equal(empty.status, "empty");
  const compatible = run('runOffset1msCheck(text, "[Oni].osu").summary', { text: beatmap(-500) });
  assert.equal(compatible.snapped, 1);
  assert.equal(compatible.compatibility, 1);
  assert.equal(compatible.status, "snapped");
  const mixed = run('runOffset1msCheck(text, "[Oni].osu").summary', {
    text: offsetSummaryMap(["256,192,-500,1,0", "256,192,501,1,0"], 500)
  });
  assert.equal(mixed.shifted, 1);
  assert.equal(mixed.status, "review"); // Do not move an already accepted position.
});

test("offset overview renders one compact row per difficulty in both languages", () => {
  const run = runtime();
  const items = [
    run('runOffset1msCheck(text, "[Oni].osu")', { text: beatmap(100) }),
    run('runOffset1msCheck(text, "[Kantan].osu")', { text: beatmap(501) }),
    run('runOffset1msCheck(text, "[<b>].osu")', { text: beatmap(500) })
  ];
  for (const lang of ["ja", "en"]) {
    const html = run(`formatMultipleShiftResults(items, k => i18n.${lang}[k] || k)`, { items });
    const table = run(`formatOffsetSnapSummary(items, k => i18n.${lang}[k] || k)`, { items });
    const lines = table.split("\n");
    assert.deepEqual(lines[0].split(" | ").map(cell => cell.trim()),
      ["Difficulty", "Snapped", "1ms offsets", "unknown snap", "Resnap with"]);
    assert.match(table, /<span class="result-warn">1<\/span>/);
    assert.match(table, /<span class="result-error">1<\/span>/);
    assert.doesNotMatch(table, /<span class="result-(?:warn|error)">0<\/span>/);
    assert.match(table, /<span class="result-warn">1\/1 snap \(Only 1\/1 snap is used\)<\/span>/);
    assert.match(table, /<span class="result-error">unknown<\/span>/);
    assert.match(table, /All snapped/);
    assert.doesNotMatch(table, /<span class="result-(?:warn|error)">All snapped<\/span>/);
    const separator = run('formatSeparator()');
    assert.ok(html.startsWith(table + "\n\n" + separator + "\n\n"));
    assert.equal(lines.filter(line => line.includes('class="diff-name"')).length, 3);
    assert.doesNotMatch(table, /<table|<tr|<td/);
    const plainRows = lines.filter(line => line.includes('class="diff-name"'))
      .map(line => line.replace(/<[^>]*>/g, ""));
    assert.deepEqual(plainRows.map(line => line.split(" | ").slice(1, 4).map(cell => cell.trim())),
      [["0", "1", "0"], ["0", "0", "1"], ["1", "0", "0"]]);
    assert.ok(table.indexOf("[Kantan]") < table.indexOf("[Oni]"));
    assert.match(table, /1\/1/);
    assert.match(table, /&lt;b&gt;/);
    assert.doesNotMatch(html, /undefined|NaN/);
    assert.match(html, /timestamp-link/); // Existing per-position details remain.
  }
});

test("normal whole beats retain Kiai omission and preview OK output", () => {
  const { run, kiai, preview } = analyze(1000);
  assert.deepEqual(kiai.results, []);
  assert.deepEqual(kiai.wheelResults, []);
  assert.equal(preview.level, "ok");
  assert.equal(preview.snap, "1/1");
  assert.equal(
    run('formatKiaiSnapResult(kiai, k => i18n.en[k])', { kiai }),
    run('getDifficultyName("[Oni].osu")') + "\n\n" + run('i18n.en.noKiaiSnap')
  );
  const html = run('formatPreviewPointResult([preview], k => i18n.en[k])', { preview });
  assert.doesNotMatch(html, /result-warn|result-error|grid time check|resnap check/);
});

test("exact finer snaps beat approximate coarse snaps", () => {
  // 1/16 = 1 ms, while 1/1 is 1 ms away. The old Kiai check chose 1/1.
  const { kiai, preview } = analyze(1, { beat: 16 });
  assert.equal(kiai.results[0].snap, "1/12"); // trunc(16 / 12) = 1, first exact candidate
  assert.equal(kiai.results[0].diff, 0);
  assert.equal(kiai.results[0].level, "warn");
  assert.equal(preview.level, "ok");
});

test("stable grid-only example keeps red Kiai and yellow preview resnap rows", () => {
  const { run, kiai, preview, offset } = analyze(34787, { red: 1038, beat: 297.029702970297 });
  assert.equal(kiai.results[0].diff, 1);
  assert.equal(kiai.results[0].level, "error");
  assert.equal(preview.level, "warn");
  assert.equal(preview.diff, 1);
  for (const result of [kiai, preview, offset]) {
    assert.equal(result.wheelResults[0].compatibility, "stableWheelOnly");
    assert.equal(result.wheelResults[0].level, "info");
    assert.deepEqual(result.wheelResults[0].supplementalSnaps, []);
  }
  for (const lang of ["ja", "en"]) {
    const khtml = run(`formatKiaiSnapResult(kiai, k => i18n.${lang}[k])`, { kiai });
    const phtml = run(`formatPreviewPointResult([preview], k => i18n.${lang}[k])`, { preview });
    assert.match(khtml, /class="result-error"/);
    assert.match(phtml, /class="result-warn"/);
    const kgrid = khtml.slice(khtml.indexOf(lang === "ja" ? "【osu!stable グリッド" : "【osu!stable grid"));
    const pgrid = phtml.slice(phtml.indexOf(lang === "ja" ? "osu!stable グリッド" : "osu!stable grid"));
    assert.doesNotMatch(kgrid, /result-warn|result-error/);
    assert.doesNotMatch(pgrid, /result-warn|result-error/);
    assert.match(kgrid, /\+1 ms/);
    assert.doesNotMatch(khtml + phtml, /undefined|NaN/);
  }
});

test("lazer grid-only result does not turn a normal preview into a warning", () => {
  const { run, kiai, preview } = analyze(34788, { red: 1038, beat: 297.029702970297 });
  assert.equal(kiai.results[0].level, "warn"); // 1/8, not 1/1
  assert.equal(preview.level, "ok");
  assert.equal(preview.wheelResults[0].compatibility, "lazerWheelOnly");
  assert.equal(preview.wheelResults[0].diff, -1);
  assert.equal(run("getPreviewPointIssueLevel([preview])", { preview }), "none");
  assert.equal(run("getKiaiSnapIssueLevel([{ results: [], wheelResults: kiai.wheelResults }])", { kiai }), "none");
});

test("a client-only resnap match is yellow even when the other candidate is far away", () => {
  const { run, kiai } = analyze(-500);
  assert.equal(kiai.results[0].compatibility, "stableOnly");
  assert.equal(kiai.results[0].level, "warn");
  assert.deepEqual(kiai.results[0].supplementalSnaps, []);
  assert.equal(run("getKiaiSnapIssueLevel([kiai])", { kiai }), "warn");
  // Check the opposite branch with a single divisor and a midpoint.
  const lazerOnly = run("findNearestSnapDiff(1, 0.5, 1, [1])");
  assert.equal(lazerOnly.compatibility, "lazerOnly");
  assert.equal(lazerOnly.diff, -1);
});

for (const [time, snap, diff, nearest, offset] of [
  [100, 5, 0, "1/16", -7], [101, 5, -1, "1/16", -8],
  [71, 7, 0, "1/8", -9], [55, 9, 0, "1/8", 7], [21, 24, -1, "1/16", 10]
]) {
  test(`large offset at ${time} shows nearest snap and supplements 1/${snap} (${diff} ms)`, () => {
    const { run, kiai, preview } = analyze(time);
    assert.equal(kiai.results[0].snap, nearest);
    assert.equal(kiai.results[0].diff, offset);
    assert.equal(kiai.results[0].level, "error");
    assert.equal(preview.snap, nearest);
    assert.equal(preview.diff, offset);
    assert.equal(preview.level, "warn");
    assert.deepEqual(preview.supplementalSnaps, [{ snap, diff }]);
    assert.deepEqual(kiai.results[0].supplementalSnaps, preview.supplementalSnaps);
    const html = run('formatPreviewPointResult([preview], k => i18n.en[k])', { preview });
    assert.match(html, new RegExp(`1/${snap} snap`));
    assert.ok(html.includes(`${nearest} snap | ${offset > 0 ? "+" : ""}${offset} ms | `));
    assert.doesNotMatch(html, /\| Warning \|/);
    const khtml = run('formatKiaiSnapResult(kiai, k => i18n.en[k])', { kiai });
    assert.ok(khtml.includes(`${nearest} snap`));
    assert.ok(khtml.includes(`${offset > 0 ? "+" : ""}${offset} ms`));
    assert.doesNotMatch(html + khtml, /unknown snap/);
  });
}

test("1 ms warnings and larger offsets without a special match have no supplement", () => {
  for (const time of [501, 10, 102]) {
    const { kiai, preview } = analyze(time);
    assert.deepEqual(kiai.results[0].supplementalSnaps, []);
    assert.deepEqual(preview.supplementalSnaps, []);
  }
});

test("missing or invalid timing shows dashes instead of inventing a nearest snap", () => {
  for (const options of [{ timing: false }, { beat: 0 }, { beat: -1 }]) {
    const { run, kiai, preview } = analyze(100, options);
    assert.equal(kiai.results[0].timingUnavailable, true);
    assert.equal(preview.timingUnavailable, true);
    assert.equal(preview.snap, null);
    assert.equal(preview.diff, null);
    assert.deepEqual(preview.supplementalSnaps, []);
    assert.deepEqual(preview.wheelResults, []);
    const html = run('formatPreviewPointSingleResult(preview, k => i18n.en[k])', { preview });
    assert.match(html, /no valid timing point/);
    assert.doesNotMatch(html, /unknown snap|null snap/);
    const khtml = run('formatKiaiSnapResult(kiai, k => i18n.en[k])', { kiai });
    assert.match(khtml, /no valid timing point/);
    assert.doesNotMatch(khtml, /unknown snap|null snap/);
  }
});

test("times before the first red point use the same fallback as the 1ms check", () => {
  const { kiai, preview, offset } = analyze(500, { red: 1000 });
  assert.deepEqual(kiai.results, []);
  assert.equal(preview.level, "ok");
  assert.deepEqual(offset.results, []);
});

test("Kiai checks ON and OFF transitions but ignores unchanged states", () => {
  const run = runtime();
  const text = beatmap(250).replace("[HitObjects]", "375,-100,4,1,0,100,0,1\n500,-100,4,1,0,100,0,0\n[HitObjects]");
  const result = run('runKiaiSnapCheck(text, "[Oni].osu")', { text });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].type, "ON");
  assert.equal(result.results[0].time, 250);
});

test("preview missing values and cross-difficulty consistency keep existing severity", () => {
  const { run, preview } = analyze(1000);
  const missing = run('runPreviewPointCheck(text, "[Oni].osu")', { text: beatmap(1000, { preview: -1 }) });
  assert.equal(missing.level, "error");
  assert.equal(missing.previewTime, null);
  assert.equal(run("getPreviewPointIssueLevel([preview, missing])", { preview, missing }), "error");
  assert.equal(run("getPreviewPointIssueLevel([preview, {...preview, previewTime: 1500}])", { preview }), "error");
  const html = run('formatPreviewPointResult([preview, missing], k => i18n.en[k])', { preview, missing });
  assert.match(html, /Preview point is not set/);
  assert.match(html, /mp3 variable bitrate check/);
});

test("preview grouping does not merge different compatibility or supplementary notes", () => {
  const run = runtime();
  const base = { fileName: "[Oni].osu", previewTime: 100, snap: "1/16", diff: -7, level: "warn" };
  assert.equal(run("groupPreviewPointSnapResults(items).length", { items: [
    { ...base, supplementalSnaps: [{ snap: 5, diff: 0 }] },
    { ...base, supplementalSnaps: [{ snap: 7, diff: 0 }] },
    { ...base, compatibility: "stableOnly" },
    { ...base, compatibility: "lazerOnly" }
  ] }), 4);
});

test("preview consistency never claims a match when a difficulty is missing its preview", () => {
  const run = runtime();
  const configured = run('runPreviewPointCheck(text, "[Oni].osu")', { text: beatmap(1000) });
  const missing = run('runPreviewPointCheck(text, "[Kantan].osu")', {
    text: beatmap(1000, { preview: -1 })
  });
  const other = { ...configured, fileName: "[Inner Oni].osu" };
  for (const lang of ["ja", "en"]) {
    for (const items of [
      [missing, configured, other],
      [missing, configured],
      [missing],
      [missing, configured, { ...other, previewTime: 1500 }]
    ]) {
      const html = run(`formatPreviewPointResult(items, k => i18n.${lang}[k])`, { items });
      const snapTitle = run(`i18n.${lang}.previewPointSnapTitle`);
      const consistency = html.slice(0, html.indexOf(snapTitle));
      assert.doesNotMatch(html, new RegExp(run(`i18n.${lang}.previewPointConsistencyOk`)));
      assert.ok(consistency.includes(run(`i18n.${lang}.previewPointMissingError`)));
      assert.ok(consistency.includes("[Kantan]"));
      assert.match(consistency, /result-error/);
      assert.equal(run("getPreviewPointIssueLevel(items)"), "error");
    }
    const html = run(`formatPreviewPointResult(items, k => i18n.${lang}[k])`, {
      items: [configured, other]
    });
    assert.ok(html.includes(run(`i18n.${lang}.previewPointConsistencyOk`)));
    assert.equal(run("getPreviewPointIssueLevel(items)"), "none");
  }
});

test("preview VBR warnings survive the new snap and grid sections", () => {
  const run = runtime();
  const bytes = new Uint8Array(100);
  bytes.set([0xff, 0xfb, 0x90, 0x00]); // MPEG1 Layer III, 128 kbps
  bytes.set(Buffer.from("Xing"), 36);
  const preview = run('runPreviewPointCheck(text, "[Oni].osu", options)', {
    text: beatmap(34788, { red: 1038, beat: 297.029702970297 }),
    options: { audioFileName: "audio.mp3", audioBytes: bytes }
  });
  assert.equal(preview.audioBitrate.isVbr, true);
  const html = run('formatPreviewPointResult([preview], k => i18n.en[k])', { preview });
  assert.match(html, /osu!stable grid time check/);
  assert.match(html, /The mp3 uses variable bitrate/);
  assert.match(html, /audio.mp3/);
});
