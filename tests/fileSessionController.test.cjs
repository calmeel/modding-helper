const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const plain = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ api, popout = false } = {}) {
  const events = [], revoked = [], published = [], errors = [];
  const button = { disabled: false, addEventListener: (name, fn) => events.push(fn) };
  const dom = { openBeatmapPage: button, fileName: {}, output: {}, timelineOutput: {} };
  const state = { spread: { results: null, diffOrder: [], manualCategories: {} },
    bnCompare: {} };
  let mode = 'file', received = null, renders = 0, clears = 0, synchronizations = 0, nextUrl = 0;
  const scope = vm.createContext({
    window: { electronAPI: api, open: url => published.push(url) },
    URL: { createObjectURL: () => `blob:${++nextUrl}`, revokeObjectURL: url => revoked.push(url) },
    console: { warn() {}, error: error => errors.push(error) },
    getBeatmapPageUrlFromSources: sources => sources?.[0]?.fileName || null,
    getNativeFilePath: file => file.path,
    extractMapMetaFromFile: async file => ({ title: file.name })
  });
  for (const file of ['parsers/osuParser.js', 'app/formatters/common.js',
    'checks/spread/difficulty.js', 'app/formatters/spread/order.js', 'app/files/fileSessionController.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
  }
  const result = name => {
    const fileName = `${name}.osu`;
    return { offsetSources: [{ fileName, text: `[Metadata]\nVersion:${name}\n` }],
      spread: [{ fileName, sortInfo: scope.getSpreadSortInfo(fileName), noteCount: 100 }],
      offsetWaveformSources: [{ audioBlob: {}, audioDurationMs: 1234 }] };
  };
  scope.processFile = async file => result(file.name);
  const controller = scope.createFileSessionController({
    state, dom, t: key => key, isChartPopout: popout,
    getSourceMode: () => mode, getReceivedDiffOrder: () => received,
    synchronizeDiffOrder: () => synchronizations++, renderLoadedFileResults: () => renders++,
    onCleared: () => clears++
  });
  return { controller, state, scope, dom, result, events, published, revoked, errors,
    setMode: value => { mode = value; }, setReceived: value => { received = value; },
    renders: () => renders, clears: () => clears, syncs: () => synchronizations };
}

test('file loading publishes results and replaces audio URLs', async () => {
  const f = fixture();
  await f.controller.handleFile({ name: 'Oni' });
  assert.equal(f.state.selectedFileName, 'Oni');
  assert.equal(f.dom.fileName.textContent, 'Oni');
  assert.equal(f.state.offsetSources, f.scope.window.__loadedDiffs);
  assert.equal(f.state.timelineSources, f.state.offsetSources);
  assert.equal(f.state.timeline, null);
  assert.equal(f.dom.timelineOutput.textContent, 'timelineNotRendered');
  assert.equal(f.scope.window.__loadedAudio.durationMs, 1234);
  assert.equal(f.renders(), 1);
  f.events[0]();
  assert.deepEqual(f.published, ['Oni.osu']);
  f.scope.processFile = async () => ({ ...f.result('Inner Oni'), offsetWaveformSources: [] });
  await f.controller.handleFile({ name: 'Inner Oni' });
  assert.deepEqual(f.revoked, ['blob:1']);
  assert.equal(f.scope.window.__loadedAudio, null);
  assert.equal(f.controller.lastFile.name, 'Inner Oni');
  assert.equal(f.errors.length, 0);
});

test('an older file load cannot overwrite a newer result or display a stale error', async () => {
  for (const rejectOld of [false, true]) {
    const f = fixture();
    const old = deferred();
    f.scope.processFile = file => file.name === 'old' ? old.promise : Promise.resolve(f.result('Oni'));
    const pending = f.controller.handleFile({ name: 'old' });
    await f.controller.handleFile({ name: 'new' });
    if (rejectOld) old.reject(new Error('invalidFile')); else old.resolve(f.result('Kantan'));
    await pending;
    assert.equal(f.state.offsetSources[0].fileName, 'Oni.osu');
    assert.equal(f.renders(), 1);
    assert.equal(f.dom.output.textContent, undefined);
  }
});

test('invalidating a load while preferences are loading prevents result publication', async () => {
  const saved = deferred(), started = deferred();
  const f = fixture({ api: { loadDiffOrderPreferences: () => { started.resolve(); return saved.promise; } } });
  const pending = f.controller.handleFile({ name: 'Oni' }, { mapsetFolder: 'set' });
  await started.promise;
  f.controller.invalidateLoads();
  saved.resolve(null);
  await pending;
  assert.equal(f.renders(), 0);
  assert.equal(f.scope.window.__loadedDiffs, undefined);
});

test('mapset preferences restore Version categories and retain in-memory overrides on refresh', async () => {
  const saves = [];
  let saved = { keyType: 'version', diffOrder: ['Galaxy'], manualCategories: { Galaxy: 'innerPlus' } };
  const f = fixture({ api: {
    loadDiffOrderPreferences: async () => saved,
    saveDiffOrderPreferences: async (folder, value) => { saves.push([folder, plain(value)]); return true; }
  } });
  f.setMode('osu');
  await f.controller.handleFile({ name: 'Galaxy' }, { mapsetFolder: 'set' });
  assert.deepEqual(plain(f.state.spread.manualCategories), { 'Galaxy.osu': 'innerPlus' });
  assert.deepEqual(plain(f.state.spread.diffOrder), ['Galaxy.osu']);
  assert.equal(saves[0][0], 'set');
  assert.deepEqual(saves[0][1].manualCategories, { Galaxy: 'innerPlus' });
  saved = null;
  await f.controller.handleFile({ name: 'Galaxy' }, { mapsetFolder: 'set' });
  assert.equal(f.state.spread.manualCategories['Galaxy.osu'], 'innerPlus');
  f.setMode('file');
  const count = saves.length;
  await f.controller.persistDiffPreferences();
  assert.equal(saves.length, count);
});

test('chart popouts use the received order without loading or saving mapset preferences', async () => {
  let preferenceCalls = 0;
  const f = fixture({ popout: true, api: {
    loadDiffOrderPreferences: async () => { preferenceCalls++; },
    saveDiffOrderPreferences: async () => { preferenceCalls++; }
  } });
  f.setReceived({ diffOrder: ['Galaxy.osu'], manualCategories: { 'Galaxy.osu': 'innerPlus' } });
  await f.controller.handleFile({ name: 'Galaxy' }, { mapsetFolder: 'set' });
  assert.deepEqual(plain(f.state.spread.diffOrder), ['Galaxy.osu']);
  assert.equal(f.state.spread.manualCategories['Galaxy.osu'], 'innerPlus');
  assert.equal(preferenceCalls, 0);
});

test('clearing results preserves BN state, releases audio and invalidates pending loads', async () => {
  const f = fixture();
  await f.controller.handleFile({ name: 'Oni' });
  const bn = f.state.bnCompare;
  const old = deferred();
  f.scope.processFile = () => old.promise;
  const pending = f.controller.handleFile({ name: 'old' });
  f.controller.clearResults();
  old.resolve(f.result('Kantan'));
  await pending;
  assert.equal(f.state.bnCompare, bn);
  assert.equal(f.scope.window.__loadedDiffs, null);
  assert.equal(f.scope.window.__loadedAudio, null);
  assert.deepEqual(f.revoked, ['blob:1']);
  assert.equal(f.controller.lastFile, null);
  assert.equal(f.dom.openBeatmapPage.disabled, true);
  assert.equal(f.clears(), 1);
  assert.equal(f.renders(), 1);
});

test('chart source publication uses native paths and discards stale buffer reads', async () => {
  const sources = [];
  const f = fixture({ api: { setChartSourceFile: source => sources.push(source) } });
  const buffer = deferred();
  const pending = f.controller.publishChartSourceFile({ name: 'old', arrayBuffer: () => buffer.promise });
  await f.controller.publishChartSourceFile({ name: 'new', path: 'C:\\Songs\\new.osu' });
  buffer.resolve(new ArrayBuffer(0));
  await pending;
  assert.equal(sources.length, 1);
  assert.equal(sources[0].path, 'C:\\Songs\\new.osu');
  await f.controller.publishChartSourceFile(null);
  assert.equal(sources[1], null);
});
