// 分離ポップアウト（メタデータ / リアルタイム表示 / 各グラフ）を管理するモジュール。
//
// メインウィンドウから切り離した小窓を開き、osu! のデータを配信する。
// mainWin は main.js 側が持つので init({getMainWin}) で参照方法だけ受け取る。
const { BrowserWindow, shell, screen } = require('electron');
const path = require('path');

const root = path.join(__dirname, '..', '..');
let getMainWin = () => null;

// main.js から mainWin の取得方法を受け取る
function init(opts) {
  if (opts && typeof opts.getMainWin === 'function') getMainWin = opts.getMainWin;
}
// 分離ポップアウト（メタデータ / リアルタイム）と最新データのキャッシュ
const popoutWindows = { metadata: null, timing: null };
const chartPopouts = {};  // chartId -> BrowserWindow（グラフ分離窓）
let lastMapInfo = null;
let lastTimingInfo = null;
let popoutMetaChecked = [];  // メタデータ分離窓と同期する Tags チェック状態（タグ文字列の配列）

// osu! データをメインウィンドウ＋開いているポップアウトへ配信し、最新値をキャッシュする
function broadcastOsuData(channel, data) {
  const targets = [getMainWin()];
  if (channel === 'osu-map-info')        { lastMapInfo    = data; targets.push(popoutWindows.metadata); }
  else if (channel === 'osu-timing-info') { lastTimingInfo = data; targets.push(popoutWindows.timing); }
  // グラフ分離窓は譜面追従(osu-map-info)と再生ヘッド(osu-timing-info)の両方を受ける
  for (const id in chartPopouts) { if (chartPopouts[id]) targets.push(chartPopouts[id]); }
  for (const w of targets) {
    if (w && !w.isDestroyed()) {
      try { w.webContents.send(channel, data); } catch (_) {}
    }
  }
}

// グラフを別ウィンドウに分離（index.html をフルに読み込み、該当グラフのみ全画面表示）
const CHART_TAB_MAP = {
  kiaiCompareChart:       { tab: 'kiaiCompare',   ja: 'Kiai タイムライン',          en: 'Kiai timeline' },
  volumeCompareChart:     { tab: 'volumeCompare', ja: 'ボリュームグラフ',           en: 'Volume graph' },
  offsetWaveformCanvas:   { tab: 'offsetWaveform',ja: '音声波形',                   en: 'Audio waveform' },
  spreadDensityChart:     { tab: 'spread', sub: 'density', ja: 'ノーツ密度グラフ',    en: 'Note density graph' },
  spreadRestChart:        { tab: 'spread', sub: 'rest',    ja: 'BPM グラフ',          en: 'BPM graph' },
  spreadScrollChart:      { tab: 'spread', sub: 'scroll',  ja: 'スクロール速度グラフ', en: 'Scroll speed graph' },
  spreadScrollDeltaChart: { tab: 'spread', sub: 'scroll',  ja: 'スクロール速度変化量', en: 'Scroll speed delta' },
};

function openChartPopout(chartId, lang) {
  const conf = CHART_TAB_MAP[chartId];
  if (!conf) return;
  if (chartPopouts[chartId] && !chartPopouts[chartId].isDestroyed()) {
    chartPopouts[chartId].focus();
    return;
  }
  const isEn = lang === 'en';

  const pop = new BrowserWindow({
    width: 900,
    height: 480,
    title: isEn ? conf.en : conf.ja,
    show: false,            // 注入(chrome 非表示)完了までは見せない（Web UI のちらつき防止）
    backgroundColor: '#1e1e1e',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
    icon: path.join(root, 'images', 'icon.ico'),
  });
  pop.setMenu(null);
  chartPopouts[chartId] = pop;
  // index.html の <title> でウィンドウ名が上書きされないようにする（グラフ名を出したい）
  pop.on('page-title-updated', (e) => e.preventDefault());

  // リンク類は外部ブラウザで開く（メインと同様）
  pop.webContents.on('new-window', (e, url) => { e.preventDefault(); shell.openExternal(url); });

  // 安全策: 注入が失敗してもウィンドウが出るよう一定時間後に必ず表示
  setTimeout(() => { if (!pop.isDestroyed() && !pop.isVisible()) pop.show(); }, 4000);

  const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?popoutChart=' + chartId;
  pop.loadURL(url);

  pop.webContents.on('did-finish-load', () => {
    if (pop.isDestroyed()) return;
    // 注入(CSS で chrome 非表示・対象グラフ全画面化)が終わってから表示する
    injectChartPopout(pop, chartId).then(() => {
      if (pop.isDestroyed()) return;
      if (!pop.isVisible()) pop.show();
      /* 現在の譜面・時刻を反映する。**必ず注入の完了後に送る**こと。
         受け手(onOsuMapInfo / onTimingInfo)は注入したコードが登録するので、
         先に送ると誰も受け取れず、osu! 側が動くまで
         「再生ヘッドが出ない」「Diff との交点マーカーが出ない」状態になる。 */
      pop.webContents.send('osu-map-info', lastMapInfo);
      pop.webContents.send('osu-timing-info', lastTimingInfo);
    });
  });

  pop.on('closed', () => { chartPopouts[chartId] = null; delete chartPopouts[chartId]; });
}

// グラフ分離窓: web の余計な UI を隠し、対象グラフのタブを開いて全画面表示＋再生ヘッド
function injectChartPopout(pop, chartId) {
  pop.webContents.insertCSS(`
    html, body { height:100%; margin:0; overflow:hidden; background:#1e1e1e; }
    body { font-family: Arial,"Meiryo","Yu Gothic UI","Hiragino Sans",sans-serif; color:#ddd; }
    .app { height:100vh; max-width:none !important; width:100% !important; margin:0 !important; padding:0 !important; box-sizing:border-box; display:flex; flex-direction:column; overflow:hidden; }
    /* 見出しと説明文はウィンドウのタイトルバーで足りるので出さない。
       「ズームをリセット」だけ右上に小さく浮かせて、グラフ用の高さを空ける。 */
    .volume-compare-chart-header h3, .volume-compare-chart-header p { display:none !important; }
    .volume-compare-chart-header {
      position:absolute !important; top:4px; right:6px; z-index:10;
      margin:0 !important; padding:0 !important; gap:0 !important; width:auto !important;
    }
    .volume-compare-chart-header .doc-btn {
      font-size:11px !important; padding:2px 8px !important; opacity:0.55; transition:opacity 0.15s;
    }
    .volume-compare-chart-header .doc-btn:hover { opacity:1; }
    /* スクロール速度系だけは見出し行に操作用チェックボックスが入っているので、
       右上に浮かせると下の警告トグル行と重なる。ここだけ通常の行として並べる。 */
    #spreadScrollChartSection .volume-compare-chart-header {
      position:static !important; width:auto !important;
      margin:0 0 4px !important; padding:0 !important; gap:12px !important;
      justify-content:flex-end;
    }
    #spreadScrollChartSection .volume-compare-chart-header .doc-btn { opacity:1; }
    /* グラフを囲む枠・背景・余白（＝グラフの周りの1色）を消してウィンドウに密着させる */
    .tab-panel.active > section, .tab-panel.active .spread-subtab-panel > section {
      margin:0 !important; padding:0 !important; border:none !important;
      border-radius:0 !important; background:transparent !important;
    }
    /* グラフの入れ物をウィンドウの高さいっぱいに広げる（高さが確定値になるので、
       グラフ側が clientHeight を読んでキャンバス高さを決められる）。
       ※ ここで display に !important を使ってはいけない。使うと
          「非アクティブなサブタブ」や「注入側が隠した他セクション(インライン display:none)」
          まで表示されてしまい、複数タブの内容が重なって出る。
          セクション自体の flex 化は isolateChart() が対象要素だけに行う。 */
    .volume-compare-chart-wrap, .kiai-compare-chart-wrap, .offset-waveform-chart-wrap,
    .spread-density-chart-wrap, .spread-rest-chart-wrap, .spread-scroll-chart-wrap {
      border-top:none !important; min-height:0 !important; flex:1 1 auto !important;
    }
    h1, p[data-i18n="subtitle"], .top-links, .drop-area, .tab-visibility-settings { display:none !important; }
    .tabs .tab-buttons, .spread-subtab-button { display:none !important; }
    .tabs { position:static !important; margin:0 !important; flex:1; min-height:0; display:flex; flex-direction:column; }
    .tab-panel { display:none; }
    .tab-panel.active { display:flex !important; flex-direction:column; flex:1; min-height:0; overflow:auto; }
    .spread-subtab-panel { display:none; }
    /* アクティブなサブタブだけ縦フレックスにして高さを下へ渡す（!important は付けない） */
    .spread-subtab-panel.active { display:flex; flex-direction:column; flex:1 1 auto; min-height:0; }
    .etb-popout-playhead { position:absolute; width:2px; background:#ff5a5a; pointer-events:none; z-index:6; box-shadow:0 0 4px rgba(255,90,90,0.7); }
    .etb-chart-marker { position:absolute; pointer-events:none; z-index:8; }
    .etb-chart-marker-dot { position:absolute; left:0; top:0; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-sizing:border-box; transform:translate(-50%,-50%); box-shadow:0 0 5px rgba(0,0,0,0.6); }
    .etb-chart-marker-label { position:absolute; left:10px; top:0; transform:translateY(-50%); font-size:11px; font-weight:700; color:#fff; background:rgba(0,0,0,0.66); padding:1px 6px; border-radius:4px; white-space:nowrap; }
  `);

  return pop.webContents.executeJavaScript(`
    (function() {
      var chartId = ${JSON.stringify(chartId)};
      var tabMap = ${JSON.stringify(CHART_TAB_MAP)};
      var m = tabMap[chartId];
      var activate = function() {
        if (!m) return;
        var sel = '.tab-button[data-tab="' + m.tab + '"]';
        if (m.sub) sel += '[data-spread-subtab-target="' + m.sub + '"]';
        var btn = document.querySelector(sel);
        if (btn) btn.click();
      };
      activate();
      setTimeout(activate, 400);
      setTimeout(activate, 1200);

      /* グラフ本体(チャートセクション)だけ残し、テキスト結果・フィルタ・サブタブ等は隠す */
      var isolateChart = function() {
        var cv = document.getElementById(chartId);
        if (!cv) return;
        var section = cv.closest('section');
        if (!section) return;
        var node = section;
        while (node && node.parentElement) {
          var parent = node.parentElement;
          Array.prototype.slice.call(parent.children).forEach(function(sib) {
            if (sib !== node) sib.style.display = 'none';
          });
          /* グラフまで高さを伝えるため、経路上の要素を縦フレックスにする。
             ここを CSS セレクタでやると他のサブタブまで表示してしまうので、
             このグラフの祖先だけにインラインで当てる（サブタブ用 div が
             block のままだと、そこで高さの伝達が止まって縦が変わらない）。 */
          parent.style.display = 'flex';
          parent.style.flexDirection = 'column';
          parent.style.minHeight = '0';
          if (parent.classList && parent.classList.contains('tab-panel')) break;
          parent.style.flex = '1 1 auto';
          node = parent;
        }
        /* グラフを囲む枠・背景・余白を消す（クラス名がグラフごとに違うので実要素に直接指定）。
           position:relative は右上に浮かせた「ズームをリセット」の基準にもなる。 */
        section.style.margin = '0';
        section.style.padding = '0';
        section.style.border = 'none';
        section.style.borderRadius = '0';
        section.style.background = 'transparent';
        section.style.position = 'relative';
        /* このセクションだけ縦フレックスにして、グラフの入れ物へ高さを渡す。
           CSS セレクタでまとめてやると他のセクションまで表示してしまうので個別に。 */
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.flex = '1 1 auto';
        section.style.minHeight = '0';
        /* 1つの section に複数のグラフが入っている場合（スクロール速度とその変化量）は、
           自分以外のグラフを隠す。隠さないと1つの窓に両方出てしまう。 */
        Array.prototype.slice.call(section.querySelectorAll('[class*="chart-wrap"]'))
          .forEach(function(w) { if (!w.contains(cv)) w.style.display = 'none'; });
        var deltaHead = section.querySelector('.spread-scroll-delta-header');
        if (deltaHead) {
          if (chartId === 'spreadScrollDeltaChart') {
            /* 自分のグラフの見出し・説明はウィンドウのタイトルで足りるので中身だけ隠す */
            Array.prototype.slice.call(deltaHead.children)
              .forEach(function(c) { c.style.display = 'none'; });
          } else {
            deltaHead.style.display = 'none';   // 相手のグラフの見出しごと隠す
          }
        }

        /* この印がある時だけ、グラフ側がキャンバス高さを親要素に合わせる
           （web ツールでは付かないので従来どおり固定高さ） */
        var wrap = cv.parentElement;
        if (wrap) wrap.dataset.chartFill = '1';
      };
      isolateChart();
      setTimeout(isolateChart, 400);
      setTimeout(isolateChart, 1200);

      /* 再生ヘッド＋現 Diff 交点マーカー */
      var phEl = null, mkEl = null;
      var currentDiffFile = null;
      var ensureEls = function() {
        var cv = document.getElementById(chartId);
        if (!cv || !cv.parentElement) return null;
        var wrap = cv.parentElement;
        if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
        if (!phEl) { phEl = document.createElement('div'); phEl.className = 'etb-popout-playhead'; phEl.style.display = 'none'; wrap.appendChild(phEl); }
        if (!mkEl) {
          mkEl = document.createElement('div'); mkEl.className = 'etb-chart-marker'; mkEl.style.display = 'none';
          mkEl.innerHTML = '<span class="etb-chart-marker-dot"></span><span class="etb-chart-marker-label"></span>';
          wrap.appendChild(mkEl);
        }
        return cv;
      };
      var updatePh = function(ms) {
        var cv = ensureEls();
        if (!cv || !phEl) return;
        var g = cv.__playheadGeom;
        /* 描画時と幅が違うジオメトリ＝古い。間違った位置に出さないよう隠す */
        var stale = g && g.__cw != null && g.__cw !== cv.clientWidth;
        if (ms < 0 || !g || !g.plot || cv.offsetParent === null || stale) { phEl.style.display = 'none'; if (mkEl) mkEl.style.display = 'none'; return; }
        var span = g.viewEnd - g.viewStart;
        if (span <= 0) { phEl.style.display = 'none'; if (mkEl) mkEl.style.display = 'none'; return; }
        var frac = (ms - g.viewStart) / span;
        if (frac < 0 || frac > 1) { phEl.style.display = 'none'; if (mkEl) mkEl.style.display = 'none'; return; }
        var x = cv.offsetLeft + g.plot.left + frac * g.plot.width;
        phEl.style.left = x + 'px';
        phEl.style.top = (cv.offsetTop + g.plot.top) + 'px';
        phEl.style.height = g.plot.height + 'px';
        phEl.style.display = '';
        if (mkEl && typeof cv.__markerAt === 'function') {
          var info = cv.__markerAt(ms, currentDiffFile);
          if (info && typeof info.y === 'number') {
            mkEl.style.left = x + 'px';
            mkEl.style.top = (cv.offsetTop + info.y) + 'px';
            mkEl.firstChild.style.background = info.color || '#fff';
            mkEl.lastChild.textContent = info.label != null ? info.label : '';
            mkEl.style.display = '';
          } else { mkEl.style.display = 'none'; }
        } else if (mkEl) { mkEl.style.display = 'none'; }
      };
      /* グラフが描き直されたら再生ヘッドも置き直す。
         各グラフは描画の最後に canvas.__playheadGeom を代入するので、その代入をフックする。
         これが無いと osu! から次の時刻が届くまでバーが古い位置のまま／出ないままになる
         （分離窓は表示直後に一度描き直されるので、事実上ずっと出なかった）。 */
      var lastMs = -1, rafPending = false;
      var hookGeom = function() {
        var cv = document.getElementById(chartId);
        if (!cv || cv.__etbGeomHooked) return;
        cv.__etbGeomHooked = true;
        var stored = cv.__playheadGeom || null;
        Object.defineProperty(cv, '__playheadGeom', {
          configurable: true,
          get: function() { return stored; },
          set: function(v) {
            stored = v;
            if (v) { v.__cw = cv.clientWidth; v.__ch = cv.clientHeight; }
            if (!rafPending) {
              rafPending = true;
              requestAnimationFrame(function() { rafPending = false; updatePh(lastMs); });
            }
          }
        });
      };
      hookGeom();
      setTimeout(hookGeom, 400);
      setTimeout(hookGeom, 1200);

      if (window.electronAPI && window.electronAPI.onTimingInfo) {
        window.electronAPI.onTimingInfo(function(data) {
          lastMs = (data && typeof data.time === 'number') ? data.time : -1;
          updatePh(lastMs);
        });
      }
      if (window.electronAPI && window.electronAPI.onOsuMapInfo) {
        window.electronAPI.onOsuMapInfo(function(data) {
          currentDiffFile = data && data.diffFileName ? data.diffFileName : null;
          /* 対象 Diff が変わったら交点マーカーを描き直す。
             osu! が一時停止中は次の時刻が来ないので、ここで更新しないと出ないまま。 */
          updatePh(lastMs);
        });
      }
    })();
  `).catch(function() {});
}

// injectChartPopout は CSS 注入 + JS 注入を行い、JS 注入完了の Promise を返す
function openPopout(name, lang) {
  if (name !== 'metadata' && name !== 'timing') return;
  if (popoutWindows[name] && !popoutWindows[name].isDestroyed()) {
    popoutWindows[name].focus();
    return;
  }
  const isEn = lang === 'en';
  const conf = {
    metadata: { width: 360, height: 820, title: isEn ? 'Metadata' : 'メタデータ' },
    timing:   { width: 230, height: 200, title: isEn ? 'Real-time' : 'リアルタイム表示' },
  }[name];

  // 画面の作業領域からはみ出さないよう高さをクランプ
  const waHeight = screen.getPrimaryDisplay().workAreaSize.height;
  const popHeight = Math.min(conf.height, Math.max(240, waHeight - 40));

  const pop = new BrowserWindow({
    width: conf.width,
    height: popHeight,
    // リアルタイム表示窓: 最小サイズを現在サイズに固定し、高さは現在値で上限固定（横のみ拡張可）
    minWidth:  name === 'timing' ? conf.width  : undefined,
    minHeight: name === 'timing' ? popHeight    : undefined,
    maxHeight: name === 'timing' ? popHeight    : undefined,
    title: conf.title,
    backgroundColor: '#1e1e1e',
    alwaysOnTop: name === 'timing',  // リアルタイム表示窓は最前面に固定
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
    icon: path.join(root, 'images', 'icon.ico'),
  });
  pop.setMenu(null);
  // 全画面アプリ(osu! 等)の上にも重ねたいので最前面レベルを少し上げる
  if (name === 'timing') pop.setAlwaysOnTop(true, 'screen-saver');
  popoutWindows[name] = pop;

  const url = 'file:///' + path.join(__dirname, 'popout.html').replace(/\\/g, '/')
    + '?panel=' + name + '&lang=' + (isEn ? 'en' : 'ja');
  pop.loadURL(url);

  // 読み込み完了時に最新データを送って即時反映
  pop.webContents.on('did-finish-load', () => {
    if (pop.isDestroyed()) return;
    if (name === 'metadata') {
      pop.webContents.send('osu-map-info', lastMapInfo);
      pop.webContents.send('popout-set-checked', popoutMetaChecked);  // Tags チェック状態を引き継ぐ
    } else {
      pop.webContents.send('osu-timing-info', lastTimingInfo);
    }
  });

  pop.on('closed', () => {
    popoutWindows[name] = null;
    if (getMainWin() && !getMainWin().isDestroyed()) {
      // メイン側でカードを復帰。メタデータは最新のチェック状態を渡す
      getMainWin().webContents.send('panel-redocked', name, name === 'metadata' ? popoutMetaChecked : null);
    }
  });
}
// ── main.js / IPC から使う補助 ──
// Tags チェック状態（メタデータ窓と本体で引き継ぐ）
function setMetaChecked(arr) { popoutMetaChecked = Array.isArray(arr) ? arr : []; }
function getMetaChecked() { return popoutMetaChecked; }

// file モードのメタデータをメタデータ窓へ転送し、最新値としても保持する
function sendMapMetaToPopout(data) {
  lastMapInfo = data;
  const w = popoutWindows.metadata;
  if (w && !w.isDestroyed()) { try { w.webContents.send('osu-map-info', data); } catch (_) {} }
}

// メインを閉じる時に全ての分離窓を閉じる
function closeAll() {
  ['metadata', 'timing'].forEach((n) => {
    if (popoutWindows[n] && !popoutWindows[n].isDestroyed()) popoutWindows[n].destroy();
    popoutWindows[n] = null;
  });
  Object.keys(chartPopouts).forEach((id) => {
    if (chartPopouts[id] && !chartPopouts[id].isDestroyed()) chartPopouts[id].destroy();
    delete chartPopouts[id];
  });
}

module.exports = {
  init,
  broadcastOsuData,
  openPopout,
  openChartPopout,
  setMetaChecked,
  getMetaChecked,
  sendMapMetaToPopout,
  closeAll,
};
