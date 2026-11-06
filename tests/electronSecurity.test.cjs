const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');

test('external links allow web URLs and osu editor timestamps without creating windows', async () => {
  const opened = [];
  const handlers = {};
  const context = { URL, console, module: { exports: {} }, require: () => ({
    shell: { openExternal: async url => opened.push(url) },
  }) };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'electron/services/windowLinks.js'), 'utf8'), context);
  context.module.exports.configureWindowLinks({ webContents: {
    setWindowOpenHandler(fn) { handlers.open = fn; },
    on(name, fn) { handlers[name] = fn; },
  } }, 'file:///C:/app/index.html');
  for (const url of ['file:///C:/untrusted.exe', 'javascript:alert(1)', 'ms-settings:', 'bad url',
    'osu://install/123', 'osu://edit/not-a-time', 'osu://edit/00:60:000',
    'osu://edit/00:01:000?command=other', 'osu://edit/00:01:000#other',
    'osu://user@edit/00:01:000']) {
    assert.equal(handlers.open({ url }).action, 'deny');
  }
  assert.deepEqual(opened, []);
  assert.equal(handlers.open({ url: 'https://osu.ppy.sh/beatmapsets/123' }).action, 'deny');
  assert.deepEqual(opened, ['https://osu.ppy.sh/beatmapsets/123']);
  let prevented = false;
  const event = { preventDefault() { prevented = true; } };
  handlers['will-navigate'](event, 'file:///C:/app/index.html#section');
  assert.equal(prevented, false);
  handlers['will-navigate'](event, 'file:///C:/other.html');
  assert.equal(prevented, true);
  assert.equal(opened.length, 1);
  for (const url of ['osu://edit/00:01:000', 'osu://edit/123:59:999', 'osu://edit/00:00:0.5']) {
    prevented = false;
    handlers['will-navigate'](event, url);
    assert.equal(prevented, true);
    assert.equal(opened.at(-1), url);
    assert.equal(handlers.open({ url }).action, 'deny');
    assert.equal(opened.at(-1), url);
  }
});

test('file paths use the isolated Electron bridge and preserve browser fallback', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, 'app/files/fileLoader.js'), 'utf8'), context);
  assert.equal(vm.runInContext('getNativeFilePath({name:"test.osu"})', context), '');
  context.window.electronAPI = { getPathForFile: () => 'C:\\Songs\\Mapset\\test.osu' };
  assert.equal(vm.runInContext('getParentFolderNameFromFilePath(getNativeFilePath({}))', context), 'Mapset');
  context.window.electronAPI.getPathForFile = () => { throw new Error('Not a native File'); };
  assert.equal(vm.runInContext('getNativeFilePath({})', context), '');
});
