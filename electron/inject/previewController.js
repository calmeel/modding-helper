// プレビューの再生・描画・設定を連携し、入力操作はpreviewInputに委譲する。
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

    var previewLayout = createElectronPreviewLayout(outBody, electronText);
    var spBar = previewLayout.toolbar;
    var spCanvas = previewLayout.canvas;

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
    var hitSounds = createElectronPreviewHitSounds(SP_SFX_BASE_DELAY_MS);
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
    /* 音楽のPCM再生と効果音でAudioContextを共有し、
       再生位置の時計と出力レイテンシを共通化する。ctxは作り直さず使い回す。 */
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
      hitSounds.reset(); // 新キットで予約し直す
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
      hitSounds.reset(); // 有効化直後に過去分を鳴らさない
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
    var spSfxWheelSilentUntil = 0;
    var previewInput = createElectronPreviewInput({
      canvas: spCanvas, playback, isActive: function () { return spPreviewOn; },
      getDiffs: function () { return getVisibleSpreadDiffs(getSpreadDiffs()); },
      getRed: function () { return spreadRefRed(getSpreadDiffs()); },
      getSnap: function () { return spSnap; }, getPxPerMs: function () { return spPxPerMs; },
      setZoom: setSpZoom, getTime: getSpreadTime, setManual: function (t) { setSpreadManual(t); },
      getAudio: function () { return spAudio; }, hasAudio: function () { return !!spAudioSrcRef; },
      getDuration: function () { return getSpreadDuration(); },
      silenceWheelSounds: function () {
        spSfxWheelSilentUntil = performance.now() + 120;
        if (spSynth && spSynth.stopAll) spSynth.stopAll();
        hitSounds.reset();
      },
      resetHitSounds: hitSounds.reset,
      selectSoundLane: function (idx) { spSoundLane = idx; },
      copyCurrentTimestamp: function () { copyCurrentTimestamp(); },
      togglePlay: function () { toggleSpreadPlay(); }
    });

    var getSpreadDiffs = function () {
      var raw = window.__loadedDiffs;
      if (raw === spCacheRef) return spCacheDiffs;
      spCacheRef = raw;
      previewInput.clearSelection(); // 譜面が差し替わったらノーツ参照が無効になる
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
      if (previewInput.notes.length) {
        var sorted = previewInput.notes.slice().sort(function (a, b) { return a.time - b.time; });
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
      hitSounds.schedule(diffs, {
        playing: playback.audioPlaying && !spAudio.paused,
        enabled: spHitSounds, synth: spSynth, audio: spAudio,
        rate: spPlaybackRate, lane: spSoundLane,
        silentUntil: spSfxWheelSilentUntil, timingAdjustment: options.sfxTimingAdjustment
      });
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
        isSelected: previewInput.notes.length ? previewInput.isSelected : null,
        marquee: previewInput.marquee,
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
