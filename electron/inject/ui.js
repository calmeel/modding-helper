      (function() {
        if (document.getElementById('electron-titlebar')) return;

        var appEl      = document.querySelector('.app');
        var topLinks   = appEl.querySelector('.top-links');
        var dropArea   = appEl.querySelector('.drop-area');
        var tabVis     = appEl.querySelector('.tab-visibility-settings');
        var tabsSec    = appEl.querySelector('.tabs');
        var tabButtons = tabsSec.querySelector('.tab-buttons');
        var tabPanels  = Array.from(tabsSec.querySelectorAll('.tab-panel'));

        /* ── 表示モード（ワイド / コンパクト） ──
           コンパクト: 左カラム（メタデータ/譜面ファイル）を出さず、
           チェックリストとチェック結果を画面いっぱいに広げる。代わりに上部の細いバーへ
           「Artist - Title (Creator)」を出し、file モードではドロップエリアもそこへ移す。
           ※ 設定ラジオの初期チェック(opt.mode === viewMode)より前で読む必要があるため、
             var の巻き上げ任せにせずここで確定させる。 */
        var playback = { lastTime: null, manualTime: null, dragging: false, audioPlaying: false };
        var getSpreadTime = function () {
          if (playback.manualTime != null) return playback.manualTime;
          return panelMode === 'osu' ? playback.lastTime : null;
        };

        var viewMode = 'wide';
        var tagDisplayMode = 'text';
        try {
          if (localStorage.getItem('moddingHelperViewMode') === 'compact') viewMode = 'compact';
          if (localStorage.getItem('moddingHelperTagDisplayMode') === 'buttons') tagDisplayMode = 'buttons';
        } catch (e) {}

        var electronText = function(key) {
          var lang = document.documentElement.lang === 'en' ? 'en' : 'ja';
          var dict = window.i18n || {};
          return (dict[lang] && dict[lang][key]) ||
            (dict.en && dict.en[key]) || key;
        };

        /* ── SVG アイコン定義 ── */
        var svgDetach = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';


        var titlebarController = createElectronTitlebar({ iconUrl: __etbIconUrl, version: __etbVersion, text: electronText });
        var titlebar = titlebarController.element;

        /* ── 3カラムレイアウト生成 ── */
        var layout = document.createElement('div');
        layout.id = 'electron-layout';

        var futureCol = document.createElement('div');
        futureCol.id = 'electron-col-future';
        var metadataCard = createElectronMetadataCard({
          text: electronText, getMode: function() { return panelMode; },
          getTagDisplayMode: function() { return tagDisplayMode; },
          onDataChanged: function(data) {
            lastMapMeta = data;
            if (typeof updateCompactMeta === 'function') updateCompactMeta();
          }
        });
        futureCol.appendChild(metadataCard.element);
        var metaHead = metadataCard.head;
        var mapActions = metadataCard.actions;
        var renderMapPanel = metadataCard.render;
        var refreshMapActionState = metadataCard.refreshActions;
        var setMapActionState = metadataCard.setActionState;
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
           緑のツールボタン群（音声波形/スペクトログラム/SR計算/BN評価）をここへ移す。
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
           音声波形/スペクトログラム/SR計算/BN評価 の表示トグルをここへ振り分ける。 */
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
            offsetWaveform: 1, spectrogram: 1, srCalculator: 1, timeline: 1, bnCompare: 1
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
           この時点で ui.js の復元処理は既に走っているので、保存設定で表示 ON に
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

        /* 緑のツールボタン群（音声波形/スペクトログラム/SR計算/BN評価）のタブグループを
           中央カラムの「ツール」カードへ丸ごと移す。bnCompare を目印にグループを特定する。
           タブ切替はイベント委譲（closest('.tab-button')）なので、置き場所が変わっても動く。
           .tab-group ごと移すので hidden-tab-group 等の既存ロジックもそのまま効く。 */
        try {
          var toolAnchorBtn = document.querySelector('.tab-button[data-tab="bnCompare"]');
          var toolGroupEl = toolAnchorBtn && toolAnchorBtn.closest('.tab-group');
          if (toolGroupEl) toolsBody.appendChild(toolGroupEl);
        } catch (e) { /* 失敗してもチェックリスト側に残るだけ */ }

        var preview = createElectronPreview({
          outBody, previewSettingsBody, viewSettingsBody, text: electronText, playback, getSpreadTime,
          getPanelMode: function() { return panelMode; },
          getViewMode: function() { return viewMode; }, setViewMode: function(mode) { viewMode = mode; },
          applyViewModeUi: function() { applyViewModeUi(); },
          getTagDisplayMode: function() { return tagDisplayMode; }, setTagDisplayMode: function(mode) { tagDisplayMode = mode; },
          redrawMetadata: function() { if (lastMapMeta) renderMapPanel(lastMapMeta); }
        });
        var ensureSpreadAudioCtx = preview.ensureAudioContext;

        setupElectronSpectrogram({
          text: electronText, ensureSpreadAudioCtx,
          getSeekEnabled: function() { return spectrogramSeekOn; },
          setSeekEnabled: function(enabled) { spectrogramSeekOn = enabled; },
          onSeekChanged: function() { if (typeof refreshPlayheads === 'function') refreshPlayheads(); }
        });

        /* Electron 既定: 保存設定がまだ無い初回のみ、web では既定 OFF の
           「音声波形」を ON にする（タイムラインは exe では非表示なので対象外。
           BN評価は既定 OFF にしたいので含めない）。
           （localStorage は web と exe で別管理。既存ユーザーの保存設定は尊重） */
        try {
          if (!localStorage.getItem('moddingHelperVisibleTabs')) {
            var defaultOnTabs = ['offsetWaveform', 'spectrogram'];
            var dispatchTarget = null;
            defaultOnTabs.forEach(function(tab) {
              var cb = document.querySelector('.tab-visibility-toggle[data-target-tab="' + tab + '"]');
              if (cb) {
                if (!dispatchTarget) dispatchTarget = cb;
                cb.checked = true;
              }
            });
            /* change を発火して ui.js 側の保存(applyTabVisibilitySettings 含む)を実行 */
            if (dispatchTarget) dispatchTarget.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch (e) {}

        /* 左パネルの動作モード: 'osu' = osu! メモリからリアルタイム表示 /
           'file' = 読み込んだファイルのメタデータを表示。
           初期値は保存済みのチェック対象設定に合わせる（app/main.js と一致させる）。 */
        var panelMode = 'file';
        try {
          if (localStorage.getItem('moddingHelperCheckSource') === 'osu') panelMode = 'osu';
        } catch (e) {}

        /* スプレッド表示の時刻ソース:
           - osu モードでは osu! の最新再生位置(playback.lastTime)に追従。
             前方予測は入れない（一時停止時に追い越して戻る現象を避けるため）。
           - ユーザーがスプレッド表示をドラッグ/ホイールでシークすると手動モード
             (playback.manualTime)になり、その位置を表示。
           - file モードでは osu! から届く時刻を参照しない。 */

        /* トップレベルの表示モード: チェック / プレビュー / メモ帳 / 設定。 */
        var settingsMode = false;
        var previewMode = false;
        var notepadMode = false;

        var notepad = createElectronNotepad({
          container: colsWrap, text: electronText, getSpreadTime,
          getPanelMode: function() { return panelMode; },
          getCurrentDiffFile: function() { return currentDiffFile; },
          getOsuTime: function() { return playback.lastTime; }
        });

        var spectrogramSeekOn = false;
        var currentDiffFile = null;
        var playheads = createElectronPlayheads({
          canShow: function() { return panelMode === 'osu' && !settingsMode && !previewMode && !notepadMode; },
          getCurrentDiffFile: function() { return currentDiffFile; },
          isSpectrogramSeekEnabled: function() { return spectrogramSeekOn; }
        });
        var updatePlayheads = playheads.update;
        var hideAllPlayheads = playheads.hide;
        var refreshPlayheads = playheads.refresh;
        var schedulePlayheadRefresh = playheads.scheduleRefresh;

        var updateWaitingText = metadataCard.updateWaitingText;
        updateWaitingText();

        /* カード表示の切替（panelMode と settingsMode を反映）:
           通常時   左→メタデータ/譜面ファイル, 中央→チェックリスト
           設定時   左→譜面読み込み設定,          中央→チェックリストの設定 */
        /* 表示モードの実装。値 viewMode 自体はもっと前で読み込んでいる
           （設定ラジオの初期チェックがこれより前で組まれるため）。 */
        var lastMapMeta = null;   // 直近に描画したメタデータ（バーの表示に使う）
        var updateCompactMeta = function() {
          var el = document.getElementById('etb-compact-meta');
          if (!el) return;
          var d = lastMapMeta;
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
        var clearMetaToWaiting = metadataCard.clear;
        applyPanelModeUi();

        /* 各グラフの右上に分離ボタンを設置（別ウィンドウで独立表示） */
        [
          { wrap: 'kiaiCompareChartWrap',       chart: 'kiaiCompareChart' },
          { wrap: 'volumeCompareChartWrap',     chart: 'volumeCompareChart' },
          { wrap: 'spreadDensityChartWrap',     chart: 'spreadDensityChart' },
          { wrap: 'spreadRestChartWrap',        chart: 'spreadRestChart' },
          { wrap: 'spreadScrollChartWrap',      chart: 'spreadScrollChart' },
          { wrap: 'spreadScrollDeltaChartWrap', chart: 'spreadScrollDeltaChart' },
          { wrap: 'offsetWaveformChartWrap',    chart: 'offsetWaveformCanvas' }
          /* スペクトログラムは分離しない: 音源の blob URL がメイン窓ローカルで、
             分離窓には渡せない（渡すと「音源を読み込んでください」になる）。 */
        ].forEach(function(item) {
          var wrap = document.getElementById(item.wrap);
          if (!wrap) return;
          if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
          var btn = document.createElement('button');
          btn.className = 'etb-chart-detach';
          btn.setAttribute('data-i18n-title', 'electronDetachWindow');
          btn.title = electronText('electronDetachWindow');
          btn.innerHTML = svgDetach;
          btn.addEventListener('click', function(ev) {
            ev.stopPropagation();
            var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
            if (window.electronAPI && window.electronAPI.detachChart) {
              window.electronAPI.detachChart(item.chart, isEn ? 'en' : 'ja');
            }
          });
          wrap.appendChild(btn);
        });

        /* ツールグループは「ツール」カードへ移設済み（DOM 挿入直後の処理を参照）。 */

        /* カードタイトルの言語対応 */
        var updatePanelTitles = function() {
          var set = function(id, key) {
            var el = document.getElementById(id);
            if (!el) return;
            el.setAttribute('data-i18n', key);
            el.textContent = electronText(key);
          };
          var setTitle = function(id, key) {
            var el = document.getElementById(id);
            if (!el) return;
            el.setAttribute('data-i18n-title', key);
            el.title = electronText(key);
          };
          set('etb-title-meta',            'electronMetadata');
          set('etb-title-file',            'electronBeatmapFile');
          set('etb-title-loadsettings',    'electronBeatmapLoading');
          set('etb-title-previewsettings', 'electronPreviewTab');
          set('etb-difforder-title',       'electronDiffOrder');
          set('etb-difforder-desc',        'electronHardToEasy');
          set('etb-difforder-asc',         'electronEasyToHard');
          set('etb-title-viewsettings',    'electronDisplayMode');
          set('etb-viewmode-wide',         'electronWide');
          set('etb-viewmode-compact',      'electronCompact');
          set('etb-tagdisplay-title',     'electronTagDisplay');
          set('etb-tagdisplay-text',      'electronTagDisplayText');
          set('etb-tagdisplay-buttons',   'electronTagDisplayButtons');
          set('etb-judgepos-title',        'electronJudgementLine');
          set('etb-judgepos-center',       'electronCenter');
          set('etb-judgepos-left',         'electronLeft');
          set('etb-diffvis-title',         'electronShownDiffs');
          set('etb-diffvis-none',          'electronNoBeatmapLoaded');
          set('etb-title-checklist',
              settingsMode ? 'electronChecklistDisplay' : 'electronChecklist');
          set('etb-title-results',       'electronCheckResults');
          set('etb-title-tools',         'electronTools');
          set('etb-title-toolsettings',  'electronToolDisplay');
          set('etb-tab-main',            'electronCheck');
          set('etb-tab-preview',         'electronPreview');
          set('etb-tab-notepad',         'electronNotepad');
          set('etb-tab-realtime',        'electronRealtime');
          set('toggleTabSettings',       'electronSettings');
          set('etb-spread-snap-text',    'electronBeatSnapDivisor');
          set('etb-spread-sfx-text',     'electronHitSounds');
          set('etb-preview-other-title', 'electronOtherSettings');
          set('etb-preview-kiai-text',   'electronHighlightKiai');
          set('etb-preview-nc-text',     'electronHighlightNcBarlines');
          set('etb-preview-timing-info-text', 'electronShowPreviewTimingInfo');
          set('etb-preview-transparent-sliders-text', 'electronTransparentSliders');
          set('etb-sfx-settings-title',  'electronHitSoundSet');
          set('etb-sfx-vol-label',       'electronHitSoundVolume');
          set('etb-music-vol-label',     'electronMusicVolume');
          set('etb-sfx-offset-label',    'electronHitSoundOffset');
          set('etb-sfx-none',            'electronNoSoundFolders');

          setTitle('etb-spread-meter', 'electronMeasureBeat');
          setTitle('etb-spread-snap2', 'electronSnapControlHint');
          setTitle('etb-sb-time',      'electronCopyTimeHint');
          setTitle('etb-sb-progress',  'electronSeekHint');
          setTitle('etb-sb-play',      'electronPlay');
          setTitle('etb-sb-pause',     'electronPause');
          setTitle('etb-sb-stop',      'electronStop');
          setTitle('etb-open-map-folder', 'electronOpenBeatmapFolder');
          setTitle('etb-open-map-page',   'electronOpenBeatmapPage');
          var mapFolderLabel = document.getElementById('etb-open-map-folder');
          var mapPageLabel = document.getElementById('etb-open-map-page');
          if (mapFolderLabel) mapFolderLabel.setAttribute('aria-label', electronText('electronOpenBeatmapFolder'));
          if (mapPageLabel) mapPageLabel.setAttribute('aria-label', electronText('electronOpenBeatmapPage'));

          document.querySelectorAll('.etb-chart-detach')
            .forEach(function(el) {
              el.setAttribute('data-i18n-title', 'electronDetachWindow');
              el.title = electronText('electronDetachWindow');
            });
          var zoomLabel = document.getElementById('etb-spread-zoomlabel');
          var testButton = document.getElementById('etb-sb-test');
          if (zoomLabel && testButton && testButton.classList.contains('active')) {
            zoomLabel.textContent = electronText('electronRealSpeed');
          }
        };
        updatePanelTitles();

        setupElectronNavigation({
          topLinks, text: electronText,
          selectView: function(mode) {
            settingsMode = mode === 'settings';
            previewMode = mode === 'preview';
            notepadMode = mode === 'notepad';
            applyPanelModeUi();
          },
          refreshView: applyPanelModeUi, refreshTitles: updatePanelTitles,
          onLanguageChanged: function() {
            updateWaitingText();
            updatePanelTitles();
            if (lastMapMeta) renderMapPanel(lastMapMeta);
          }
        });

        titlebarController.connect();
        if (window.electronAPI) {
          /* ── osu! タイミング情報 IPC（osu モードのみ反映） ── */
          var applyTimingInfo = function(data) {
            /* file モードでは、別の譜面を再生中の osu! の時刻を
               プレビューやグラフへ一切流さない。 */
            if (panelMode !== 'osu') return;

            /* プレビュー(スプレッド)の追従は data.editing のときのみ許可。
               editing = Edit 画面 または エディタのテストプレイ（osuWatcher.js が判定）。
               本番のゲームプレイ中は追従させない＝デュアルスクリーンでの先読みチート対策。
               ※リアルタイム表示の別ウィンドウはプレイ中も更新する。
               osu! の時刻が届いた＝再生/シークなので、ドラッグ中でなければ手動解除。 */
            if (data && typeof data.time === 'number' && data.time >= 0 && data.editing) {
              var prevOsuTime = playback.lastTime;
              playback.lastTime = data.time;
              /* osu! のタイムラインが動いた（シーク/再生）＝ osu! 側を操作した合図。
                 その場合は自前の音楽再生を止めて osu! 追従に戻す。
                 osu! は一時停止中も同じ時刻を送り続けるので、前回と時刻が変化した
                 ときだけ発火させる（一時停止中のスタンドアロン再生は止めない）。 */
              if (playback.audioPlaying && prevOsuTime != null &&
                  Math.abs(data.time - prevOsuTime) > 2) {
                preview.pauseMusic(); // 'pause' で playback.audioPlaying=false
              }
              /* ドラッグ中・（止めなかった）音楽再生中は手動位置を維持 */
              if (!playback.dragging && !playback.audioPlaying) playback.manualTime = null;
            } else {
              playback.lastTime = null;
            }
            /* グラフ上の再生ヘッドを更新（時刻が無ければ -1 で非表示） */
            updatePlayheads(data && typeof data.time === 'number' ? data.time : -1);
          };

          /* PowerShell側は低遅延のため約125Hzで時刻を送る。IPCごとにDOM・グラフを
             更新せず、最新値だけを次の描画フレームへ渡して最大1回に集約する。 */
          var pendingTimingInfo = null;
          var pendingTimingInfoSet = false;
          var timingInfoRaf = null;
          window.electronAPI.onTimingInfo(function(data) {
            if (panelMode !== 'osu') return;
            pendingTimingInfo = data;
            pendingTimingInfoSet = true;
            if (timingInfoRaf != null) return;
            timingInfoRaf = requestAnimationFrame(function() {
              timingInfoRaf = null;
              if (!pendingTimingInfoSet) return;
              var latest = pendingTimingInfo;
              pendingTimingInfoSet = false;
              pendingTimingInfo = null;
              applyTimingInfo(latest);
            });
          });

          /* ── osu! マップ情報 IPC（osu モードのみ反映） ── */
          window.electronAPI.onOsuMapInfo(function(data) {
            /* osu! 側の譜面変更・終了時にボタンの可否も更新する。 */
            refreshMapActionState();
            if (panelMode !== 'osu') return;
            currentDiffFile = data && data.diffFileName ? data.diffFileName : null;
            renderMapPanel(data);
          });

        /* ── app/main.js から呼ぶパネル制御 API ── */
          window.__osuPanel = {
            setMode: function(mode) {
              panelMode = (mode === 'file') ? 'file' : 'osu';
              setMapActionState(null);
              refreshMapActionState();
              if (panelMode === 'file') {
                /* osu モードの最後の位置を残さず、以降の IPC 追従も止める。 */
                playback.lastTime = null;
                currentDiffFile = null;
                updatePlayheads(-1);
              }
              applyPanelModeUi();
              clearMetaToWaiting();
              /* osu! モードに切り替えた時は、既に開いている譜面の情報を要求する。
                 監視側は譜面が変わった時しか送らないので、これが無いと
                 osu! 側で何か操作するまで空欄のままになる。 */
              if (panelMode === 'osu' && window.electronAPI && window.electronAPI.requestMapInfo) {
                window.electronAPI.requestMapInfo();
              }
            },
            renderFileMeta: function(data) {
              if (panelMode !== 'file') return;
              if (!data) { clearMetaToWaiting(); }
              else { renderMapPanel(data); }
              window.electronAPI.sendMapMetaToPopout(data);
              refreshMapActionState();
            }
          };
        }

        /* ── Electron 専用: メタデータ表示・タグ一覧表示セクションを非表示 ── */
        (function() {
          var targetTitles = ['メタデータ表示', 'Metadata field view', 'タグ一覧表示', 'Tag token view'];

          var hideFirstSection = function(containerEl) {
            var firstH3 = containerEl.querySelector('h3.result-section-title');
            if (!firstH3) return;
            if (targetTitles.indexOf(firstH3.textContent.trim()) === -1) return;

            var node = containerEl.firstChild;
            var pastSeparator = false;
            while (node) {
              var next = node.nextSibling;
              if (!pastSeparator) {
                if (node.nodeType === 1) {
                  node.style.display = 'none';
                  if (node.classList.contains('result-separator-line')) pastSeparator = true;
                } else if (node.nodeType === 3) {
                  node.textContent = '';
                }
              } else {
                /* セパレーター直後のテキストノード（改行）も除去 */
                if (node.nodeType === 3) node.textContent = '';
                else break;
              }
              node = next;
            }
          };

          ['artistOutput', 'titleOutput', 'sourceOutput', 'tagOutput'].forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            new MutationObserver(function() { hideFirstSection(el); })
              .observe(el, { childList: true });
          });
        })();

        /* Web 側の初回 applyLanguage() より後に追加した Electron 専用 DOM に、
           保存済みの現在言語を適用する。 */
        if (typeof window.applyModdingHelperLanguage === 'function') {
          window.applyModdingHelperLanguage();
        }
      })();
