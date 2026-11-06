const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function context() {
  const events = new EventTarget();
  const ctx = vm.createContext({ Event, window: {
    dispatchEvent: event => events.dispatchEvent(event),
    addEventListener: (...args) => events.addEventListener(...args)
  }, document: { getElementById: () => null, querySelectorAll: () => [] } });
  for (const file of ['app/formatters/common.js', 'checks/spread/difficulty.js',
    'app/formatters/spread/order.js', 'checks/tools/timelineCheck.js', 'app/ui/setup.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx);
  }
  return ctx;
}
const map = (name, noteCount = 100) => ({ fileName: `song [${name}].osu`, noteCount });
const names = values => Array.from(values, value => value.fileName);

test('automatic order is shared: difficulty, equal-score names, then Unknown circle counts', () => {
  const ctx = context();
  const input = [map('Galaxy', 300), map("Zoe's Oni"), map('Kantan'),
    map('Aurora', 100), map("Alice's Oni"), map('Cosmos', 100), map('Inner Oni')];
  const expected = ['Kantan', "Alice's Oni", "Zoe's Oni", 'Inner Oni', 'Aurora', 'Cosmos', 'Galaxy']
    .map(name => map(name).fileName);
  assert.deepEqual(names(ctx.sortResultsForDisplay(input)), expected);
  assert.deepEqual(names(ctx.sortSpreadResults(input)), expected);
  assert.deepEqual(names(ctx.sortTimelineDiffs(input)), expected);
  assert.deepEqual(Array.from(ctx.createSpreadDiffOrder(input)), expected);
  assert.equal(input[0].fileName, map('Galaxy').fileName);
});

test('publishing replacement orders updates all consumers; automatic reset ignores manual ranks', () => {
  const ctx = context();
  const input = [map('Kantan'), map('Oni'), map('Galaxy', 5)];
  let events = 0;
  ctx.window.addEventListener('modding-helper-diff-order-changed', () => events++);
  const order = names(input).reverse();
  ctx.publishDisplayDiffOrder(order);
  order.reverse(); // Published ranks must not silently mutate with the caller's array.
  const expected = names(input).reverse();
  assert.deepEqual(names(ctx.sortResultsForDisplay(input)), expected);
  assert.deepEqual(names(ctx.applySpreadDiffOrder(input, ctx.getDisplayDiffOrder())), expected);
  assert.deepEqual(names(ctx.sortTimelineDiffs(input, ctx.getDisplayDiffOrder())), expected);
  assert.deepEqual(Array.from(ctx.createSpreadDiffOrder(input)), names(input));
  ctx.publishDisplayDiffOrder(ctx.createSpreadDiffOrder(input));
  assert.deepEqual(names(ctx.sortResultsForDisplay(input)), names(input));
  ctx.publishDisplayDiffOrder([]);
  assert.equal(events, 3);
  assert.deepEqual(names(ctx.sortResultsForDisplay(input)), names(input));
});

test('source-only Unknown diffs use circle count rather than total hit objects', () => {
  const ctx = context();
  const circle = '0,0,100,1,0';
  const slider = '0,0,200,2,0';
  const input = [
    { fileName: map('Aurora').fileName, text: '[HitObjects]\n' + [circle, circle].join('\n') },
    { fileName: map('Galaxy').fileName, text: '[HitObjects]\n' + [circle, slider, slider].join('\n') }
  ];
  assert.deepEqual(names(ctx.sortResultsForDisplay(input)), names(input).reverse());
  const withoutCounts = [map('Galaxy'), map('Aurora')].map(({fileName}) => ({fileName}));
  assert.deepEqual(names(ctx.sortResultsForDisplay(withoutCounts)), names(withoutCounts).reverse());
});

test('BN comparison keeps manual pair selections when its difficulty list is reordered', () => {
  const ctx = context();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app/tools/bnCompare/ui.js'), 'utf8'), ctx);
  const before = { ...map('Kantan'), id: 'before', diffName: 'Kantan' };
  const after = [{ ...map('Kantan'), id: 'default', diffName: 'Kantan' },
    { ...map('Oni'), id: 'manual', diffName: 'Oni' }];
  const area = { innerHTML: '', querySelectorAll: () => [{
    dataset: { beforeId: 'before' }, querySelector: () => ({value: 'manual'})
  }] };
  const ui = ctx.setupBnCompareUi({state: {bnCompare: {beforeDiffs: [before], afterDiffs: after}},
    bnDiffMatchingArea: area, dom: {}, t: key => key });
  ui.renderBnDiffMatching(true);
  assert.match(area.innerHTML, /value="manual" selected/);
  ui.renderBnDiffMatching();
  assert.match(area.innerHTML, /value="default" selected/);
});

test('move, category replacement, and reset notify the application for a full redraw', () => {
  const ctx = context();
  const handlers = {};
  const state = { spread: { results: [map('Kantan'), map('Oni')],
    diffOrder: [map('Kantan').fileName, map('Oni').fileName], manualCategories: {} } };
  let redraws = 0;
  ctx.setupSpreadOrderControls({ state, dom: {
    spreadResetOrderButton: { addEventListener: (_, cb) => handlers.reset = cb },
    spreadOrderOutput: { addEventListener: (name, cb) => handlers[name] = cb }
  }, onOrderChanged: () => { ctx.publishDisplayDiffOrder(state.spread.diffOrder); redraws++; } });
  handlers.click({ target: { closest: () => ({ dataset: {
    spreadOrderAction: 'up', fileName: map('Oni').fileName
  } }) } });
  assert.deepEqual(names(ctx.sortResultsForDisplay(state.spread.results)), names(state.spread.results).reverse());
  handlers.change({ target: { closest: () => ({ value: 'kantan', dataset: { fileName: map('Oni').fileName } }) } });
  assert.deepEqual(Array.from(ctx.getDisplayDiffOrder()), Array.from(state.spread.diffOrder));
  handlers.reset();
  assert.deepEqual(Array.from(ctx.getDisplayDiffOrder()), names(state.spread.results));
  assert.equal(redraws, 3);
});

test('SR completion keeps an order changed while the asynchronous calculation was running', async () => {
  const ctx = context();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app/tools/srCalculator.js'), 'utf8'), ctx);
  let finish;
  ctx.window.electronAPI = { calculateSr: () => new Promise(resolve => finish = resolve) };
  ctx.parseMetadataValue = () => 'Oni';
  const state = ctx.createSrCalculatorState();
  const oldOrder = [map('Kantan').fileName, map('Oni').fileName];
  const latestOrder = [...oldOrder].reverse();
  const pending = ctx.startSrCalculation([{fileName: oldOrder[1], text: ''}], state, null, key => key, oldOrder);
  ctx.renderSrCalculator(state, null, key => key, latestOrder);
  finish({ results: [] });
  await pending;
  assert.equal(state.status, 'complete');
  assert.deepEqual(Array.from(state.diffOrder), latestOrder);
});

test('Electron preview reorders its existing cache when a new order is published', () => {
  const ctx = context();
  const source = fs.readFileSync(path.join(__dirname, '..', 'electron/inject/ui.js'), 'utf8');
  const start = source.indexOf('          var sortSpreadDiffs = function');
  const end = source.indexOf('          var spreadTimeRange', start);
  vm.runInContext('var spDiffDesc = true; var spVisibleDiffsDirty = false;\n' + source.slice(start, end), ctx);
  const input = [map('Kantan'), map('Oni')];
  ctx.spCacheDiffs = [...input];
  ctx.publishDisplayDiffOrder(names(input));
  assert.deepEqual(names(ctx.spCacheDiffs), names(input).reverse());
  ctx.spDiffDesc = false;
  ctx.spVisibleDiffsDirty = false;
  ctx.publishDisplayDiffOrder(names(input).reverse());
  assert.deepEqual(names(ctx.spCacheDiffs), names(input).reverse());
  assert.equal(ctx.spVisibleDiffsDirty, true);
});

test('detached charts receive current order on opening and later replacement orders', async () => {
  const windows = [];
  class BrowserWindow {
    constructor() {
      this.messages = [];
      this.handlers = {};
      this.webContents = {
        send: (...args) => this.messages.push(args),
        on: (event, cb) => this.handlers[event] = cb,
        insertCSS: async () => {}, executeJavaScript: async () => {}
      };
      windows.push(this);
    }
    isDestroyed() { return false; }
    isVisible() { return false; }
    on() {}
    setMenu() {}
    loadURL() {}
    show() {}
  }
  const ctx = vm.createContext({
    __dirname: path.join(__dirname, '..', 'electron/windows'),
    Buffer, setTimeout: () => {}, module: { exports: {} },
    require: name => name === 'electron' ? { BrowserWindow } :
      name.includes('windowLinks') ? { configureWindowLinks() {} } : require(name)
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'electron/windows/popouts.js'), 'utf8'), ctx);
  const popouts = ctx.module.exports;
  const first = { diffOrder: ['b.osu', 'a.osu'], manualCategories: { 'b.osu': 'oni', unrelated: 'oni' } };
  popouts.setDiffOrder(first);
  popouts.openChartPopout('spreadDensityChart', 'en');
  windows[0].handlers['did-finish-load']();
  await new Promise(resolve => setImmediate(resolve));
  const payloads = () => windows[0].messages.filter(([channel]) => channel === 'diff-order-changed').map(([, payload]) => JSON.parse(JSON.stringify(payload)));
  assert.deepEqual(payloads()[0], { diffOrder: ['b.osu', 'a.osu'], manualCategories: { 'b.osu': 'oni' } });
  popouts.setDiffOrder({ diffOrder: ['a.osu', 'b.osu'], manualCategories: {} });
  assert.deepEqual(payloads()[1].diffOrder, ['a.osu', 'b.osu']);
  popouts.setDiffOrder({ diffOrder: [1] });
  assert.equal(payloads().length, 2);
});
