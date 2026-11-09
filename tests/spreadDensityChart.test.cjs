const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture() {
  const bands = [];
  const ctx = new Proxy({ fillRect: (...args) => bands.push(args),
    measureText: text => ({ width: text.length * 6 })
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  const wrap = { clientWidth: 600, clientHeight: 400, dataset: {}, hidden: false };
  const canvas = { style: {}, parentElement: wrap, getContext: () => ctx,
    classList: { toggle() {}, remove() {} },
    getBoundingClientRect: () => ({ left: 10, top: 20 }) };
  const tooltip = { style: {}, offsetWidth: 200, offsetHeight: 100,
    classList: { add() {} }, hidden: true };
  const dom = { spreadDensityChart: canvas, spreadDensityChartWrap: wrap,
    spreadDensityChartTooltip: tooltip, spreadDensityShowInversions: { checked: false } };
  const scope = vm.createContext({ window: { devicePixelRatio: 2, location: {} } });
  for (const file of ['app/formatters/common.js', 'checks/spread/difficulty.js',
    'app/formatters/spread/order.js', 'app/formatters/spread/density.js',
    'app/charts/chartNavigation.js', 'app/charts/volumeCompareDrawing.js',
    'app/charts/spreadDensityChart.js', 'app/charts/spreadDensityDrawing.js',
    'app/charts/spreadDensityTooltip.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
  }
  const result = (name, counts) => {
    const fileName = `song [${name}].osu`;
    return { fileName, sortInfo: scope.getSpreadSortInfo(fileName), audioDurationMs: 3000,
      density: { measures: counts.map((noteCount, index) => ({
        start: index * 1000, end: (index + 1) * 1000, noteCount
      })) } };
  };
  const results = [result('Kantan', [10, 3]), result('Oni', [4, 6]), result('Inner Oni', [12, 12])];
  const state = vm.runInContext('spreadDensityChartState', scope);
  Object.assign(state, { results, dom, t: key => key, viewStart: 0, viewEnd: 3000 });
  return { scope, state, dom, canvas, tooltip, results, bands };
}

test('density graph follows manual Diff order, hidden files and resized playhead geometry', () => {
  const f = fixture();
  f.state.diffOrder = f.results.map(r => r.fileName).reverse();
  f.scope.drawSpreadDensityChart();
  assert.deepEqual(Array.from(f.canvas._spreadDensityVisibleResults, r => r.fileName), f.state.diffOrder);
  assert.equal(f.canvas.width, 1200);
  assert.equal(f.canvas.height, 660);
  const file = f.results[0].fileName;
  assert.equal(f.canvas.__markerAt(500, `C:\\Songs\\${file}`).label, '10');
  assert.equal(f.canvas.__markerAt(1000, file).label, '3');
  assert.equal(f.canvas.__markerAt(2500, file), null);
  f.state.hiddenFiles.add(file);
  f.dom.spreadDensityChartWrap.dataset.chartFill = '1';
  f.dom.spreadDensityChartWrap.clientWidth = 800;
  f.scope.drawSpreadDensityChart();
  assert.equal(f.canvas.width, 1600);
  assert.equal(f.canvas.height, 800);
  assert.equal(f.canvas.__markerAt(500, file), null);
  assert.equal(f.canvas.__playheadGeom.viewEnd, 3000);
});

test('inversion-only filtering restores prior visibility and respects threshold and categories', () => {
  const f = fixture();
  const [lower, higher, other] = f.results;
  f.state.hiddenFiles.add(lower.fileName);
  f.scope.applySpreadDensityInversionFilter();
  assert.deepEqual(Array.from(f.state.hiddenFiles), [other.fileName]);
  f.scope.applySpreadDensityInversionFilter();
  f.scope.restoreSpreadDensityDiffFilter();
  assert.deepEqual(Array.from(f.state.hiddenFiles), [lower.fileName]);
  f.state.minDiff = 7;
  f.scope.applySpreadDensityInversionFilter();
  assert.equal(f.state.hiddenFiles.size, 3);
  f.scope.restoreSpreadDensityDiffFilter();
  f.state.minDiff = 1;
  f.state.manualCategories = { [lower.fileName]: 'unknown' };
  f.scope.applySpreadDensityInversionFilter();
  assert.equal(f.state.hiddenFiles.has(higher.fileName), true);
  assert.equal(f.state.hiddenFiles.size, 3);
});

test('density inversion bands only draw when enabled and reflect the comparison threshold', () => {
  const f = fixture();
  f.scope.drawSpreadDensityChart();
  assert.equal(f.bands.length, 0);
  f.dom.spreadDensityShowInversions.checked = true;
  f.scope.drawSpreadDensityChart();
  assert.equal(f.bands.length, 1);
  f.bands.length = 0;
  f.state.minDiff = 7;
  f.scope.drawSpreadDensityChart();
  assert.equal(f.bands.length, 0);
});

test('density lines keep separate measure gaps and clip the visible time window', () => {
  const f = fixture(), commands = [];
  const ctx = { beginPath() {}, stroke() {},
    moveTo: (...args) => commands.push(['move', ...args]),
    lineTo: (...args) => commands.push(['line', ...args]) };
  const measures = [{ start: 0, end: 1000, noteCount: 10 },
    { start: 1000, end: 2000, noteCount: 4 }, { start: 2100, end: 3000, noteCount: 8 }];
  f.scope.drawSpreadDensitySeries(ctx, measures, 'red', 500, 2500, t => t, n => n);
  assert.deepEqual(commands, [
    ['move', 500, 10], ['line', 1000, 10], ['line', 1000, 10],
    ['line', 1000, 4], ['line', 2000, 4], ['move', 2100, 8], ['line', 2500, 8]
  ]);
});

test('density tooltip uses the containing group, visible Diff order and translated inversion labels', () => {
  const f = fixture();
  f.state.diffOrder = [f.results[1].fileName, f.results[0].fileName, f.results[2].fileName];
  f.state.t = key => `ja:${key}`;
  f.scope.drawSpreadDensityChart();
  f.scope.showSpreadDensityTooltip({ x: 590, y: 390 }, 1000);
  assert.match(f.tooltip.textContent, /\[Oni\]: 6 ja:spreadDensityGraphNotes/);
  assert.ok(f.tooltip.textContent.indexOf('[Oni]:') < f.tooltip.textContent.indexOf('[Kantan]:'));
  assert.match(f.tooltip.textContent, /\[Oni\] 6 > \[Kantan\] 3/);
  assert.ok(parseFloat(f.tooltip.style.left) + 200 <= 592);
  assert.ok(parseFloat(f.tooltip.style.top) + 100 <= 392);
  f.state.diffOrder = f.results.map(r => r.fileName);
  f.scope.drawSpreadDensityChart();
  f.scope.showSpreadDensityTooltip({ x: 100, y: 100 }, 500);
  assert.match(f.tooltip.textContent, /ja:spreadDensityInversions/);
  f.state.hiddenFiles.add(f.results[2].fileName);
  f.scope.drawSpreadDensityChart();
  f.scope.showSpreadDensityTooltip({ x: 100, y: 100 }, 500);
  assert.doesNotMatch(f.tooltip.textContent, /Inner Oni/);
  f.scope.hideSpreadDensityTooltip();
  assert.equal(f.tooltip.hidden, true);
});

test('density graph zoom, pan and right-click navigation work across the split modules', () => {
  const f = fixture();
  f.scope.drawSpreadDensityChart();
  const event = { clientX: 300, clientY: 120, deltaY: -100, deltaMode: 0, preventDefault() {} };
  f.scope.handleSpreadDensityWheel(event);
  assert.ok(f.state.viewEnd - f.state.viewStart < 3000);
  const start = f.state.viewStart;
  f.scope.handleSpreadDensityPointerDown({ ...event, button: 0 });
  f.scope.handleSpreadDensityPointerMove({ ...event, clientX: 320 });
  assert.ok(f.state.viewStart < start);
  f.scope.handleSpreadDensityPointerUp({ ...event, clientX: 320 });
  assert.equal(f.state.dragStartX, null);
  f.scope.handleSpreadDensityPointerDown({ ...event, button: 2 });
  f.scope.handleSpreadDensityPointerUp({ ...event, button: 2 });
  assert.match(f.scope.window.location.href, /^osu:\/\/edit\//);
});
