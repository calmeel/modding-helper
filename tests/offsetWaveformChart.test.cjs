const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function audioBuffer(duration = 2) {
  const left = new Float32Array(duration * 1000).fill(0.8);
  const right = new Float32Array(duration * 1000).fill(0.4);
  return { duration, sampleRate: 1000, length: left.length, numberOfChannels: 2,
    getChannelData: channel => channel === 0 ? left : right };
}
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}
function fixture() {
  const fills = [], strokes = [], errors = [];
  let currentPath = [];
  const ctx = new Proxy({
    beginPath() { currentPath = []; },
    moveTo: (x, y) => currentPath.push([x, y]),
    lineTo: (x, y) => currentPath.push([x, y]),
    fill: () => fills.push(currentPath.slice()),
    stroke: () => strokes.push(currentPath.slice()),
    measureText: text => ({ width: text.length * 6 })
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  const wrap = { clientWidth: 600, clientHeight: 400, dataset: {}, hidden: false };
  const classes = { add() {}, remove() {}, toggle() {} };
  const canvas = { style: {}, parentElement: wrap, getContext: () => ctx, classList: classes };
  const tooltip = { style: {}, hidden: true };
  const dom = { offsetWaveformCanvas: canvas, offsetWaveformChartWrap: wrap,
    offsetWaveformTooltip: tooltip, offsetWaveformEstimate: { classList: classes },
    offsetWaveformEmpty: {}, offsetWaveformInfo: {} };
  const scope = vm.createContext({ window: { devicePixelRatio: 2 },
    console: { error: error => errors.push(error) }, buildOffsetWaveformBarlines: () => [] });
  for (const file of ['app/formatters/common.js', 'checks/spread/difficulty.js',
    'app/formatters/spread/order.js', 'app/charts/chartNavigation.js',
    'app/charts/offsetWaveformData.js', 'app/charts/offsetWaveformChart.js',
    'app/charts/offsetWaveformDrawing.js', 'app/charts/offsetWaveformInput.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
  }
  const source = { fileName: 'song [Oni].osu', offsetWaveformBarlines: [{ time: 500 }, { time: 1500 }] };
  const state = vm.runInContext('offsetWaveformChartState', scope);
  const buffer = audioBuffer();
  Object.assign(state, { sources: [source], dom, t: key => key, audioBuffer: buffer,
    waveformData: scope.createOffsetWaveformData(buffer), viewStart: 0, viewEnd: 2000 });
  return { scope, state, dom, canvas, tooltip, source, fills, strokes, errors };
}

test('offset waveform draws both channels and updates playhead geometry after resize', () => {
  const f = fixture();
  f.scope.drawOffsetWaveformChart();
  assert.equal(f.canvas.width, 1200);
  assert.equal(f.canvas.height, 660);
  assert.equal(f.canvas.__playheadGeom.viewEnd, 2000);
  const plot = f.canvas._offsetWaveformPlot;
  const middle = plot.top + plot.height / 2;
  assert.ok(f.fills[0].some(([, y]) => y < middle));
  assert.ok(f.fills[0].some(([, y]) => y > middle));
  assert.ok(f.fills[0].flat().every(Number.isFinite));
  f.dom.offsetWaveformChartWrap.dataset.chartFill = '1';
  f.dom.offsetWaveformChartWrap.clientWidth = 800;
  f.scope.drawOffsetWaveformChart();
  assert.equal(f.canvas.width, 1600);
  assert.equal(f.canvas.height, 800);
});

test('offset waveform right click keeps nearest-barline and 28.7ms manual correction', () => {
  const f = fixture();
  f.scope.drawOffsetWaveformChart();
  const plot = f.canvas._offsetWaveformPlot;
  const x = plot.left + plot.width * 600 / 2000;
  const event = { button: 2, offsetX: x, offsetY: 100, preventDefault() {} };
  f.scope.handleOffsetWaveformPointerDown(event);
  f.scope.handleOffsetWaveformPointerUp(event);
  const result = f.state.manualOffsetResult;
  assert.equal(result.peakTime, 600);
  assert.equal(result.nearestBarlineTime, 500);
  assert.equal(result.barlineGap, 100);
  assert.ok(Math.abs(result.recommendedOffsetTime - 571.3) < 1e-9);
  assert.ok(Math.abs(result.recommendedDelta - 71.3) < 1e-9);
  assert.match(f.dom.offsetWaveformEstimate.innerHTML, /offsetManualTitle/);
  assert.match(f.dom.offsetWaveformEstimate.innerHTML, /71.3 ms/);
  f.state.manualOffsetResult = null;
  f.scope.handleOffsetWaveformPointerDown(event);
  f.scope.handleOffsetWaveformPointerUp({ ...event, offsetX: x + 10 });
  assert.equal(f.state.manualOffsetResult, null);
});

test('offset waveform guide lines clip out-of-range manual results', () => {
  const f = fixture();
  const plot = { top: 0, bottom: 100 };
  const paths = [];
  let current;
  const ctx = { save() {}, restore() {}, setLineDash() {}, beginPath() { current = []; },
    moveTo: (...p) => current.push(p), lineTo: (...p) => current.push(p), stroke: () => paths.push(current) };
  f.scope.drawManualOffsetResult(ctx, { peakTime: 600, recommendedOffsetTime: 571.3 }, plot, 580, 700, t => t);
  assert.equal(paths.length, 1);
  assert.equal(paths[0][0][0], 600.5);
});

test('offset waveform zoom, pan, hover timestamp and cancellation keep their behavior', () => {
  const f = fixture();
  f.scope.drawOffsetWaveformChart();
  const event = { offsetX: 300, offsetY: 100, deltaY: -100, deltaMode: 0, preventDefault() {} };
  f.scope.handleOffsetWaveformWheel(event);
  assert.ok(f.state.viewEnd - f.state.viewStart < 2000);
  const start = f.state.viewStart;
  f.scope.handleOffsetWaveformPointerDown({ ...event, button: 0 });
  f.scope.handleOffsetWaveformPointerMove({ ...event, offsetX: 320 });
  assert.ok(f.state.viewStart < start);
  f.scope.handleOffsetWaveformPointerCancel();
  assert.equal(f.state.dragStartX, null);
  f.scope.handleOffsetWaveformPointerMove(event);
  assert.equal(f.tooltip.hidden, false);
  assert.match(f.tooltip.textContent, /^\d\d:\d\d:\d\d\d$/);
  f.scope.handleOffsetWaveformPointerLeave();
  assert.equal(f.tooltip.hidden, true);
  assert.equal(f.state.hoverTime, null);
});

test('offset waveform ignores an older decode when the selected source changes', async () => {
  const f = fixture();
  const older = deferred();
  f.state.audioContext = { decodeAudioData: value => value === 'old' ? older.promise : Promise.resolve(audioBuffer(3)) };
  const old = { fileName: 'old.osu', audioFileName: 'old.wav', audioBlob: { arrayBuffer: async () => 'old' } };
  const next = { fileName: 'new.osu', audioFileName: 'new.wav', audioBlob: { arrayBuffer: async () => 'new' } };
  f.state.sources = [old];
  const pending = f.scope.renderSelectedOffsetWaveformSource(old);
  f.state.sources = [next];
  await f.scope.renderSelectedOffsetWaveformSource(next);
  older.resolve(audioBuffer(1));
  await pending;
  assert.equal(f.state.decodedFileName, 'new.osu');
  assert.equal(f.state.audioBuffer.duration, 3);
  assert.equal(f.canvas.__playheadGeom.viewEnd, 3000);
  assert.equal(f.errors.length, 0);
});
