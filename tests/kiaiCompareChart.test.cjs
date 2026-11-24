const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture() {
  const scope = vm.createContext({ getDifficultyNameText: name => name });
  for (const file of ['checks/kiai/kiaiCompareCheck.js', 'app/charts/kiaiCompareChart.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
  }
  vm.runInContext('kiaiCompareChartState.t = key => key', scope);
  const results = [
    { fileName: 'a.osu', endTime: 1000, intervals: [
      { start: 0, end: 250 }, { start: 600, end: 800 }
    ] },
    { fileName: 'b.osu', endTime: 1000, intervals: [{ start: 250, end: 500 }] }
  ];
  const { mismatchSections } = scope.compareKiaiResults(results);
  return { scope, results, mismatchSections };
}

test('adjacent mismatches with different difficulty states draw as one translucent band', () => {
  const { scope, results, mismatchSections } = fixture();
  assert.equal(mismatchSections.length, 3);
  assert.notDeepEqual(mismatchSections[0].states, mismatchSections[1].states);
  const original = JSON.stringify(mismatchSections);

  for (const [viewStart, viewEnd] of [[100, 700], [300, 650]]) {
    const bands = [];
    const ctx = {
      fillRect(...rect) {
        if (this.fillStyle === 'rgba(255, 107, 107, 0.72)') bands.push(rect);
      },
      measureText: () => ({ width: 10 }),
      fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}
    };
    const xForTime = time => 110.25 + (time - viewStart) * 0.7337;
    scope.drawKiaiCompareRows(ctx, results, mismatchSections,
      { left: 110.25, right: 600, top: 14, width: 489.75, rowHeight: 34 },
      viewStart, viewEnd, xForTime, true);
    assert.deepEqual(bands, [
      [xForTime(viewStart), 19, xForTime(500) - xForTime(viewStart), 24],
      [xForTime(600), 19, xForTime(viewEnd) - xForTime(600), 24]
    ]);
  }
  assert.equal(JSON.stringify(mismatchSections), original, 'comparison states stay intact');
});

test('drawing intervals preserve genuine gaps, including a one millisecond gap', () => {
  const { scope } = fixture();
  const sections = [
    { start: 0, end: 100 }, { start: 100, end: 200 }, { start: 201, end: 300 }
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(scope.getKiaiCompareDrawingIntervals(sections))), [
    { start: 0, end: 200 }, { start: 201, end: 300 }
  ]);
  assert.equal(scope.getKiaiCompareDrawingIntervals([]).length, 0);
});
