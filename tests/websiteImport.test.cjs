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
  assert.equal(scope.getFileCheckIssueLevel(results, { checked: false }), 'none');
  assert.equal(scope.formatFileCheckResult(results, null, key => key), 'websiteImportFileNamesUnavailable');
});

function sourceFixture({ failSecond = false } = {}) {
  const elements = new Map(), requests = [], stored = new Map(), tabs = [];
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
    setTimeout: fn => { fn(); },
    GM_listValues: () => [], GM_getValue: key => stored.get(key),
    GM_setValue: (key, value) => stored.set(key, value), GM_deleteValue: key => stored.delete(key),
    GM_openInTab: url => tabs.push(url),
    DOMParser: class { parseFromString() { return { querySelector: () => ({ textContent: JSON.stringify({ id: 20,
      beatmaps: [{ id: 10, mode: 'taiko' }, { id: 12, mode: 'osu' }, { id: 11, mode_int: 1 }] }) }) }; } },
    fetch: async url => {
      requests.push(url);
      return { ok: !(failSecond && url.endsWith('/osu/11')), status: 503,
        text: async () => url.includes('/osu/') ? map(Number(url.split('/').pop())).text : 'HTML' };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'userscripts/modding-helper.user.js'), 'utf8'), scope);
  return { requests, stored, tabs, wrapper: elements.get('modding-helper-launch') };
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

test('userscript never opens a partial set when a difficulty fetch fails', async () => {
  const f = sourceFixture({ failSecond: true });
  await f.wrapper.children[0].click();
  assert.equal(f.tabs.length, 0);
  assert.equal(f.stored.size, 0);
  assert.match(f.wrapper.children[1].textContent, /HTTP 503/);
  assert.equal(f.wrapper.children[0].disabled, false);
});

test('userscript bridge retries readiness and deletes only its acknowledged transfer', () => {
  const token = '12345678-1234-1234-1234-123456789abc';
  const key = 'modding-helper-import:' + token;
  const stored = new Map([[key, { createdAt: Date.now(), payload: { setId: 20, maps: [map()] } }],
    ['modding-helper-import:expired', { createdAt: 1 }], ['unrelated', 123]]);
  const listeners = new Map(), messages = [];
  const window = { addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name), postMessage: message => messages.push(message) };
  const scope = vm.createContext({ window,
    location: { origin: 'https://calmeel.github.io', pathname: '/modding-helper/', hash: '#osu-import=' + token },
    document: { documentElement: { lang: 'en' } }, URL, URLSearchParams,
    GM_listValues: () => [...stored.keys()], GM_getValue: key => stored.get(key),
    GM_deleteValue: key => stored.delete(key),
    setInterval: () => 1, setTimeout: () => 2, clearInterval() {}, clearTimeout() {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'userscripts/modding-helper.user.js'), 'utf8'), scope);
  assert.equal(stored.has('modding-helper-import:expired'), false);
  assert.equal(stored.has('unrelated'), true);
  assert.equal(messages[0].type, 'hello');
  const receive = listeners.get('message');
  const event = type => ({ source: window, origin: 'https://calmeel.github.io',
    data: { channel: 'modding-helper-import', token, type } });
  receive({ ...event('ready'), origin: 'https://other.example' });
  receive({ ...event('ready'), source: {} });
  receive({ ...event('ready'), data: { ...event('ready').data, token: 'wrong' } });
  assert.equal(messages.length, 1);
  receive(event('ready'));
  receive(event('ready'));
  assert.equal(messages.length, 2, 'payload is sent once even if readiness repeats');
  assert.equal(messages[1].payload.maps.length, 1);
  assert.equal(stored.has(key), true, 'keep data until the app acknowledges loading');
  receive(event('complete'));
  assert.equal(stored.has(key), false);
  assert.equal(listeners.size, 0);
});
