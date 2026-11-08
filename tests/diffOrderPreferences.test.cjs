const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { createDiffOrderPreferences } = require('../electron/services/diffOrderPreferences');

function temporaryStore(t) {
  const directory = fs.mkdtempSync(path.join(__dirname, '.tmp-diff-order-'));
  const stores = [];
  const reopen = () => {
    const store = createDiffOrderPreferences(directory);
    stores.push(store);
    return store;
  };
  const store = reopen();
  t.after(async () => {
    for (const instance of stores) await instance.flush();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { directory, store, reopen };
}

function memoryStore(mapsets, now) {
  let disk = { version: 1, mapsets };
  const store = createDiffOrderPreferences('unused', { now, io: {
    async readFile() { return JSON.stringify(disk); }, async mkdir() {},
    async writeFile(file, contents) { disk = JSON.parse(contents); }, async rename() {}
  } });
  return { store, disk: () => disk };
}

function savedMapsets(count, withTimestamps = true) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `c:\\songs\\set${index}`, { keyType: 'version', diffOrder: ['Galaxy'],
      manualCategories: { Galaxy: 'innerPlus' }, ...(withTimestamps ? { lastUsedAt: index + 1 } : {}) }
  ]));
}

test('1001st saved mapset evicts the least recently opened set, retaining 1000', async () => {
  let clock = 2000;
  const { store, disk } = memoryStore(savedMapsets(1000), () => clock);
  // 設定の変更なしで開くだけでも、以前は最古だったセットが残る。
  await store.load('C:\\Songs\\Set0');
  clock = 2001;
  assert.equal(await store.load('C:\\Songs\\New'), null);
  await store.save('C:\\Songs\\New', { keyType: 'version', diffOrder: ['Oni'], manualCategories: {} });
  await store.flush();
  assert.equal(Object.keys(disk().mapsets).length, 1000);
  assert.equal(disk().mapsets['c:\\songs\\set1'], undefined);
  assert.equal(disk().mapsets['c:\\songs\\set0'].lastUsedAt, 2000);
  assert.deepEqual(disk().mapsets['c:\\songs\\new'].diffOrder, ['Oni']);
});

test('legacy entries without timestamps are pruned, but the currently opened set survives', async () => {
  const { store, disk } = memoryStore(savedMapsets(1001, false), () => 3000);
  assert.deepEqual((await store.load('C:\\Songs\\Set0')).manualCategories, { Galaxy: 'innerPlus' });
  await store.flush();
  assert.equal(Object.keys(disk().mapsets).length, 1000);
  assert.equal(disk().mapsets['c:\\songs\\set0'].lastUsedAt, 3000);
  assert.equal(disk().mapsets['c:\\songs\\set1'], undefined);
  const restarted = memoryStore(disk().mapsets, () => 4000);
  await restarted.store.load('C:\\Songs\\New');
  await restarted.store.save('C:\\Songs\\New', { diffOrder: ['Oni'], manualCategories: {} });
  await restarted.store.flush();
  assert.equal(Object.keys(restarted.disk().mapsets).length, 1000);
  assert.ok(restarted.disk().mapsets['c:\\songs\\set0']);
});

test('flush caps an oversized existing file even without opening a mapset', async () => {
  const { store, disk } = memoryStore(savedMapsets(1002), () => 4000);
  await store.flush();
  assert.equal(Object.keys(disk().mapsets).length, 1000);
  assert.equal(disk().mapsets['c:\\songs\\set0'], undefined);
  assert.equal(disk().mapsets['c:\\songs\\set1'], undefined);
  assert.ok(disk().mapsets['c:\\songs\\set2']);
});

test('opening an unsaved mapset does not create a saved entry or evict another set', async () => {
  const { store, disk } = memoryStore(savedMapsets(1000), () => 4000);
  assert.equal(await store.load('C:\\Songs\\NotSaved'), null);
  await store.flush();
  assert.equal(Object.keys(disk().mapsets).length, 1000);
  assert.equal(disk().mapsets['c:\\songs\\notsaved'], undefined);
  assert.ok(disk().mapsets['c:\\songs\\set0']);
});

test('reads once, updates memory immediately, and debounces multiple edits into one async write', async () => {
  let reads = 0;
  let writes = 0;
  let disk;
  let written;
  const committed = new Promise(resolve => { written = resolve; });
  const store = createDiffOrderPreferences('unused', { saveDelay: 10, now: () => 123, io: {
    async readFile() { reads++; return JSON.stringify({ version: 1, mapsets: {} }); },
    async mkdir() {},
    async writeFile(file, contents) { writes++; disk = JSON.parse(contents); },
    async rename() { written(); }
  } });
  for (const version of ['First', 'Second', 'Latest']) {
    await store.save('C:\\Songs\\A', { keyType: 'version', diffOrder: [version], manualCategories: {} });
    assert.deepEqual((await store.load('C:\\Songs\\A')).diffOrder, [version]);
  }
  assert.equal(writes, 0);
  await committed;
  await store.flush();
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.deepEqual(disk.mapsets['c:\\songs\\a'].diffOrder, ['Latest']);
  await store.save('C:\\Songs\\A', { keyType: 'version', diffOrder: ['Latest'], manualCategories: {} });
  await store.flush();
  assert.equal(writes, 1);
});

test('flush serializes in-flight writes and includes edits made during a write', async () => {
  let release;
  let started;
  const firstWriteStarted = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const snapshots = [];
  const store = createDiffOrderPreferences('unused', { io: {
    async readFile() { return '{"version":1,"mapsets":{}}'; }, async mkdir() {},
    async writeFile(file, contents) {
      snapshots.push(JSON.parse(contents));
      if (snapshots.length === 1) { started(); await gate; }
    },
    async rename() {}
  } });
  await store.save('C:\\Songs\\A', { diffOrder: ['a'], manualCategories: {} });
  const flushing = store.flush();
  await firstWriteStarted;
  await store.save('C:\\Songs\\B', { diffOrder: ['b'], manualCategories: {} });
  assert.equal(store.flush(), flushing);
  release();
  await flushing;
  assert.equal(snapshots.length, 2);
  assert.deepEqual(Object.keys(snapshots[1].mapsets), ['c:\\songs\\a', 'c:\\songs\\b']);
});

test('a failed asynchronous write can be retried without losing the in-memory changes', async () => {
  let attempts = 0;
  const store = createDiffOrderPreferences('unused', { io: {
    async readFile() { return '{"version":1,"mapsets":{}}'; }, async mkdir() {}, async writeFile() {},
    async rename() { if (++attempts === 1) throw new Error('disk unavailable'); }
  } });
  const value = { diffOrder: ['Galaxy'], manualCategories: { Galaxy: 'innerPlus' } };
  await store.save('C:\\Songs\\A', value);
  await assert.rejects(store.flush(), /disk unavailable/);
  assert.deepEqual(await store.load('C:\\Songs\\A'), value);
  await store.flush();
  assert.equal(attempts, 2);
});

test('preferences survive a new store instance and remain separate for each mapset', async t => {
  const { directory, store, reopen } = temporaryStore(t);
  const a = { diffOrder: ['custom.osu', 'kantan.osu'], manualCategories: { 'custom.osu': 'innerPlus' } };
  const b = { diffOrder: ['oni.osu'], manualCategories: {} };
  assert.equal(await store.load('C:\\Songs\\A'), null);
  assert.equal(await store.save('C:\\Songs\\A', a), true);
  await store.save('C:\\Songs\\B', b);
  await store.flush();
  const restarted = reopen();
  assert.deepEqual(await restarted.load('C:/songs/a/'), a);
  assert.deepEqual(await restarted.load('C:\\Songs\\B'), b);
  assert.equal(fs.existsSync(path.join(directory, 'diff-order-preferences.json.tmp')), false);
});

test('saving replaces the previous order and filters invalid category entries', async t => {
  const { store } = temporaryStore(t);
  await store.save('C:\\Songs\\A', { diffOrder: ['a.osu'], manualCategories: { 'a.osu': 'oni' } });
  await store.save('C:\\Songs\\A', { diffOrder: ['b.osu', 'a.osu', 'b.osu', null],
    manualCategories: { 'a.osu': 'innerPlus', 'b.osu': 'invalid', 'deleted.osu': 'oni' } });
  assert.deepEqual(await store.load('C:\\Songs\\A'), {
    diffOrder: ['b.osu', 'a.osu'], manualCategories: { 'a.osu': 'innerPlus' }
  });
  assert.equal(await store.save('../other', { diffOrder: [] }), false);
});

test('missing or damaged preference files do not prevent loading a mapset', async t => {
  const { directory, reopen } = temporaryStore(t);
  fs.writeFileSync(path.join(directory, 'diff-order-preferences.json'), '{broken');
  const warn = console.warn;
  console.warn = () => {};
  try { assert.equal(await reopen().load('C:\\Songs\\A'), null); }
  finally { console.warn = warn; }
});

function restoreContext() {
  const ctx = vm.createContext({ window: {} });
  for (const file of ['parsers/osuParser.js', 'app/formatters/common.js', 'checks/spread/difficulty.js', 'app/formatters/spread/order.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx);
  }
  return ctx;
}
function result(ctx, name) {
  const fileName = `song [${name}].osu`;
  return { fileName, sortInfo: ctx.getSpreadSortInfo(fileName), noteCount: 100 };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('Version keys survive title/artist/creator filename changes and restart', async t => {
  const ctx = restoreContext();
  const { store, reopen } = temporaryStore(t);
  const oldSources = [
    { fileName: 'Old Artist - Title (Creator) [not-the-version].osu', text: '[Metadata]\nVersion:Galaxy\n' },
    { fileName: 'Old Artist - Title (Creator) [Kantan].osu', text: '[Metadata]\nVersion:Kantan\n' }
  ];
  const preferences = { diffOrder: oldSources.map(source => source.fileName),
    manualCategories: { [oldSources[0].fileName]: 'innerPlus' } };
  const encoded = ctx.serializeSpreadDiffPreferences(oldSources, preferences);
  assert.deepEqual(plain(encoded), { keyType: 'version', diffOrder: ['Galaxy', 'Kantan'],
    manualCategories: { Galaxy: 'innerPlus' } });
  await store.save('C:\\Songs\\A', encoded);
  await store.flush();
  const saved = await reopen().load('C:\\Songs\\A');
  const newSources = oldSources.map(source => ({ ...source,
    fileName: source.fileName.replace('Old Artist - Title (Creator)', 'New Artist - New Title (New Creator)') }));
  const decoded = ctx.resolveSpreadDiffPreferences(newSources, saved);
  const results = newSources.map(source => ({ fileName: source.fileName,
    sortInfo: ctx.getSpreadSortInfo(source.fileName), noteCount: 100 }));
  assert.deepEqual(plain(ctx.restoreSpreadDiffPreferences(results, decoded)), {
    diffOrder: newSources.map(source => source.fileName),
    manualCategories: { [newSources[0].fileName]: 'innerPlus' }
  });
});

test('changing Version is treated as a new difficulty even if the filename stays the same', () => {
  const ctx = restoreContext();
  const decoded = ctx.resolveSpreadDiffPreferences([
    { fileName: 'Custom.osu', text: '[Metadata]\nVersion:New Version\n' }
  ], { keyType: 'version', diffOrder: ['Old Version'], manualCategories: { 'Old Version': 'innerPlus' } });
  assert.deepEqual(plain(decoded), { diffOrder: [], manualCategories: {} });
});

test('legacy filename preferences migrate to Version keys without losing overrides', () => {
  const ctx = restoreContext();
  const sources = [{ fileName: 'Custom.osu', text: '[Metadata]\nVersion:Galaxy\n' }];
  const legacy = { diffOrder: ['Custom.osu'], manualCategories: { 'Custom.osu': 'innerPlus' } };
  const decoded = ctx.resolveSpreadDiffPreferences(sources, legacy);
  assert.deepEqual(plain(decoded), legacy);
  assert.deepEqual(plain(ctx.serializeSpreadDiffPreferences(sources, decoded)), {
    keyType: 'version', diffOrder: ['Galaxy'], manualCategories: { Galaxy: 'innerPlus' }
  });
});

test('same-mapset refresh preserves an Unknown override and a custom order', () => {
  const ctx = restoreContext();
  const kantan = result(ctx, 'Kantan');
  const custom = result(ctx, 'Galaxy');
  const saved = { diffOrder: [custom.fileName, kantan.fileName],
    manualCategories: { [custom.fileName]: 'innerPlus' } };
  assert.deepEqual(plain(ctx.restoreSpreadDiffPreferences([kantan, custom], saved)), saved);
  assert.equal(custom.sortInfo.base, 999);
});

test('new diffs are inserted automatically while removed diffs and overrides are pruned', () => {
  const ctx = restoreContext();
  const kantan = result(ctx, 'Kantan');
  const futsuu = result(ctx, 'Futsuu');
  const oni = result(ctx, 'Oni');
  const saved = { diffOrder: [kantan.fileName, 'removed.osu', oni.fileName],
    manualCategories: { 'removed.osu': 'innerPlus', [oni.fileName]: 'oni' } };
  assert.deepEqual(plain(ctx.restoreSpreadDiffPreferences([oni, futsuu, kantan], saved)), {
    diffOrder: [kantan.fileName, futsuu.fileName, oni.fileName],
    manualCategories: { [oni.fileName]: 'oni' }
  });
  const allNew = ctx.restoreSpreadDiffPreferences([oni, futsuu, kantan], {
    diffOrder: ['removed.osu'], manualCategories: { 'removed.osu': 'innerPlus' }
  });
  assert.deepEqual(plain(allNew), {
    diffOrder: [kantan.fileName, futsuu.fileName, oni.fileName], manualCategories: {}
  });
});
