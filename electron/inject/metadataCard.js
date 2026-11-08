// Electronのメタデータカード。タグ操作と譜面操作ボタンの状態を所有する。
function createElectronMetadataCard({ text, getMode, getTagDisplayMode, onDataChanged }) {
  var electronText = text;
  var svgFolder = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></svg>';
  var svgExternal = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>';
  function escapePanelText(value) {
    var el = document.createElement('span');
    el.textContent = String(value == null ? '' : value);
    return el.innerHTML;
  }

  var container = document.createElement('div');
  container.innerHTML =
    /* メタデータカード */
    '<div class="etb-card" id="etb-card-meta">' +
      '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-meta">' +
        electronText('electronMetadata') + '</span></div>' +
      '<div class="etb-card-body" id="etb-meta-body">' +
        '<div id="osu-map-panel">' +
          '<div id="osu-map-bg-wrap" style="display:none"><img id="osu-map-bg" src="" alt=""></div>' +
          '<div id="osu-map-meta"><div id="osu-map-waiting"></div></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  var card = container.firstElementChild;
  function get(id) { return card.querySelector('#' + id); }

  /* 譜面操作はメタデータ見出しの右端にアイコンのみで配置する。 */
  var mapActions = document.createElement('div');
  mapActions.id = 'etb-map-actions';
  mapActions.innerHTML =
    '<button class="etb-map-action" id="etb-open-map-folder" type="button" disabled ' +
      'data-i18n-title="electronOpenBeatmapFolder" title="' + electronText('electronOpenBeatmapFolder') + '" ' +
      'aria-label="' + electronText('electronOpenBeatmapFolder') + '">' + svgFolder +
      '</button>' +
    '<button class="etb-map-action" id="etb-open-map-page" type="button" disabled ' +
      'data-i18n-title="electronOpenBeatmapPage" title="' + electronText('electronOpenBeatmapPage') + '" ' +
      'aria-label="' + electronText('electronOpenBeatmapPage') + '">' + svgExternal +
      '</button>';
  var metaHead = card.querySelector('.etb-card-head');
  metaHead.appendChild(mapActions);

  /* Tags のチェック状態（タグ文字列→true）。譜面切替でリセットする。 */
  var tagChecked = Object.create(null);
  var lastRenderedTags = null;
  var applyTagChecked = function() {
    var meta = get('osu-map-meta');
    if (!meta) return;
    var chips = meta.querySelectorAll('.osu-tag-chip');
    for (var i = 0; i < chips.length; i++) {
      if (tagChecked[chips[i].textContent]) chips[i].classList.add('checked');
      else chips[i].classList.remove('checked');
    }
  };

  /* 待機テキスト（言語・モード対応） */
  var updateWaitingText = function() {
    var w = get('osu-map-waiting');
    if (!w) return;
    w.innerHTML = electronText(getMode() === 'file'
      ? 'electronFileMetaWaiting'
      : 'electronOsuMetaWaiting');
  };
  updateWaitingText();

  var clearMetaToWaiting = function() {
    onDataChanged(null);
    var meta = get('osu-map-meta');
    if (meta) { meta.innerHTML = '<div id="osu-map-waiting"></div>'; updateWaitingText(); }
    var bgw = get('osu-map-bg-wrap');
    if (bgw) bgw.style.display = 'none';
    var bg = get('osu-map-bg');
    if (bg) bg.src = '';
  };
  /* メタデータ行をパネルに描画（osu! / file 両モードで共用） */
  var renderMapPanel = function(data) {
    var bg   = get('osu-map-bg');
    var meta = get('osu-map-meta');
    if (!meta) return;
    onDataChanged(data);
    if (!data) { clearMetaToWaiting(); return; }
    if (bg) bg.src = data.bgDataUrl || '';
    get('osu-map-bg-wrap').style.display = data.bgDataUrl ? '' : 'none';
    var noneText = electronText('none');
    var row = function(label, value, cls, alwaysShow) {
      if (!value && !alwaysShow) return '';
      var isEmpty = !value;
      var displayCls = isEmpty ? 'none' : (cls || '');
      var displayVal = escapePanelText(isEmpty ? noneText : value);
      return '<div class="osu-map-row">' +
        '<span class="osu-map-label">' + label + '</span>' +
        '<span class="osu-map-value ' + displayCls + '">' + displayVal + '</span>' +
        '</div>';
    };
    var tagsHtml = (function() {
      if (!data.tags) {
        return '<div class="osu-map-row">' +
          '<span class="osu-map-label">Tags</span>' +
          '<span class="osu-map-value none">' + noneText + '</span>' +
          '</div>';
      }
      if (getTagDisplayMode() === 'text') {
        return row('Tags', data.tags, 'osu-tags-text');
      }
      var chipTitle = electronText('electronTagHint');
      var chips = data.tags.split(' ').filter(function(t) { return t; })
        .map(function(t) { return '<span class="osu-tag-chip" title="' + chipTitle + '">' + escapePanelText(t) + '</span>'; })
        .join('');
      return '<div class="osu-map-row"><span class="osu-map-label">Tags</span>' +
        '<div id="osu-map-tags">' + chips + '</div></div>';
    })();
    meta.innerHTML =
      row('Artist (Unicode)', data.artistUnicode, 'unicode') +
      row('Artist',           data.artist)                   +
      row('Title (Unicode)',  data.titleUnicode,  'unicode') +
      row('Title',            data.title)                    +
      row('Creator',          data.creator, '', true)        +
      row('Source',           data.source, 'source', true)   +
      tagsHtml;
    /* 譜面(タグ)が変わったらチェック状態をリセット。同一譜面なら維持して再適用 */
    var tagsKey = data.tags || '';
    if (tagsKey !== lastRenderedTags) { tagChecked = Object.create(null); lastRenderedTags = tagsKey; }
    applyTagChecked();
  };

  /* TAGS チップのクリックで色付けトグル（全タグを確認する際のチェックオフ用）。
     チップは再描画で作り直されるため #osu-map-meta にイベント委譲する */
  var metaForTags = get('osu-map-meta');
  if (metaForTags) {
    /* タグチップ: クリックで色トグル（確認チェック用） */
    metaForTags.addEventListener('click', function(e) {
      var chip = e.target && e.target.closest ? e.target.closest('.osu-tag-chip') : null;
      if (!chip) return;
      chip.classList.toggle('checked');
      var tag = chip.textContent;
      if (chip.classList.contains('checked')) tagChecked[tag] = true;
      else delete tagChecked[tag];
    });
    /* タグチップ: ダブルクリックでそのタグをクリップボードへコピー */
    metaForTags.addEventListener('dblclick', function(e) {
      var chip = e.target && e.target.closest ? e.target.closest('.osu-tag-chip') : null;
      if (!chip) return;
      var txt = chip.textContent;
      if (txt && window.electronAPI && window.electronAPI.copyText) {
        window.electronAPI.copyText(txt);
        chip.classList.add('copied');
        setTimeout(function() { chip.classList.remove('copied'); }, 600);
      }
    });
  }

  /* 読み込みモードに応じた譜面のタイトルバー操作 */
  var mapFolderButton = get('etb-open-map-folder');
  var mapPageButton = get('etb-open-map-page');
  var mapActionRefreshId = 0;
  var setMapActionState = function(state) {
    if (mapFolderButton) mapFolderButton.disabled = !(state && state.canOpenFolder);
    if (mapPageButton) mapPageButton.disabled = !(state && state.canOpenBeatmapPage);
  };
  var refreshMapActionState = function() {
    var refreshId = ++mapActionRefreshId;
    if (!window.electronAPI || typeof window.electronAPI.getCurrentMapActions !== 'function') {
      setMapActionState(null);
      return;
    }
    window.electronAPI.getCurrentMapActions().then(function(state) {
      if (refreshId === mapActionRefreshId) setMapActionState(state);
    }).catch(function() {
      if (refreshId === mapActionRefreshId) setMapActionState(null);
    });
  };
  if (mapFolderButton) mapFolderButton.addEventListener('click', function() {
    if (!window.electronAPI || typeof window.electronAPI.openCurrentMapFolder !== 'function') return;
    window.electronAPI.openCurrentMapFolder().then(function(ok) {
      if (!ok) refreshMapActionState();
    }).catch(refreshMapActionState);
  });
  if (mapPageButton) mapPageButton.addEventListener('click', function() {
    if (!window.electronAPI || typeof window.electronAPI.openCurrentBeatmapPage !== 'function') return;
    window.electronAPI.openCurrentBeatmapPage().then(function(ok) {
      if (!ok) refreshMapActionState();
    }).catch(refreshMapActionState);
  });
  refreshMapActionState();

  return { element: card, head: metaHead, actions: mapActions, render: renderMapPanel,
    clear: clearMetaToWaiting, updateWaitingText, refreshActions: refreshMapActionState,
    setActionState: setMapActionState };
}
