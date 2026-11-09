const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

test('only realtime panels open, start hidden, show when ready and receive timing updates', () => {
  const windows = [], mainMessages = [];
  class BrowserWindow {
    constructor(options) {
      this.options = options;
      this.events = {};
      this.messages = [];
      this.visible = false;
      this.destroyed = false;
      this.focused = false;
      this.webContents = {
        send: (...args) => this.messages.push(args),
        on: (event, fn) => { this.events[event] = fn; }
      };
      windows.push(this);
    }
    setMenu() {}
    setAlwaysOnTop() {}
    loadURL(url) { this.url = url; }
    isDestroyed() { return this.destroyed; }
    isVisible() { return this.visible; }
    show() { this.visible = true; }
    focus() { this.focused = true; }
    on(event, fn) { this.events[event] = fn; }
    destroy() { this.destroyed = true; this.events.closed(); }
  }
  const filename = path.join(__dirname, '../electron/windows/popouts.js');
  const context = { __dirname: path.dirname(filename), module: { exports: {} }, setTimeout() {},
    require(name) {
      if (name === 'electron') return { BrowserWindow, screen: { getPrimaryDisplay: () => ({ workAreaSize: { height: 900 } }) } };
      if (name === '../services/windowLinks') return { configureWindowLinks() {} };
      return require(name);
    } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
  const popouts = context.module.exports;
  popouts.init({ getMainWin: () => ({ isDestroyed: () => false,
    webContents: { send: (...args) => mainMessages.push(args) } }) });
  popouts.openPopout('metadata', 'ja');
  assert.equal(windows.length, 0, 'retired metadata panel cannot be opened');
  assert.equal(popouts.sendMapMetaToPopout, undefined);
  const initial = { time: 1000 };
  popouts.broadcastOsuData('osu-timing-info', initial);
  popouts.openPopout('timing', 'en');
  const win = windows[0];
  assert.equal(win.options.show, false);
  assert.equal(win.options.alwaysOnTop, true);
  assert.equal(win.isVisible(), false);
  win.events['did-finish-load']();
  assert.equal(win.isVisible(), true, 'normal app still shows realtime panel when ready');
  assert.deepEqual(win.messages, [['osu-timing-info', initial]]);
  const next = { time: 2000 };
  popouts.broadcastOsuData('osu-timing-info', next);
  assert.deepEqual(win.messages.at(-1), ['osu-timing-info', next]);
  popouts.openPopout('timing', 'ja');
  assert.equal(windows.length, 1);
  assert.equal(win.focused, true);
  popouts.closeAll();
  assert.equal(win.isDestroyed(), true);
  assert.deepEqual(mainMessages.at(-1), ['panel-redocked', 'timing']);
});
