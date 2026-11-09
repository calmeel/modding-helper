// グラフの再生ヘッドと交点マーカー、および再描画への追従を担当する。
function createElectronPlayheads({ canShow, getCurrentDiffFile, isSpectrogramSeekEnabled }) {
  /* ── グラフの再生ヘッド（リアルタイム時刻バー） ──
     各グラフは描画時に canvas.__playheadGeom = { plot, viewStart, viewEnd } を保存する。
     osu! モードで時刻が流れている時のみ、表示中グラフに縦バーを重ねる。 */
  var playheadChartIds = ['kiaiCompareChart', 'volumeCompareChart', 'spreadDensityChart',
                          'spreadRestChart', 'spreadScrollChart', 'spreadScrollDeltaChart',
                          'offsetWaveformCanvas', 'spectrogramCanvas'];
  /* スペクトログラムのシークバー(再生ヘッド)は既定 OFF。setupSpectrogram が切り替える */
  var playheadEls = {};
  var markerEls = {};
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
    /* スペクトログラムはチェックが ON の時だけシークバーを出す（既定 OFF） */
    if (id === 'spectrogramCanvas' && !isSpectrogramSeekEnabled()) {
      d.style.display = 'none'; if (mk) mk.style.display = 'none'; return;
    }
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
      var info = cv.__markerAt(ms, getCurrentDiffFile());
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
    if (!canShow()) return;
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
    if (!canShow()) return;
    updatePlayheads(lastPlayheadMs);
  };
  /* 保険: 少し経ってもジオメトリが古いまま＝グラフが描き直されていない場合、
     resize を投げて再描画パスを起こす（グラフ側は resize で描き直す）。
     通常は表示された時点で ResizeObserver が発火するのでここは通らない。 */
  var nudgeStaleCharts = function() {
    if (!canShow()) return;
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
  /* タブ・サブタブのクリックで再生ヘッドを再適用 */
  document.addEventListener('click', function(e) {
    if (!e.target || !e.target.closest) return;
    if (!e.target.closest('.tab-button, .spread-subtab-button, .bn-subtab-button')) return;
    schedulePlayheadRefresh();
  });
  /* グラフを左ドラッグで移動した直後にも再配置（表示範囲 viewStart/viewEnd が変わるため） */
  document.addEventListener('mouseup', function(e) {
    if (!e.target || !e.target.id) return;
    if (playheadChartIds.indexOf(e.target.id) < 0) return;
    schedulePlayheadRefresh();
  });
  /* ウィンドウリサイズでもプロット領域が変わるので再配置 */
  window.addEventListener('resize', schedulePlayheadRefresh);

  return { update: updatePlayheads, hide: hideAllPlayheads, refresh: refreshPlayheads, scheduleRefresh: schedulePlayheadRefresh };
}
