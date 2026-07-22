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
           コンパクト: 左カラム（メタデータ/リアルタイム/譜面ファイル）を出さず、
           チェックリストとチェック結果を画面いっぱいに広げる。代わりに上部の細いバーへ
           「Artist - Title (Creator)」を出し、file モードではドロップエリアもそこへ移す。
           ※ 設定ラジオの初期チェック(opt.mode === viewMode)より前で読む必要があるため、
             var の巻き上げ任せにせずここで確定させる。 */
        var viewMode = 'wide';
        try {
          if (localStorage.getItem('moddingHelperViewMode') === 'compact') viewMode = 'compact';
        } catch (e) {}

        /* ── SVG アイコン定義 ── */
        var svgBook = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
        var svgMin  = '<svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor"><rect x="0" y="5.25" width="12" height="1.5" rx="0.5"/></svg>';
        var svgMax  = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="0.6" y="0.6" width="10.8" height="10.8" rx="0.5"/></svg>';
        var svgRes  = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="0.6" width="8.4" height="8.4" rx="0.5"/><path d="M0.6 3.5v7.4a.5.5 0 0 0 .5.5h7.4"/></svg>';
        var svgX    = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="1.5" y1="1.5" x2="10.5" y2="10.5"/><line x1="10.5" y1="1.5" x2="1.5" y2="10.5"/></svg>';
        var svgDetach = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

        /* ── タイトルバー生成 ── */
        var titlebar = document.createElement('div');
        titlebar.id = 'electron-titlebar';
        titlebar.innerHTML =
          '<div id="etb-brand">' +
            '<img id="etb-icon" src="' + __etbIconUrl + '" alt="">' +
            '<span id="etb-title">osu!taiko Modding Helper<span id="etb-title-suffix"> for Desktop</span></span>' +
            '<span id="etb-badge">v' + __etbVersion + '</span>' +
          '</div>' +
          '<div id="etb-vsep"></div>' +
          '<div id="etb-nav"></div>' +
          '<div id="etb-spacer"></div>' +
          '<div id="etb-controls">' +
            '<button class="etb-ctrl" id="etb-min">' + svgMin + '</button>' +
            '<button class="etb-ctrl" id="etb-max">' + svgMax + '</button>' +
            '<button class="etb-ctrl" id="etb-close">' + svgX + '</button>' +
          '</div>';

        /* ── 3カラムレイアウト生成 ── */
        var layout = document.createElement('div');
        layout.id = 'electron-layout';

        var futureCol = document.createElement('div');
        futureCol.id = 'electron-col-future';
        futureCol.innerHTML =
          /* メタデータカード */
          '<div class="etb-card" id="etb-card-meta">' +
            '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-meta">メタデータ</span>' +
              '<button class="etb-detach-btn" data-panel="metadata" title="別ウィンドウに分離">' + svgDetach + '</button></div>' +
            '<div class="etb-card-body" id="etb-meta-body">' +
              '<div id="osu-map-panel">' +
                '<div id="osu-map-bg-wrap" style="display:none"><img id="osu-map-bg" src="" alt=""></div>' +
                '<div id="osu-map-meta"><div id="osu-map-waiting"></div></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          /* リアルタイム表示カード（osu! モードのみ表示） */
          '<div class="etb-card" id="etb-card-realtime">' +
            '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-realtime">リアルタイム表示</span>' +
              '<button class="etb-detach-btn" data-panel="timing" title="別ウィンドウに分離">' + svgDetach + '</button></div>' +
            '<div class="etb-card-body" id="osu-timing-panel">' +
              '<div class="osu-timing-row"><span class="osu-timing-label">Timing</span><span class="osu-timing-value" id="osu-t-timing">--:--:---</span></div>' +
              '<div class="osu-timing-row"><span class="osu-timing-label">BPM</span><span class="osu-timing-value" id="osu-t-bpm">---</span></div>' +
              '<div class="osu-timing-row"><span class="osu-timing-label">SV</span><span class="osu-timing-value" id="osu-t-sv">---</span></div>' +
              '<div class="osu-timing-row"><span class="osu-timing-label" id="osu-t-vbpm-label">見た目 BPM</span><span class="osu-timing-value" id="osu-t-vbpm">---</span></div>' +
              '<div class="osu-timing-row"><span class="osu-timing-label">Volume</span><span class="osu-timing-value" id="osu-t-vol">---</span></div>' +
            '</div>' +
          '</div>';

        /* 譜面ファイルカード（file モードのみ表示。ドロップエリアを内包） */
        var fileCard = document.createElement('div');
        fileCard.className = 'etb-card';
        fileCard.id = 'etb-card-file';
        fileCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-file">譜面ファイル</span></div>';
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
        viewSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-viewsettings">表示モード</span></div>';
        var viewSettingsBody = document.createElement('div');
        viewSettingsBody.className = 'etb-card-body';
        viewSettingsCard.appendChild(viewSettingsBody);
        futureCol.appendChild(viewSettingsCard);

        /* 譜面読み込み設定カード（設定モード時のみ表示。チェック対象選択を内包） */
        var loadSettingsCard = document.createElement('div');
        loadSettingsCard.className = 'etb-card';
        loadSettingsCard.id = 'etb-card-loadsettings';
        loadSettingsCard.style.display = 'none';
        loadSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-loadsettings">譜面読み込み設定</span></div>';
        var loadSettingsBody = document.createElement('div');
        loadSettingsBody.className = 'etb-card-body';
        loadSettingsCard.appendChild(loadSettingsBody);
        futureCol.appendChild(loadSettingsCard);

        /* プレビュータブ設定カード（設定モード時のみ表示。効果音・音量を内包） */
        var previewSettingsCard = document.createElement('div');
        previewSettingsCard.className = 'etb-card';
        previewSettingsCard.id = 'etb-card-previewsettings';
        previewSettingsCard.style.display = 'none';
        previewSettingsCard.innerHTML = '<div class="etb-card-head"><span class="etb-card-title" id="etb-title-previewsettings">プレビュータブ設定</span></div>';
        var previewSettingsBody = document.createElement('div');
        previewSettingsBody.className = 'etb-card-body';
        previewSettingsCard.appendChild(previewSettingsBody);
        futureCol.appendChild(previewSettingsCard);

        /* チェックリストカード */
        var tabsCol = document.createElement('div');
        tabsCol.id = 'electron-col-tabs';
        tabsCol.className = 'etb-card';
        var tabsHead = document.createElement('div');
        tabsHead.className = 'etb-card-head';
        tabsHead.innerHTML = '<span class="etb-card-title" id="etb-title-checklist">チェックリスト</span>';
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

        /* チェック結果カード */
        var outputCol = document.createElement('div');
        outputCol.id = 'electron-col-output';
        outputCol.className = 'etb-card';
        var outHead = document.createElement('div');
        outHead.className = 'etb-card-head';
        outHead.innerHTML = '<span class="etb-card-title" id="etb-title-results">チェック結果</span>';
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
        colsWrap.appendChild(tabsCol);
        colsWrap.appendChild(outputCol);

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
          Array.prototype.slice.call(tabSettingsPanelEl.querySelectorAll('label')).forEach(function(lb) {
            tabsSettingsBody.appendChild(lb);
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

        /* ── スプレッド表示タブ（exe 限定）──
           全難易度のノーツを等速(SV無視)で右→左に流し、osu! 再生に同期する。 */
        if (window.drawTaikoSpread && window.parseTaikoNotes) {
          /* スプレッド表示は「プレビュー」トップタブ専用。サブタブではなく
             プレビュー時のみ CSS で表示し、spPreviewOn で描画ループを回す。 */
          var spPreviewOn = false;

          var spPanel = document.createElement('section');
          spPanel.className = 'tab-panel';
          spPanel.id = 'tab-spreadPlay';

          /* ツールバー: スナップ選択 + ズーム(+/-) */
          var spBar = document.createElement('div');
          spBar.className = 'etb-spread-toolbar';
          spBar.innerHTML =
            /* 左: ズーム(+/-) */
            '<span class="etb-spread-zoom">' +
            '<button type="button" id="etb-spread-zoomout">−</button>' +
            '<span id="etb-spread-zoomlabel">100%</span>' +
            '<button type="button" id="etb-spread-zoomin">＋</button>' +
            '</span>' +
            '<label class="etb-spread-sfx"><input type="checkbox" id="etb-spread-sfx-cb"> ' +
            '<span id="etb-spread-sfx-text">効果音</span></label>' +
            '<label class="etb-spread-sfx"><input type="checkbox" id="etb-spread-nc-cb"> ' +
            '<span id="etb-spread-nc-text">NCシンバルの小節線を強調表示</span></label>' +
            /* 右: ビートスナップ(スクロールで変更) + 再生速度 */
            '<span class="etb-spread-right">' +
            '<span class="etb-spread-snap2" id="etb-spread-snap2" title="スライダー/スクロールで変更">' +
            '<span id="etb-spread-snap-text">ビートスナップ間隔</span> ' +
            '<input type="range" class="etb-spread-snap-slider" id="etb-spread-snap-slider" min="0" step="1">' +
            '<span class="etb-spread-snap-val" id="etb-spread-snap-val">1/4</span>' +
            '</span>' +
            '</span>';
          spPanel.appendChild(spBar);

          var spCanvas = document.createElement('canvas');
          spCanvas.id = 'etb-spread-canvas';
          spPanel.appendChild(spCanvas);

          /* 下部バー（osu!エディタ風）: 左=時間/％, 中央=進捗バー, 右=再生操作+速度 */
          var spBottom = document.createElement('div');
          spBottom.className = 'etb-spread-bottom';
          spBottom.innerHTML =
            '<span class="etb-sb-time" id="etb-sb-time" title="ダブルクリック / Ctrl+C でコピー">00:00:000</span>' +
            '<span class="etb-sb-pct" id="etb-sb-pct">0.0%</span>' +
            '<span class="etb-sb-progress" id="etb-sb-progress" title="クリックでシーク">' +
            '<canvas id="etb-sb-progress-canvas"></canvas>' +
            '</span>' +
            '<span class="etb-sb-controls">' +
            '<button type="button" id="etb-sb-play"  title="再生">▶</button>' +
            '<button type="button" id="etb-sb-pause" title="一時停止">❚❚</button>' +
            '<button type="button" id="etb-sb-stop"  title="停止">■</button>' +
            '<button type="button" id="etb-sb-test"  title="Test">Test</button>' +
            '</span>' +
            '<span class="etb-spread-speed" id="etb-spread-speed">' +
            '<button type="button" data-rate="0.25">25%</button>' +
            '<button type="button" data-rate="0.5">50%</button>' +
            '<button type="button" data-rate="0.75">75%</button>' +
            '<button type="button" data-rate="1">100%</button>' +
            '</span>';
          spPanel.appendChild(spBottom);

          outBody.appendChild(spPanel);

          /* 表示状態: スナップ分割・ズーム(pxPerMs)・再生速度 */
          var SP_SNAP_DIVS = [1, 2, 3, 4, 6, 8, 12, 16];
          var spSnap = 4;
          try { var sn = parseInt(localStorage.getItem('moddingHelperPreviewSnap'), 10); if (SP_SNAP_DIVS.indexOf(sn) >= 0) spSnap = sn; } catch (e) {}
          var spPlaybackRate = 1;
          try { var pr = parseFloat(localStorage.getItem('moddingHelperPreviewRate')); if (pr === 0.25 || pr === 0.5 || pr === 0.75 || pr === 1) spPlaybackRate = pr; } catch (e) {}
          /* Test: ゲーム画面表示（SV/BPM/SliderMultiplier を反映した実機同等のスクロール） */
          var spSvMode = false;
          /* 判定ラインの位置（プレイフィールド幅に対する割合）。
             左寄せの 0.2 は osu!taiko 実機の受け口位置（165/901.7≒0.18）に近い値。 */
          var SP_JUDGE_CENTER = 0.5, SP_JUDGE_LEFT = 0.2;
          var spJudgeFrac = SP_JUDGE_CENTER;
          try {
            var jf = parseFloat(localStorage.getItem('moddingHelperPreviewJudgeFrac'));
            if (jf === SP_JUDGE_LEFT || jf === SP_JUDGE_CENTER) spJudgeFrac = jf;
          } catch (e) {}

          /* Diff順: true=難→易(上が難しい / 既定), false=易→難(上が易しい) */
          var spDiffDesc = true;
          try { if (localStorage.getItem('moddingHelperPreviewDiffDesc') === '0') spDiffDesc = false; } catch (e) {}
          /* 非表示にする Diff（fileName→true）。localStorage に永続化 */
          var spHiddenDiffs = Object.create(null);
          try {
            var hd0 = JSON.parse(localStorage.getItem('moddingHelperPreviewHiddenDiffs') || '{}');
            if (hd0 && typeof hd0 === 'object') for (var hk in hd0) if (hd0[hk]) spHiddenDiffs[hk] = true;
          } catch (e) {}
          var saveHiddenDiffs = function () {
            try { localStorage.setItem('moddingHelperPreviewHiddenDiffs', JSON.stringify(spHiddenDiffs)); } catch (e) {}
          };
          var SP_BASE_PX = 0.32, SP_ZOOM_MIN = 0.06, SP_ZOOM_MAX = 2.2;
          var spPxPerMs = SP_BASE_PX;
          var updateSpZoomLabel = function () {
            var l = document.getElementById('etb-spread-zoomlabel');
            if (l) l.textContent = Math.round(spPxPerMs / SP_BASE_PX * 100) + '%';
          };
          var setSpZoom = function (v) {
            /* ゲーム画面表示(Test)中は実機と同じ速度で見せるためズーム不可 */
            if (spSvMode) return;
            spPxPerMs = Math.max(SP_ZOOM_MIN, Math.min(SP_ZOOM_MAX, v));
            updateSpZoomLabel();
          };
          /* ズームUIの有効/無効を SV モードに合わせて切り替える */
          var updateZoomEnabled = function () {
            var zi = document.getElementById('etb-spread-zoomin');
            var zo = document.getElementById('etb-spread-zoomout');
            if (zi) zi.disabled = spSvMode;
            if (zo) zo.disabled = spSvMode;
            var zl = document.getElementById('etb-spread-zoomlabel');
            if (zl) zl.textContent = spSvMode ? '実速' : (Math.round(spPxPerMs / SP_BASE_PX * 100) + '%');
          };
          /* ビートスナップ: スライダー / スクロールで変更（osu!エディタ風）。表示と同期 */
          var spSnapSlider = spBar.querySelector('#etb-spread-snap-slider');
          if (spSnapSlider) spSnapSlider.max = String(SP_SNAP_DIVS.length - 1);
          var updateSnapUi = function () {
            var el = document.getElementById('etb-spread-snap-val');
            if (el) el.textContent = '1/' + spSnap;
            var idx = SP_SNAP_DIVS.indexOf(spSnap);
            if (spSnapSlider && idx >= 0) spSnapSlider.value = String(idx);
          };
          var setSnapByIndex = function (i) {
            i = Math.max(0, Math.min(SP_SNAP_DIVS.length - 1, i));
            spSnap = SP_SNAP_DIVS[i];
            try { localStorage.setItem('moddingHelperPreviewSnap', String(spSnap)); } catch (e) {}
            updateSnapUi();
          };
          var spSnapEl = spBar.querySelector('#etb-spread-snap2');
          if (spSnapEl) spSnapEl.addEventListener('wheel', function (e) {
            var cur = SP_SNAP_DIVS.indexOf(spSnap);
            if (cur < 0) cur = SP_SNAP_DIVS.indexOf(4);
            setSnapByIndex(cur + (e.deltaY < 0 ? 1 : -1)); // 上スクロール=細かく(分割大)
            e.preventDefault();
          }, { passive: false });
          if (spSnapSlider) spSnapSlider.addEventListener('input', function () {
            setSnapByIndex(parseInt(spSnapSlider.value, 10) || 0);
          });
          updateSnapUi();

          /* 再生速度（25/50/75/100%）: osu!エディタ風。自前の音楽再生に適用 */
          var updateSpeedActive = function () {
            var wrap = document.getElementById('etb-spread-speed');
            if (!wrap) return;
            var bs = wrap.querySelectorAll('button');
            for (var i = 0; i < bs.length; i++) {
              bs[i].classList.toggle('active', parseFloat(bs[i].getAttribute('data-rate')) === spPlaybackRate);
            }
          };
          var setPlaybackRate = function (r) {
            spPlaybackRate = r;
            try { localStorage.setItem('moddingHelperPreviewRate', String(r)); } catch (e) {}
            if (typeof spAudio !== 'undefined' && spAudio) spAudio.playbackRate = r;
            updateSpeedActive();
          };
          var spSpeedWrap = document.getElementById('etb-spread-speed');
          if (spSpeedWrap) spSpeedWrap.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('button[data-rate]') : null;
            if (!btn) return;
            setPlaybackRate(parseFloat(btn.getAttribute('data-rate')));
          });
          updateSpeedActive();

          var spZoomIn  = spBar.querySelector('#etb-spread-zoomin');
          var spZoomOut = spBar.querySelector('#etb-spread-zoomout');
          if (spZoomIn)  spZoomIn.addEventListener('click',  function () { setSpZoom(spPxPerMs * 1.25); });
          if (spZoomOut) spZoomOut.addEventListener('click', function () { setSpZoom(spPxPerMs / 1.25); });
          updateSpZoomLabel();
          /* スプレッド表示中のキーボード +/- でもズーム */
          document.addEventListener('keydown', function (e) {
            if (!spPreviewOn) return;
            var t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
            if (e.key === '+' || e.key === '=') { setSpZoom(spPxPerMs * 1.25); e.preventDefault(); }
            else if (e.key === '-' || e.key === '_') { setSpZoom(spPxPerMs / 1.25); e.preventDefault(); }
          });

          /* 効果音（ドン/カツ）: ON のとき、選択レーンのノーツを再生に合わせて鳴らす */
          var spHitSounds = false;   // 効果音 ON/OFF
          /* NCシンバルが鳴る小節線（major）を強調表示するか */
          var spShowNc = false;
          try { if (localStorage.getItem('moddingHelperPreviewNcCymbal') === '1') spShowNc = true; } catch (e) {}
          var spSynth = null;        // Web Audio シンセ/サンプルキット
          var spSoundLane = 0;       // 効果音を鳴らすレーン（0=最上=最難）。クリックで変更

          /* 効果音セット（sounds/<セット>/）の選択。設定画面のラジオで切替、localStorage に保存 */
          var spSfxSets = Array.isArray(window.__taikoSoundSets) ? window.__taikoSoundSets : [];
          var spSfxSetId = null;
          try { spSfxSetId = localStorage.getItem('moddingHelperSfxSet'); } catch (e) {}
          /* 効果音の音量（0..1）。設定画面で 0〜100 入力。 */
          var spSfxVolume01 = 0.8;
          try {
            var sv0 = parseInt(localStorage.getItem('moddingHelperSfxVolume'), 10);
            if (Number.isFinite(sv0)) spSfxVolume01 = Math.max(0, Math.min(100, sv0)) / 100;
          } catch (e) {}
          /* 効果音オフセット(ms)。+で遅らせ / -で早める。設定画面で調整・永続化。
             音楽側の出力バッファぶん効果音が早く聞こえるのを打ち消す。
             既定 35 は実際に聴き合わせて決めた値。 */
          var spSfxOffsetMs = 35;
          try {
            var so0 = parseInt(localStorage.getItem('moddingHelperSfxOffset'), 10);
            if (Number.isFinite(so0)) spSfxOffsetMs = Math.max(-200, Math.min(200, so0));
          } catch (e) {}
          /* 曲の音量（0..1）。設定画面で 0〜100 入力。spAudio.volume に反映。 */
          var spMusicVolume01 = 1.0;
          try {
            var mv0 = parseInt(localStorage.getItem('moddingHelperMusicVolume'), 10);
            if (Number.isFinite(mv0)) spMusicVolume01 = Math.max(0, Math.min(100, mv0)) / 100;
          } catch (e) {}
          var getSelectedSfxSet = function () {
            if (!spSfxSets.length) return null;
            for (var i = 0; i < spSfxSets.length; i++) if (spSfxSets[i].id === spSfxSetId) return spSfxSets[i];
            return spSfxSets[0];
          };
          /* 音楽と効果音で共有する AudioContext。
             別々のクロックだと長い曲で徐々にズレるため、音楽(<audio>)も同じ ctx に通して
             時計と出力レイテンシを完全に共通化する。ctx は作り直さず使い回す。 */
          var spSharedCtx = null, spMediaRouted = false;
          var ensureSpreadAudioCtx = function () {
            if (!spSharedCtx) {
              var Ctx = window.AudioContext || window.webkitAudioContext;
              if (!Ctx) return null;
              try { spSharedCtx = new Ctx(); } catch (e) { spSharedCtx = null; return null; }
            }
            /* 音楽を ctx 経由に（1要素につき1回だけ可能）。失敗しても直接再生のまま継続 */
            if (!spMediaRouted && typeof spAudio !== 'undefined' && spAudio) {
              try {
                spSharedCtx.createMediaElementSource(spAudio).connect(spSharedCtx.destination);
                spMediaRouted = true;
              } catch (e) { spMediaRouted = true; /* 既にルート済み等。以後試さない */ }
            }
            if (spSharedCtx.state === 'suspended') { try { spSharedCtx.resume(); } catch (e) {} }
            return spSharedCtx;
          };

          /* 選択中のセットで効果音キットを作り直す（合成音フォールバック付き）。
             ctx は共有なので閉じない（閉じると音楽まで止まる） */
          var buildSfxKit = function () {
            spSynth = null;
            var ctx = ensureSpreadAudioCtx();
            var set = getSelectedSfxSet();
            var sm = set && set.sounds;
            if (sm && (sm.don || sm.kat) && window.createTaikoSampleKit) {
              spSynth = window.createTaikoSampleKit(sm, ctx);
            }
            if (!spSynth && window.createTaikoHitSynth) {
              spSynth = window.createTaikoHitSynth(ctx); // 音源が無ければ合成音
            }
            if (spSynth) {
              if (spSynth.setVolume) spSynth.setVolume(spSfxVolume01);
              spSynth.resume();
            }
          };
          /* 設定画面から呼ばれる: セット選択を変更 */
          var setSfxSet = function (id) {
            spSfxSetId = id;
            try { localStorage.setItem('moddingHelperSfxSet', id); } catch (e) {}
            if (spHitSounds) buildSfxKit(); // 再生中でも即差し替え
            spSfxLastSong = null; spSfxSchedTo = null; // 新キットで予約し直す
          };
          window.__spreadSetSfxSet = setSfxSet; // 設定 UI から利用

          /* 設定画面「プレビュータブ設定」カードに Diff順 / 効果音の種類・音量 を追加 */
          if (typeof previewSettingsBody !== 'undefined' && previewSettingsBody) {
            /* Diff順（難→易 / 易→難）の切替 */
            var diffOrderSection = document.createElement('div');
            diffOrderSection.className = 'etb-sfx-settings';
            var doTitle = document.createElement('div');
            doTitle.className = 'etb-sfx-settings-title';
            doTitle.id = 'etb-difforder-title';
            doTitle.textContent = 'Diff順';
            diffOrderSection.appendChild(doTitle);
            [
              { desc: true,  id: 'etb-difforder-desc', ja: '難→易（上が難しい）' },
              { desc: false, id: 'etb-difforder-asc',  ja: '易→難（上が易しい）' }
            ].forEach(function (opt) {
              var lb = document.createElement('label');
              lb.className = 'etb-sfx-opt';
              var rb = document.createElement('input');
              rb.type = 'radio'; rb.name = 'etb-difforder';
              if (opt.desc === spDiffDesc) rb.checked = true;
              rb.addEventListener('change', function () {
                if (!rb.checked) return;
                spDiffDesc = opt.desc;
                try { localStorage.setItem('moddingHelperPreviewDiffDesc', spDiffDesc ? '1' : '0'); } catch (e) {}
                if (spCacheDiffs && spCacheDiffs.length) sortSpreadDiffs(spCacheDiffs); // 即時反映
              });
              var txt = document.createElement('span');
              txt.id = opt.id; txt.textContent = opt.ja;
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
                { mode: 'wide',    id: 'etb-viewmode-wide',    ja: 'ワイド' },
                { mode: 'compact', id: 'etb-viewmode-compact', ja: 'コンパクト' }
              ].forEach(function (opt) {
                var lb = document.createElement('label');
                lb.className = 'etb-sfx-opt';
                var rb = document.createElement('input');
                rb.type = 'radio'; rb.name = 'etb-viewmode';
                if (opt.mode === viewMode) rb.checked = true;
                rb.addEventListener('change', function () {
                  if (!rb.checked) return;
                  viewMode = opt.mode;
                  try { localStorage.setItem('moddingHelperViewMode', viewMode); } catch (e) {}
                  applyViewModeUi();
                  /* ウィンドウサイズもモードに合わせる。
                     コンパクト → 標準のデスクトップサイズ / ワイド → 画面いっぱい。
                     どちらも固定ではないので、以後は自由にリサイズできる。 */
                  var api = window.electronAPI;
                  if (viewMode === 'compact') { if (api && api.standardSize) api.standardSize(); }
                  else if (api && api.maximizeFull) api.maximizeFull();
                });
                var txt = document.createElement('span');
                txt.id = opt.id; txt.textContent = opt.ja;
                lb.appendChild(rb);
                lb.appendChild(document.createTextNode(' '));
                lb.appendChild(txt);
                viewModeSection.appendChild(lb);
              });
              viewSettingsBody.appendChild(viewModeSection);
            }

            /* 判定ラインの位置（中央 / 左寄せ）の切替 */
            var judgePosSection = document.createElement('div');
            judgePosSection.className = 'etb-sfx-settings';
            var jpTitle = document.createElement('div');
            jpTitle.className = 'etb-sfx-settings-title';
            jpTitle.id = 'etb-judgepos-title';
            jpTitle.textContent = '判定ラインの位置';
            judgePosSection.appendChild(jpTitle);
            [
              { frac: SP_JUDGE_CENTER, id: 'etb-judgepos-center', ja: '中央' },
              { frac: SP_JUDGE_LEFT,   id: 'etb-judgepos-left',   ja: '左寄せ（先を長く見る）' }
            ].forEach(function (opt) {
              var lb = document.createElement('label');
              lb.className = 'etb-sfx-opt';
              var rb = document.createElement('input');
              rb.type = 'radio'; rb.name = 'etb-judgepos';
              if (opt.frac === spJudgeFrac) rb.checked = true;
              rb.addEventListener('change', function () {
                if (!rb.checked) return;
                spJudgeFrac = opt.frac;
                try { localStorage.setItem('moddingHelperPreviewJudgeFrac', String(spJudgeFrac)); } catch (e) {}
              });
              var txt = document.createElement('span');
              txt.id = opt.id; txt.textContent = opt.ja;
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
            dvTitle.textContent = '表示するDiff';
            diffVisSection.appendChild(dvTitle);
            var diffVisList = document.createElement('div');
            diffVisList.id = 'etb-diffvis-list';
            diffVisSection.appendChild(diffVisList);
            previewSettingsBody.appendChild(diffVisSection);

            /* 現在の譜面から表示チェックリストを作り直す（設定画面を開いた時に呼ぶ） */
            var rebuildDiffVisibilityList = function () {
              diffVisList.innerHTML = '';
              var diffs = getSpreadDiffs();
              if (!diffs.length) {
                var none = document.createElement('div');
                none.className = 'etb-sfx-none'; none.id = 'etb-diffvis-none';
                none.textContent = '（譜面が読み込まれていません）';
                diffVisList.appendChild(none);
                return;
              }
              diffs.forEach(function (d) {
                var lb = document.createElement('label');
                lb.className = 'etb-sfx-opt';
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !spHiddenDiffs[d.fileName];
                cb.addEventListener('change', function () {
                  if (cb.checked) delete spHiddenDiffs[d.fileName];
                  else spHiddenDiffs[d.fileName] = true;
                  saveHiddenDiffs();
                });
                lb.appendChild(cb);
                lb.appendChild(document.createTextNode(' ' + (d.name || d.fileName)));
                diffVisList.appendChild(lb);
              });
            };
            window.__spreadRebuildDiffList = rebuildDiffVisibilityList;

            var sfxSection = document.createElement('div');
            sfxSection.className = 'etb-sfx-settings';
            var sfxTitle = document.createElement('div');
            sfxTitle.className = 'etb-sfx-settings-title';
            sfxTitle.id = 'etb-sfx-settings-title';
            sfxTitle.textContent = '効果音の種類';
            sfxSection.appendChild(sfxTitle);
            if (spSfxSets.length) {
              var selId = (getSelectedSfxSet() || {}).id;
              spSfxSets.forEach(function (set) {
                var lb = document.createElement('label');
                lb.className = 'etb-sfx-opt';
                var rb = document.createElement('input');
                rb.type = 'radio'; rb.name = 'etb-sfx-set'; rb.value = set.id;
                if (set.id === selId) rb.checked = true;
                rb.addEventListener('change', function () { if (rb.checked) setSfxSet(set.id); });
                lb.appendChild(rb);
                lb.appendChild(document.createTextNode(' ' + set.label));
                sfxSection.appendChild(lb);
              });
            } else {
              var sfxNone = document.createElement('div');
              sfxNone.className = 'etb-sfx-none'; sfxNone.id = 'etb-sfx-none';
              sfxNone.textContent = '（sounds/ に音源フォルダがありません。合成音を使用）';
              sfxSection.appendChild(sfxNone);
            }

            /* 音量（0〜100）: スライダー + 数値入力（同期） */
            var volRow = document.createElement('div');
            volRow.className = 'etb-sfx-vol';
            var volLabel = document.createElement('span');
            volLabel.id = 'etb-sfx-vol-label'; volLabel.className = 'etb-sfx-vol-label';
            volLabel.textContent = '効果音の音量';
            var volRange = document.createElement('input');
            volRange.type = 'range'; volRange.min = '0'; volRange.max = '100'; volRange.step = '1';
            volRange.className = 'etb-sfx-vol-range';
            var volNum = document.createElement('input');
            volNum.type = 'number'; volNum.min = '0'; volNum.max = '100'; volNum.step = '1';
            volNum.id = 'etb-sfx-vol-input'; volNum.className = 'etb-sfx-vol-num';
            var applyVol = function (v, from) {
              v = Math.max(0, Math.min(100, Math.round(v)));
              spSfxVolume01 = v / 100;
              try { localStorage.setItem('moddingHelperSfxVolume', String(v)); } catch (e) {}
              if (spSynth && spSynth.setVolume) spSynth.setVolume(spSfxVolume01);
              if (from !== 'range') volRange.value = String(v);
              if (from !== 'num') volNum.value = String(v);
            };
            var initVol = Math.round(spSfxVolume01 * 100);
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
            mVolLabel.textContent = '曲の音量';
            var mVolRange = document.createElement('input');
            mVolRange.type = 'range'; mVolRange.min = '0'; mVolRange.max = '100'; mVolRange.step = '1';
            mVolRange.className = 'etb-sfx-vol-range';
            var mVolNum = document.createElement('input');
            mVolNum.type = 'number'; mVolNum.min = '0'; mVolNum.max = '100'; mVolNum.step = '1';
            mVolNum.id = 'etb-music-vol-input'; mVolNum.className = 'etb-sfx-vol-num';
            var applyMusicVol = function (v, from) {
              v = Math.max(0, Math.min(100, Math.round(v)));
              spMusicVolume01 = v / 100;
              try { localStorage.setItem('moddingHelperMusicVolume', String(v)); } catch (e) {}
              if (typeof spAudio !== 'undefined' && spAudio) spAudio.volume = spMusicVolume01;
              if (from !== 'range') mVolRange.value = String(v);
              if (from !== 'num') mVolNum.value = String(v);
            };
            var initMVol = Math.round(spMusicVolume01 * 100);
            mVolRange.value = String(initMVol); mVolNum.value = String(initMVol);
            mVolRange.addEventListener('input', function () { applyMusicVol(parseInt(mVolRange.value, 10) || 0, 'range'); });
            mVolNum.addEventListener('input', function () {
              var v = parseInt(mVolNum.value, 10); if (Number.isFinite(v)) applyMusicVol(v, 'num');
            });
            mVolRow.appendChild(mVolLabel);
            mVolRow.appendChild(mVolRange);
            mVolRow.appendChild(mVolNum);
            sfxSection.appendChild(mVolRow);

            /* 効果音オフセット(ms): +で遅らせ / -で早める */
            var offRow = document.createElement('div');
            offRow.className = 'etb-sfx-vol';
            var offLabel = document.createElement('span');
            offLabel.id = 'etb-sfx-offset-label'; offLabel.className = 'etb-sfx-vol-label';
            offLabel.textContent = '効果音オフセット';
            var offRange = document.createElement('input');
            offRange.type = 'range'; offRange.min = '-100'; offRange.max = '100'; offRange.step = '1';
            offRange.className = 'etb-sfx-vol-range';
            var offNum = document.createElement('input');
            offNum.type = 'number'; offNum.min = '-200'; offNum.max = '200'; offNum.step = '1';
            offNum.id = 'etb-sfx-offset-input'; offNum.className = 'etb-sfx-vol-num';
            var applyOffset = function (v, from) {
              v = Math.max(-200, Math.min(200, Math.round(v)));
              spSfxOffsetMs = v;
              try { localStorage.setItem('moddingHelperSfxOffset', String(v)); } catch (e) {}
              if (from !== 'range') offRange.value = String(Math.max(-100, Math.min(100, v)));
              if (from !== 'num') offNum.value = String(v);
            };
            offRange.value = String(Math.max(-100, Math.min(100, spSfxOffsetMs)));
            offNum.value = String(spSfxOffsetMs);
            offRange.addEventListener('input', function () { applyOffset(parseInt(offRange.value, 10) || 0, 'range'); });
            offNum.addEventListener('input', function () {
              var v = parseInt(offNum.value, 10); if (Number.isFinite(v)) applyOffset(v, 'num');
            });
            offRow.appendChild(offLabel);
            offRow.appendChild(offRange);
            offRow.appendChild(offNum);
            sfxSection.appendChild(offRow);

            previewSettingsBody.appendChild(sfxSection);
          }

          /* NCシンバル位置（major な小節線）の強調表示。保存して次回も維持 */
          var spNcCb = spBar.querySelector('#etb-spread-nc-cb');
          if (spNcCb) {
            spNcCb.checked = spShowNc;
            spNcCb.addEventListener('change', function () {
              spShowNc = spNcCb.checked;
              try { localStorage.setItem('moddingHelperPreviewNcCymbal', spShowNc ? '1' : '0'); } catch (e) {}
            });
          }

          var spSfxCb = spBar.querySelector('#etb-spread-sfx-cb');
          if (spSfxCb) spSfxCb.addEventListener('change', function () {
            spHitSounds = spSfxCb.checked;
            if (spHitSounds && !spSynth) buildSfxKit();
            if (spHitSounds && spSynth) spSynth.resume(); // ユーザー操作なので AudioContext を起動
            spSfxLastSong = null; spSfxSchedTo = null; // 有効化直後に過去分を鳴らさない
          });

          /* Diff順の並べ替え（難易度順 __loadedDiffOrder=易→難 を基準）。
             spDiffDesc=true → 難→易(上が難)、false → 易→難(上が易)。順序不明は末尾。 */
          var sortSpreadDiffs = function (arr) {
            var order = window.__loadedDiffOrder;
            if (!order || !order.length) return;
            var rank = Object.create(null);
            for (var oi = 0; oi < order.length; oi++) rank[order[oi]] = oi;
            var unknown = spDiffDesc ? -1 : (order.length + 1); // 未知は常に末尾へ
            arr.sort(function (a, b) {
              var ra = a.fileName in rank ? rank[a.fileName] : unknown;
              var rb = b.fileName in rank ? rank[b.fileName] : unknown;
              return spDiffDesc ? (rb - ra) : (ra - rb);
            });
          };

          /* 難易度キャッシュ（__loadedDiffs が差し替わった時だけ再解析） */
          var spCacheRef = null, spCacheDiffs = [];
          var spreadTimeRange = null; // 手動シークのクランプ用 [min, max]
          /* ── ノーツ選択（Ctrl+C のタイムスタンプ用） ──
             選択は 1 難易度内に限定する（osu! のタイムスタンプが 1 譜面を指すため）。
             ノーツはオブジェクト参照で保持する。譜面を読み直すと配列ごと作り直され、
             参照が変わってしまうので、その時は選択をクリアする。 */
          var spSelNotes = [];   // 選択中のノーツ(参照)
          var spSelDiff  = null; // 選択中の難易度
          var spMarquee  = null; // ドラッグ中の選択範囲 {x0,y0,x1,y1}（CSS px）
          var spClearSelection = function () { spSelNotes = []; spSelDiff = null; };
          var spIsSelected = function (note) { return spSelNotes.indexOf(note) >= 0; };

          var getSpreadDiffs = function () {
            var raw = window.__loadedDiffs;
            if (raw === spCacheRef) return spCacheDiffs;
            spCacheRef = raw;
            spClearSelection(); // 譜面が差し替わったらノーツ参照が無効になる
            spCacheDiffs = (raw || []).map(function (d) {
              var name = (typeof parseMetadataValue === 'function' && d.text
                && parseMetadataValue(d.text, 'Version')) || d.fileName || '';
              var notes = window.parseTaikoNotes(d.text);
              var red   = window.parseTaikoRedTiming ? window.parseTaikoRedTiming(d.text) : [];
              var green = (typeof parseInheritedTimingPoints === 'function')
                ? parseInheritedTimingPoints(d.text) : [];
              var sm = (typeof parseHitObjectEndSliderMultiplier === 'function')
                ? parseHitObjectEndSliderMultiplier(d.text) : 1.4;
              /* ゲーム画面表示(SV適用)用に、各ノーツのスクロール速度を1回だけ計算 */
              if (window.applyTaikoNoteVelocities) {
                window.applyTaikoNoteVelocities(notes, red, green, sm);
              }
              var marks = window.parseTaikoTimelineMarks
                ? window.parseTaikoTimelineMarks(d.text) : null;
              /* 小節線も1回だけ生成（譜面末尾＋1小節ぶんまで） */
              var barlines = [];
              if (window.buildTaikoBarlines && notes.length) {
                var last = notes[notes.length - 1];
                var endT = (last.endTime != null ? last.endTime : last.time) + 4000;
                barlines = window.buildTaikoBarlines(red, green, sm, endT,
                  marks ? marks.omitBarline : null);
              }
              return {
                name: name,
                fileName: d.fileName || '',
                notes: notes,
                red: red,
                barlines: barlines,
                /* 進捗バー用マーカー(kiai/SV/BPM/PreviewTime/Bookmarks)を1回だけ解析 */
                marks: marks
              };
            });
            sortSpreadDiffs(spCacheDiffs);
            /* 全難易度の時間範囲（ノーツの最初〜最後）を求めてクランプ範囲にする */
            var minT = Infinity, maxT = -Infinity;
            spCacheDiffs.forEach(function (d) {
              var ns = d.notes;
              if (ns && ns.length) {
                if (ns[0].time < minT) minT = ns[0].time;
                var last = ns[ns.length - 1];
                var e = last.endTime != null ? last.endTime : last.time;
                if (e > maxT) maxT = e;
              }
            });
            spreadTimeRange = minT <= maxT ? [minT - 2000, maxT + 2000] : null;
            return spCacheDiffs;
          };

          /* ── 手動シーク（osu! には同期しない） ── */
          var setSpreadManual = function (t) {
            if (!Number.isFinite(t)) return;
            if (spreadTimeRange) t = Math.max(spreadTimeRange[0], Math.min(spreadTimeRange[1], t));
            spreadManualTime = t;
          };
          /* グリッド用の参照赤線（最初に見つかった非空のもの） */
          var spreadRefRed = function (diffs) {
            for (var i = 0; i < diffs.length; i++) {
              if (diffs[i].red && diffs[i].red.length) return diffs[i].red;
            }
            return null;
          };
          /* スナップ1目盛り分ステップ（ホイール用）。グリッドに吸着して dir 方向へ */
          /* ホイール加速: ゆっくり回すと1目盛り、速く連続で回すと段々多く進む */
          var SP_WHEEL_MAX = 6;   // 加速時の最大目盛り/ノッチ
          var SP_WHEEL_GAP = 90;  // この間隔(ms)以内の連続回転で加速
          var spWheelLast = 0, spWheelAccel = 1;
          var spreadSnapStep = function (red, t, snap, dir, steps) {
            steps = steps || 1; // 1ノッチで動くスナップ目盛り数
            if (!red || !red.length) return t + dir * steps * 100;
            var seg = red[0];
            for (var i = 0; i < red.length; i++) { if (red[i].time <= t) seg = red[i]; else break; }
            var tick = seg.beatLength / snap;
            if (!(tick > 0)) return t + dir * steps * 100;
            var k = Math.round((t - seg.time) / tick);
            return seg.time + (k + dir * steps) * tick;
          };

          /* キャンバス座標（CSS px）に変換 */
          var spCanvasPos = function (e) {
            var rect = spCanvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect: rect };
          };
          /* 点とノーツ（円 or カプセル）の当たり判定。線分までの距離で見る */
          var spHitOne = function (h, px, py) {
            var dy = py - h.y;
            var lo = Math.min(h.x, h.x2), hi = Math.max(h.x, h.x2);
            var dx = px < lo ? px - lo : (px > hi ? px - hi : 0); // 線分内なら水平距離0
            return dx * dx + dy * dy <= h.r * h.r;
          };
          /* その座標にあるノーツ。描画順の後ろ＝前面から探す。
             難易度名のラベル列（playX0 より左）はノーツの上に被せて描いていて
             ノーツは見えていないので、そこのクリックはノーツ判定の対象外にする
             （でないとラベルを押したのにノーツ選択に吸われる）。 */
          var spHitTest = function (px, py) {
            var geom = spCanvas.__spreadGeom;
            var hits = geom && geom.hits;
            if (!hits) return null;
            if (geom.playX0 != null && px < geom.playX0) return null;
            for (var i = hits.length - 1; i >= 0; i--) {
              if (spHitOne(hits[i], px, py)) return hits[i];
            }
            return null;
          };
          /* 矩形に触れているノーツを列挙（diff 指定時はその難易度に限る） */
          var spHitsInRect = function (x0, y0, x1, y1, diff) {
            var geom = spCanvas.__spreadGeom;
            var hits = geom && geom.hits;
            var out = [];
            if (!hits) return out;
            var lo = Math.min(x0, x1), hi = Math.max(x0, x1);
            var top = Math.min(y0, y1), bot = Math.max(y0, y1);
            /* ラベル列に隠れている部分は選択対象にしない（クリック判定と同じ理由） */
            if (geom.playX0 != null) { lo = Math.max(lo, geom.playX0); if (hi < lo) return out; }
            for (var i = 0; i < hits.length; i++) {
              var h = hits[i];
              if (diff && h.diff !== diff) continue;
              var nl = Math.min(h.x, h.x2) - h.r, nr = Math.max(h.x, h.x2) + h.r;
              if (nr < lo || nl > hi) continue;            // 横が重ならない
              if (h.y + h.r < top || h.y - h.r > bot) continue; // 縦が重ならない
              out.push(h);
            }
            return out;
          };

          /* マウス操作:
             - 左ドラッグ  = ノーツを範囲選択（ラバーバンド。開始したレーン内に限定）
             - 左クリック  = ノーツを選択 / 何も無い所は選択解除（＋効果音レーンの切替）
             - Ctrl+左     = 選択に追加・解除（クリック / ドラッグとも）
             - 右ドラッグ  = スクラブ（右=戻る / 左=進む。開始時に音楽停止）
             閾値を超えて初めてドラッグ扱いにする。 */
          var SP_DRAG_THRESH = 5;
          var spPendingDown = false, spDownX = 0, spDownY = 0, spDragLastX = 0;
          var spPendingSel = false, spSelDragging = false;
          var spSelBase = null;    // Ctrl+ドラッグ開始時点の選択（これに足していく）
          var spSelDragDiff = null;
          spCanvas.addEventListener('mousedown', function (e) {
            /* ツールバー等に残ったフォーカスを外す（スペースが吸われないように） */
            try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (_) {}
            if (e.button === 2) {              // 右 = スクラブ
              spPendingDown = true;
              spDownX = e.clientX; spDownY = e.clientY; spDragLastX = e.clientX;
              e.preventDefault();
              return;
            }
            if (e.button !== 0) return;
            var p = spCanvasPos(e);
            spPendingSel = true;
            spDownX = e.clientX; spDownY = e.clientY;
            spMarquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
            /* ドラッグ開始位置のレーン（=難易度）に選択を閉じ込める */
            var geom = spCanvas.__spreadGeom;
            var laneIdx = geom && geom.laneH ? Math.floor((p.y - geom.topPad) / geom.laneH) : -1;
            var diffs = getSpreadDiffs().filter(function (d) { return !spHiddenDiffs[d.fileName]; });
            spSelDragDiff = (laneIdx >= 0 && laneIdx < diffs.length) ? diffs[laneIdx] : null;
            /* Ctrl+ドラッグでの追加は、既存の選択と同じ難易度の時だけ（選択は 1 譜面に限定） */
            spSelBase = ((e.ctrlKey || e.metaKey) && spSelDiff && spSelDiff === spSelDragDiff)
              ? spSelNotes.slice() : [];
            e.preventDefault();
          });
          window.addEventListener('mousemove', function (e) {
            /* 右ドラッグ = スクラブ */
            if (spPendingDown || spreadDragging) {
              if (!spreadDragging) {
                if (Math.abs(e.clientX - spDownX) + Math.abs(e.clientY - spDownY) < SP_DRAG_THRESH) return;
                spreadDragging = true;
                if (spAudio && !spAudio.paused) spAudio.pause(); // スクラブ開始で音楽停止
                var base0 = getSpreadTime(); if (base0 == null) base0 = 0;
                setSpreadManual(base0);
                spDragLastX = e.clientX;
                spCanvas.style.cursor = 'grabbing';
              }
              var dx = e.clientX - spDragLastX;
              spDragLastX = e.clientX;
              var base = spreadManualTime != null ? spreadManualTime : (spreadLastTime || 0);
              setSpreadManual(base - dx / spPxPerMs);
              return;
            }
            /* 左ドラッグ = ラバーバンド選択 */
            if (!spPendingSel) return;
            if (!spSelDragging) {
              if (Math.abs(e.clientX - spDownX) + Math.abs(e.clientY - spDownY) < SP_DRAG_THRESH) return;
              spSelDragging = true;
            }
            var p2 = spCanvasPos(e);
            spMarquee.x1 = p2.x; spMarquee.y1 = p2.y;
            var found = spHitsInRect(spMarquee.x0, spMarquee.y0, spMarquee.x1, spMarquee.y1, spSelDragDiff);
            var sel = spSelBase.slice();
            for (var i = 0; i < found.length; i++) {
              if (sel.indexOf(found[i].note) < 0) sel.push(found[i].note);
            }
            spSelNotes = sel;
            if (sel.length) spSelDiff = spSelDragDiff || spSelDiff;
          });
          window.addEventListener('mouseup', function (e) {
            if (spreadDragging) { spreadDragging = false; spCanvas.style.cursor = ''; spPendingDown = false; return; }
            spPendingDown = false;
            if (!spPendingSel) return;
            spPendingSel = false;
            spMarquee = null;
            if (spSelDragging) { spSelDragging = false; return; } // ドラッグ確定済み
            /* ここからは「動かさずクリック」 */
            var p = spCanvasPos(e);
            if (p.x < 0 || p.x > p.rect.width || p.y < 0 || p.y > p.rect.height) return;
            var hit = spHitTest(p.x, p.y);
            var additive = e.ctrlKey || e.metaKey;
            if (hit) {
              if (!additive || spSelDiff !== hit.diff) {  // 別譜面に移ったら選択し直し
                spSelNotes = [hit.note]; spSelDiff = hit.diff;
              } else {
                var at = spSelNotes.indexOf(hit.note);
                if (at >= 0) spSelNotes.splice(at, 1); else spSelNotes.push(hit.note);
                if (!spSelNotes.length) spSelDiff = null;
              }
              return;
            }
            /* ノーツ以外をクリック → Ctrl でなければ選択解除。
               加えて、そのレーンを効果音の対象にする（従来どおり）。
               レーンの範囲内をクリックした時だけ。クランプすると余白クリックで
               最下段が選ばれてしまうため。 */
            if (!additive) spClearSelection();
            var geom = spCanvas.__spreadGeom;
            if (!geom || !geom.n) return;
            var idx = Math.floor((p.y - geom.topPad) / geom.laneH);
            if (idx < 0 || idx >= geom.n) return;
            spSoundLane = idx;
          });
          /* 右ドラッグでコンテキストメニューが出ないように */
          spCanvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

          /* ホイール: 通常=スナップ単位でシーク / Ctrl+ホイール=ズーム */
          spCanvas.addEventListener('wheel', function (e) {
            if (e.ctrlKey) {
              setSpZoom(spPxPerMs * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
              e.preventDefault();
              return;
            }
            if (spAudio && !spAudio.paused) spAudio.pause(); // ホイールでシークしたら音楽は止める
            /* 連続で速く回すほど1ノッチの移動目盛りを増やす（単発はきっちり1目盛り） */
            var now = performance.now();
            if (now - spWheelLast < SP_WHEEL_GAP) spWheelAccel = Math.min(spWheelAccel + 1, SP_WHEEL_MAX);
            else spWheelAccel = 1;
            spWheelLast = now;
            var base = getSpreadTime(); if (base == null) base = 0;
            var red = spreadRefRed(getSpreadDiffs());
            var dir = e.deltaY > 0 ? 1 : -1; // 下回し=進む
            setSpreadManual(spreadSnapStep(red, base, spSnap, dir, spWheelAccel));
            e.preventDefault();
          }, { passive: false });

          /* ダブルクリックで追従に復帰 */
          spCanvas.addEventListener('dblclick', function (e) {
            spreadManualTime = null;
            e.preventDefault();
          });

          /* ── 音楽付き再生（スペースキー。osu! には同期しない） ── */
          var spAudio = new Audio();
          spAudio.preload = 'auto';
          spAudio.volume = spMusicVolume01;   // 設定した曲の音量を反映
          spAudio.playbackRate = spPlaybackRate; // 設定した再生速度を反映
          var spAudioSrcRef = null;
          var syncSpreadAudioSrc = function () {
            var a = window.__loadedAudio;
            var url = a && a.url ? a.url : null;
            if (url === spAudioSrcRef) return;
            spAudioSrcRef = url;
            spreadAudioPlaying = false;
            try { spAudio.pause(); } catch (e) {}
            if (url) spAudio.src = url; else spAudio.removeAttribute('src');
          };
          /* 'play' は play() を呼んだ時点で発火し、まだ実際に音が出ていないことがある。
             実際に再生が始まる 'playing' を使う（開始直後に効果音が先走るのを防ぐ）。 */
          spAudio.addEventListener('playing', function () { spreadAudioPlaying = true; });
          spAudio.addEventListener('pause',   function () { spreadAudioPlaying = false; });
          spAudio.addEventListener('ended',   function () { spreadAudioPlaying = false; });

          var toggleSpreadPlay = function () {
            syncSpreadAudioSrc();
            if (!spAudioSrcRef) return; // 音源が無い
            if (spAudio.paused) {
              /* 音楽を ctx 経由にしている場合、suspended だと無音になるので必ず起こす */
              if (spSharedCtx) ensureSpreadAudioCtx();
              var base = getSpreadTime(); if (base == null) base = 0;
              var durMs = (spAudio.duration && isFinite(spAudio.duration)) ? spAudio.duration * 1000 : Infinity;
              var startMs = Math.max(0, Math.min(base, durMs - 1));
              try { spAudio.currentTime = startMs / 1000; } catch (e) {}
              spAudio.play().catch(function () {});
            } else {
              spAudio.pause();
              spreadManualTime = spAudio.currentTime * 1000; // 停止位置で固定
            }
          };

          /* ── 下部バー: 時間/％表示・進捗バー・再生操作 ── */
          var spProgCanvas = document.getElementById('etb-sb-progress-canvas');
          var spProgWrap   = document.getElementById('etb-sb-progress');
          /* 音源長(ms)。読み込み済みなら audio 要素の値を優先 */
          var getSpreadDuration = function () {
            if (spAudio && spAudio.duration && isFinite(spAudio.duration)) return spAudio.duration * 1000;
            var a = window.__loadedAudio;
            return a && a.durationMs > 0 ? a.durationMs : 0;
          };
          var pad = function (n, w) { n = String(Math.floor(n)); while (n.length < w) n = '0' + n; return n; };
          var fmtSpreadTime = function (ms) {
            if (!isFinite(ms) || ms < 0) ms = 0;
            return pad(ms / 60000, 2) + ':' + pad((ms % 60000) / 1000, 2) + ':' + pad(ms % 1000, 3);
          };

          /* タイムスタンプをクリップボードへ。
             ノーツ選択中は osu! と同じ「01:32:493 (1,2,3) - 」形式（時刻は選択の先頭ノーツ、
             括弧内は時間順のコンボ番号）。未選択なら現在位置の「01:32:493 - 」。 */
          var copyCurrentTimestamp = function () {
            var text;
            if (spSelNotes.length) {
              var sorted = spSelNotes.slice().sort(function (a, b) { return a.time - b.time; });
              var nums = sorted.map(function (n) { return n.combo || 1; }).join(',');
              text = fmtSpreadTime(sorted[0].time) + ' (' + nums + ') - ';
            } else {
              var t = getSpreadTime();
              if (t == null || !isFinite(t) || t < 0) t = 0;
              text = fmtSpreadTime(t) + ' - ';
            }
            if (!window.electronAPI || !window.electronAPI.copyText) return;
            window.electronAPI.copyText(text);
            var el = document.getElementById('etb-sb-time');
            if (el) {
              el.classList.add('copied');
              setTimeout(function () { el.classList.remove('copied'); }, 700);
            }
          };
          /* プレイタイムのダブルクリックでコピー */
          var sbTimeEl = document.getElementById('etb-sb-time');
          if (sbTimeEl) sbTimeEl.addEventListener('dblclick', function (e) {
            copyCurrentTimestamp();
            e.preventDefault();
          });
          /* プレビュー表示中の Ctrl+C でコピー（文字入力中は通常のコピーを優先） */
          document.addEventListener('keydown', function (e) {
            if (!spPreviewOn) return;
            if (!(e.ctrlKey || e.metaKey) || (e.key !== 'c' && e.key !== 'C')) return;
            var t = e.target;
            if (t) {
              if (t.isContentEditable) return;
              var tag = t.tagName;
              if (tag === 'TEXTAREA' || tag === 'SELECT') return;
              if (tag === 'INPUT') {
                var ty = (t.type || 'text').toLowerCase();
                if (ty !== 'checkbox' && ty !== 'radio' && ty !== 'button' &&
                    ty !== 'submit' && ty !== 'reset' && ty !== 'range') return;
              }
            }
            e.preventDefault();
            copyCurrentTimestamp();
          });
          /* Esc でノーツの選択を解除 */
          document.addEventListener('keydown', function (e) {
            if (!spPreviewOn || e.key !== 'Escape') return;
            if (spSelNotes.length) { spClearSelection(); e.preventDefault(); }
          });
          /* 毎フレーム: 時間・％・進捗バーを更新 */
          var updateSpreadBottom = function (diffs, curMs) {
            var dur = getSpreadDuration();
            var t = (curMs != null && isFinite(curMs)) ? curMs : 0;
            var te = document.getElementById('etb-sb-time');
            if (te) te.textContent = fmtSpreadTime(t);
            var pe = document.getElementById('etb-sb-pct');
            if (pe) pe.textContent = (dur > 0 ? (Math.max(0, Math.min(1, t / dur)) * 100).toFixed(1) : '0.0') + '%';
            if (spProgCanvas && window.drawTaikoProgressBar) {
              /* マーカーは「選択中のレーン」の譜面のものを表示 */
              var d = diffs[Math.min(spSoundLane, diffs.length - 1)];
              window.drawTaikoProgressBar(spProgCanvas, d ? d.marks : null, dur, curMs);
            }
          };
          /* 進捗バー: クリック / 左右ボタンでのドラッグ（押しながら左右）でシーク */
          var spProgDragging = false;
          var seekProgressAt = function (clientX) {
            var dur = getSpreadDuration();
            if (!(dur > 0) || !spProgWrap) return;
            var r = spProgWrap.getBoundingClientRect();
            if (r.width <= 0) return;
            var frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
            var target = frac * dur;
            if (spAudio && spAudioSrcRef) { try { spAudio.currentTime = target / 1000; } catch (_) {} }
            /* 音源長の範囲内なので、ノーツ範囲へのクランプは通さず直接指定 */
            spreadManualTime = target;
          };
          if (spProgWrap) {
            spProgWrap.addEventListener('mousedown', function (e) {
              if (e.button !== 0 && e.button !== 2) return; // 左/右ボタン
              spProgDragging = true;
              seekProgressAt(e.clientX);
              e.preventDefault();
            });
            /* 右ドラッグ中にコンテキストメニューが出ないように */
            spProgWrap.addEventListener('contextmenu', function (e) { e.preventDefault(); });
            window.addEventListener('mousemove', function (e) {
              if (!spProgDragging) return;
              seekProgressAt(e.clientX); // バー外へ出ても端にクランプして追従
            });
            window.addEventListener('mouseup', function () { spProgDragging = false; });
          }
          /* 再生 / 一時停止 / 停止 / Test */
          var sbPlay = document.getElementById('etb-sb-play');
          if (sbPlay) sbPlay.addEventListener('click', function () {
            if (spAudio && spAudio.paused) toggleSpreadPlay();
          });
          var sbPause = document.getElementById('etb-sb-pause');
          if (sbPause) sbPause.addEventListener('click', function () {
            if (spAudio && !spAudio.paused) toggleSpreadPlay();
          });
          var sbStop = document.getElementById('etb-sb-stop');
          if (sbStop) sbStop.addEventListener('click', function () {
            if (spAudio) { try { spAudio.pause(); spAudio.currentTime = 0; } catch (_) {} }
            setSpreadManual(0);
          });
          /* Test: 等速表示 ⇔ ゲーム画面表示（SV適用）を切替 */
          var sbTest = document.getElementById('etb-sb-test');
          if (sbTest) sbTest.addEventListener('click', function () {
            spSvMode = !spSvMode;
            sbTest.classList.toggle('active', spSvMode);
            updateZoomEnabled(); // SVモード中はズーム不可
          });

          /* スペースキーで再生/一時停止（スプレッド表示中）。
             直前に触ったチェックボックス/ボタンにフォーカスが残っていても、
             スペースを奪われず再生を優先する。文字入力中だけは邪魔しない。 */
          document.addEventListener('keydown', function (e) {
            if (!spPreviewOn) return;
            if (e.code !== 'Space' && e.key !== ' ') return;
            var t = e.target;
            if (t) {
              if (t.isContentEditable) return;
              var tag = t.tagName;
              if (tag === 'TEXTAREA' || tag === 'SELECT') return;
              if (tag === 'INPUT') {
                var ty = (t.type || 'text').toLowerCase();
                /* チェック/ラジオ/ボタン/スライダー以外（＝文字入力系）はスペースを譲る */
                if (ty !== 'checkbox' && ty !== 'radio' && ty !== 'button' &&
                    ty !== 'submit' && ty !== 'reset' && ty !== 'range') return;
              }
            }
            e.preventDefault();
            toggleSpreadPlay();
          });

          /* 効果音を Web Audio クロックに「先読みスケジュール」して鳴らす。
             描画ループ(約16ms)で通過検出→即再生 だと検出遅れぶん遅延するため、
             少し先(SP_SFX_LOOKAHEAD_MS)までのノーツを正確な発音時刻で予約する。 */
          var SP_SFX_LOOKAHEAD_MS = 120;
          var SP_SFX_SETTLE_MS = 200;  // 再生開始直後、出音が安定するまで予約を見送る時間
          var spSfxPlayFrom = null;    // この再生セッションの開始曲位置
          var spSfxLastSong = null;   // 前フレームの曲時刻（シーク検出用）
          var spSfxSchedTo = null;    // ここまでの曲時刻を予約済み
          var scheduleSpreadHitSounds = function (diffs, playing) {
            if (!spHitSounds || !spSynth || !spSynth.ctx || !playing) {
              spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null; return;
            }
            /* シーク中・バッファ待ちの間は予約しない（実音が出ていない間に先走るのを防ぐ）。
               再開時は下のシーク検出で予約位置がリセットされる。 */
            if (spAudio.seeking || spAudio.readyState < 3) {
              spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null; return;
            }
            var songNow = spAudio.currentTime * 1000;
            var ctxNow  = spSynth.ctx.currentTime;
            var rate    = spPlaybackRate || 1; // 曲時刻→実時間の換算（再生速度）
            /* 音楽も同じ ctx を通しているので出力レイテンシは共通＝相殺される。
               追加の補正は不要（設定画面の「効果音オフセット」で手動微調整のみ）。 */
            /* シーク/巻き戻し/大ジャンプ → 予約位置をリセット（過去を鳴らさない） */
            if (spSfxLastSong == null || songNow < spSfxLastSong - 5 || songNow - spSfxLastSong > 300) {
              spSfxSchedTo = songNow;
              spSfxPlayFrom = null; // シーク直後も立ち上がりを待ち直す
            }
            spSfxLastSong = songNow;
            /* 再生/シーク直後は currentTime と実際の出音がまだ一致していないことがある
               （曲・デコーダ依存）。開始位置から十分進むまでは予約を見送る。 */
            if (spSfxPlayFrom == null) spSfxPlayFrom = songNow;
            if (songNow - spSfxPlayFrom < SP_SFX_SETTLE_MS) { spSfxSchedTo = songNow; return; }
            var from = Math.max(spSfxSchedTo == null ? songNow : spSfxSchedTo, songNow);
            var horizon = songNow + SP_SFX_LOOKAHEAD_MS;
            var diff = diffs[Math.min(spSoundLane, diffs.length - 1)];
            if (diff && diff.notes) {
              var notes = diff.notes;
              for (var k = 0; k < notes.length; k++) {
                var nt = notes[k].time;
                if (nt <= from) continue;
                if (nt > horizon) break; // ソート済み → 以降は先
                var when = ctxNow + (nt - songNow + spSfxOffsetMs) / 1000 / rate;
                var kind = notes[k].kind;
                if (kind === 'don') spSynth.don(notes[k].big, when);
                else if (kind === 'kat') spSynth.kat(notes[k].big, when);
                /* 連打(drumroll)・風船(denden)は鳴らさない */
              }
            }
            spSfxSchedTo = horizon;
          };

          var spRaf = null;
          var spLoop = function () {
            if (!spPreviewOn) { spRaf = null; return; }
            /* 音源を最新譜面に合わせて先読みしておく（スペース押下時に即再生できるよう） */
            syncSpreadAudioSrc();
            /* 自前の音楽再生中はその位置で譜面を流す */
            if (spreadAudioPlaying && !spAudio.paused) {
              spreadManualTime = spAudio.currentTime * 1000;
            }
            /* 非表示Diffを除外（レーンは上に詰まる）。両処理・描画で同じ配列を使う */
            var diffs = getSpreadDiffs().filter(function (d) { return !spHiddenDiffs[d.fileName]; });
            var curTime = getSpreadTime();
            /* 効果音（音楽再生中のみ、先読みスケジュール） */
            scheduleSpreadHitSounds(diffs, spreadAudioPlaying && !spAudio.paused);
            var isEn = false;
            try {
              var le = document.getElementById('langEn');
              isEn = !!(le && le.classList.contains('active'));
            } catch (e) {}
            updateSpreadBottom(diffs, curTime); // 下部バー（時間/％/進捗）
            window.drawTaikoSpread(spCanvas, diffs, curTime, {
              pxPerMs: spPxPerMs,
              snap: spSnap,
              svMode: spSvMode, /* SVスケールは実機速度に一致するよう描画側で自動計算 */
              soundLane: spHitSounds ? Math.min(spSoundLane, diffs.length - 1) : -1,
              judgeFrac: spJudgeFrac,
              showNcCymbal: spShowNc,
              isSelected: spSelNotes.length ? spIsSelected : null,
              marquee: spMarquee,
              emptyText: isEn ? 'No beatmap loaded' : '譜面が読み込まれていません',
              idleText:  isEn ? 'Play in osu! to scroll' : 'osu! を再生すると流れます'
            });
            spRaf = requestAnimationFrame(spLoop);
          };

          /* 「プレビュー」トップタブから ON/OFF される。ON で描画開始、OFF で停止＋音楽停止。 */
          var setSpreadActive = function (on) {
            spPreviewOn = !!on;
            if (spPreviewOn) {
              if (!spRaf) spRaf = requestAnimationFrame(spLoop);
            } else {
              if (spAudio && !spAudio.paused) spAudio.pause();
            }
          };
          window.__setSpreadActive = setSpreadActive;
        }

        /* Electron 既定: 保存設定がまだ無い初回のみ、web では既定 OFF の
           「音声波形・BN評価」を ON にする（タイムラインは exe では非表示なので対象外）。
           （localStorage は web と exe で別管理。既存ユーザーの保存設定は尊重） */
        try {
          if (!localStorage.getItem('moddingHelperVisibleTabs')) {
            var defaultOnTabs = ['offsetWaveform', 'bnCompare'];
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
           初期値は保存済みのチェック対象設定に合わせる（script.js と一致させる）。 */
        var panelMode = 'file';
        try {
          if (localStorage.getItem('moddingHelperCheckSource') === 'osu') panelMode = 'osu';
        } catch (e) {}

        /* スプレッド表示の時刻ソース:
           - 通常は osu! の最新再生位置(spreadLastTime)に追従。
             前方予測は入れない（一時停止時に追い越して戻る現象を避けるため）。
           - ユーザーがスプレッド表示をドラッグ/ホイールでシークすると手動モード
             (spreadManualTime)になり、その位置を表示。
           - osu! の時刻が動いたら（再生/シーク）追従に復帰。ただしドラッグ中は維持。 */
        var spreadLastTime = null;
        var spreadManualTime = null;
        var spreadDragging = false;
        var spreadAudioPlaying = false; // modding-helper 内で音楽再生中か
        var getSpreadTime = function () {
          return spreadManualTime != null ? spreadManualTime : spreadLastTime;
        };

        /* トップレベルの表示モード: チェック / プレビュー / 設定 の3タブ。
           settingsMode = 設定表示, previewMode = プレビュー（スプレッド表示）, 両方 false = チェック */
        var settingsMode = false;
        var previewMode = false;

        /* 分離状態: 別ウィンドウに出しているパネルは true（メイン側のカードを隠す） */
        var detachState = { metadata: false, timing: false };

        /* Tags のチェック状態（タグ文字列→true）。譜面切替でリセット、分離/復帰で引き継ぐ */
        var tagChecked = Object.create(null);
        var lastRenderedTags = null;
        var applyTagChecked = function() {
          var meta = document.getElementById('osu-map-meta');
          if (!meta) return;
          var chips = meta.querySelectorAll('.osu-tag-chip');
          for (var i = 0; i < chips.length; i++) {
            if (tagChecked[chips[i].textContent]) chips[i].classList.add('checked');
            else chips[i].classList.remove('checked');
          }
        };

        /* ── グラフの再生ヘッド（リアルタイム時刻バー） ──
           各グラフは描画時に canvas.__playheadGeom = { plot, viewStart, viewEnd } を保存する。
           osu! モードで時刻が流れている時のみ、表示中グラフに縦バーを重ねる。 */
        var playheadChartIds = ['kiaiCompareChart', 'volumeCompareChart', 'spreadDensityChart',
                                'spreadRestChart', 'spreadScrollChart', 'spreadScrollDeltaChart',
                                'offsetWaveformCanvas'];
        var playheadEls = {};
        var markerEls = {};
        var currentDiffFile = null;  // osu! で現在開いている .osu 名（マーカー対象 Diff）
        var getPlayheadEl = function(id) {
          if (playheadEls[id]) return playheadEls[id];
          var cv = document.getElementById(id);
          if (!cv || !cv.parentElement) return null;
          var wrap = cv.parentElement;
          if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
          var d = document.createElement('div');
          d.className = 'etb-playhead';
          d.style.display = 'none';
          wrap.appendChild(d);
          playheadEls[id] = d;
          return d;
        };
        var getMarkerEl = function(id) {
          if (markerEls[id]) return markerEls[id];
          var cv = document.getElementById(id);
          if (!cv || !cv.parentElement) return null;
          var wrap = cv.parentElement;
          var m = document.createElement('div');
          m.className = 'etb-chart-marker';
          m.style.display = 'none';
          m.innerHTML = '<span class="etb-chart-marker-dot"></span><span class="etb-chart-marker-label"></span>';
          wrap.appendChild(m);
          markerEls[id] = m;
          return m;
        };
        var lastPlayheadMs = -1;  // 直近の再生位置（タブ切替時の再描画用に保持）
        /* グラフ1つぶんの再生ヘッド配置。
           非表示タブで描かれたジオメトリは幅が違う（＝古い）ので、その時は出さない。
           古い幅のまま置くと、タブ切替直後に間違った位置にバーが見えてしまう。 */
        var positionPlayhead = function(id, ms) {
          var cv = document.getElementById(id);
          var d  = getPlayheadEl(id);
          var mk = getMarkerEl(id);
          if (!cv || !d) return;
          var g = cv.__playheadGeom;
          var stale = g && g.__cw != null && g.__cw !== cv.clientWidth;
          if (ms < 0 || !g || !g.plot || cv.offsetParent === null || stale) {
            d.style.display = 'none'; if (mk) mk.style.display = 'none'; return;
          }
          var span = g.viewEnd - g.viewStart;
          if (span <= 0) { d.style.display = 'none'; if (mk) mk.style.display = 'none'; return; }
          var frac = (ms - g.viewStart) / span;
          if (frac < 0 || frac > 1) { d.style.display = 'none'; if (mk) mk.style.display = 'none'; return; }
          var x = cv.offsetLeft + g.plot.left + frac * g.plot.width;
          d.style.left   = x + 'px';
          d.style.top    = (cv.offsetTop + g.plot.top) + 'px';
          d.style.height = g.plot.height + 'px';
          d.style.display = '';
          /* 現 Diff との交点マーカー（チャートが __markerAt を提供する場合のみ） */
          if (mk && typeof cv.__markerAt === 'function') {
            var info = cv.__markerAt(ms, currentDiffFile);
            if (info && typeof info.y === 'number') {
              mk.style.left = x + 'px';
              mk.style.top  = (cv.offsetTop + info.y) + 'px';
              var dot = mk.firstChild, lab = mk.lastChild;
              if (dot) dot.style.background = info.color || '#fff';
              if (lab) lab.textContent = info.label != null ? info.label : '';
              mk.style.display = '';
            } else {
              mk.style.display = 'none';
            }
          } else if (mk) {
            mk.style.display = 'none';
          }
        };
        var updatePlayheads = function(ms) {
          lastPlayheadMs = ms;
          for (var i = 0; i < playheadChartIds.length; i++) positionPlayhead(playheadChartIds[i], ms);
        };

        /* ── グラフ再描画への追従 ──
           各グラフは ResizeObserver で「表示された瞬間」に描き直す。その時に
           canvas.__playheadGeom が書き換わるので、代入をフックして即座にバーを置き直す。
           これが無いと、描き直された後もバーが古い位置に残り、次のタイマー(200ms)や
           osu! からの次の時刻が届くまで直らない＝切替時にワンテンポ遅れて飛ぶ。 */
        var geomDirty = {}, geomRaf = null;
        var flushGeomDirty = function() {
          geomRaf = null;
          var ids = Object.keys(geomDirty);
          geomDirty = {};
          if (panelMode !== 'osu' || settingsMode || previewMode) return;
          for (var i = 0; i < ids.length; i++) positionPlayhead(ids[i], lastPlayheadMs);
        };
        var hookChartGeom = function(id) {
          var cv = document.getElementById(id);
          if (!cv || cv.__etbGeomHooked) return;
          cv.__etbGeomHooked = true;
          var stored = cv.__playheadGeom || null;
          Object.defineProperty(cv, '__playheadGeom', {
            configurable: true,
            get: function() { return stored; },
            set: function(v) {
              stored = v;
              /* 描画時のキャンバス寸法を控える。表示切替でサイズが変わると
                 現在値と食い違うので「古いジオメトリ」と判定できる。 */
              if (v) { v.__cw = cv.clientWidth; v.__ch = cv.clientHeight; }
              geomDirty[id] = true;
              if (!geomRaf) geomRaf = requestAnimationFrame(flushGeomDirty);
            }
          });
        };
        for (var hi = 0; hi < playheadChartIds.length; hi++) hookChartGeom(playheadChartIds[hi]);
        var hideAllPlayheads = function() {
          for (var k in playheadEls) { if (playheadEls[k]) playheadEls[k].style.display = 'none'; }
          for (var k2 in markerEls) { if (markerEls[k2]) markerEls[k2].style.display = 'none'; }
        };
        /* タブ切替などで表示が変わった後、保持している時刻で再生ヘッドを復帰させる。
           osu! が一時停止中は新しい時刻が来ないため、これが無いと消えたままになる。 */
        var refreshPlayheads = function() {
          if (panelMode !== 'osu' || settingsMode || previewMode) return;
          updatePlayheads(lastPlayheadMs);
        };
        /* 保険: 少し経ってもジオメトリが古いまま＝グラフが描き直されていない場合、
           resize を投げて再描画パスを起こす（グラフ側は resize で描き直す）。
           通常は表示された時点で ResizeObserver が発火するのでここは通らない。 */
        var nudgeStaleCharts = function() {
          if (panelMode !== 'osu' || settingsMode || previewMode) return;
          for (var i = 0; i < playheadChartIds.length; i++) {
            var cv = document.getElementById(playheadChartIds[i]);
            var g = cv && cv.__playheadGeom;
            if (cv && g && g.__cw != null && g.__cw !== cv.clientWidth && cv.offsetParent !== null) {
              window.dispatchEvent(new Event('resize'));
              return;
            }
          }
        };
        /* 表示切替直後はレイアウト確定/チャート再描画を待つ必要があるため複数回試す */
        var schedulePlayheadRefresh = function() {
          requestAnimationFrame(refreshPlayheads);
          setTimeout(function() { refreshPlayheads(); nudgeStaleCharts(); }, 200);
        };
        /* タブ・サブタブ・ズームリセットのクリックで再生ヘッドを再適用 */
        document.addEventListener('click', function(e) {
          if (!e.target || !e.target.closest) return;
          if (!e.target.closest('.tab-button, .spread-subtab-button, .bn-subtab-button, [id$="ResetZoom"]')) return;
          schedulePlayheadRefresh();
        });
        /* グラフ上のドラッグでズームした直後にも再配置（表示範囲 viewStart/viewEnd が変わるため） */
        document.addEventListener('mouseup', function(e) {
          if (!e.target || !e.target.id) return;
          if (playheadChartIds.indexOf(e.target.id) < 0) return;
          schedulePlayheadRefresh();
        });
        /* ウィンドウリサイズでもプロット領域が変わるので再配置 */
        window.addEventListener('resize', schedulePlayheadRefresh);

        /* 待機テキスト（言語・モード対応） */
        var updateWaitingText = function() {
          var w = document.getElementById('osu-map-waiting');
          if (!w) return;
          var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
          if (panelMode === 'file') {
            w.innerHTML = isEn
              ? 'Load a file to<br>display its metadata'
              : 'ファイルを読み込むと<br>メタデータが表示されます';
          } else {
            w.innerHTML = isEn
              ? 'Select a beatmap in osu!<br>to display info here'
              : 'osu! で譜面を選択すると<br>ここに情報が表示されます';
          }
        };
        updateWaitingText();

        /* カード表示の切替（panelMode と settingsMode を反映）:
           通常時   左→リアルタイム/譜面ファイル, 中央→チェックリスト
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
          var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
          el.textContent = txt || (isEn ? 'No beatmap loaded' : '譜面が読み込まれていません');
          el.classList.toggle('etb-compact-meta-empty', !txt);
        };
        var applyViewModeUi = function() {
          var layoutEl = document.getElementById('electron-layout');
          if (layoutEl) layoutEl.classList.toggle('etb-compact', viewMode === 'compact');
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
          /* 左カラム（設定モード中・分離中のカードは隠す。カラム全体はプレビューで CSS が隠す） */
          setDisp('etb-card-meta',         !s && !detachState.metadata);
          setDisp('etb-card-realtime',     !s && isOsu && !detachState.timing);
          setDisp('etb-card-file',         !s && !isOsu);
          setDisp('etb-card-viewsettings',  s);
          setDisp('etb-card-loadsettings',  s);
          setDisp('etb-card-previewsettings', s);
          applyViewModeUi();   // モード切替でドロップエリアの置き場所が変わる
          /* 設定を開いたら Diff表示チェックリストを現在の譜面で作り直す */
          if (s && window.__spreadRebuildDiffList) window.__spreadRebuildDiffList();
          /* 中央カラム（チェックリスト） */
          setDisp('etb-checklist-buttons-body',  !s);
          setDisp('etb-checklist-settings-body',  s);
          /* 右カラム（チェック結果/プレビュー）は設定モード中のみ隠す */
          setDisp('electron-col-output',  !s);
          /* レイアウトのモードクラス（設定=50/50, プレビュー=スプレッド全面） */
          var layoutEl = document.getElementById('electron-layout');
          if (layoutEl) {
            layoutEl.classList.toggle('etb-settings', s);
            layoutEl.classList.toggle('etb-preview', pv);
          }
          /* スプレッド表示の描画ループ ON/OFF */
          if (window.__setSpreadActive) window.__setSpreadActive(pv);
          /* osu! モード以外・設定/プレビュー中は再生ヘッドを隠す */
          if (!isOsu || s || pv) hideAllPlayheads();
          else schedulePlayheadRefresh(); // チェック表示に戻ったら保持時刻で復帰
          /* チェックリストカードのタイトル切替 */
          var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
          var clT = document.getElementById('etb-title-checklist');
          if (clT) clT.textContent = s
            ? (isEn ? 'Check list settings' : 'チェックリストの設定')
            : (isEn ? 'Check list' : 'チェックリスト');
          /* チェック/プレビュー/設定ボタンのアクティブ表示（今どこを見ているか） */
          var sBtn = document.getElementById('toggleTabSettings');
          if (sBtn) sBtn.classList.toggle('active', s);
          var mBtn = document.getElementById('etb-tab-main');
          if (mBtn) mBtn.classList.toggle('active', !s && !pv);
          var pvBtn = document.getElementById('etb-tab-preview');
          if (pvBtn) pvBtn.classList.toggle('active', pv);
        };
        var resetTimingPanel = function() {
          var ids = { 'osu-t-timing': '--:--:---', 'osu-t-bpm': '---',
                      'osu-t-sv': '---', 'osu-t-vbpm': '---', 'osu-t-vol': '---' };
          Object.keys(ids).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = ids[id];
          });
        };
        var clearMetaToWaiting = function() {
          lastMapMeta = null; updateCompactMeta();
          var meta = document.getElementById('osu-map-meta');
          if (meta) { meta.innerHTML = '<div id="osu-map-waiting"></div>'; updateWaitingText(); }
          var bgw = document.getElementById('osu-map-bg-wrap');
          if (bgw) bgw.style.display = 'none';
          var bg = document.getElementById('osu-map-bg');
          if (bg) bg.src = '';
        };
        applyPanelModeUi();

        /* TAGS チップのクリックで色付けトグル（全タグを確認する際のチェックオフ用）。
           チップは再描画で作り直されるため #osu-map-meta にイベント委譲する */
        var metaForTags = document.getElementById('osu-map-meta');
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

        /* パネル分離ボタン: クリックで別ウィンドウに出し、メイン側のカードを隠す */
        Array.prototype.slice.call(document.querySelectorAll('.etb-detach-btn')).forEach(function(btn) {
          btn.addEventListener('click', function(ev) {
            ev.stopPropagation();
            var panel = btn.getAttribute('data-panel');
            if (panel !== 'metadata' && panel !== 'timing') return;
            detachState[panel] = true;
            applyPanelModeUi();
            var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
            var checkedArr = (panel === 'metadata') ? Object.keys(tagChecked) : undefined;
            if (window.electronAPI && window.electronAPI.detachPanel) {
              window.electronAPI.detachPanel(panel, isEn ? 'en' : 'ja', checkedArr);
            }
          });
        });

        /* 分離ウィンドウが閉じられたらカードを復帰 */
        if (window.electronAPI && window.electronAPI.onPanelRedocked) {
          window.electronAPI.onPanelRedocked(function(panel, checked) {
            if (panel === 'metadata' || panel === 'timing') {
              detachState[panel] = false;
              /* メタデータ: 分離窓の Tags チェック状態を引き継ぐ */
              if (panel === 'metadata' && Array.isArray(checked)) {
                tagChecked = Object.create(null);
                checked.forEach(function(t) { tagChecked[t] = true; });
                applyTagChecked();
              }
              applyPanelModeUi();
            }
          });
        }

        /* 各グラフの右上に分離ボタンを設置（別ウィンドウで独立表示） */
        [
          { wrap: 'kiaiCompareChartWrap',       chart: 'kiaiCompareChart' },
          { wrap: 'volumeCompareChartWrap',     chart: 'volumeCompareChart' },
          { wrap: 'spreadDensityChartWrap',     chart: 'spreadDensityChart' },
          { wrap: 'spreadRestChartWrap',        chart: 'spreadRestChart' },
          { wrap: 'spreadScrollChartWrap',      chart: 'spreadScrollChart' },
          { wrap: 'spreadScrollDeltaChartWrap', chart: 'spreadScrollDeltaChart' },
          { wrap: 'offsetWaveformChartWrap',    chart: 'offsetWaveformCanvas' }
        ].forEach(function(item) {
          var wrap = document.getElementById(item.wrap);
          if (!wrap) return;
          if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
          var btn = document.createElement('button');
          btn.className = 'etb-chart-detach';
          btn.title = '別ウィンドウに分離';
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

        /* 「ツール」グループ（音声波形・タイムライン・BN評価）を最下部に隔離 */
        var toolAnchor = document.querySelector('#electron-col-tabs .tab-button[data-tab="bnCompare"]');
        if (toolAnchor) {
          var toolGroup = toolAnchor.closest('.tab-group');
          if (toolGroup) toolGroup.classList.add('etb-tool-group');
        }

        /* リアルタイム表示の値をダブルクリックでクリップボードにコピー */
        ['osu-t-timing', 'osu-t-bpm', 'osu-t-sv', 'osu-t-vbpm', 'osu-t-vol'].forEach(function(id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.title = 'ダブルクリックでコピー';
          el.addEventListener('dblclick', function() {
            var txt = (el.textContent || '').trim();
            if (!txt || txt === '---' || txt === '--:--:---') return;
            if (window.electronAPI && window.electronAPI.copyText) {
              window.electronAPI.copyText(txt);
              el.classList.add('etb-copied');
              setTimeout(function() { el.classList.remove('etb-copied'); }, 450);
            }
          });
        });

        /* タイミングパネルの言語対応ラベル */
        var updateTimingLabels = function() {
          var vbpmLabel = document.getElementById('osu-t-vbpm-label');
          if (!vbpmLabel) return;
          var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
          vbpmLabel.textContent = isEn ? 'Visual BPM' : '見た目 BPM';
        };
        updateTimingLabels();

        /* カードタイトルの言語対応 */
        var updatePanelTitles = function() {
          var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
          var set = function(id, ja, en) {
            var el = document.getElementById(id);
            if (el) el.textContent = isEn ? en : ja;
          };
          set('etb-title-meta',         'メタデータ',        'Metadata');
          set('etb-title-realtime',     'リアルタイム表示',   'Real-time');
          set('etb-title-file',         '譜面ファイル',       'Beatmap file');
          set('etb-title-loadsettings', '譜面読み込み設定',   'Beatmap loading');
          set('etb-title-previewsettings', 'プレビュータブ設定', 'Preview tab');
          set('etb-difforder-title',    'Diff順',            'Diff order');
          set('etb-difforder-desc',     '難→易（上が難しい）', 'Hard→Easy (top=hardest)');
          set('etb-difforder-asc',      '易→難（上が易しい）', 'Easy→Hard (top=easiest)');
          set('etb-title-viewsettings',  '表示モード',          'Display mode');
          set('etb-viewmode-wide',     'ワイド',   'Wide');
          set('etb-viewmode-compact',  'コンパクト', 'Compact');
          set('etb-judgepos-title',     '判定ラインの位置',    'Judgement line');
          set('etb-judgepos-center',    '中央',              'Center');
          set('etb-judgepos-left',      '左寄せ', 'Left');
          set('etb-diffvis-title',      '表示するDiff',       'Shown diffs');
          set('etb-diffvis-none',       '（譜面が読み込まれていません）', '(No beatmap loaded)');
          set('etb-title-checklist',
              settingsMode ? 'チェックリストの設定' : 'チェックリスト',
              settingsMode ? 'Check list settings'  : 'Check list');
          set('etb-title-results',      'チェック結果',       'Check results');
          set('etb-tab-main',           'チェック',          'Check');
          set('etb-tab-preview',        'プレビュー',        'Preview');
          set('toggleTabSettings',      '設定',              'Settings');
          set('etb-spread-snap-text',   'ビートスナップ間隔',  'Beat Snap Divisor');
          set('etb-spread-sfx-text',    '効果音',            'Hit sounds');
          set('etb-spread-nc-text',     'NCシンバルの小節線を強調表示', 'Highlight NC cymbal barlines');
          set('etb-sfx-settings-title', '効果音の種類',      'Hit sound set');
          set('etb-sfx-vol-label',      '効果音の音量',      'Hit sound vol.');
          set('etb-music-vol-label',    '曲の音量',          'Music vol.');
          set('etb-sfx-offset-label',   '効果音オフセット',   'Hit sound offset');
          set('etb-sfx-none',
              '（sounds/ に音源フォルダがありません。合成音を使用）',
              '(No sound folders in sounds/. Using synth.)');
        };
        updatePanelTitles();

        /* ⚙設定 ボタンで設定モードを切替 */
        var settingsToggleBtn = document.getElementById('toggleTabSettings');
        if (settingsToggleBtn) {
          settingsToggleBtn.addEventListener('click', function() {
            settingsMode = true; previewMode = false; // 「設定」表示へ
            applyPanelModeUi();
          });
        }

        /* ── .top-links の子要素を #etb-nav に移動 ── */
        try {
          var navEl = document.getElementById('etb-nav');
          if (topLinks && navEl) {
            var tlRow = topLinks.querySelector('.top-links-row');
            var langSwitch = topLinks.querySelector('.language-switch');
            if (tlRow) {
              var otherToolsA = tlRow.querySelector('a:not(#manualLink)');
              if (otherToolsA) otherToolsA.id = 'etb-other-tools';
              Array.from(tlRow.children).forEach(function(child) { navEl.appendChild(child); });
            }
            if (langSwitch) {
              var langSep = document.createElement('div');
              langSep.style.cssText = 'width:1px;background:#363636;margin:9px 4px;flex-shrink:0;-webkit-app-region:no-drag;';
              navEl.appendChild(langSep);
              Array.from(langSwitch.children).forEach(function(child) { navEl.appendChild(child); });
            }
            topLinks.remove();

            /* exe では外部リンク系（他のツールを見る / 更新履歴）は出さない。
               タイトルバーの幅を食い、ウィンドウを狭めた時にウィンドウ操作ボタンを
               押し出してしまうため。web ツール側には残っている。 */
            ['etb-other-tools', 'updateBtn'].forEach(function(id) {
              var el = document.getElementById(id);
              if (el) el.remove();
            });

            /* 絵文字を除去しつつ SVG アイコンを先頭に設定（innerHTML で再構築） */
            var updateNavItem = function(el, svg) {
              if (!el) return;
              var text = el.textContent.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/^\s+/, '');
              el.innerHTML = svg + text;
            };

            /* 説明書リンクを GitHub Pages URL に向ける */
            var manualLink = document.getElementById('manualLink');
            var updateDocsUrl = function() {
              if (!manualLink) return;
              var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
              manualLink.href = isEn
                ? 'https://calmeel.github.io/modding-helper/docs/docs-en.html'
                : 'https://calmeel.github.io/modding-helper/docs/docs.html';
            };
            updateDocsUrl();

            /* アイコン付きボタンを初期設定し、言語切替時も MutationObserver で即時再描画 */
            [
              { id: 'manualLink', svg: svgBook },
            ].forEach(function(item) {
              var el = document.getElementById(item.id);
              if (!el) return;
              updateNavItem(el, item.svg);
              (function(element, iconSvg) {
                var obs = new MutationObserver(function() {
                  obs.disconnect();
                  updateNavItem(element, iconSvg);
                  obs.observe(element, { childList: true, characterData: true, subtree: true });
                });
                obs.observe(element, { childList: true, characterData: true, subtree: true });
              })(el, item.svg);
            });

            /* langEn の class 変化（active 付与）を監視して docs URL・待機テキストを即時更新 */
            var langEnBtn = document.getElementById('langEn');
            if (langEnBtn) {
              new MutationObserver(function() {
                updateDocsUrl();
                updateWaitingText();
                updateTimingLabels();
                updatePanelTitles();
              }).observe(langEnBtn, { attributes: true, attributeFilter: ['class'] });
            }

            /* 設定ボタンのテキスト（歯車は付けない） */
            var settingsBtn = document.getElementById('toggleTabSettings');
            if (settingsBtn) settingsBtn.textContent = '設定';

            /* 「チェック」「プレビュー」ボタンを設定の前に追加し、
               チェック/プレビュー/設定 を明示的な切替タブにする */
            if (settingsBtn && settingsBtn.parentNode && !document.getElementById('etb-tab-main')) {
              var mainTabBtn = document.createElement('button');
              mainTabBtn.id = 'etb-tab-main';
              mainTabBtn.type = 'button';
              mainTabBtn.textContent = 'チェック';
              settingsBtn.parentNode.insertBefore(mainTabBtn, settingsBtn);
              mainTabBtn.addEventListener('click', function() {
                settingsMode = false; previewMode = false; // チェック表示へ
                applyPanelModeUi();
              });

              var previewTabBtn = document.createElement('button');
              previewTabBtn.id = 'etb-tab-preview';
              previewTabBtn.type = 'button';
              previewTabBtn.textContent = 'プレビュー';
              settingsBtn.parentNode.insertBefore(previewTabBtn, settingsBtn);
              previewTabBtn.addEventListener('click', function() {
                settingsMode = false; previewMode = true; // プレビュー（スプレッド表示）へ
                applyPanelModeUi();
              });

              applyPanelModeUi(); // 追加直後に active 表示を反映
            }

            var extSep = document.createElement('div');
            extSep.style.cssText = 'width:1px;background:#363636;margin:9px 4px;flex-shrink:0;-webkit-app-region:no-drag;';

            /* ナビの並び順を指定どおりに整える:
               チェック/プレビュー/設定 | 区切り | 日本語/English | 区切り | 説明書
               （appendChild は既存要素を移動するので、望む順に付け直すだけで並び替わる） */
            [
              document.getElementById('etb-tab-main'),      // チェック
              document.getElementById('etb-tab-preview'),   // プレビュー
              document.getElementById('toggleTabSettings'), // 設定
              langSep,                                      // 区切り
              document.getElementById('langJa'),            // 日本語
              document.getElementById('langEn'),            // English
              extSep,                                       // 区切り
              document.getElementById('manualLink')         // 説明書
            ].forEach(function(el) { if (el) navEl.appendChild(el); });
          }
        } catch(e) { /* ナビゲーション処理が失敗してもウィンドウ操作は継続 */ }

        /* ── ウィンドウコントロール ── */
        if (window.electronAPI) {
          document.getElementById('etb-min').addEventListener('click', function() {
            window.electronAPI.minimize();
          });
          document.getElementById('etb-max').addEventListener('click', function() {
            window.electronAPI.maximize();
          });
          document.getElementById('etb-close').addEventListener('click', function() {
            window.electronAPI.close();
          });

          window.electronAPI.onMaximize(function() {
            document.getElementById('etb-max').innerHTML = svgRes;
          });
          window.electronAPI.onUnmaximize(function() {
            document.getElementById('etb-max').innerHTML = svgMax;
          });

          /* アップデートのダウンロード進捗バー */
          if (window.electronAPI.onUpdateProgress) {
            var upToast = document.createElement('div');
            upToast.id = 'etb-update-toast';
            upToast.innerHTML =
              '<div class="etb-update-text">アップデートをダウンロード中 <span id="etb-update-pct">0</span>%</div>' +
              '<div class="etb-update-track"><div id="etb-update-fill"></div></div>';
            document.body.appendChild(upToast);
            window.electronAPI.onUpdateProgress(function(pct) {
              if (pct < 0 || pct >= 100) { upToast.style.display = 'none'; return; }
              upToast.style.display = '';
              document.getElementById('etb-update-pct').textContent = pct;
              document.getElementById('etb-update-fill').style.width = pct + '%';
            });
          }

          /* メタデータ行をパネルに描画（osu! / file 両モードで共用） */
          var renderMapPanel = function(data) {
            var bg   = document.getElementById('osu-map-bg');
            var meta = document.getElementById('osu-map-meta');
            if (!meta) return;
            lastMapMeta = data;   // コンパクトバー用に保持
            updateCompactMeta();
            if (!data) { clearMetaToWaiting(); return; }
            if (bg) bg.src = data.bgDataUrl || '';
            document.getElementById('osu-map-bg-wrap').style.display = data.bgDataUrl ? '' : 'none';
            var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
            var noneText = isEn ? 'None' : 'なし';
            var row = function(label, value, cls, alwaysShow) {
              if (!value && !alwaysShow) return '';
              var isEmpty = !value;
              var displayCls = isEmpty ? 'none' : (cls || '');
              var displayVal = isEmpty ? noneText : value;
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
              var isEnTag = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
              var chipTitle = isEnTag ? 'Click: mark / Double-click: copy' : 'クリック: チェック / ダブルクリック: コピー';
              var chips = data.tags.split(' ').filter(function(t) { return t; })
                .map(function(t) { return '<span class="osu-tag-chip" title="' + chipTitle + '">' + t + '</span>'; })
                .join('');
              return '<div class="osu-map-row"><span class="osu-map-label">Tags</span>' +
                '<div id="osu-map-tags">' + chips + '</div></div>';
            })();
            meta.innerHTML =
              row('Artist (Unicode)', data.artistUnicode, 'unicode') +
              row('Artist',           data.artist)                   +
              row('Title (Unicode)',  data.titleUnicode,  'unicode') +
              row('Title',            data.title)                    +
              row('Source',           data.source, 'source', true)   +
              tagsHtml;
            /* 譜面(タグ)が変わったらチェック状態をリセット。同一譜面なら維持して再適用 */
            var tagsKey = data.tags || '';
            if (tagsKey !== lastRenderedTags) { tagChecked = Object.create(null); lastRenderedTags = tagsKey; }
            applyTagChecked();
          };

          /* ── osu! タイミング情報 IPC（osu モードのみ反映） ── */
          window.electronAPI.onTimingInfo(function(data) {
            /* プレビュー(スプレッド)の追従は data.editing のときのみ許可。
               editing = Edit 画面 または エディタのテストプレイ（osuWatcher.js が判定）。
               本番のゲームプレイ中は追従させない＝デュアルスクリーンでの先読みチート対策。
               ※リアルタイム表示カードは下で常時更新（プレイ中OK）。
               osu! の時刻が届いた＝再生/シークなので、ドラッグ中でなければ手動解除。 */
            if (data && typeof data.time === 'number' && data.time >= 0 && data.editing) {
              spreadLastTime = data.time;
              /* ドラッグ中・自前の音楽再生中は手動位置を維持 */
              if (!spreadDragging && !spreadAudioPlaying) spreadManualTime = null;
            } else {
              spreadLastTime = null;
            }
            if (panelMode !== 'osu') return;
            /* グラフ上の再生ヘッドを更新（時刻が無ければ -1 で非表示） */
            updatePlayheads(data && typeof data.time === 'number' ? data.time : -1);
            var timing = document.getElementById('osu-t-timing');
            var bpm    = document.getElementById('osu-t-bpm');
            var sv     = document.getElementById('osu-t-sv');
            var vbpm   = document.getElementById('osu-t-vbpm');
            var vol    = document.getElementById('osu-t-vol');
            if (!timing) return;

            if (!data) {
              timing.textContent = '--:--:---';
              bpm.textContent    = '---';
              sv.textContent     = '---';
              vbpm.textContent   = '---';
              vol.textContent    = '---';
              return;
            }

            var ms  = data.time;
            var m   = Math.floor(ms / 60000);
            var s   = Math.floor((ms % 60000) / 1000);
            var mil = ms % 1000;
            timing.textContent = String(m).padStart(2, '0') + ':' +
                                  String(s).padStart(2, '0') + ':' +
                                  String(mil).padStart(3, '0');
            bpm.textContent  = data.bpm   !== null ? data.bpm.toFixed(2)  : '---';
            sv.textContent   = data.sv    !== null ? data.sv.toFixed(2)   : '---';
            vbpm.textContent = data.vbpm  !== null ? data.vbpm.toFixed(2) : '---';
            vol.textContent  = data.volume !== null ? data.volume + '%'   : '---';
          });

          /* ── osu! マップ情報 IPC（osu モードのみ反映） ── */
          window.electronAPI.onOsuMapInfo(function(data) {
            if (panelMode !== 'osu') return;
            currentDiffFile = data && data.diffFileName ? data.diffFileName : null;
            renderMapPanel(data);
          });

          /* ── script.js から呼ぶパネル制御 API ── */
          window.__osuPanel = {
            setMode: function(mode) {
              panelMode = (mode === 'file') ? 'file' : 'osu';
              applyPanelModeUi();
              resetTimingPanel();
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
              /* メタデータ分離ウィンドウにも反映（osu モードは osuWatcher 経由で届く） */
              if (window.electronAPI && window.electronAPI.sendMapMetaToPopout) {
                window.electronAPI.sendMapMetaToPopout(data || null);
              }
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
      })();
