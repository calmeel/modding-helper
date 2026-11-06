const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function compare(pointsByFile, options = {}) {
  const context = vm.createContext({});
  for (const file of [
    "parsers/osuParser.js", "checks/kiai/kiaiCompareCheck.js",
    "checks/volume/volumeCompareCheck.js"
  ]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
  }
  context.sources = pointsByFile.map((points, index) => ({
    fileName: `diff${index}.osu`,
    text: "[TimingPoints]\n" + points.join("\n") +
      "\n[HitObjects]\n256,192,2000,1,0\n"
  }));
  context.options = options;
  return JSON.parse(vm.runInContext(
    "JSON.stringify(runVolumeCompareCheck(sources, options))", context
  ));
}

const red = volume => `0,500,4,1,0,${volume},1,0`;
const green = (time, volume, beatLength = -100) =>
  `${time},${beatLength},4,1,0,${volume},0,0`;
const ranges = result => result.results.map(({ start, end }) => [start, end]);

test("unchanged volumes merge across timing points from every difficulty", () => {
  const result = compare([
    [red(70), green(1000, 70), green(1100, 70, -50)],
    [red(80), green(1050, 80), green(1200, 80)]
  ]);
  assert.deepEqual(ranges(result), [[0, 2000]]);
  assert.deepEqual(result.results[0].states.map(state => state.volume), [70, 80]);
  // Table merging must not extend the original intervals used by the graph.
  assert.deepEqual(result.intervals.map(({ start, end }) => [start, end]), [
    [0, 1000], [1000, 1050], [1050, 1100], [1100, 1200], [1200, 2000]
  ]);
});

test("volume changes split rows even when the difference stays the same", () => {
  const result = compare([
    [red(70), green(1000, 80)],
    [red(80), green(1000, 70)]
  ]);
  assert.deepEqual(ranges(result), [[0, 1000], [1000, 2000]]);
  assert.deepEqual(result.results.map(section => section.diff), [10, 10]);
});

test("identical rows remain separate across matching or filtered intervals", () => {
  for (const volume of [70, 72]) {
    const result = compare([
      [red(70)],
      [red(80), green(1000, volume), green(1100, 80)]
    ]);
    assert.deepEqual(ranges(result), [[0, 1000], [1100, 2000]]);
  }
});

test("duration filtering still counts continuous differences across timing points", () => {
  const points = [green(20, 80), green(40, 80), green(60, 70)];
  assert.deepEqual(ranges(compare([[red(70)], [red(80), ...points]])), [[0, 60]]);
  const shortPoints = [green(20, 80), green(40, 70)];
  assert.deepEqual(ranges(compare([[red(70)], [red(80), ...shortPoints]])), []);
  assert.deepEqual(ranges(compare([[red(70)], [red(80), ...shortPoints]], {
    minDurationOnly: false
  })), [[0, 40]]);
});
