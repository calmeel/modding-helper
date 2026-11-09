// ワイド/コンパクトとトップタブに応じたカード表示・既存要素の移動を管理する。
function createElectronDisplayModes({ text: electronText, getState, getMetadata,
  dropArea, layout, metadataCard, diffOrderCard, notepad, hideAllPlayheads, schedulePlayheadRefresh }) {
  var compactBar = layout.compactBar, fileBody = layout.fileBody;
  var mapActions = metadataCard.actions, metaHead = metadataCard.head;
  /* カード表示の切替（panelMode と settingsMode を反映）:
     通常時   左→メタデータ/譜面ファイル, 中央→チェックリスト
     設定時   左→譜面読み込み設定,          中央→チェックリストの設定 */
  /* 設定値は呼び出し側が所有し、適用時に最新の状態を取得する。 */
  var updateCompactMeta = function() {
    var el = document.getElementById('etb-compact-meta');
    if (!el) return;
    var d = getMetadata();
    var artist = d && (d.artist || d.artistUnicode) || '';
    var title  = d && (d.title  || d.titleUnicode)  || '';
    var creator = d && d.creator || '';
    var txt = '';
    if (artist || title) {
      txt = (artist ? artist + ' - ' : '') + title;
      if (creator) txt += ' (' + creator + ')';
    }
    el.textContent = txt || electronText('electronNoBeatmapLoadedPlain');
    el.classList.toggle('etb-compact-meta-empty', !txt);
  };
  var applyViewModeUi = function() {
    var { viewMode, panelMode } = getState();
    var layoutEl = document.getElementById('electron-layout');
    if (layoutEl) layoutEl.classList.toggle('etb-compact', viewMode === 'compact');
    diffOrderCard.setCompact(viewMode === 'compact');
    /* 同じボタンを移動し、可否・イベントを表示モード間で保持する。 */
    if (viewMode === 'compact') compactBar.insertBefore(mapActions, document.getElementById('etb-compact-drop'));
    else metaHead.appendChild(mapActions);
    /* ドロップエリアは1つしか無いので、置き場所ごと移動する
       （複製するとイベントの張り直しが要るため） */
    var slot = document.getElementById('etb-compact-drop');
    if (slot && dropArea) {
      var wantInBar = (viewMode === 'compact' && panelMode !== 'osu');
      if (wantInBar) { if (dropArea.parentElement !== slot) slot.appendChild(dropArea); }
      else if (dropArea.parentElement !== fileBody) fileBody.appendChild(dropArea);
      slot.style.display = wantInBar ? '' : 'none';
    }
    updateCompactMeta();
    schedulePlayheadRefresh(); // 幅が変わるのでグラフの再生ヘッドを置き直す
  };

  var applyPanelModeUi = function() {
    var { viewMode, panelMode, settingsMode, previewMode, notepadMode } = getState();
    var isOsu = (panelMode === 'osu');
    var s = settingsMode;
    var pv = previewMode;
    var setDisp = function(id, show) {
      var el = document.getElementById(id);
      if (el) el.style.display = show ? '' : 'none';
    };
    /* 左カラム（設定モード中のカードは隠す。カラム全体はプレビューで CSS が隠す） */
    setDisp('etb-card-meta',         !s);
    setDisp('etb-card-difforder',    !s && viewMode !== 'compact');
    setDisp('etb-card-file',         !s && !isOsu);
    setDisp('etb-card-viewsettings',  s);
    setDisp('etb-card-loadsettings',  s);
    /* 右カラム(設定)のプレビュータブ設定。カラムの表示/非表示は CSS が担う */
    setDisp('etb-card-previewsettings', s);
    applyViewModeUi();   // モード切替でドロップエリアの置き場所が変わる
    /* 設定を開いたら Diff表示チェックリストを現在の譜面で作り直す */
    if (s && window.__spreadRebuildDiffList) window.__spreadRebuildDiffList();
    /* 中央カラム（チェックリストの表示設定＋ツールの表示設定） */
    setDisp('etb-checklist-buttons-body',  !s);
    setDisp('etb-checklist-settings-body',  s);
    setDisp('etb-card-toolsettings',        s);
    /* 右カラム（チェック結果/プレビュー）は設定モード中のみ隠す */
    setDisp('electron-col-output',  !s);
    /* レイアウトのモードクラス（設定=50/50, プレビュー=スプレッド全面） */
    var layoutEl = document.getElementById('electron-layout');
    if (layoutEl) {
      layoutEl.classList.toggle('etb-settings', s);
      layoutEl.classList.toggle('etb-preview', pv);
      layoutEl.classList.toggle('etb-notepad', notepadMode);
    }
    notepad.setActive(notepadMode);
    /* スプレッド表示の描画ループ ON/OFF */
    if (window.__setSpreadActive) window.__setSpreadActive(pv);
    /* osu! モード以外・設定/プレビュー中は再生ヘッドを隠す */
    if (!isOsu || s || pv || notepadMode) hideAllPlayheads();
    else schedulePlayheadRefresh(); // チェック表示に戻ったら保持時刻で復帰
    /* チェックリストカードのタイトル切替 */
    var clT = document.getElementById('etb-title-checklist');
    if (clT) {
      var checklistKey = s ? 'electronChecklistDisplay' : 'electronChecklist';
      clT.setAttribute('data-i18n', checklistKey);
      clT.textContent = electronText(checklistKey);
    }
    /* チェック/プレビュー/設定ボタンのアクティブ表示（今どこを見ているか） */
    var sBtn = document.getElementById('toggleTabSettings');
    if (sBtn) sBtn.classList.toggle('active', s);
    var mBtn = document.getElementById('etb-tab-main');
    if (mBtn) mBtn.classList.toggle('active', !s && !pv && !notepadMode);
    var pvBtn = document.getElementById('etb-tab-preview');
    if (pvBtn) pvBtn.classList.toggle('active', pv);
    var npBtn = document.getElementById('etb-tab-notepad');
    if (npBtn) npBtn.classList.toggle('active', notepadMode);
  };
  return { applyPanel: applyPanelModeUi, applyView: applyViewModeUi, updateMetadata: updateCompactMeta };
}
