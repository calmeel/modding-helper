const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.join(__dirname, '..');

function validator() {
  const scope = vm.createContext({});
  for (const file of ['parsers/osuParser.js', 'app/files/websiteImport.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope);
  }
  return scope.validateWebsiteImport;
}
const map = (id = 10, mode = 1, set = 20) => ({ id,
  text: `osu file format v14\n[General]\nMode:${mode}\n[Metadata]\nBeatmapID:${id}\nBeatmapSetID:${set}\nVersion:Oni\n` });

test('website import label prefers Unicode metadata and falls back to ordinary metadata', () => {
  const scope = vm.createContext({});
  for (const file of ['parsers/osuParser.js', 'app/files/websiteImport.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope);
  }
  const payload = { setId: 20, maps: [{ text: '[Metadata]\nArtist:Artist\nTitle:Title\nArtistUnicode:作曲者\nTitleUnicode:曲名\n' }] };
  assert.equal(scope.getWebsiteImportDisplayName(payload), '20 作曲者 - 曲名');
  payload.maps[0].text = '[Metadata]\nArtist:Artist\nTitle:Title\nArtistUnicode:\nTitleUnicode:\n';
  assert.equal(scope.getWebsiteImportDisplayName(payload), '20 Artist - Title');
});

test('website import accepts all taiko difficulties from one set', () => {
  const payload = { setId: 20, maps: [map(), map(11)] };
  assert.equal(validator()(payload), payload);
});

test('website import rejects partial, mixed-mode, duplicate and mismatched data', () => {
  const validate = validator();
  for (const payload of [null, { setId: 20, maps: [] },
    { setId: 20, maps: [map(), map()] },
    { setId: 20, maps: [map(11, 0)] },
    { setId: 20, maps: [map(11, 1, 21)] },
    { setId: 20, maps: [{ ...map(), id: 99 }] },
    { setId: 20, maps: [{ id: 10, text: '<html>Sign in</html>' }] },
    { setId: 20, maps: [{ id: 10, text: 'x'.repeat(10 * 1024 * 1024 + 1) }] }]) {
    assert.throws(() => validate(payload));
  }
});

test('unknown website filenames are reported as skipped without a warning badge', () => {
  const scope = vm.createContext({});
  for (const file of ['app/issues/tabs.js', 'app/formatters/misc/file.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope);
  }
  const results = [{ fileName: '10.osu', checked: false, level: 'ok' }];
  assert.equal(scope.getFileCheckIssueLevel(results), 'none');
  assert.equal(scope.formatFileCheckResult(results, key => key), 'websiteImportFileNamesUnavailable');
});

test('app DOM bridge rejects mismatched beatmaps before loading any files', async () => {
  const token = '12345678-1234-1234-1234-123456789abc';
  const nodes = [], timers = [];
  class Element extends EventTarget {
    dataset = {};
    style = {};
    textContent = '';
    setAttribute() {}
    after(node) { nodes.push(node); }
  }
  let loads = 0;
  const scope = vm.createContext({ Event,
    document: { createElement: () => new Element(), querySelector: () => new Element(),
      body: { append: node => nodes.push(node) } }, window: {},
    location: { hash: '#osu-import=' + token }, URLSearchParams,
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {}
  });
  for (const file of ['parsers/osuParser.js', 'app/files/websiteImport.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope);
  }
  scope.setupWebsiteImport({ loadFile: () => { loads++; }, t: key => key });
  const bridge = nodes.find(node => node.id === 'modding-helper-import-bridge');
  assert.equal(bridge.dataset.state, 'ready');
  bridge.dataset.token = 'different-transfer';
  bridge.textContent = JSON.stringify({ setId: 20, maps: [map(10, 1, 21)] });
  bridge.dispatchEvent(new Event('modding-helper-import-data'));
  assert.equal(bridge.dataset.state, 'ready');
  bridge.dataset.token = token;
  bridge.dispatchEvent(new Event('modding-helper-import-data'));
  assert.equal(bridge.dataset.state, 'error');
  assert.equal(bridge.textContent, '');
  assert.equal(loads, 0);
});

function sourceFixture({ failSecond = false, responseDelay = 0, difficultyCount = null } = {}) {
  const elements = new Map(), requests = [], requestTimes = [], stored = new Map(), tabs = [];
  let clock = 100000;
  const makeElement = () => ({ dataset: {}, style: {}, children: [],
    append(...nodes) { this.children.push(...nodes); for (const node of nodes) if (node.id) elements.set(node.id, node); },
    contains(node) { return this.children.includes(node); },
    setAttribute() {}, addEventListener(type, fn) { this[type] = fn; },
    remove() { elements.delete(this.id); }
  });
  const host = makeElement();
  const scope = vm.createContext({
    location: { origin: 'https://osu.ppy.sh', pathname: '/beatmapsets/20' },
    document: { documentElement: { lang: 'en' }, body: {}, addEventListener() {},
      querySelector: () => host, getElementById: id => elements.get(id), createElement: makeElement },
    window: { addEventListener() {} }, navigator: { language: 'en' }, URL, URLSearchParams,
    AbortSignal, crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789abc' },
    MutationObserver: class { observe() {} }, requestAnimationFrame: fn => fn(),
    Date: class extends Date { static now() { return clock; } },
    setTimeout: (fn, ms) => { clock += ms; fn(); },
    GM_listValues: () => [], GM_getValue: key => stored.get(key),
    GM_setValue: (key, value) => stored.set(key, value), GM_deleteValue: key => stored.delete(key),
    GM_openInTab: url => tabs.push(url),
    DOMParser: class { parseFromString() { return { querySelector: () => ({ textContent: JSON.stringify({ id: 20,
      beatmaps: difficultyCount === null
        ? [{ id: 10, mode: 'taiko' }, { id: 12, mode: 'osu' }, { id: 11, mode_int: 1 }]
        : Array.from({ length: difficultyCount }, (_, i) => ({ id: 10 + i, mode: 'taiko' })) }) }) }; } },
    fetch: async url => {
      requests.push(url);
      requestTimes.push(clock);
      return { ok: !(failSecond && url.endsWith('/osu/11')), status: 503,
        text: async () => {
          clock += responseDelay;
          return url.includes('/osu/') ? map(Number(url.split('/').pop())).text : 'HTML';
        } };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'userscripts/modding-helper.user.js'), 'utf8'), scope);
  return { requests, requestTimes, stored, tabs, wrapper: elements.get('modding-helper-launch') };
}

test('userscript fetches every taiko difficulty and opens an isolated transfer', async () => {
  const f = sourceFixture();
  await f.wrapper.children[0].click();
  assert.deepEqual(f.requests, ['https://osu.ppy.sh/beatmapsets/20', 'https://osu.ppy.sh/osu/10', 'https://osu.ppy.sh/osu/11']);
  assert.equal(f.tabs.length, 1);
  assert.match(f.tabs[0], /^https:\/\/calmeel.github.io\/modding-helper\/#osu-import=/);
  assert.equal([...f.stored.values()][0].payload.maps.length, 2);
  assert.equal(f.wrapper.children[0].disabled, false);
});

test('small sets use shorter waits while repeated listing requests retain a one second gap', async () => {
  const f = sourceFixture({ responseDelay: 700 });
  await f.wrapper.children[0].click();
  await f.wrapper.children[0].click();
  assert.equal(f.requestTimes.length, 6);
  for (let i = 1; i < f.requestTimes.length; i++) {
    assert.equal(f.requestTimes[i] - f.requestTimes[i - 1], i % 3 === 0 ? 1700 : 950);
  }
});

test('nine difficulties use 250ms gaps and ten difficulties use one second gaps', async () => {
  for (const count of [9, 10]) {
    const f = sourceFixture({ difficultyCount: count });
    await f.wrapper.children[0].click();
    assert.equal(f.requestTimes.length, count + 1);
    for (let i = 1; i < f.requestTimes.length; i++) {
      assert.equal(f.requestTimes[i] - f.requestTimes[i - 1], count === 9 ? 250 : 1000);
    }
  }
});

test('repeated small imports never exceed sixty requests per rolling minute', async () => {
  const f = sourceFixture();
  for (let i = 0; i < 22; i++) await f.wrapper.children[0].click();
  assert.equal(f.requestTimes.length, 66);
  for (let i = 60; i < f.requestTimes.length; i++) {
    assert.ok(f.requestTimes[i] - f.requestTimes[i - 60] >= 60000);
  }
});

test('userscript never opens a partial set when a difficulty fetch fails', async () => {
  const f = sourceFixture({ failSecond: true });
  await f.wrapper.children[0].click();
  assert.equal(f.tabs.length, 0);
  assert.equal(f.stored.size, 0);
  assert.match(f.wrapper.children[1].textContent, /HTTP 503/);
  assert.equal(f.wrapper.children[0].disabled, false);
  await f.wrapper.children[0].click();
  assert.equal(f.requestTimes[3] - f.requestTimes[2], 1000, 'failure does not bypass the retry interval');
});

test('userscript DOM bridge waits for readiness and deletes only its acknowledged transfer', () => {
  const token = '12345678-1234-1234-1234-123456789abc';
  const key = 'modding-helper-import:' + token;
  const stored = new Map([[key, { createdAt: Date.now(), payload: { setId: 20, maps: [map()] } }],
    ['modding-helper-import:expired', { createdAt: 1 }], ['unrelated', 123]]);
  const listeners = new Map(), messages = [];
  const bridge = { dataset: { token: 'wrong', state: 'ready' }, textContent: '',
    dispatchEvent(event) { messages.push({ type: event.type, payload: JSON.parse(this.textContent) }); },
    remove() { this.removed = true; } };
  const scope = vm.createContext({ Event,
    location: { origin: 'https://calmeel.github.io', pathname: '/modding-helper/', hash: '#osu-import=' + token },
    document: { documentElement: { lang: 'en' }, getElementById: () => bridge,
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name) }, URL, URLSearchParams,
    GM_listValues: () => [...stored.keys()], GM_getValue: key => stored.get(key),
    GM_deleteValue: key => stored.delete(key),
    setInterval: () => 1, setTimeout: () => 2, clearInterval() {}, clearTimeout() {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'userscripts/modding-helper.user.js'), 'utf8'), scope);
  assert.equal(stored.has('modding-helper-import:expired'), false);
  assert.equal(stored.has('unrelated'), true);
  assert.equal(messages.length, 0, 'ignore a bridge for a different transfer');
  const receive = listeners.get('modding-helper-import-state');
  bridge.dataset.token = token;
  receive();
  receive();
  assert.equal(messages.length, 1, 'payload is sent once even if readiness repeats');
  assert.equal(messages[0].type, 'modding-helper-import-data');
  assert.equal(messages[0].payload.maps.length, 1);
  assert.equal(stored.has(key), true, 'keep data until the app acknowledges loading');
  bridge.dataset.state = 'complete';
  receive();
  assert.equal(stored.has(key), false);
  assert.equal(bridge.removed, true);
  assert.equal(listeners.size, 0);
});
