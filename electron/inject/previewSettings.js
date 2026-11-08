// プレビュー設定カードのDOMと入力イベントを構築する。再生への副作用はコールバックに委譲する。
function setupElectronPreviewSettings({ previewSettingsBody, viewSettingsBody, text: electronText,
  options, display, events, sounds, constants }) {
  /* 設定画面「プレビュータブ設定」カードに Diff順 / 効果音の種類・音量 を追加 */
  if (typeof previewSettingsBody !== 'undefined' && previewSettingsBody) {
    /* Diff順（難→易 / 易→難）の切替 */
    var diffOrderSection = document.createElement('div');
    diffOrderSection.className = 'etb-sfx-settings';
    var doTitle = document.createElement('div');
    doTitle.className = 'etb-sfx-settings-title';
    doTitle.id = 'etb-difforder-title';
    doTitle.textContent = electronText('electronDiffOrder');
    diffOrderSection.appendChild(doTitle);
    [
      { desc: true,  id: 'etb-difforder-desc', key: 'electronHardToEasy' },
      { desc: false, id: 'etb-difforder-asc',  key: 'electronEasyToHard' }
    ].forEach(function (opt) {
      var lb = document.createElement('label');
      lb.className = 'etb-sfx-opt';
      var rb = document.createElement('input');
      rb.type = 'radio'; rb.name = 'etb-difforder';
      if (opt.desc === options.diffDescending) rb.checked = true;
      rb.addEventListener('change', function () {
        if (!rb.checked) return;
        options.diffDescending = opt.desc;
        try { localStorage.setItem('moddingHelperPreviewDiffDesc', options.diffDescending ? '1' : '0'); } catch (e) {}
        events.diffOrderChanged();
      });
      var txt = document.createElement('span');
      txt.id = opt.id; txt.textContent = electronText(opt.key);
      lb.appendChild(rb);
      lb.appendChild(document.createTextNode(' '));
      lb.appendChild(txt);
      diffOrderSection.appendChild(lb);
    });
    previewSettingsBody.appendChild(diffOrderSection);

    /* 表示モード（ワイド / コンパクト）の切替。カードは別だがここでまとめて組む */
    if (typeof viewSettingsBody !== 'undefined' && viewSettingsBody) {
      var viewModeSection = document.createElement('div');
      viewModeSection.className = 'etb-sfx-settings';
      [
        { mode: 'wide',    id: 'etb-viewmode-wide',    key: 'electronWide' },
        { mode: 'compact', id: 'etb-viewmode-compact', key: 'electronCompact' }
      ].forEach(function (opt) {
        var lb = document.createElement('label');
        lb.className = 'etb-sfx-opt';
        var rb = document.createElement('input');
        rb.type = 'radio'; rb.name = 'etb-viewmode';
        if (opt.mode === display.getViewMode()) rb.checked = true;
        rb.addEventListener('change', function () {
          if (!rb.checked) return;
          display.setViewMode(opt.mode);
          try { localStorage.setItem('moddingHelperViewMode', display.getViewMode()); } catch (e) {}
          display.applyViewModeUi();
          /* ウィンドウサイズもモードに合わせる。
             コンパクト → 標準のデスクトップサイズ / ワイド → 画面いっぱい。
             どちらも固定ではないので、以後は自由にリサイズできる。 */
          var api = window.electronAPI;
          if (display.getViewMode() === 'compact') { if (api && api.standardSize) api.standardSize(); }
          else if (api && api.maximizeFull) api.maximizeFull();
        });
        var txt = document.createElement('span');
        txt.id = opt.id; txt.textContent = electronText(opt.key);
        lb.appendChild(rb);
        lb.appendChild(document.createTextNode(' '));
        lb.appendChild(txt);
        viewModeSection.appendChild(lb);
      });
      viewSettingsBody.appendChild(viewModeSection);

      var tagDisplaySection = document.createElement('div');
      tagDisplaySection.className = 'etb-sfx-settings';
      var tagDisplayTitle = document.createElement('div');
      tagDisplayTitle.className = 'etb-sfx-settings-title';
      tagDisplayTitle.id = 'etb-tagdisplay-title';
      tagDisplayTitle.textContent = electronText('electronTagDisplay');
      tagDisplaySection.appendChild(tagDisplayTitle);
      [
        { mode: 'text', id: 'etb-tagdisplay-text', key: 'electronTagDisplayText' },
        { mode: 'buttons', id: 'etb-tagdisplay-buttons', key: 'electronTagDisplayButtons' }
      ].forEach(function(opt) {
        var label = document.createElement('label');
        label.className = 'etb-sfx-opt';
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'etb-tagdisplay';
        radio.value = opt.mode;
        radio.checked = display.getTagDisplayMode() === opt.mode;
        radio.addEventListener('change', function() {
          if (!radio.checked) return;
          display.setTagDisplayMode(opt.mode);
          try { localStorage.setItem('moddingHelperTagDisplayMode', display.getTagDisplayMode()); } catch (e) {}
          display.redrawMetadata();
        });
        var text = document.createElement('span');
        text.id = opt.id;
        text.textContent = electronText(opt.key);
        label.appendChild(radio);
        label.appendChild(document.createTextNode(' '));
        label.appendChild(text);
        tagDisplaySection.appendChild(label);
      });
      viewSettingsBody.appendChild(tagDisplaySection);
    }

    /* 判定ラインの位置（中央 / 左寄せ）の切替 */
    var judgePosSection = document.createElement('div');
    judgePosSection.className = 'etb-sfx-settings';
    var jpTitle = document.createElement('div');
    jpTitle.className = 'etb-sfx-settings-title';
    jpTitle.id = 'etb-judgepos-title';
    jpTitle.textContent = electronText('electronJudgementLine');
    judgePosSection.appendChild(jpTitle);
    [
      { frac: constants.judgeCenter, id: 'etb-judgepos-center', key: 'electronCenter' },
      { frac: constants.judgeLeft,   id: 'etb-judgepos-left',   key: 'electronLeft' }
    ].forEach(function (opt) {
      var lb = document.createElement('label');
      lb.className = 'etb-sfx-opt';
      var rb = document.createElement('input');
      rb.type = 'radio'; rb.name = 'etb-judgepos';
      if (opt.frac === options.judgementFraction) rb.checked = true;
      rb.addEventListener('change', function () {
        if (!rb.checked) return;
        options.judgementFraction = opt.frac;
        try { localStorage.setItem('moddingHelperPreviewJudgeFrac', String(options.judgementFraction)); } catch (e) {}
      });
      var txt = document.createElement('span');
      txt.id = opt.id; txt.textContent = electronText(opt.key);
      lb.appendChild(rb);
      lb.appendChild(document.createTextNode(' '));
      lb.appendChild(txt);
      judgePosSection.appendChild(lb);
    });
    previewSettingsBody.appendChild(judgePosSection);

    /* Diff の表示/非表示（読み込み中の譜面に応じて動的生成） */
    var diffVisSection = document.createElement('div');
    diffVisSection.className = 'etb-sfx-settings';
    var dvTitle = document.createElement('div');
    dvTitle.className = 'etb-sfx-settings-title';
    dvTitle.id = 'etb-diffvis-title';
    dvTitle.textContent = electronText('electronShownDiffs');
    diffVisSection.appendChild(dvTitle);
    var diffVisList = document.createElement('div');
    diffVisList.id = 'etb-diffvis-list';
    diffVisSection.appendChild(diffVisList);
    previewSettingsBody.appendChild(diffVisSection);

    /* 現在の譜面から表示チェックリストを作り直す（設定画面を開いた時に呼ぶ） */
    var rebuildDiffVisibilityList = function () {
      diffVisList.innerHTML = '';
      var diffs = events.getDiffs();
      if (!diffs.length) {
        var none = document.createElement('div');
        none.className = 'etb-sfx-none'; none.id = 'etb-diffvis-none';
        none.setAttribute('data-i18n', 'electronNoBeatmapLoaded');
        none.textContent = electronText('electronNoBeatmapLoaded');
        diffVisList.appendChild(none);
        return;
      }
      diffs.forEach(function (d) {
        var lb = document.createElement('label');
        lb.className = 'etb-sfx-opt';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !options.hiddenDiffs[d.fileName];
        cb.addEventListener('change', function () {
          if (cb.checked) delete options.hiddenDiffs[d.fileName];
          else options.hiddenDiffs[d.fileName] = true;
          events.visibilityChanged();
        });
        lb.appendChild(cb);
        lb.appendChild(document.createTextNode(' ' + (d.name || d.fileName)));
        diffVisList.appendChild(lb);
      });
    };
    window.__spreadRebuildDiffList = rebuildDiffVisibilityList;

    /* その他のプレビュー設定 */
    var otherSection = document.createElement('div');
    otherSection.className = 'etb-sfx-settings';
    var otherTitle = document.createElement('div');
    otherTitle.className = 'etb-sfx-settings-title';
    otherTitle.id = 'etb-preview-other-title';
    otherTitle.textContent = electronText('electronOtherSettings');
    otherSection.appendChild(otherTitle);
    [
      {
        id: 'etb-preview-transparent-sliders-cb',
        textId: 'etb-preview-transparent-sliders-text',
        key: 'electronTransparentSliders',
        checked: options.transparentSliders,
        change: function(checked) {
          options.transparentSliders = checked;
          try {
            localStorage.setItem(
              'moddingHelperPreviewTransparentSliders',
              checked ? '1' : '0'
            );
          } catch (e) {}
        }
      },
      {
        id: 'etb-preview-kiai-cb',
        textId: 'etb-preview-kiai-text',
        key: 'electronHighlightKiai',
        checked: options.highlightKiai,
        change: function(checked) {
          options.highlightKiai = checked;
          try {
            localStorage.setItem(
              'moddingHelperPreviewKiaiHighlight',
              checked ? '1' : '0'
            );
          } catch (e) {}
        }
      },
      {
        id: 'etb-preview-nc-cb',
        textId: 'etb-preview-nc-text',
        key: 'electronHighlightNcBarlines',
        checked: options.showNc,
        change: function(checked) {
          options.showNc = checked;
          try {
            localStorage.setItem(
              'moddingHelperPreviewNcCymbal',
              checked ? '1' : '0'
            );
          } catch (e) {}
        }
      },
      {
        id: 'etb-preview-timing-info-cb',
        textId: 'etb-preview-timing-info-text',
        key: 'electronShowPreviewTimingInfo',
        checked: options.showTimingInfo,
        change: function(checked) {
          options.showTimingInfo = checked;
          /* 情報カラム分だけプレイフィールド幅が変わるため基準ズームも再計算する。 */
          events.timingInfoChanged();
          try {
            localStorage.setItem(
              'moddingHelperPreviewTimingInfo',
              checked ? '1' : '0'
            );
          } catch (e) {}
        }
      }
    ].forEach(function(opt) {
      var lb = document.createElement('label');
      lb.className = 'etb-sfx-opt';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = opt.id;
      cb.checked = opt.checked;
      cb.addEventListener('change', function() {
        opt.change(cb.checked);
      });
      var txt = document.createElement('span');
      txt.id = opt.textId;
      txt.textContent = electronText(opt.key);
      lb.appendChild(cb);
      lb.appendChild(document.createTextNode(' '));
      lb.appendChild(txt);
      otherSection.appendChild(lb);
    });
    previewSettingsBody.appendChild(otherSection);

    var sfxSection = document.createElement('div');
    sfxSection.className = 'etb-sfx-settings';
    var sfxTitle = document.createElement('div');
    sfxTitle.className = 'etb-sfx-settings-title';
    sfxTitle.id = 'etb-sfx-settings-title';
    sfxTitle.textContent = electronText('electronHitSoundSet');
    sfxSection.appendChild(sfxTitle);
    if (sounds.sets.length) {
      var selId = (sounds.getSelectedSet() || {}).id;
      sounds.sets.forEach(function (set) {
        var lb = document.createElement('label');
        lb.className = 'etb-sfx-opt';
        var rb = document.createElement('input');
        rb.type = 'radio'; rb.name = 'etb-sfx-set'; rb.value = set.id;
        if (set.id === selId) rb.checked = true;
        rb.addEventListener('change', function () { if (rb.checked) sounds.setSet(set.id); });
        lb.appendChild(rb);
        lb.appendChild(document.createTextNode(' ' + set.label));
        sfxSection.appendChild(lb);
      });
    } else {
      var sfxNone = document.createElement('div');
      sfxNone.className = 'etb-sfx-none'; sfxNone.id = 'etb-sfx-none';
      sfxNone.textContent = electronText('electronNoSoundFolders');
      sfxSection.appendChild(sfxNone);
    }

    /* 音量（0〜100）: スライダー + 数値入力（同期） */
    var volRow = document.createElement('div');
    volRow.className = 'etb-sfx-vol';
    var volLabel = document.createElement('span');
    volLabel.id = 'etb-sfx-vol-label'; volLabel.className = 'etb-sfx-vol-label';
    volLabel.textContent = electronText('electronHitSoundVolume');
    var volRange = document.createElement('input');
    volRange.type = 'range'; volRange.min = '0'; volRange.max = '100'; volRange.step = '1';
    volRange.className = 'etb-sfx-vol-range';
    var volNum = document.createElement('input');
    volNum.type = 'number'; volNum.min = '0'; volNum.max = '100'; volNum.step = '1';
    volNum.id = 'etb-sfx-vol-input'; volNum.className = 'etb-sfx-vol-num';
    var applyVol = function (v, from) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      options.sfxVolume = v / 100;
      try { localStorage.setItem('moddingHelperSfxVolume', String(v)); } catch (e) {}
      sounds.setVolume(options.sfxVolume);
      if (from !== 'range') volRange.value = String(v);
      if (from !== 'num') volNum.value = String(v);
    };
    var initVol = Math.round(options.sfxVolume * 100);
    volRange.value = String(initVol); volNum.value = String(initVol);
    volRange.addEventListener('input', function () { applyVol(parseInt(volRange.value, 10) || 0, 'range'); });
    volNum.addEventListener('input', function () {
      var v = parseInt(volNum.value, 10); if (Number.isFinite(v)) applyVol(v, 'num');
    });
    volRow.appendChild(volLabel);
    volRow.appendChild(volRange);
    volRow.appendChild(volNum);
    sfxSection.appendChild(volRow);

    /* 曲の音量（0〜100）: スライダー + 数値入力（同期） */
    var mVolRow = document.createElement('div');
    mVolRow.className = 'etb-sfx-vol';
    var mVolLabel = document.createElement('span');
    mVolLabel.id = 'etb-music-vol-label'; mVolLabel.className = 'etb-sfx-vol-label';
    mVolLabel.textContent = electronText('electronMusicVolume');
    var mVolRange = document.createElement('input');
    mVolRange.type = 'range'; mVolRange.min = '0'; mVolRange.max = '100'; mVolRange.step = '1';
    mVolRange.className = 'etb-sfx-vol-range';
    var mVolNum = document.createElement('input');
    mVolNum.type = 'number'; mVolNum.min = '0'; mVolNum.max = '100'; mVolNum.step = '1';
    mVolNum.id = 'etb-music-vol-input'; mVolNum.className = 'etb-sfx-vol-num';
    var applyMusicVol = function (v, from) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      options.musicVolume = v / 100;
      try { localStorage.setItem('moddingHelperMusicVolume', String(v)); } catch (e) {}
      sounds.setMusicVolume(options.musicVolume);
      if (from !== 'range') mVolRange.value = String(v);
      if (from !== 'num') mVolNum.value = String(v);
    };
    var initMVol = Math.round(options.musicVolume * 100);
    mVolRange.value = String(initMVol); mVolNum.value = String(initMVol);
    mVolRange.addEventListener('input', function () { applyMusicVol(parseInt(mVolRange.value, 10) || 0, 'range'); });
    mVolNum.addEventListener('input', function () {
      var v = parseInt(mVolNum.value, 10); if (Number.isFinite(v)) applyMusicVol(v, 'num');
    });
    mVolRow.appendChild(mVolLabel);
    mVolRow.appendChild(mVolRange);
    mVolRow.appendChild(mVolNum);
    sfxSection.appendChild(mVolRow);

    /* 効果音タイミング補正(ms): 基準値 0、+で遅らせ / -で早める */
    var offRow = document.createElement('div');
    offRow.className = 'etb-sfx-vol';
    var offLabel = document.createElement('span');
    offLabel.id = 'etb-sfx-offset-label'; offLabel.className = 'etb-sfx-vol-label';
    offLabel.textContent = electronText('electronHitSoundOffset');
    var offRange = document.createElement('input');
    offRange.type = 'range'; offRange.min = '-100'; offRange.max = '100'; offRange.step = '1';
    offRange.className = 'etb-sfx-vol-range';
    var offNum = document.createElement('input');
    offNum.type = 'number'; offNum.min = String(-constants.sfxTimingLimitMs);
    offNum.max = String(constants.sfxTimingLimitMs); offNum.step = '1';
    offNum.id = 'etb-sfx-offset-input'; offNum.className = 'etb-sfx-vol-num';
    var applyTimingAdjustment = function (v, from) {
      v = Math.max(-constants.sfxTimingLimitMs, Math.min(constants.sfxTimingLimitMs, Math.round(v)));
      options.sfxTimingAdjustment = v;
      try {
        localStorage.setItem('moddingHelperSfxTimingAdjustment', String(v));
        /* 旧バージョンへ戻した場合も同じタイミングになるよう、旧キーも更新する。 */
        localStorage.setItem('moddingHelperSfxOffset', String(constants.sfxBaseDelayMs + v));
      } catch (e) {}
      if (from !== 'range') offRange.value = String(Math.max(-100, Math.min(100, v)));
      if (from !== 'num') offNum.value = String(v);
    };
    offRange.value = String(Math.max(-100, Math.min(100, options.sfxTimingAdjustment)));
    offNum.value = String(options.sfxTimingAdjustment);
    offRange.addEventListener('input', function () { applyTimingAdjustment(parseInt(offRange.value, 10) || 0, 'range'); });
    offNum.addEventListener('input', function () {
      var v = parseInt(offNum.value, 10); if (Number.isFinite(v)) applyTimingAdjustment(v, 'num');
    });
    offRow.appendChild(offLabel);
    offRow.appendChild(offRange);
    offRow.appendChild(offNum);
    sfxSection.appendChild(offRow);

    previewSettingsBody.appendChild(sfxSection);
  }

}
