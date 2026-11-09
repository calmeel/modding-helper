// Electronのカード構築と既存タブ・設定要素の移設。表示状態は呼び出し側が管理する。
function createElectronLayout({ appEl, titlebar, dropArea, text: electronText,
  getPanelMode, getTagDisplayMode, onMetadataChanged }) {
  var tabVis     = appEl.querySelector('.tab-visibility-settings');
  var tabsSec    = appEl.querySelector('.tabs');
  var tabButtons = tabsSec.querySelector('.tab-buttons');
  var tabPanels  = Array.from(tabsSec.querySelectorAll('.tab-panel'));

  /* ── 3カラムレイアウト生成 ── */
  var layout = document.createElement('div');
  layout.id = 'electron-layout';

  var futureCol = document.createElement('div');
  futureCol.id = 'electron-col-future';
  var metadataCard = createElectronMetadataCard({
    text: electronText, getMode: getPanelMode,
    getTagDisplayMode: getTagDisplayMode,
    onDataChanged: onMetadataChanged
  });
  futureCol.appendChild(metadataCard.element);
  var diffOrderCard = createElectronDiffOrderCard(electronText);
  futureCol.appendChild(diffOrderCard.element);

  /* 譜面ファイルカード（file モードのみ表示。ドロップエリアを内包） */
  var fileCard = document.createElement('div');
  fileCard.className = 'etb-card';
  fileCard.id = 'etb-card-file';
  fileCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-file">' +
    electronText('electronBeatmapFile') + '</span></div>';
  var fileBody = document.createElement('div');
  fileBody.className = 'etb-card-body';
  fileBody.appendChild(dropArea);
  fileCard.appendChild(fileBody);
  futureCol.appendChild(fileCard);

  /* 表示モード設定カード（設定モード時のみ表示。ワイド/コンパクトの切替） */
  var viewSettingsCard = document.createElement('div');
  viewSettingsCard.className = 'etb-card';
  viewSettingsCard.id = 'etb-card-viewsettings';
  viewSettingsCard.style.display = 'none';
  viewSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-viewsettings">' +
    electronText('electronDisplayMode') + '</span></div>';
  var viewSettingsBody = document.createElement('div');
  viewSettingsBody.className = 'etb-card-body';
  viewSettingsCard.appendChild(viewSettingsBody);
  futureCol.appendChild(viewSettingsCard);

  /* 譜面読み込み設定カード（設定モード時のみ表示。チェック対象選択を内包） */
  var loadSettingsCard = document.createElement('div');
  loadSettingsCard.className = 'etb-card';
  loadSettingsCard.id = 'etb-card-loadsettings';
  loadSettingsCard.style.display = 'none';
  loadSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-loadsettings">' +
    electronText('electronBeatmapLoading') + '</span></div>';
  var loadSettingsBody = document.createElement('div');
  loadSettingsBody.className = 'etb-card-body';
  loadSettingsCard.appendChild(loadSettingsBody);
  futureCol.appendChild(loadSettingsCard);

  /* プレビュータブ設定カード（設定モード時のみ表示。効果音・音量を内包） */
  var previewSettingsCard = document.createElement('div');
  previewSettingsCard.className = 'etb-card';
  previewSettingsCard.id = 'etb-card-previewsettings';
  previewSettingsCard.style.display = 'none';
  previewSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-previewsettings">' +
    electronText('electronPreviewTab') + '</span></div>';
  var previewSettingsBody = document.createElement('div');
  previewSettingsBody.className = 'etb-card-body';
  previewSettingsCard.appendChild(previewSettingsBody);
  /* 設定モードの右カラム（プレビュータブ設定を単独で置く）。設定以外は CSS で隠す。 */
  var settingsRightCol = document.createElement('div');
  settingsRightCol.id = 'electron-col-settings-right';
  settingsRightCol.appendChild(previewSettingsCard);

  /* チェックリストカード */
  var tabsCol = document.createElement('div');
  tabsCol.id = 'electron-col-tabs';
  tabsCol.className = 'etb-card';
  var tabsHead = document.createElement('div');
  tabsHead.className = 'etb-card-head';
  tabsHead.innerHTML = '<span class="etb-card-title" id="etb-title-checklist">' +
    electronText('electronChecklist') + '</span>';
  var tabsBody = document.createElement('div');
  tabsBody.className = 'etb-card-body';
  tabsBody.id = 'etb-checklist-buttons-body';
  tabsBody.appendChild(tabButtons);
  /* 設定モード時に表示する「チェックリストの設定」ボディ（表示トグルを内包） */
  var tabsSettingsBody = document.createElement('div');
  tabsSettingsBody.className = 'etb-card-body';
  tabsSettingsBody.id = 'etb-checklist-settings-body';
  tabsSettingsBody.style.display = 'none';
  tabsCol.appendChild(tabsHead);
  tabsCol.appendChild(tabsBody);
  tabsCol.appendChild(tabsSettingsBody);

  /* ツールカード（中央カラム・チェックリストの下）。
     緑のツールボタン群（音声波形/スペクトログラム/BN評価）をここへ移す。
     中身のタブグループは DOM 挿入後（タイムライン除去の後）に移設する。 */
  var toolsCard = document.createElement('div');
  toolsCard.className = 'etb-card';
  toolsCard.id = 'etb-card-tools';
  var toolsHead = document.createElement('div');
  toolsHead.className = 'etb-card-head';
  toolsHead.innerHTML = '<span class="etb-card-title" id="etb-title-tools">' +
    electronText('electronTools') + '</span>';
  var toolsBody = document.createElement('div');
  toolsBody.className = 'etb-card-body';
  toolsBody.id = 'etb-tools-body';
  toolsCard.appendChild(toolsHead);
  toolsCard.appendChild(toolsBody);

  /* ツールの表示設定カード（設定モード時のみ表示。中央カラム・チェックリストの表示設定の下）。
     音声波形/スペクトログラム/BN評価 の表示トグルをここへ振り分ける。 */
  var toolsSettingsCard = document.createElement('div');
  toolsSettingsCard.className = 'etb-card';
  toolsSettingsCard.id = 'etb-card-toolsettings';
  toolsSettingsCard.style.display = 'none';
  toolsSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-toolsettings">' +
    electronText('electronToolDisplay') + '</span></div>';
  var toolsSettingsBody = document.createElement('div');
  toolsSettingsBody.className = 'etb-card-body';
  toolsSettingsBody.id = 'etb-toolsettings-body';
  toolsSettingsCard.appendChild(toolsSettingsBody);

  /* 中央カラム: チェックリスト（表示設定）カード＋ツールカード＋ツール表示設定カードを縦積み。 */
  var centerCol = document.createElement('div');
  centerCol.id = 'electron-col-center';
  centerCol.appendChild(tabsCol);
  centerCol.appendChild(toolsCard);
  centerCol.appendChild(toolsSettingsCard);

  /* チェック結果カード */
  var outputCol = document.createElement('div');
  outputCol.id = 'electron-col-output';
  outputCol.className = 'etb-card';
  var outHead = document.createElement('div');
  outHead.className = 'etb-card-head';
  outHead.innerHTML = '<span class="etb-card-title" id="etb-title-results">' +
    electronText('electronCheckResults') + '</span>';
  var outBody = document.createElement('div');
  outBody.className = 'etb-card-body';
  outBody.appendChild(tabVis);
  tabPanels.forEach(function(p) { outBody.appendChild(p); });
  outputCol.appendChild(outHead);
  outputCol.appendChild(outBody);

  /* コンパクトモード用の細い情報バー（カードの上に1行）。
     「Artist - Title (Creator)」を表示し、file モードではドロップエリアも入る。
     ワイドモードでは CSS で非表示。 */
  var compactBar = document.createElement('div');
  compactBar.id = 'etb-compact-bar';
  compactBar.innerHTML =
    '<span id="etb-compact-meta"></span>' +
    '<span id="etb-compact-drop" style="display:none"></span>';

  /* 3カラムは row 用のラッパーに入れる（バーを上に積むため layout は column）。
     既存 CSS は #electron-layout の子孫セレクタなのでラッパーを挟んでも効く。 */
  var colsWrap = document.createElement('div');
  colsWrap.id = 'etb-cols';
  colsWrap.appendChild(futureCol);
  colsWrap.appendChild(centerCol);
  colsWrap.appendChild(outputCol);
  colsWrap.appendChild(settingsRightCol);

  layout.appendChild(compactBar);
  layout.appendChild(colsWrap);

  /* ── DOM に挿入 ── */
  appEl.insertBefore(titlebar, appEl.firstChild);
  appEl.appendChild(layout);
  tabsSec.remove();

  /* 設定項目を各カードへ移設:
     - チェック対象選択(#osuSourceSettings) → 譜面読み込み設定カード
     - タブ表示トグル(チェックボックス各 label) → チェックリスト設定ボディ
     移動後、空になった旧設定パネルは隠す */
  var osuSrcEl = document.getElementById('osuSourceSettings');
  if (osuSrcEl) { osuSrcEl.hidden = false; loadSettingsBody.appendChild(osuSrcEl); }
  var tabSettingsPanelEl = document.getElementById('tabSettingsPanel');
  if (tabSettingsPanelEl) {
    /* ツール系タブの表示トグルは「ツールの表示設定」カードへ、
       それ以外は「チェックリストの表示設定」へ振り分ける。 */
    var toolToggleTabs = {
      offsetWaveform: 1, spectrogram: 1, timeline: 1, bnCompare: 1
    };
    Array.prototype.slice.call(tabSettingsPanelEl.querySelectorAll('label')).forEach(function(lb) {
      var inp = lb.querySelector('.tab-visibility-toggle');
      var tab = inp && inp.getAttribute('data-target-tab');
      if (tab && toolToggleTabs[tab]) toolsSettingsBody.appendChild(lb);
      else tabsSettingsBody.appendChild(lb);
    });
  }
  var tabVisEl = document.querySelector('.tab-visibility-settings');
  if (tabVisEl) tabVisEl.style.display = 'none';

  /* exe では「タイムライン」タブを完全に出さない（web ツール側はそのまま）。
     設定のチェックボックスとタブボタンを DOM から取り除き、パネルは隠したままにする。
     パネル自体を消さないのは、チェック処理が結果を書き込む先だから（消すと落ちる）。
     この時点で app/ui/setup.js の復元処理は既に走っているので、保存設定で表示 ON に
     なっていた場合に備えて hidden-tab を明示的に付け直す。 */
  try {
    var tlToggle = document.querySelector('.tab-visibility-toggle[data-target-tab="timeline"]');
    if (tlToggle) {
      var tlLabel = tlToggle.closest('label');
      (tlLabel || tlToggle).remove();
    }
    Array.prototype.slice.call(document.querySelectorAll('.tab-button[data-tab="timeline"]'))
      .forEach(function(b) { b.remove(); });
    var tlPanel = document.getElementById('tab-timeline');
    if (tlPanel) {
      tlPanel.classList.add('hidden-tab');
      tlPanel.classList.remove('active');
    }
    /* タブが消えた分、グループの折り畳みと「現在のタブ」を作り直す */
    if (typeof applyTabVisibilitySettings === 'function') applyTabVisibilitySettings();
  } catch (e) { /* 失敗しても他のUIは動かす */ }

  /* 緑のツールボタン群（音声波形/スペクトログラム/BN評価）のタブグループを
     中央カラムの「ツール」カードへ丸ごと移す。bnCompare を目印にグループを特定する。
     タブ切替はイベント委譲（closest('.tab-button')）なので、置き場所が変わっても動く。
     .tab-group ごと移すので hidden-tab-group 等の既存ロジックもそのまま効く。 */
  try {
    var toolAnchorBtn = document.querySelector('.tab-button[data-tab="bnCompare"]');
    var toolGroupEl = toolAnchorBtn && toolAnchorBtn.closest('.tab-group');
    if (toolGroupEl) toolsBody.appendChild(toolGroupEl);
  } catch (e) { /* 失敗してもチェックリスト側に残るだけ */ }

  return { metadataCard, diffOrderCard, outBody, previewSettingsBody, viewSettingsBody,
    colsWrap, compactBar, fileBody };
}
