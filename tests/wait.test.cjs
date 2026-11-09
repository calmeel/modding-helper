const assert = require('node:assert/strict');
const { test } = require('node:test');
const { withTimeout, waitFor } = require('./helpers/wait.cjs');

test('bounded renderer wait preserves success and propagates errors immediately', async () => {
  let started = false;
  const pending = withTimeout(() => { started = true; return Promise.resolve(42); }, 100, 'renderer');
  assert.equal(started, true, 'event subscription must be installed before the caller triggers reload');
  assert.equal(await pending, 42);
  const failure = new Error('renderer disposed');
  await assert.rejects(withTimeout(() => { throw failure; }, 100, 'renderer'), error => error === failure);
});

test('an unanswered renderer operation fails with actionable context', async () => {
  await assert.rejects(withTimeout(() => new Promise(() => {}), 20,
    () => 'window=1, code=pending render'), /Timed out: window=1, code=pending render/);
});

test('condition waits retry false values and finish when the real state is ready', async () => {
  let probes = 0;
  await waitFor(async () => ++probes === 3, 'settings visible', { timeoutMs: 500, intervalMs: 1 });
  assert.equal(probes, 3);
});

test('condition deadline also bounds a probe that never settles', async () => {
  await assert.rejects(waitFor(() => new Promise(() => {}), 'metadata synchronization',
    { timeoutMs: 20, intervalMs: 1 }), /Timed out: metadata synchronization/);
});

test('a condition that stays false reaches its deadline', async () => {
  await assert.rejects(waitFor(() => false, 'settings still hidden',
    { timeoutMs: 20, intervalMs: 1 }), /Timed out: settings still hidden/);
});
