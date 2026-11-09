      (function() {
        if (document.getElementById('electron-titlebar')) return;

        var appEl      = document.querySelector('.app');
        var topLinks   = appEl.querySelector('.top-links');
        var dropArea   = appEl.querySelector('.drop-area');
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

        var desktopLayout = createElectronLayout({
          appEl, titlebar, dropArea, text: electronText,
          getPanelMode: function() { return panelMode; },
          getTagDisplayMode: function() { return tagDisplayMode; },
          onMetadataChanged: function(data) {
            lastMapMeta = data;
            if (typeof updateCompactMeta === 'function') updateCompactMeta();
          }
        });
        var metadataCard = desktopLayout.metadataCard;
        var diffOrderCard = desktopLayout.diffOrderCard;
        var renderMapPanel = metadataCard.render;
        var refreshMapActionState = metadataCard.refreshActions;
        var setMapActionState = metadataCard.setActionState;
        var outBody = desktopLayout.outBody;
        var previewSettingsBody = desktopLayout.previewSettingsBody;
        var viewSettingsBody = desktopLayout.viewSettingsBody;
        var colsWrap = desktopLayout.colsWrap;

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

        var lastMapMeta = null;
        var displayModes = createElectronDisplayModes({
          text: electronText, layout: desktopLayout, dropArea, metadataCard, diffOrderCard, notepad,
          getState: function() { return { viewMode, panelMode, settingsMode, previewMode, notepadMode }; },
          getMetadata: function() { return lastMapMeta; },
          hideAllPlayheads, schedulePlayheadRefresh
        });
        var updateCompactMeta = displayModes.updateMetadata;
        var applyViewModeUi = displayModes.applyView;
        var applyPanelModeUi = displayModes.applyPanel;
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
