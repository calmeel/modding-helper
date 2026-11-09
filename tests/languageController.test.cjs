const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture(electron = false) {
  const notifications = [], history = [], calls = [];
  const labels = [{ dataset: { i18n: 'heading' } }];
  const titles = [{ dataset: { i18nTitle: 'hint' } }];
  const document = {
    documentElement: {},
    querySelectorAll: selector => selector === '[data-i18n]' ? labels : titles
  };
  function languageButton() {
    const classes = new Set();
    return { classList: {
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
      contains: name => classes.has(name)
    } };
  }
  const dom = { langEn: languageButton(), langJa: languageButton(), manualLink: {},
    updateHistoryContent: {}, fileName: {}, output: {}, shiftOutput: {}, timelineOutput: {} };
  const state = {};
  let language = 'ja';
  const scope = vm.createContext({ document,
    window: electron ? { electronAPI: { setLanguage: lang => notifications.push(lang) } } : {},
    renderUpdateHistory: (el, lang) => history.push([el, lang])
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/ui/languageController.js'), 'utf8'), scope);
  const controller = scope.createLanguageController({ state, dom,
    t: key => `${language}:${key}`, getLanguage: () => language,
    refreshSourceStatus: () => calls.push('status'),
    renderResults: () => calls.push(['render', document.documentElement.lang, dom.output?.textContent])
  });
  return { controller, state, dom, document, labels, titles, notifications, history, calls,
    setLanguage: value => { language = value; } };
}

test('language changes translate labels, titles and empty views before redrawing results', () => {
  const f = fixture();
  for (const language of ['ja', 'en']) {
    f.setLanguage(language);
    f.controller.apply();
    assert.equal(f.document.documentElement.lang, language);
    assert.equal(f.labels[0].textContent, `${language}:heading`);
    assert.equal(f.titles[0].title, `${language}:hint`);
    assert.equal(f.dom.fileName.textContent, `${language}:noFileSelected`);
    assert.equal(f.dom.output.textContent, `${language}:noFileLoaded`);
    assert.equal(f.dom.shiftOutput.textContent, `${language}:noFileLoaded`);
    assert.equal(f.dom.timelineOutput.textContent, `${language}:timelineNotRendered`);
    assert.equal(f.dom.langJa.classList.contains('active'), language === 'ja');
    assert.equal(f.dom.langEn.classList.contains('active'), language === 'en');
    assert.deepEqual(f.calls.slice(-2), ['status', ['render', language, `${language}:noFileLoaded`]]);
    assert.equal(f.history.at(-1)[0], f.dom.updateHistoryContent);
    assert.equal(f.history.at(-1)[1], language);
  }
});

test('manual links and desktop language synchronization work in both runtimes', () => {
  for (const electron of [false, true]) {
    const f = fixture(electron);
    for (const language of ['ja', 'en']) {
      f.setLanguage(language);
      f.controller.apply();
      const base = electron ? 'https://calmeel.github.io/modding-helper/docs/' : 'docs/';
      assert.equal(f.dom.manualLink.href, base + (language === 'ja' ? 'docs.html' : 'docs-en.html'));
    }
    assert.deepEqual(f.notifications, electron ? ['ja', 'en'] : []);
  }
});

test('reapplying language translates Electron elements inserted after startup', () => {
  const f = fixture(true);
  f.controller.apply();
  const label = { dataset: { i18n: 'lateLabel' } };
  const title = { dataset: { i18nTitle: 'lateHint' } };
  f.labels.push(label);
  f.titles.push(title);
  f.setLanguage('en');
  f.controller.apply();
  assert.equal(label.textContent, 'en:lateLabel');
  assert.equal(title.title, 'en:lateHint');
});

test('loaded file and results survive translation without empty-state replacement', () => {
  const f = fixture();
  Object.assign(f.state, { selectedFileName: '譜面.osz', clapWhistle: {}, offset: [], timeline: {} });
  f.dom.output.textContent = 'loaded output';
  f.dom.shiftOutput.textContent = 'loaded shift';
  f.dom.timelineOutput.textContent = 'loaded timeline';
  f.controller.apply();
  assert.equal(f.dom.fileName.textContent, '譜面.osz');
  assert.equal(f.dom.output.textContent, 'loaded output');
  assert.equal(f.dom.shiftOutput.textContent, 'loaded shift');
  assert.equal(f.dom.timelineOutput.textContent, 'loaded timeline');
  // Optional UI elements may be absent in another layout.
  for (const key of Object.keys(f.dom)) delete f.dom[key];
  assert.doesNotThrow(() => f.controller.apply());
});
