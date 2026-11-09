// プレビューの再生、シーク、入力操作と表示設定を管理する。
function createElectronPreview({ outBody, previewSettingsBody, viewSettingsBody,
  text: electronText, playback, getSpreadTime, getPanelMode,
  getViewMode, setViewMode, applyViewModeUi, getTagDisplayMode, setTagDisplayMode, redrawMetadata }) {
  var options = {};
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
      '<span id="etb-spread-sfx-text" data-i18n="electronHitSounds">' +
        electronText('electronHitSounds') + '</span></label>' +
      /* 右: 小節/拍 + ビートスナップ(ドラッグ/マウスホイールで変更) */
      '<span class="etb-spread-right">' +
      '<span class="etb-spread-meter" id="etb-spread-meter" data-i18n-title="electronMeasureBeat" title="' +
        electronText('electronMeasureBeat') + '">--:--</span>' +
      '<span class="etb-spread-snap2" id="etb-spread-snap2" data-i18n-title="electronSnapControlHint" title="' +
        electronText('electronSnapControlHint') + '">' +
      '<span id="etb-spread-snap-text" data-i18n="electronBeatSnapDivisor">' +
        electronText('electronBeatSnapDivisor') + '</span> ' +
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
      '<span class="etb-sb-time" id="etb-sb-time" data-i18n-title="electronCopyTimeHint" title="' +
        electronText('electronCopyTimeHint') + '">00:00:000</span>' +
      '<span class="etb-sb-pct" id="etb-sb-pct">0.0%</span>' +
      '<span class="etb-sb-progress" id="etb-sb-progress" data-i18n-title="electronSeekHint" title="' +
        electronText('electronSeekHint') + '">' +
      '<canvas id="etb-sb-progress-canvas"></canvas>' +
      '</span>' +
      '<span class="etb-sb-controls">' +
      '<button type="button" id="etb-sb-play" data-i18n-title="electronPlay" title="' +
        electronText('electronPlay') + '">▶</button>' +
      '<button type="button" id="etb-sb-pause" data-i18n-title="electronPause" title="' +
        electronText('electronPause') + '">❚❚</button>' +
      '<button type="button" id="etb-sb-stop" data-i18n-title="electronStop" title="' +
        electronText('electronStop') + '">■</button>' +
      '<button type="button" id="etb-sb-test"  title="Test">Test</button>' +
      '</span>' +
      '<span class="etb-spread-speed" id="etb-spread-speed">' +
      '<button type="button" data-rate="0.25">25%</button>' +
      '<button type="button" data-rate="0.5">50%</button>' +
      '<button type="button" data-rate="0.75">75%</button>' +
      '<button type="button" data-rate="1">100%</button>' +
      '<button type="button" data-rate="1.5">150%</button>' +
      '</span>';
    spPanel.appendChild(spBottom);

    outBody.appendChild(spPanel);

    /* 表示状態: スナップ分割・ズーム(pxPerMs)・再生速度 */
    var SP_SNAP_DIVS = [1, 2, 3, 4, 6, 8, 12, 16];
    var spSnap = 4;
    try { var sn = parseInt(localStorage.getItem('moddingHelperPreviewSnap'), 10); if (SP_SNAP_DIVS.indexOf(sn) >= 0) spSnap = sn; } catch (e) {}
    var spPlaybackRate = 1;
    try { var pr = parseFloat(localStorage.getItem('moddingHelperPreviewRate')); if (pr === 0.25 || pr === 0.5 || pr === 0.75 || pr === 1 || pr === 1.5) spPlaybackRate = pr; } catch (e) {}
    /* Test: ゲーム画面表示（SV/BPM/SliderMultiplier を反映した実機同等のスクロール） */
    var spSvMode = false;
    /* 判定ラインの位置（プレイフィールド幅に対する割合）。
       左寄せの 0.2 は osu!taiko 実機の受け口位置（165/901.7≒0.18）に近い値。 */
    var SP_JUDGE_CENTER = 0.5, SP_JUDGE_LEFT = 0.2;
    options.judgementFraction = SP_JUDGE_CENTER;
    try {
      var jf = parseFloat(localStorage.getItem('moddingHelperPreviewJudgeFrac'));
      if (jf === SP_JUDGE_LEFT || jf === SP_JUDGE_CENTER) options.judgementFraction = jf;
    } catch (e) {}

    /* Diff順: true=難→易(上が難しい / 既定), false=易→難(上が易しい) */
    options.diffDescending = true;
    try { if (localStorage.getItem('moddingHelperPreviewDiffDesc') === '0') options.diffDescending = false; } catch (e) {}
    /* 非表示にする Diff（fileName→true）。localStorage に永続化 */
    options.hiddenDiffs = Object.create(null);
    var spVisibleDiffsRef = null;
    var spVisibleDiffs = [];
    var spVisibleDiffsDirty = true;
    try {
      var hd0 = JSON.parse(localStorage.getItem('moddingHelperPreviewHiddenDiffs') || '{}');
      if (hd0 && typeof hd0 === 'object') for (var hk in hd0) if (hd0[hk]) options.hiddenDiffs[hk] = true;
    } catch (e) {}
    var saveHiddenDiffs = function () {
      try { localStorage.setItem('moddingHelperPreviewHiddenDiffs', JSON.stringify(options.hiddenDiffs)); } catch (e) {}
    };
    var SP_FALLBACK_BASE_PX = 0.32;
    var SP_ZOOM_RATIO_MIN = 0.06 / SP_FALLBACK_BASE_PX;
    var SP_ZOOM_RATIO_MAX = 2.2 / SP_FALLBACK_BASE_PX;
    var spBasePxPerMs = SP_FALLBACK_BASE_PX;
    var spZoomRatio = 1;
    var spPxPerMs = spBasePxPerMs;
    var spBaseSpeedKey = '';
    var spBaseSpeedDiffsRef = null;
    var spBaseSpeedCanvasWidth = -1;
    var spBaseSpeedTimingInfo = null;
    var updateSpZoomLabel = function () {
      var l = document.getElementById('etb-spread-zoomlabel');
      if (l) l.textContent = Math.round(spZoomRatio * 100) + '%';
    };
    var setSpZoomRatio = function (ratio) {
      /* ゲーム画面表示(Test)中は実機と同じ速度で見せるためズーム不可 */
      if (spSvMode) return;
      spZoomRatio = Math.max(SP_ZOOM_RATIO_MIN, Math.min(SP_ZOOM_RATIO_MAX, ratio));
      spPxPerMs = spBasePxPerMs * spZoomRatio;
      updateSpZoomLabel();
    };
    var setSpZoom = function (v) {
      setSpZoomRatio(v / spBasePxPerMs);
    };
    /* 全Diffの dominant BPM の中央値を使い、難易度固有の例外に引っ張られないようにする。 */
    var getSpreadRepresentativeBpm = function (diffs) {
      var bpms = (diffs || []).map(function (d) { return d.dominantBpm; })
        .filter(function (bpm) { return Number.isFinite(bpm) && bpm > 0; })
        .sort(function (a, b) { return a - b; });
      if (!bpms.length) return null;
      var mid = Math.floor(bpms.length / 2);
      return bpms.length % 2 ? bpms[mid] : (bpms[mid - 1] + bpms[mid]) / 2;
    };
    var updateSpreadBaseSpeed = function (diffs) {
      var canvasWidth = Math.max(
        360,
        spCanvas.clientWidth || (spCanvas.parentElement && spCanvas.parentElement.clientWidth) || 800
      );
      if (spBaseSpeedDiffsRef === diffs &&
          spBaseSpeedCanvasWidth === canvasWidth &&
          spBaseSpeedTimingInfo === options.showTimingInfo) return;
      spBaseSpeedDiffsRef = diffs;
      spBaseSpeedCanvasWidth = canvasWidth;
      spBaseSpeedTimingInfo = options.showTimingInfo;
      var bpm = getSpreadRepresentativeBpm(diffs);
      var key = (bpm == null ? 'fallback' : bpm.toFixed(6)) + ':' +
        Math.round(canvasWidth) + ':' + (options.showTimingInfo ? 'info' : 'plain');
      if (key === spBaseSpeedKey) return;
      spBaseSpeedKey = key;
      var calculated = window.getTaikoEqualSpeedPxPerMs
        ? window.getTaikoEqualSpeedPxPerMs(bpm, canvasWidth, options.showTimingInfo)
        : null;
      spBasePxPerMs = Number.isFinite(calculated) && calculated > 0
        ? calculated
        : SP_FALLBACK_BASE_PX;
      spPxPerMs = spBasePxPerMs * spZoomRatio;
      updateSpZoomLabel();
    };
    /* ズームUIの有効/無効を SV モードに合わせて切り替える */
    var updateZoomEnabled = function () {
      var zi = document.getElementById('etb-spread-zoomin');
      var zo = document.getElementById('etb-spread-zoomout');
      if (zi) zi.disabled = spSvMode;
      if (zo) zo.disabled = spSvMode;
      var zl = document.getElementById('etb-spread-zoomlabel');
      if (zl) zl.textContent = spSvMode
        ? electronText('electronRealSpeed')
        : (Math.round(spZoomRatio * 100) + '%');
    };
    /* ビートスナップ: ドラッグ / マウスホイールで変更（osu!エディタ風）。表示と同期 */
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

    /* 再生速度（25/50/75/100/150%）: osu!エディタ風。自前の音楽再生に適用 */
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
    /* Kiai/NCは既定ON、BPM/SV/Volume情報は既定OFF。 */
    options.highlightKiai = true;
    options.showNc = true;
    options.showTimingInfo = false;
    options.transparentSliders = false;
    try {
      if (localStorage.getItem('moddingHelperPreviewKiaiHighlight') === '0') options.highlightKiai = false;
      if (localStorage.getItem('moddingHelperPreviewNcCymbal') === '0') options.showNc = false;
      if (localStorage.getItem('moddingHelperPreviewTimingInfo') === '1') options.showTimingInfo = true;
      if (localStorage.getItem('moddingHelperPreviewTransparentSliders') === '1') options.transparentSliders = true;
    } catch (e) {}
    var spSynth = null;        // Web Audio シンセ/サンプルキット
    var spSoundLane = 0;       // 効果音を鳴らすレーン（0=最上=最難）。クリックで変更

    /* 効果音セット（sounds/<セット>/）の選択。設定画面のラジオで切替、localStorage に保存 */
    var spSfxSets = Array.isArray(window.__taikoSoundSets) ? window.__taikoSoundSets : [];
    var spSfxSetId = null;
    try { spSfxSetId = localStorage.getItem('moddingHelperSfxSet'); } catch (e) {}
    /* 効果音の音量（0..1）。設定画面で 0〜100 入力。 */
    options.sfxVolume = 0.8;
    try {
      var sv0 = parseInt(localStorage.getItem('moddingHelperSfxVolume'), 10);
      if (Number.isFinite(sv0)) options.sfxVolume = Math.max(0, Math.min(100, sv0)) / 100;
    } catch (e) {}
    /* 効果音の内部基準遅延と、設定画面で指定する相対補正(ms)。
       基準遅延 30ms を設定上の 0ms とし、+で遅らせ / -で早める。 */
    var SP_SFX_BASE_DELAY_MS = 30;
    var SP_SFX_TIMING_ADJUST_LIMIT_MS = 250;
    options.sfxTimingAdjustment = 0;
    try {
      var timingAdjust0 = parseInt(localStorage.getItem('moddingHelperSfxTimingAdjustment'), 10);
      if (Number.isFinite(timingAdjust0)) {
        options.sfxTimingAdjustment = Math.max(
          -SP_SFX_TIMING_ADJUST_LIMIT_MS,
          Math.min(SP_SFX_TIMING_ADJUST_LIMIT_MS, timingAdjust0)
        );
      } else {
        /* 旧設定は絶対値だったため、30ms を引いて同じ再生タイミングを保つ。 */
        var legacyOffset0 = parseInt(localStorage.getItem('moddingHelperSfxOffset'), 10);
        if (Number.isFinite(legacyOffset0)) {
          options.sfxTimingAdjustment = Math.max(
            -SP_SFX_TIMING_ADJUST_LIMIT_MS,
            Math.min(SP_SFX_TIMING_ADJUST_LIMIT_MS, legacyOffset0 - SP_SFX_BASE_DELAY_MS)
          );
          localStorage.setItem('moddingHelperSfxTimingAdjustment', String(options.sfxTimingAdjustment));
        }
      }
    } catch (e) {}
    /* 曲の音量（0..1）。設定画面で 0〜100 入力。spAudio.volume に反映。 */
    options.musicVolume = 1.0;
    try {
      var mv0 = parseInt(localStorage.getItem('moddingHelperMusicVolume'), 10);
      if (Number.isFinite(mv0)) options.musicVolume = Math.max(0, Math.min(100, mv0)) / 100;
    } catch (e) {}
    var getSelectedSfxSet = function () {
      if (!spSfxSets.length) return null;
      for (var i = 0; i < spSfxSets.length; i++) if (spSfxSets[i].id === spSfxSetId) return spSfxSets[i];
      return spSfxSets[0];
    };
    /* 音楽と効果音で共有する AudioContext。
       別々のクロックだと長い曲で徐々にズレるため、音楽(<audio>)も同じ ctx に通して
       時計と出力レイテンシを完全に共通化する。ctx は作り直さず使い回す。 */
    var spSharedCtx = null;
    var ensureSpreadAudioCtx = function () {
      if (!spSharedCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try { spSharedCtx = new Ctx(); } catch (e) { spSharedCtx = null; return null; }
      }
      /* 曲は spAudio（デコード済み PCM）がこの ctx に直接つなぐので、
         <audio> をルーティングする必要はない。 */
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
        if (spSynth.setVolume) spSynth.setVolume(options.sfxVolume);
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

    setupElectronPreviewSettings({
      previewSettingsBody, viewSettingsBody, text: electronText, options,
      display: { getViewMode, setViewMode, applyViewModeUi, getTagDisplayMode, setTagDisplayMode, redrawMetadata },
      events: {
        getDiffs: function() { return getSpreadDiffs(); },
        diffOrderChanged: function() {
          if (spCacheDiffs && spCacheDiffs.length) sortSpreadDiffs(spCacheDiffs);
          spVisibleDiffsDirty = true;
        },
        visibilityChanged: function() { spVisibleDiffsDirty = true; saveHiddenDiffs(); },
        timingInfoChanged: function() { spBaseSpeedKey = ''; }
      },
      sounds: {
        sets: spSfxSets, getSelectedSet: getSelectedSfxSet, setSet: setSfxSet,
        setVolume: function(volume) { if (spSynth && spSynth.setVolume) spSynth.setVolume(volume); },
        setMusicVolume: function(volume) { if (spAudio) spAudio.volume = volume; }
      },
      constants: { judgeCenter: SP_JUDGE_CENTER, judgeLeft: SP_JUDGE_LEFT,
        sfxBaseDelayMs: SP_SFX_BASE_DELAY_MS, sfxTimingLimitMs: SP_SFX_TIMING_ADJUST_LIMIT_MS }
    });

    var spSfxCb = spBar.querySelector('#etb-spread-sfx-cb');
    if (spSfxCb) spSfxCb.addEventListener('change', function () {
      spHitSounds = spSfxCb.checked;
      if (spHitSounds && !spSynth) buildSfxKit();
      if (spHitSounds && spSynth) spSynth.resume(); // ユーザー操作なので AudioContext を起動
      spSfxLastSong = null; spSfxSchedTo = null; // 有効化直後に過去分を鳴らさない
    });

    /* Diff順の並べ替え（難易度順 __loadedDiffOrder=易→難 を基準）。
       options.diffDescending=true → 難→易(上が難)、false → 易→難(上が易)。順序不明は末尾。 */
    var sortSpreadDiffs = function (arr) {
      var order = window.__loadedDiffOrder;
      if (!order || !order.length) return;
      var rank = Object.create(null);
      for (var oi = 0; oi < order.length; oi++) rank[order[oi]] = oi;
      var unknown = options.diffDescending ? -1 : (order.length + 1); // 未知は常に末尾へ
      arr.sort(function (a, b) {
        var ra = a.fileName in rank ? rank[a.fileName] : unknown;
        var rb = b.fileName in rank ? rank[b.fileName] : unknown;
        return options.diffDescending ? (rb - ra) : (ra - rb);
      });
    };

    /* 難易度キャッシュ（__loadedDiffs が差し替わった時だけ再解析） */
    var spCacheRef = null, spCacheDiffs = [];
    window.addEventListener('modding-helper-diff-order-changed', function() {
      sortSpreadDiffs(spCacheDiffs);
      spVisibleDiffsDirty = true;
    });
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
      spCacheDiffs = prepareElectronPreviewDiffs(raw);
      sortSpreadDiffs(spCacheDiffs);
      spreadTimeRange = getElectronPreviewTimeRange(spCacheDiffs);
      return spCacheDiffs;
    };
    var getVisibleSpreadDiffs = function (allDiffs) {
      if (!spVisibleDiffsDirty && spVisibleDiffsRef === allDiffs) return spVisibleDiffs;
      spVisibleDiffsRef = allDiffs;
      spVisibleDiffs = allDiffs.filter(function (d) { return !options.hiddenDiffs[d.fileName]; });
      spVisibleDiffsDirty = false;
      return spVisibleDiffs;
    };

    /* ── 手動シーク（osu! には同期しない） ── */
    var setSpreadManual = function (t) {
      if (!Number.isFinite(t)) return;
      if (spreadTimeRange) t = Math.max(spreadTimeRange[0], Math.min(spreadTimeRange[1], t));
      playback.manualTime = t;
    };
    /* グリッド用の参照赤線（最初に見つかった非空のもの） */
    var spreadRefRed = function (diffs) {
      for (var i = 0; i < diffs.length; i++) {
        if (diffs[i].red && diffs[i].red.length) return diffs[i].red;
      }
      return null;
    };
    /* 現在位置を、アクティブな赤線から数えた「小節:拍」で右上に表示する。 */
    var updateSpreadMeterUi = function (diffs, curMs) {
      var el = document.getElementById('etb-spread-meter');
      if (!el) return;
      var red = spreadRefRed(diffs || []);
      var pos = window.getTaikoMeasureBeat
        ? window.getTaikoMeasureBeat(red, curMs)
        : null;
      var value = pos ? (pos.measure + ':' + pos.beat) : '--:--';
      if (el.textContent !== value) el.textContent = value;
      var title = electronText('electronMeasureBeat');
      if (pos) title += ' · ' + pos.meter + '/4';
      if (el.title !== title) el.title = title;
    };
    /* スナップ1目盛り分ステップ（ホイール用）。グリッドに吸着して dir 方向へ */
    /* ホイール加速: ゆっくり回すと1目盛り、速く連続で回すと段々多く進む */
    var SP_WHEEL_MAX = 6;   // 加速時の最大目盛り/ノッチ
    var SP_WHEEL_GAP = 90;  // この間隔(ms)以内の連続回転で加速
    var spWheelLast = 0, spWheelAccel = 1;
    /* ホイールシーク中は効果音を鳴らさない。最後の入力から少し待って再開する。 */
    var SP_WHEEL_SFX_SILENCE_MS = 120;
    var spSfxWheelSilentUntil = 0;
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

    var hitTesting = createElectronPreviewHitTesting(spCanvas);
    var spCanvasPos = hitTesting.point;
    var spHitTest = hitTesting.hitTest;
    var spHitsInRect = hitTesting.hitsInRect;

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
      var diffs = getVisibleSpreadDiffs(getSpreadDiffs());
      spSelDragDiff = (laneIdx >= 0 && laneIdx < diffs.length) ? diffs[laneIdx] : null;
      /* Ctrl+ドラッグでの追加は、既存の選択と同じ難易度の時だけ（選択は 1 譜面に限定） */
      spSelBase = ((e.ctrlKey || e.metaKey) && spSelDiff && spSelDiff === spSelDragDiff)
        ? spSelNotes.slice() : [];
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      /* 右ドラッグ = スクラブ */
      if (spPendingDown || playback.dragging) {
        if (!playback.dragging) {
          if (Math.abs(e.clientX - spDownX) + Math.abs(e.clientY - spDownY) < SP_DRAG_THRESH) return;
          playback.dragging = true;
          if (spAudio && !spAudio.paused) spAudio.pause(); // スクラブ開始で音楽停止
          var base0 = getSpreadTime(); if (base0 == null) base0 = 0;
          setSpreadManual(base0);
          spDragLastX = e.clientX;
          spCanvas.style.cursor = 'grabbing';
        }
        var dx = e.clientX - spDragLastX;
        spDragLastX = e.clientX;
        var base = playback.manualTime != null ? playback.manualTime : (playback.lastTime || 0);
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
      if (playback.dragging) { playback.dragging = false; spCanvas.style.cursor = ''; spPendingDown = false; return; }
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
      var wasPlaying = !!(spAudio && !spAudio.paused);
      /* すでに先読み予約された音も止め、連続ホイール中の重なりを防ぐ。 */
      spSfxWheelSilentUntil = performance.now() + SP_WHEEL_SFX_SILENCE_MS;
      if (spSynth && spSynth.stopAll) spSynth.stopAll();
      spSfxLastSong = null;
      spSfxSchedTo = null;
      spSfxPlayFrom = null;
      /* 連続で速く回すほど1ノッチの移動目盛りを増やす（単発はきっちり1目盛り） */
      var now = performance.now();
      if (now - spWheelLast < SP_WHEEL_GAP) spWheelAccel = Math.min(spWheelAccel + 1, SP_WHEEL_MAX);
      else spWheelAccel = 1;
      spWheelLast = now;
      var base = getSpreadTime(); if (base == null) base = 0;
      var red = spreadRefRed(getSpreadDiffs());
      var dir = e.deltaY > 0 ? 1 : -1; // 下回し=進む
      var target = spreadSnapStep(red, base, spSnap, dir, spWheelAccel);
      if (wasPlaying && spAudioSrcRef) {
        /* 再生中は音源も移動先へ合わせる。spAudio.currentTime の setter が
           再生ソースを新しい位置から作り直すため、一時停止状態にはならない。 */
        var durMs = (spAudio.duration && isFinite(spAudio.duration))
          ? spAudio.duration * 1000
          : Infinity;
        target = Math.max(0, Math.min(target, durMs - 1));
        setSpreadManual(target);
        try { spAudio.currentTime = target / 1000; } catch (_) {}
        /* 効果音の先読み位置も破棄し、移動先のタイムラインから予約し直す。 */
        spSfxLastSong = null;
        spSfxSchedTo = null;
        spSfxPlayFrom = null;
        /* 将来別の音源実装へ差し替えて setter が再開しない場合にも再生を維持する。 */
        if (spAudio.paused) spAudio.play().catch(function () {});
      } else {
        setSpreadManual(target);
      }
      e.preventDefault();
    }, { passive: false });

    /* ノーツをダブルクリックすると、そのノーツの開始時刻へシークする。 */
    spCanvas.addEventListener('dblclick', function (e) {
      var p = spCanvasPos(e);
      var hit = spHitTest(p.x, p.y);
      if (hit && hit.note && Number.isFinite(hit.note.time)) {
        var target = hit.note.time;
        /* 音源がある場合は、再生中・停止中を問わず音楽側の位置も揃える。 */
        if (spAudio && spAudioSrcRef) {
          try { spAudio.currentTime = target / 1000; } catch (_) {}
        }
        setSpreadManual(target);
      }
      e.preventDefault();
    });

    /* ── 音楽付き再生（スペースキー。osu! には同期しない） ──
       `<audio>` ではなく「デコード済み PCM を AudioContext で鳴らす」方式にしている。
       理由: `<audio>` の currentTime は MP3 だとファイル位置からの推定になり、
       VBR やエンコーダ遅延があると後半ほど実際の出音とズレる（曲の終盤でズレる原因）。
       デコード後の PCM をオーディオデバイスのクロックで再生し、位置もそのクロックから
       求めれば原理的にズレない。osu!/TaikoEditor と同じ考え方。
       効果音と同じ ctx を使うので、両者の時計と出力レイテンシも完全に共通。
       既存コードをそのまま使えるよう `<audio>` 風の見た目を持たせている。 */
    var spAudio = createElectronPreviewAudio(ensureSpreadAudioCtx);
    spAudio.volume = options.musicVolume;      // 設定した曲の音量を反映
    spAudio.playbackRate = spPlaybackRate; // 設定した再生速度を反映
    var spAudioSrcRef = null;
    var syncSpreadAudioSrc = function () {
      var a = window.__loadedAudio;
      var url = a && a.url ? a.url : null;
      if (url === spAudioSrcRef) return;
      spAudioSrcRef = url;
      playback.audioPlaying = false;
      spAudio.setSrc(url);
    };
    /* 'play' は play() を呼んだ時点で発火し、まだ実際に音が出ていないことがある。
       実際に再生が始まる 'playing' を使う（開始直後に効果音が先走るのを防ぐ）。 */
    spAudio.addEventListener('playing', function () { playback.audioPlaying = true; });
    spAudio.addEventListener('pause',   function () { playback.audioPlaying = false; });
    spAudio.addEventListener('ended',   function () { playback.audioPlaying = false; });

    var toggleSpreadPlay = function () {
      syncSpreadAudioSrc();
      if (!spAudioSrcRef) return; // 音源が無い
      if (spAudio.paused) {
        /* suspended だと無音になるので必ず起こす（ユーザー操作起点なので許可される） */
        ensureSpreadAudioCtx();
        var base = getSpreadTime(); if (base == null) base = 0;
        var durMs = (spAudio.duration && isFinite(spAudio.duration)) ? spAudio.duration * 1000 : Infinity;
        var startMs = Math.max(0, Math.min(base, durMs - 1));
        try { spAudio.currentTime = startMs / 1000; } catch (e) {}
        spAudio.play().catch(function () {});
      } else {
        spAudio.pause();
        playback.manualTime = spAudio.currentTime * 1000; // 停止位置で固定
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
    var spBottomLastTimeText = '';
    var spBottomLastPctText = '';
    var updateSpreadBottom = function (diffs, curMs) {
      var dur = getSpreadDuration();
      var t = (curMs != null && isFinite(curMs)) ? curMs : 0;
      var te = document.getElementById('etb-sb-time');
      var timeText = fmtSpreadTime(t);
      if (te && timeText !== spBottomLastTimeText) {
        te.textContent = timeText;
        spBottomLastTimeText = timeText;
      }
      var pe = document.getElementById('etb-sb-pct');
      var pctText = (dur > 0 ? (Math.max(0, Math.min(1, t / dur)) * 100).toFixed(1) : '0.0') + '%';
      if (pe && pctText !== spBottomLastPctText) {
        pe.textContent = pctText;
        spBottomLastPctText = pctText;
      }
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
      playback.manualTime = target;
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
    /* 速度を落とした時の追加補正[ms]。
       タイムストレッチは1つの打点を複数の粒に分けて重ねるため、曲の打点が
       本来より早く聴こえる（25%では1打点が約8粒に現れる）。その分だけ
       効果音も前倒しする必要があり、ズレ量は速度が遅いほど大きい。
       値は実際に聴いて合わせた実測値。基準(100%)は「効果音タイミング補正」設定側で調整する。 */
    var SP_SFX_RATE_ADJUST = { '1': 0, '0.75': -20, '0.5': -50, '0.25': -80 };
    var spSfxRateAdjust = function (r) {
      var v = SP_SFX_RATE_ADJUST[String(r)];
      return typeof v === 'number' ? v : 0;
    };

    var SP_SFX_LOOKAHEAD_MS = 120;
    /* 再生開始直後に効果音の予約を見送る時間。
       昔 <audio> 再生だった頃は currentTime が開始直後に不正確で、安定を待つため
       200ms 見送っていた（そのぶん出だしの効果音が鳴らずラグに聞こえた）。
       現在は AudioContext の PCM 再生で currentTime が開始の瞬間から正確なので、
       見送りは不要。0 = 開始直後から鳴らす。 */
    var SP_SFX_SETTLE_MS = 0;
    var spSfxPlayFrom = null;    // この再生セッションの開始曲位置
    var spSfxLastSong = null;   // 前フレームの曲時刻（シーク検出用）
    var spSfxSchedTo = null;    // ここまでの曲時刻を予約済み
    var scheduleSpreadHitSounds = function (diffs, playing) {
      /* ホイールシーク中は予約しない。終了後はその時点から新しく予約する。 */
      if (performance.now() < spSfxWheelSilentUntil) {
        spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null; return;
      }
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
         追加の補正は不要（設定画面の「効果音タイミング補正」で手動微調整のみ）。 */
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
        /* 曲時間 → 実時間。基準遅延とタイミング補正は実時間の定数なので割らない
           （割ると 25% 再生で4倍に効いてしまう）。
           さらに速度ごとの補正を足す（下の SP_SFX_RATE_ADJUST を参照）。 */
        var offMs = SP_SFX_BASE_DELAY_MS + options.sfxTimingAdjustment + spSfxRateAdjust(rate);
        var realWhen = function (songMs) {
          return ctxNow + (songMs - songNow) / 1000 / rate + offMs / 1000;
        };
        for (var k = 0; k < notes.length; k++) {
          var note = notes[k];
          var nt = note.time;
          if (nt > horizon) break; // ソート済み → 以降は先
          if (note.kind === 'drumroll') {
            /* 連打はティックごとに鳴らす（通常＝小ドン / Finisher＝大ドン）。
               開始が過去でもティックが窓に入ることがあるので、
               開始時刻ではなく終端で打ち切る。 */
            var end = note.endTime != null ? note.endTime : nt;
            var spacing = note.tickSpacing || 0;
            if (end + spacing <= from) continue;
            if (!note._tickTimes && window.taikoDrumRollTickTimes) {
              note._tickTimes = window.taikoDrumRollTickTimes(note); // 1回だけ計算
            }
            var ticks = note._tickTimes || [];
            for (var ti = 0; ti < ticks.length; ti++) {
              var tt = ticks[ti];
              if (tt <= from) continue;
              if (tt > horizon) break;
              spSynth.don(note.big, realWhen(tt));
            }
            continue;
          }
          if (note.kind === 'denden') {
            /* 風船は必要打数を区間内に等間隔で置き、ドン開始でドン/カツを交互に鳴らす。
               osu!本体では最初の面/縁はどちらでもよく、以降の交互入力だけが必須。
               プレビューでは出音を一意にするためドン開始に固定する。 */
            var swellEnd = note.endTime != null ? note.endTime : nt;
            if (swellEnd <= from) continue;
            if (!note._swellHitTimes && window.taikoSwellHitTimes) {
              note._swellHitTimes = window.taikoSwellHitTimes(note); // 1回だけ計算
            }
            var swellHits = note._swellHitTimes || [];
            for (var si = 0; si < swellHits.length; si++) {
              var st = swellHits[si];
              if (st <= from) continue;
              if (st > horizon) break;
              if (si % 2 === 0) spSynth.don(false, realWhen(st));
              else spSynth.kat(false, realWhen(st));
            }
            continue;
          }
          if (nt <= from) continue;
          if (note.kind === 'don') spSynth.don(note.big, realWhen(nt));
          else if (note.kind === 'kat') spSynth.kat(note.big, realWhen(nt));
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
      if (playback.audioPlaying && !spAudio.paused) {
        playback.manualTime = spAudio.currentTime * 1000;
      }
      var allDiffs = getSpreadDiffs();
      var curTime = getSpreadTime();
      /* 100%の基準速度は、非表示設定に左右されない全Diffから決める。 */
      updateSpreadBaseSpeed(allDiffs);
      updateSpreadMeterUi(allDiffs, curTime);
      /* 非表示Diffを除外（レーンは上に詰まる）。両処理・描画で同じ配列を使う */
      var diffs = getVisibleSpreadDiffs(allDiffs);
      /* 効果音（音楽再生中のみ、先読みスケジュール） */
      scheduleSpreadHitSounds(diffs, playback.audioPlaying && !spAudio.paused);
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
        judgeFrac: options.judgementFraction,
        highlightKiai: options.highlightKiai,
        showNcCymbal: options.showNc,
        showTimingInfo: options.showTimingInfo,
        transparentSliders: options.transparentSliders,
        isSelected: spSelNotes.length ? spIsSelected : null,
        marquee: spMarquee,
        emptyText: isEn ? 'No beatmap loaded' : '譜面が読み込まれていません',
        idleText: getPanelMode() === 'osu'
          ? (isEn ? 'Play in osu! to scroll' : 'osu! を再生すると流れます')
          : (isEn ? 'Use the preview controls to seek or play' : 'プレビューの操作で再生・シークできます')
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

  return {
    ensureAudioContext: function() { return typeof ensureSpreadAudioCtx === 'function' ? ensureSpreadAudioCtx() : null; },
    pauseMusic: function() { if (spAudio && !spAudio.paused) spAudio.pause(); }
  };
}
