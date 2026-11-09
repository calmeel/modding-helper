const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function element() {
  const classes = new Set();
  return {
    style: {}, children: [], attributes: {},
    classList: { toggle: (key, value) => value ? classes.add(key) : classes.delete(key),
      contains: key => classes.has(key) },
    setAttribute(key, value) { this.attributes[key] = value; },
    appendChild(child) {
      if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
      this.children.push(child); child.parentElement = this;
    },
    insertBefore(child, before) {
      this.appendChild(child);
      this.children.pop();
      this.children.splice(this.children.indexOf(before), 0, child);
    }
  };
}
function fixture() {
  const ids = {};
  const get = id => ids[id] ||= element();
  const state = { viewMode: 'wide', panelMode: 'file', settingsMode: false, previewMode: false, notepadMode: false };
  let metadata = null, hidden = 0, refreshed = 0, rebuilt = 0, compact = false, notepad = false, preview = false;
  const fileBody = element(), compactBar = element(), head = element(), actions = element(), dropArea = element();
  head.appendChild(actions);
  fileBody.appendChild(dropArea);
  compactBar.appendChild(get('etb-compact-meta'));
  compactBar.appendChild(get('etb-compact-drop'));
  const scope = vm.createContext({ document: { getElementById: get }, window: {
    __spreadRebuildDiffList: () => rebuilt++, __setSpreadActive: on => { preview = on; }
  } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../electron/inject/displayModes.js'), 'utf8'), scope);
  const controller = scope.createElectronDisplayModes({
    text: key => `text:${key}`, getState: () => state, getMetadata: () => metadata,
    dropArea, layout: { fileBody, compactBar }, metadataCard: { head, actions },
    diffOrderCard: { setCompact: on => { compact = on; } },
    notepad: { setActive: on => { notepad = on; } },
    hideAllPlayheads: () => hidden++, schedulePlayheadRefresh: () => refreshed++
  });
  return { controller, state, get, actions, dropArea, fileBody, compactBar, head,
    setMetadata: value => { metadata = value; },
    flags: () => ({ hidden, refreshed, rebuilt, compact, notepad, preview }) };
}

test('display modes preserve card visibility and top-tab state across all layouts and sources', () => {
  for (const viewMode of ['wide', 'compact']) for (const panelMode of ['file', 'osu']) {
    for (const tab of ['check', 'settings', 'preview', 'notepad']) {
      const f = fixture();
      Object.assign(f.state, { viewMode, panelMode, settingsMode: tab === 'settings',
        previewMode: tab === 'preview', notepadMode: tab === 'notepad' });
      f.controller.applyPanel();
      const settings = tab === 'settings';
      assert.equal(f.get('etb-card-meta').style.display, settings ? 'none' : '');
      assert.equal(f.get('etb-card-file').style.display, settings || panelMode === 'osu' ? 'none' : '');
      assert.equal(f.get('etb-card-difforder').style.display, settings || viewMode === 'compact' ? 'none' : '');
      assert.equal(f.get('etb-card-viewsettings').style.display, settings ? '' : 'none');
      assert.equal(f.get('etb-checklist-settings-body').style.display, settings ? '' : 'none');
      assert.equal(f.get('electron-col-output').style.display, settings ? 'none' : '');
      assert.equal(f.get('electron-layout').classList.contains('etb-preview'), tab === 'preview');
      assert.equal(f.get('electron-layout').classList.contains('etb-settings'), settings);
      assert.equal(f.get('electron-layout').classList.contains('etb-notepad'), tab === 'notepad');
      assert.equal(f.get('etb-tab-main').classList.contains('active'), tab === 'check');
      assert.equal(f.flags().notepad, tab === 'notepad');
      assert.equal(f.flags().preview, tab === 'preview');
      assert.equal(f.flags().hidden, panelMode !== 'osu' || tab !== 'check' ? 1 : 0);
      assert.equal(f.flags().rebuilt, settings ? 1 : 0);
      assert.equal(f.get('etb-title-checklist').textContent,
        `text:${settings ? 'electronChecklistDisplay' : 'electronChecklist'}`);
    }
  }
});

test('compact mode relocates the existing map actions and drop area without replacing them', () => {
  const f = fixture();
  const handler = () => {};
  f.actions.onclick = handler;
  f.dropArea.ondrop = handler;
  f.state.viewMode = 'compact';
  f.controller.applyView();
  assert.equal(f.actions.parentElement, f.compactBar);
  assert.equal(f.dropArea.parentElement, f.get('etb-compact-drop'));
  assert.equal(f.flags().compact, true);
  f.state.panelMode = 'osu';
  f.controller.applyView();
  assert.equal(f.dropArea.parentElement, f.fileBody);
  assert.equal(f.get('etb-compact-drop').style.display, 'none');
  f.state.viewMode = 'wide';
  f.controller.applyView();
  assert.equal(f.actions.parentElement, f.head);
  assert.equal(f.actions.onclick, handler);
  assert.equal(f.dropArea.ondrop, handler);
  assert.equal(f.flags().compact, false);
  assert.equal(f.flags().refreshed, 3);
});

test('compact metadata supports Unicode fallbacks and refreshes its empty state', () => {
  const f = fixture();
  f.controller.updateMetadata();
  const label = f.get('etb-compact-meta');
  assert.equal(label.textContent, 'text:electronNoBeatmapLoadedPlain');
  assert.equal(label.classList.contains('etb-compact-meta-empty'), true);
  f.setMetadata({ artistUnicode: '作曲者', titleUnicode: '曲名', creator: 'Mapper' });
  f.controller.updateMetadata();
  assert.equal(label.textContent, '作曲者 - 曲名 (Mapper)');
  assert.equal(label.classList.contains('etb-compact-meta-empty'), false);
  f.setMetadata(null);
  f.controller.updateMetadata();
  assert.equal(label.classList.contains('etb-compact-meta-empty'), true);
});
