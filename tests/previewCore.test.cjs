const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, globals = {}) {
  const scope = vm.createContext(globals);
  scope.window = scope;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../electron/inject', file), 'utf8'), scope);
  return scope;
}

test('preview hit testing respects drawing order, label area and Diff selection', () => {
  const diffA = {}, diffB = {};
  const circle = { x: 70, x2: 70, y: 20, r: 10, diff: diffA };
  const roll = { x: 100, x2: 60, y: 20, r: 5, diff: diffB };
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 30 }),
    __spreadGeom: { playX0: 50, hits: [circle, roll] }
  };
  const hit = load('previewHitTesting.js').createElectronPreviewHitTesting(canvas);
  assert.equal(hit.point({ clientX: 80, clientY: 50 }).x, 70);
  assert.equal(hit.point({ clientX: 80, clientY: 50 }).y, 20);
  assert.equal(hit.hitTest(70, 20), roll);
  assert.equal(hit.hitTest(70, 29), circle);
  assert.equal(hit.hitTest(104, 24), null);
  assert.equal(hit.hitTest(105, 20), roll);
  assert.equal(hit.hitTest(49, 20), null);
  assert.deepEqual(Array.from(hit.hitsInRect(110, 30, 60, 10, diffA)), [circle]);
  assert.deepEqual(Array.from(hit.hitsInRect(0, 0, 49, 40)), []);
  delete canvas.__spreadGeom;
  assert.equal(hit.hitTest(70, 20), null);
});

function audioFixture(decode = async () => ({ duration: 30 })) {
  const sources = [], timers = new Map();
  let timerId = 0;
  const ctx = {
    currentTime: 0, destination: {}, decodeAudioData: decode,
    createGain: () => ({ connect() {}, gain: {
      value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}
    } }),
    createBufferSource() {
      const source = { connect() {}, start() {}, stop() {}, onended: null };
      sources.push(source);
      return source;
    }
  };
  const scope = load('previewAudio.js', {
    fetch: async url => ({ arrayBuffer: async () => url }),
    setInterval: fn => { timers.set(++timerId, fn); return timerId; },
    clearInterval: id => timers.delete(id)
  });
  return { audio: scope.createElectronPreviewAudio(() => ctx), ctx, sources, timers };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('preview audio keeps position across pause, seek and playback speed changes', async () => {
  const { audio, ctx, sources, timers } = audioFixture();
  audio.setSrc('song');
  await settle();
  assert.equal(audio.readyState, 4);
  assert.equal(audio.duration, 30);
  await audio.play();
  ctx.currentTime = 3;
  assert.equal(audio.currentTime, 3);
  audio.pause();
  ctx.currentTime = 8;
  assert.equal(audio.currentTime, 3);
  audio.currentTime = 5;
  await audio.play();
  ctx.currentTime = 9;
  assert.equal(audio.currentTime, 6);
  audio.playbackRate = 0.5;
  assert.equal(audio.currentTime, 6);
  ctx.currentTime = 11;
  assert.equal(audio.currentTime, 7);
  assert.equal(timers.size, 1);
  audio.pause();
  assert.equal(timers.size, 0);
  audio.playbackRate = 1;
  let ended = 0;
  audio.addEventListener('ended', () => ended++);
  await audio.play();
  sources.at(-1).onended();
  assert.equal(ended, 1);
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 30);
});

test('preview audio ignores stale decodes and honors play requested during loading', async () => {
  const pending = new Map();
  const { audio } = audioFixture(url => new Promise(resolve => pending.set(url, resolve)));
  audio.setSrc('old');
  audio.setSrc('new');
  await audio.play();
  await settle();
  pending.get('new')({ duration: 40 });
  await settle();
  assert.equal(audio.paused, false);
  pending.get('old')({ duration: 10 });
  await settle();
  assert.equal(audio.duration, 40);
  audio.setSrc(null);
  assert.equal(audio.readyState, 0);
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
});

test('preview data uses Version and spans notes including their end times', () => {
  const scope = load('previewDiffData.js', {
    parseMetadataValue: text => text === 'named' ? 'Inner Oni' : '',
    parseTaikoNotes: text => text === 'named'
      ? [{ time: 1000 }, { time: 2000, endTime: 5000 }] : []
  });
  const diffs = scope.prepareElectronPreviewDiffs([
    { fileName: 'Artist - Title.osu', text: 'named' },
    { fileName: 'Fallback.osu', text: 'empty' }
  ]);
  assert.equal(diffs[0].name, 'Inner Oni');
  assert.equal(diffs[1].name, 'Fallback.osu');
  assert.deepEqual(Array.from(scope.getElectronPreviewTimeRange(diffs)), [-1000, 7000]);
  assert.equal(scope.getElectronPreviewTimeRange([diffs[1]]), null);
});
