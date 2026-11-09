const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function target(extra = {}) {
  const handlers = {};
  return Object.assign({
    addEventListener(name, fn) { (handlers[name] ||= []).push(fn); },
    fire(name, values = {}) {
      const e = { button: 0, clientX: 0, clientY: 0, prevented: false,
        preventDefault() { this.prevented = true; }, ...values };
      for (const fn of handlers[name] || []) fn(e);
      return e;
    }
  }, extra);
}
function fixture() {
  const noteA = { time: 1000 }, noteB = { time: 1500 }, noteC = { time: 2000 };
  const diffs = [{ notes: [noteA, noteB] }, { notes: [noteC] }];
  const hits = [
    { x: 70, x2: 70, y: 20, r: 5, note: noteA, diff: diffs[0] },
    { x: 100, x2: 100, y: 20, r: 5, note: noteB, diff: diffs[0] },
    { x: 70, x2: 70, y: 60, r: 5, note: noteC, diff: diffs[1] }
  ];
  const canvas = target({ style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }),
    __spreadGeom: { hits, playX0: 50, topPad: 0, laneH: 40, n: 2 } });
  const progress = target({ getBoundingClientRect: () => ({ left: 10, width: 100 }) });
  const document = target({ getElementById: () => progress });
  const window = target();
  const playback = { manualTime: 1000, lastTime: 1000, dragging: false };
  const audio = { paused: true, currentTime: 1, duration: 10,
    pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); } };
  let active = true, clock = 1000, lane = 0, copies = 0, toggles = 0, silences = 0, resets = 0, zoom = 1;
  const scope = vm.createContext({ document, window, performance: { now: () => clock } });
  for (const file of ['previewHitTesting.js', 'previewInput.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../electron/inject', file), 'utf8'), scope);
  }
  const input = scope.createElectronPreviewInput({ canvas, playback,
    isActive: () => active, getDiffs: () => diffs,
    getRed: () => [{ time: 0, beatLength: 500 }], getSnap: () => 4,
    getPxPerMs: () => zoom, setZoom: value => { zoom = value; },
    getTime: () => playback.manualTime, setManual: value => { playback.manualTime = value; },
    getAudio: () => audio, hasAudio: () => true, getDuration: () => 10000,
    silenceWheelSounds: () => silences++, resetHitSounds: () => resets++,
    selectSoundLane: value => { lane = value; }, copyCurrentTimestamp: () => copies++, togglePlay: () => toggles++
  });
  const click = (x, y, keys = {}) => {
    canvas.fire('mousedown', { clientX: x, clientY: y, ...keys });
    window.fire('mouseup', { clientX: x, clientY: y, ...keys });
  };
  return { input, canvas, progress, document, window, playback, audio, noteA, noteB, noteC, click,
    setActive: value => { active = value; }, advance: ms => { clock += ms; },
    lane: () => lane, copies: () => copies, toggles: () => toggles,
    silences: () => silences, resets: () => resets, zoom: () => zoom };
}

test('preview clicks toggle additive notes and replace selections across difficulties', () => {
  const f = fixture();
  f.click(70, 20);
  f.click(100, 20, { ctrlKey: true });
  assert.deepEqual(Array.from(f.input.notes), [f.noteA, f.noteB]);
  f.click(70, 20, { ctrlKey: true });
  assert.deepEqual(Array.from(f.input.notes), [f.noteB]);
  f.click(70, 60, { metaKey: true });
  assert.deepEqual(Array.from(f.input.notes), [f.noteC]);
  f.click(150, 60);
  assert.equal(f.input.notes.length, 0);
  assert.equal(f.lane(), 1);
  f.click(150, 95);
  assert.equal(f.lane(), 1);
});

test('preview rectangle selection remains in its starting difficulty and clears on reload', () => {
  const f = fixture();
  f.canvas.fire('mousedown', { clientX: 60, clientY: 10 });
  f.window.fire('mousemove', { clientX: 110, clientY: 70 });
  assert.deepEqual(Array.from(f.input.notes), [f.noteA, f.noteB]);
  assert.equal(f.input.marquee.y1, 70);
  f.window.fire('mouseup', { clientX: 110, clientY: 70 });
  assert.equal(f.input.marquee, null);
  assert.equal(f.input.isSelected(f.noteA), true);
  f.input.clearSelection();
  assert.equal(f.input.isSelected(f.noteA), false);
});

test('right drag starts scrubbing only after its threshold and pauses music', () => {
  const f = fixture();
  f.audio.paused = false;
  f.canvas.fire('mousedown', { button: 2, clientX: 50, clientY: 20 });
  f.window.fire('mousemove', { clientX: 53, clientY: 20 });
  assert.equal(f.audio.paused, false);
  assert.equal(f.playback.dragging, false);
  f.window.fire('mousemove', { clientX: 60, clientY: 20 });
  assert.equal(f.audio.paused, true);
  assert.equal(f.playback.dragging, true);
  f.window.fire('mousemove', { clientX: 80, clientY: 20 });
  assert.equal(f.playback.manualTime, 980);
  f.window.fire('mouseup');
  assert.equal(f.playback.dragging, false);
  assert.equal(f.canvas.style.cursor, '');
});

test('wheel seeks snap to beats, accelerate, and keep music playing; Ctrl zooms', () => {
  const f = fixture();
  f.audio.paused = false;
  f.canvas.fire('wheel', { deltaY: 1 });
  assert.equal(f.playback.manualTime, 1125);
  assert.equal(f.audio.currentTime, 1.125);
  f.advance(50);
  f.canvas.fire('wheel', { deltaY: 1 });
  assert.equal(f.playback.manualTime, 1375);
  assert.equal(f.audio.paused, false);
  assert.equal(f.silences(), 2);
  assert.equal(f.resets(), 2);
  f.canvas.fire('wheel', { deltaY: -1, ctrlKey: true });
  assert.equal(f.zoom(), 1.15);
  assert.equal(f.playback.manualTime, 1375);
  assert.equal(f.silences(), 2);
});

test('double click and progress dragging align audio and clamp progress outside the bar', () => {
  const f = fixture();
  f.canvas.fire('dblclick', { clientX: 100, clientY: 20 });
  assert.equal(f.playback.manualTime, 1500);
  assert.equal(f.audio.currentTime, 1.5);
  f.progress.fire('mousedown', { button: 2, clientX: 60 });
  assert.equal(f.playback.manualTime, 5000);
  f.window.fire('mousemove', { clientX: 200 });
  assert.equal(f.playback.manualTime, 10000);
  assert.equal(f.audio.currentTime, 10);
  f.window.fire('mouseup');
  f.window.fire('mousemove', { clientX: 10 });
  assert.equal(f.playback.manualTime, 10000);
});

test('preview shortcuts respect visibility and text input while allowing focused checkboxes', () => {
  const f = fixture();
  const key = values => f.document.fire('keydown', values);
  f.setActive(false);
  key({ code: 'Space' });
  key({ key: 'c', ctrlKey: true });
  assert.equal(f.toggles(), 0);
  assert.equal(f.copies(), 0);
  f.setActive(true);
  for (const target of [{ tagName: 'TEXTAREA' }, { tagName: 'INPUT', type: 'text' }, { isContentEditable: true }]) {
    assert.equal(key({ code: 'Space', target }).prevented, false);
    assert.equal(key({ key: 'c', ctrlKey: true, target }).prevented, false);
  }
  key({ code: 'Space', target: { tagName: 'INPUT', type: 'checkbox' } });
  key({ key: 'C', metaKey: true });
  assert.equal(f.toggles(), 1);
  assert.equal(f.copies(), 1);
  f.click(70, 20);
  assert.equal(key({ key: 'Escape' }).prevented, true);
  assert.equal(f.input.notes.length, 0);
  key({ key: '+' });
  assert.equal(f.zoom(), 1.25);
  key({ key: '-', target: { tagName: 'INPUT' } });
  assert.equal(f.zoom(), 1.25);
});
