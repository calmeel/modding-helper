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
    assert.ok(html.includes(`${nearest} snap | ${offset > 0 ? "+" : ""}${offset} ms`));
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
