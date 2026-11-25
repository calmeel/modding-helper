const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  const requests = [], events = {}, shown = [], finished = [];
  const settings = { querySelectorAll: () => [] };
  const scope = vm.createContext({
    document: { getElementById: id => id === 'osuSourceSettings' ? settings : null },
    localStorage: { getItem: key => key === 'moddingHelperCheckSource' ? 'osu' : null, setItem() {} },
    File: class { constructor(parts, name) { this.name = name; } },
    window: { electronAPI: {
      getCurrentMapset: (knownFolder, options) => new Promise(resolve => requests.push({ knownFolder, options, resolve })),
      onMapsetProgress: fn => { events.progress = fn; },
      onOsuMapInfo: fn => { events.map = fn; },
      onMapsetChanged: fn => { events.saved = fn; }
    } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/electron/osuSourceController.js'), 'utf8'), scope);
  const controller = scope.createOsuSourceController({ t: key => key, invalidateLoads() {},
    handleFile: async () => true, clearResults() {}, onModeChanged() {},
    showDiffOrderLoading: () => shown.push('loading'),
    showEarlyDiffOrder: sources => shown.push(sources),
    finishEarlyDiffOrder: success => finished.push(success) });
  controller.setup();
  return { controller, requests, events, shown, finished,
    progress(index, phase, folder, sources = []) {
      events.progress({ requestId: requests[index].options.requestId, phase, folder, sources });
    } };
}

test('early progress ignores stale requests and releases the list after full loading', async () => {
  const f = fixture();
  f.progress(0, 'loading', 'old');
  f.events.map();
  f.progress(0, 'beatmaps', 'old', ['stale']);
  f.progress(1, 'loading', 'new');
  f.progress(1, 'beatmaps', 'new', ['new list']);
  assert.deepEqual(f.shown, ['loading', 'loading', ['new list']]);
  f.requests[0].resolve({ folder: 'old', buffer: [], name: 'old.osz' });
  await tick();
  f.requests[1].resolve({ folder: 'new', buffer: [], name: 'new.osz' });
  await tick();
  assert.equal(f.finished.at(-1), true);
  f.events.map();
  assert.equal(f.requests[2].knownFolder, 'new');
  f.requests[2].resolve({ unchanged: true, folder: 'new' });
  await tick();
  assert.equal(f.shown.length, 3, 'same mapset must keep its list');
  f.controller.setMode('file');
  f.progress(2, 'beatmaps', 'new', ['ignored in file mode']);
  assert.equal(f.shown.length, 3);
});

test('failed and skipped loads release the pending list', async () => {
  for (const response of [null, { skipped: 'multiple-audio', folder: 'set' }]) {
    const f = fixture();
    f.progress(0, 'loading', 'set');
    f.requests[0].resolve(response);
    await tick();
    assert.equal(f.finished.at(-1), false);
  }
});
