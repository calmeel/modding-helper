const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const paths = [], bands = [];
  let currentPath = [];
  const ctx = new Proxy({
    beginPath() { currentPath = []; },
    moveTo(x, y) { currentPath.push(['move', x, y]); },
    lineTo(x, y) { currentPath.push(['line', x, y]); },
    stroke() { paths.push(currentPath.slice()); },
    fillRect(...rect) { bands.push(rect); },
    measureText: text => ({ width: text.length * 6 })
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  const wrap = { clientWidth: 600, clientHeight: 400, dataset: {}, hidden: false };
  const canvas = { style: {}, parentElement: wrap, getContext: () => ctx,
    classList: { toggle() {}, remove() {} },
    getBoundingClientRect: () => ({ left: 10, top: 20 }) };
  const tooltip = { style: {}, offsetWidth: 200, offsetHeight: 100, hidden: true };
  const dom = { volumeCompareChart: canvas, volumeCompareChartWrap: wrap,
    volumeCompareChartTooltip: tooltip, volumeCompareShowDifferences: { checked: true },
    volumeCompareShowKiai: { checked: false }, volumeCompareShowBreaks: { checked: false } };
  const scope = vm.createContext({ window: { devicePixelRatio: 2, location: {} } });
  for (const file of ['app/formatters/common.js', 'checks/spread/difficulty.js',
    'app/formatters/spread/order.js', 'checks/volume/volumeCompareCheck.js',
    'app/charts/chartNavigation.js', 'app/charts/volumeCompareChart.js',
    'app/charts/volumeCompareDrawing.js', 'app/charts/volumeCompareTooltip.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
  }
  const a = { fileName: 'a.osu', points: [{ time: 0, volume: 70 }, { time: 1000, volume: 80 }],
    kiaiIntervals: [{ start: 0, end: 1500 }], breakIntervals: [] };
  const b = { fileName: 'b.osu', points: [{ time: 0, volume: 90 }],
    kiaiIntervals: [], breakIntervals: [{ start: 500, end: 1000 }] };
  const result = { endTime: 2000, series: [a, b], options: {}, intervals: [
    { start: 0, end: 1000, states: [{ fileName: 'a.osu', volume: 70 }, { fileName: 'b.osu', volume: 90 }] },
    { start: 1000, end: 2000, states: [{ fileName: 'a.osu', volume: 80 }, { fileName: 'b.osu', volume: 90 }] }
  ] };
  const state = vm.runInContext('volumeCompareChartState', scope);
  Object.assign(state, { result, dom, t: key => key, viewStart: 0, viewEnd: 2000 });
  return { scope, state, result, dom, canvas, tooltip, paths, bands, a, b };
}

test('volume graph drawing publishes matching geometry and visible-Diff markers after resize', () => {
  const f = fixture();
  f.scope.drawVolumeCompareChart();
  assert.equal(f.canvas.width, 1200);
  assert.equal(f.canvas.height, 680);
  const marker = f.canvas.__markerAt(1200, 'C:\\Songs\\a.osu');
  assert.equal(marker.label, '80%');
  assert.equal(f.canvas.__markerAt(-1, 'a.osu'), null);
  assert.equal(f.canvas.__markerAt(1000, 'missing.osu'), null);
  assert.equal(f.canvas.__playheadGeom.viewEnd, 2000);
  f.state.hiddenFiles.add('a.osu');
  f.dom.volumeCompareChartWrap.dataset.chartFill = '1';
  f.dom.volumeCompareChartWrap.clientWidth = 800;
  f.scope.drawVolumeCompareChart();
  assert.equal(f.canvas.width, 1600);
  assert.equal(f.canvas.height, 800);
  assert.equal(f.canvas.__markerAt(1200, 'a.osu'), null);
  assert.equal(f.canvas._volumeCompareVisibleAssignments.length, 1);
});

test('volume graph lines stay stepped at volume changes and clip to the time window', () => {
  const f = fixture();
  f.scope.drawVolumeCompareSeries({
    beginPath() {}, moveTo: (...args) => f.paths.push(['move', ...args]),
    lineTo: (...args) => f.paths.push(['line', ...args]), stroke() {}
  }, f.a, 'red', 500, 1500, time => time, volume => volume);
  assert.deepEqual(f.paths, [
    ['move', 500, 70], ['line', 1000, 70], ['line', 1000, 80], ['line', 1500, 80]
  ]);
});

test('volume difference bands use only visible files and preserve threshold filtering', () => {
  const f = fixture();
  const visible = new Set(['a.osu', 'b.osu']);
  assert.deepEqual(plain(f.scope.getVisibleVolumeCompareSections(f.result, visible)), [
    { start: 0, end: 2000, diff: 20 }
  ]);
  f.result.options.thresholdPercent = 15;
  assert.deepEqual(plain(f.scope.getVisibleVolumeCompareSections(f.result, visible)), [
    { start: 0, end: 1000, diff: 20 }
  ]);
  visible.delete('b.osu');
  assert.deepEqual(plain(f.scope.getVisibleVolumeCompareSections(f.result, visible)), []);
});

test('volume tooltip follows visible series, background toggles and language, staying inside the wrapper', () => {
  const f = fixture();
  f.scope.drawVolumeCompareChart();
  f.dom.volumeCompareShowKiai.checked = true;
  f.scope.showVolumeCompareTooltip({ x: 590, y: 390 }, 750);
  assert.match(f.tooltip.textContent, /70%/);
  assert.match(f.tooltip.textContent, /90%/);
  assert.match(f.tooltip.textContent, /volumeCompareGraphDifference: 20%/);
  assert.match(f.tooltip.textContent, /volumeCompareGraphKiai/);
  assert.doesNotMatch(f.tooltip.textContent, /volumeCompareGraphBreak/);
  assert.ok(parseFloat(f.tooltip.style.left) + 200 <= 592);
  assert.ok(parseFloat(f.tooltip.style.top) + 100 <= 392);
  f.state.hiddenFiles.add('a.osu');
  f.state.t = key => `ja:${key}`;
  f.dom.volumeCompareShowBreaks.checked = true;
  f.scope.drawVolumeCompareChart();
  f.scope.showVolumeCompareTooltip({ x: 60, y: 30 }, 750);
  assert.doesNotMatch(f.tooltip.textContent, /70%|GraphDifference|GraphKiai/);
  assert.match(f.tooltip.textContent, /ja:volumeCompareGraphBreak/);
  f.scope.hideVolumeCompareTooltip();
  assert.equal(f.tooltip.hidden, true);
});

test('volume graph wheel zoom, left pan and right-click osu navigation survive module separation', () => {
  const f = fixture();
  f.scope.drawVolumeCompareChart();
  const event = { clientX: 300, clientY: 120, deltaY: -100, deltaMode: 0, preventDefault() {} };
  f.scope.handleVolumeCompareWheel(event);
  const span = f.state.viewEnd - f.state.viewStart;
  assert.ok(span < 2000);
  f.scope.handleVolumeComparePointerDown({ ...event, button: 0 });
  const start = f.state.viewStart;
  f.scope.handleVolumeComparePointerMove({ ...event, clientX: 320 });
  assert.ok(f.state.viewStart < start);
  f.scope.handleVolumeComparePointerUp({ ...event, clientX: 320 });
  assert.equal(f.state.dragStartX, null);
  f.scope.handleVolumeComparePointerDown({ ...event, button: 2 });
  f.scope.handleVolumeComparePointerUp({ ...event, button: 2 });
  assert.match(f.scope.window.location.href, /^osu:\/\/edit\//);
});
