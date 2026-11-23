const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const scope = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/ui/updateHistory.js'), 'utf8'), scope);
const key = 'moddingHelperReadUpdateHistory';
const entry = (date, items = ['First update']) => ({ date, type: 'update', items: { en: items, ja: items } });

function setup(entries, data = new Map(), storageOverride) {
  const classes = new Set();
  const attributes = new Map();
  const button = {
    classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); }
  };
  const storage = storageOverride || {
    getItem: name => data.get(name) ?? null,
    setItem: (name, value) => data.set(name, value)
  };
  const notification = scope.createUpdateHistoryNotification(button, { entries, getStorage: () => storage });
  return { data, attributes, unread: () => classes.has('has-unread-updates'), ...notification };
}

test('first visit establishes a baseline and repeat visits remain read', () => {
  const first = setup([entry('2026/11/23')]);
  assert.equal(first.unread(), false);
  assert.ok(first.data.has(key));
  assert.equal(setup([entry('2026/11/23')], first.data).unread(), false);
});

test('new entries stay unread across reloads until the history is opened', () => {
  const first = setup([entry('2026/11/23')]);
  const updated = [entry('2026/11/23'), entry('2026/11/24')];
  const next = setup(updated, first.data);
  assert.equal(next.unread(), true);
  assert.equal(next.attributes.get('aria-describedby'), 'updateHistoryUnread');
  assert.equal(setup(updated, first.data).unread(), true);
  next.markRead();
  assert.equal(next.unread(), false);
  assert.equal(next.attributes.has('aria-describedby'), false);
  assert.equal(setup(updated, first.data).unread(), false);
});

test('same-day additions notify, while text corrections and deletions do not', () => {
  const first = setup([entry('2026/11/23')]);
  assert.equal(setup([entry('2026/11/23', ['Corrected text'])], first.data).unread(), false);
  assert.equal(setup([entry('2026/11/23', [])], first.data).unread(), false);
  assert.equal(setup([entry('2026/11/23', ['First update', 'Added item'])], first.data).unread(), true);
  assert.equal(setup([entry('2026/11/23'), entry('2026/11/23')], first.data).unread(), true);
});

test('invalid saved data and unavailable storage do not interrupt opening history', () => {
  for (const saved of ['broken json', '{}', '[42]']) {
    const state = setup([entry('2026/11/23')], new Map([[key, saved]]));
    assert.equal(state.unread(), false);
    state.markRead();
    assert.ok(Array.isArray(JSON.parse(state.data.get(key))));
  }
  const blocked = setup([entry('2026/11/23')], new Map(), {
    getItem() { throw new Error('Storage blocked'); },
    setItem() { throw new Error('Storage blocked'); }
  });
  assert.equal(blocked.unread(), false);
  assert.doesNotThrow(() => blocked.markRead());
});
