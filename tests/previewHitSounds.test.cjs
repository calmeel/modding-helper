const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(notes) {
  const calls = [];
  const scope = vm.createContext({ performance: { now: () => 1000 } });
  scope.window = scope;
  scope.taikoDrumRollTickTimes = note => note.ticks;
  scope.taikoSwellHitTimes = note => note.ticks;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../electron/inject/previewHitSounds.js'), 'utf8'), scope);
  const scheduler = scope.createElectronPreviewHitSounds(30);
  const state = {
    playing: true, enabled: true, rate: 1, lane: 0, silentUntil: 0, timingAdjustment: 0,
    audio: { seeking: false, readyState: 4, currentTime: 1 },
    synth: {
      ctx: { currentTime: 10 },
      don: (big, time) => calls.push({ kind: 'don', big, time }),
      kat: (big, time) => calls.push({ kind: 'kat', big, time })
    }
  };
  const diffs = [{ notes }];
  return { scheduler, state, calls, diffs, schedule: () => scheduler.schedule(diffs, state) };
}

test('hit sounds schedule only future notes in the lookahead window, once', () => {
  const f = fixture([
    { time: 1000, kind: 'don' },
    { time: 1050, kind: 'don', big: true },
    { time: 1120, kind: 'kat', big: false },
    { time: 1121, kind: 'don' }
  ]);
  f.schedule();
  f.schedule();
  assert.deepEqual(f.calls.map(c => [c.kind, c.big]), [['don', true], ['kat', false]]);
  assert.ok(Math.abs(f.calls[0].time - 10.08) < 1e-9);
  assert.ok(Math.abs(f.calls[1].time - 10.15) < 1e-9);
  f.state.audio.currentTime = 1.02;
  f.schedule();
  assert.equal(f.calls.length, 3);
});

test('hit sounds select the requested lane and convert timing at slower speed', () => {
  const f = fixture([{ time: 1050, kind: 'don' }]);
  f.diffs.push({ notes: [{ time: 1050, kind: 'kat', big: true }] });
  f.state.lane = 1;
  f.state.rate = 0.5;
  f.state.timingAdjustment = 20;
  f.schedule();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].kind, 'kat');
  // 50ms / 0.5 + 30ms base + 20ms user adjustment - 50ms speed correction.
  assert.ok(Math.abs(f.calls[0].time - 10.1) < 1e-9);
});

test('hit sounds emit drumroll ticks and alternating swell hits without duplicates', () => {
  const f = fixture([
    { time: 900, endTime: 1150, kind: 'drumroll', big: true, ticks: [990, 1020, 1100, 1140] },
    { time: 950, endTime: 1200, kind: 'denden', ticks: [980, 1040, 1080, 1160] }
  ]);
  f.schedule();
  f.schedule();
  assert.deepEqual(f.calls.map(c => [c.kind, c.big]), [
    ['don', true], ['don', true], ['kat', false], ['don', false]
  ]);
});

test('hit sounds reset reservations on backward seek and explicit kit reset', () => {
  const f = fixture([{ time: 1050, kind: 'don' }]);
  f.schedule();
  f.state.audio.currentTime = 0.95;
  f.schedule();
  assert.equal(f.calls.length, 2);
  f.scheduler.reset();
  f.schedule();
  assert.equal(f.calls.length, 3);
});

test('hit sounds wait during silence, pause, disabled audio and decoding', () => {
  for (const modify of [
    state => { state.silentUntil = 1100; },
    state => { state.playing = false; },
    state => { state.enabled = false; },
    state => { state.audio.seeking = true; },
    state => { state.audio.readyState = 0; }
  ]) {
    const f = fixture([{ time: 1050, kind: 'don' }]);
    modify(f.state);
    f.schedule();
    assert.equal(f.calls.length, 0);
    Object.assign(f.state, { silentUntil: 0, playing: true, enabled: true });
    Object.assign(f.state.audio, { seeking: false, readyState: 4 });
    f.schedule();
    assert.equal(f.calls.length, 1);
  }
});
