// 現在言語の翻訳、リンク、未読込表示と結果の再描画を取りまとめる。
function createLanguageController({ state, dom, t, getLanguage, refreshSourceStatus, renderResults }) {
  const emptyOutputs = [
    ['clapWhistle', 'output'],
    ['offset', 'shiftOutput'],
    ['kiaiCompare', 'kiaiOutput'],
    ['kiaiSnap', 'kiaiSnapOutput'],
    ['doubleSvSources', 'doubleSvOutput'],
    ['barlineSources', 'barlineOutput'],
    ['unappliedSv', 'unappliedSvOutput'],
    ['redGreenMatch', 'redGreenMatchOutput'],
    ['sampleSet', 'sampleSetOutput'],
    ['sliderSettings', 'sliderSettingsOutput'],
    ['earlyNote', 'earlyNoteOutput'],
    ['artist', 'artistOutput'],
    ['title', 'titleOutput'],
    ['source', 'sourceOutput'],
    ['tag', 'tagOutput'],
    ['previewPoint', 'previewPointOutput'],
    ['bgOffset', 'bgOffsetOutput'],
    ['fileCheck', 'fileCheckOutput'],
    ['epilepsyWarning', 'epilepsyWarningOutput'],
    ['spread', 'spreadOdHpOutput'],
    ['offsetWaveformSources', 'offsetWaveformEmpty'],
    ['contentPermission', 'contentPermissionOutput']
  ];

  function apply() {
    const language = getLanguage();
    document.documentElement.lang = language === 'ja' ? 'ja' : 'en';

    // Electronが後から追加する要素も含め、適用するたびに取得する。
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });

    refreshSourceStatus();
    if (dom.fileName) dom.fileName.textContent = state.selectedFileName || t('noFileSelected');
    if (dom.langEn) dom.langEn.classList.toggle('active', language === 'en');
    if (dom.langJa) dom.langJa.classList.toggle('active', language === 'ja');
    if (window.electronAPI && typeof window.electronAPI.setLanguage === 'function') {
      window.electronAPI.setLanguage(language);
    }
    if (dom.manualLink) {
      const docsBase = window.electronAPI
        ? 'https://calmeel.github.io/modding-helper/docs/' : 'docs/';
      dom.manualLink.href = docsBase + (language === 'ja' ? 'docs.html' : 'docs-en.html');
    }
    if (dom.updateHistoryContent) renderUpdateHistory(dom.updateHistoryContent, language);

    emptyOutputs.forEach(([stateKey, domKey]) => {
      if (!state[stateKey] && dom[domKey]) dom[domKey].textContent = t('noFileLoaded');
    });
    if (!state.timeline && dom.timelineOutput) dom.timelineOutput.textContent = t('timelineNotRendered');

    renderResults();
  }

  return { apply };
}
