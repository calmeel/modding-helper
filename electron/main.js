const { app, BrowserWindow, session, Menu, screen, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const osuWatcher = require('./osuWatcher');

const root     = path.join(__dirname, '..');
const { version } = require('../package.json');
const iconUrl  = 'file:///' + path.join(root, 'images', 'icon.png').replace(/\\/g, '/');
const docsPath = path.join(root, 'docs', 'docs.html');

let mainWin = null;

// 分離ポップアウト（メタデータ / リアルタイム）と最新データのキャッシュ
const popoutWindows = { metadata: null, timing: null };
const chartPopouts = {};  // chartId -> BrowserWindow（グラフ分離窓）
let lastMapInfo = null;
let lastTimingInfo = null;
let popoutMetaChecked = [];  // メタデータ分離窓と同期する Tags チェック状態（タグ文字列の配列）

// osu! データをメインウィンドウ＋開いているポップアウトへ配信し、最新値をキャッシュする
function broadcastOsuData(channel, data) {
  const targets = [mainWin];
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
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(root, 'images', 'icon.ico'),
  });
  pop.setMenu(null);
  chartPopouts[chartId] = pop;

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
      if (!pop.isDestroyed() && !pop.isVisible()) pop.show();
    });
    // 現在の譜面・時刻を即時反映
    pop.webContents.send('osu-map-info', lastMapInfo);
    pop.webContents.send('osu-timing-info', lastTimingInfo);
  });

  pop.on('closed', () => { chartPopouts[chartId] = null; delete chartPopouts[chartId]; });
}

// グラフ分離窓: web の余計な UI を隠し、対象グラフのタブを開いて全画面表示＋再生ヘッド
function injectChartPopout(pop, chartId) {
  pop.webContents.insertCSS(`
    html, body { height:100%; margin:0; overflow:hidden; background:#1e1e1e; }
    body { font-family: Arial,"Meiryo","Yu Gothic UI","Hiragino Sans",sans-serif; color:#ddd; }
    .app { height:100vh; max-width:none !important; width:100% !important; margin:0 !important; padding:10px !important; box-sizing:border-box; display:flex; flex-direction:column; overflow:hidden; }
    h1, p[data-i18n="subtitle"], .top-links, .drop-area, .tab-visibility-settings { display:none !important; }
    .tabs .tab-buttons, .spread-subtab-button { display:none !important; }
    .tabs { position:static !important; margin:0 !important; flex:1; min-height:0; display:flex; flex-direction:column; }
    .tab-panel { display:none; }
    .tab-panel.active { display:flex !important; flex-direction:column; flex:1; min-height:0; overflow:auto; }
    .spread-subtab-panel { display:none; }
    .spread-subtab-panel.active { display:block; }
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
          if (parent.classList && parent.classList.contains('tab-panel')) break;
          node = parent;
        }
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
        if (ms < 0 || !g || !g.plot || cv.offsetParent === null) { phEl.style.display = 'none'; if (mkEl) mkEl.style.display = 'none'; return; }
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
      if (window.electronAPI && window.electronAPI.onTimingInfo) {
        window.electronAPI.onTimingInfo(function(data) {
          updatePh(data && typeof data.time === 'number' ? data.time : -1);
        });
      }
      if (window.electronAPI && window.electronAPI.onOsuMapInfo) {
        window.electronAPI.onOsuMapInfo(function(data) {
          currentDiffFile = data && data.diffFileName ? data.diffFileName : null;
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
    title: conf.title,
    backgroundColor: '#1e1e1e',
    alwaysOnTop: name === 'timing',  // リアルタイム表示窓は最前面に固定
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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
    if (mainWin && !mainWin.isDestroyed()) {
      // メイン側でカードを復帰。メタデータは最新のチェック状態を渡す
      mainWin.webContents.send('panel-redocked', name, name === 'metadata' ? popoutMetaChecked : null);
    }
  });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    show: false,            // 注入完了までは非表示にして Web UI のちらつきを防ぐ
    backgroundColor: '#1e1e1e',
    title: `osu!taiko Modding Helper v${version}`,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(root, 'images', 'icon.ico'),
  });

  // 最大化 / 元に戻す → レンダラーに通知
  win.on('maximize',   () => win.webContents.send('win-maximized'));
  win.on('unmaximize', () => win.webContents.send('win-unmaximized'));

  // target="_blank" リンク・新規ウィンドウをすべて外部ブラウザで開く
  win.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // 誤って index.html 以外に遷移しそうになったらブラウザに飛ばす
  win.webContents.on('will-navigate', (event, url) => {
    const indexUrl = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
    if (url !== indexUrl) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // CDN 経由の jszip をローカルの npm 版にリダイレクト
  const jszipLocal = path.join(root, 'node_modules', 'jszip', 'dist', 'jszip.min.js');
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['https://cdn.jsdelivr.net/npm/jszip*'] },
    (details, callback) => {
      callback({ redirectURL: `file://${jszipLocal.replace(/\\/g, '/')}` });
    }
  );

  win.loadFile(path.join(root, 'index.html'));

  // 安全策: 注入が万一失敗してもウィンドウが出るよう一定時間後に必ず表示
  setTimeout(() => { if (!win.isDestroyed() && !win.isVisible()) win.show(); }, 4000);

  win.webContents.on('did-finish-load', () => {
    // ─────────────────────────────────────────────
    // CSS 注入
    // ─────────────────────────────────────────────
    win.webContents.insertCSS(`
      h1, p[data-i18n="subtitle"], .top-links { display: none !important; }

      html {
        font-size: 85% !important;
        height: 100% !important;
        overflow: hidden !important;
        margin: 0 !important;
      }

      body {
        font-family: Arial, "Meiryo", "Yu Gothic UI", "Hiragino Sans", sans-serif !important;
        height: 100% !important;
        overflow: hidden !important;
        margin: 0 !important;
      }

      pre {
        font-family: "Consolas", "Meiryo", "Yu Gothic UI", monospace !important;
      }

      /* <code>（タグ候補等）も pre と同じフォントに揃える
         （既定の Consolas のみだと日本語がシステム既定の旧 monospace になるため） */
      code {
        font-family: "Consolas", "Meiryo", "Yu Gothic UI", monospace !important;
      }

      .app {
        height: 100vh !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: none !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* ── カスタムタイトルバー ── */
      #electron-titlebar {
        display: flex;
        align-items: stretch;
        height: 36px;
        min-height: 36px;
        background: #252525;
        border-bottom: 1px solid #363636;
        flex-shrink: 0;
        -webkit-app-region: drag;
        user-select: none;
      }

      #etb-brand {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 10px 0 14px;
      }

      #etb-icon {
        width: 15px;
        height: 15px;
        opacity: 0.85;
      }

      #etb-title {
        font-size: 12px;
        font-weight: 700;
        color: #dedede;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }

      #etb-title-suffix {
        font-weight: 400;
        color: #9a9a9a;
      }

      #etb-badge {
        font-size: 9px;
        color: #5a5a5a;
        background: #1a1a1a;
        border: 1px solid #3e3e3e;
        border-radius: 3px;
        padding: 1px 5px;
        line-height: 1.5;
      }

      #etb-vsep {
        width: 1px;
        background: #363636;
        margin: 9px 4px;
        flex-shrink: 0;
      }

      #etb-nav {
        display: flex;
        align-items: center;
        gap: 1px;
        padding: 0 2px;
        -webkit-app-region: no-drag;
      }

      .etb-nav-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        background: transparent;
        border: none;
        color: #888;
        font-size: 11.5px;
        font-family: inherit;
        padding: 0 11px;
        height: 36px;
        cursor: pointer;
        -webkit-app-region: no-drag;
        transition: background 0.1s, color 0.1s;
        white-space: nowrap;
      }

      .etb-nav-btn:hover {
        background: #2e2e2e;
        color: #ccc;
      }

      #etb-spacer { flex: 1; }

      #etb-controls {
        display: flex;
        align-items: stretch;
        -webkit-app-region: no-drag;
      }

      .etb-ctrl {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
        -webkit-app-region: no-drag;
        transition: background 0.1s, color 0.1s;
      }

      .etb-ctrl:hover         { background: #363636; color: #eee; }
      #etb-close:hover        { background: #c42b1c; color: #fff; }

      /* ── 3カラムレイアウト（カード型パネル） ── */
      #electron-layout {
        display: flex !important;
        flex: 1 !important;
        overflow: hidden !important;
        min-height: 0 !important;
        gap: 8px !important;
        padding: 8px !important;
        background: #19191e !important;
        box-sizing: border-box !important;
      }

      /* カード共通スタイル */
      .etb-card {
        background: #26262e;
        border: 1px solid #383842;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
        box-sizing: border-box;
      }
      .etb-card-head {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 11px;
        background: #2c2c35;
        border-bottom: 1px solid #383842;
        flex-shrink: 0;
      }
      .etb-card-head::before {
        content: '';
        width: 3px;
        height: 12px;
        border-radius: 2px;
        background: #5b6c9c;
        flex-shrink: 0;
      }
      .etb-card-title {
        font-size: 11px;
        font-weight: 700;
        color: #a6a6b4;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .etb-card-body { padding: 8px; min-height: 0; }

      /* カードヘッダーの分離ボタン */
      .etb-detach-btn {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 18px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: #6b6b78;
        cursor: pointer;
        transition: background 0.1s, color 0.1s;
      }
      .etb-detach-btn:hover { background: #3a3a44; color: #cfcfe0; }

      /* ── 左カラム: 複数カードを縦に並べ、列ごとスクロール ── */
      #electron-col-future {
        flex: 2 !important;
        min-width: 0 !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      #electron-col-future > .etb-card { flex: 0 0 auto; }
      #etb-meta-body { padding: 0 !important; }

      /* 設定モード: 「譜面読み込み設定」「チェックリストの設定」を 50/50・全高に統一 */
      #electron-layout.etb-settings #electron-col-future { flex: 1 1 0 !important; }
      #electron-layout.etb-settings #electron-col-tabs   { flex: 1 1 0 !important; }
      #electron-layout.etb-settings #etb-card-loadsettings { flex: 1 1 auto !important; }

      /* ── osu! マップパネル ── */
      #osu-map-panel {
        display: flex;
        flex-direction: column;
        font-size: 12px;
        color: #ddd;
      }

      #osu-map-bg-wrap { padding: 8px 8px 0 8px; }

      #osu-map-bg {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        display: block;
        background: #111;
        border-radius: 6px;
      }

      #osu-map-meta {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
      }

      .osu-map-row { display: flex; flex-direction: column; gap: 1px; }

      .osu-map-label {
        font-size: 11px;
        color: #777;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .osu-map-value { color: #eee; word-break: break-all; font-size: 13px; }
      .osu-map-value.unicode { color: #aac4ff; }
      .osu-map-value.source  { color: #e8b462; }
      .osu-map-value.none    { color: #444; font-style: italic; font-size: 12px; }

      #osu-map-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px; }

      .osu-tag-chip {
        display: inline-block;
        background: rgba(255,255,255,0.07);
        color: #bbb;
        border: 1px solid rgba(255,255,255,0.13);
        border-radius: 999px;
        padding: 1px 7px;
        font-size: 11px;
        line-height: 1.6;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
      }
      .osu-tag-chip:hover { border-color: rgba(255,255,255,0.32); color: #ddd; }
      .osu-tag-chip.checked {
        background: rgba(74,222,128,0.18);
        border-color: #4ade80;
        color: #c9f5d6;
      }
      .osu-tag-chip.checked:hover { border-color: #6ee79a; }

      #osu-map-waiting { padding: 12px 8px; color: #555; font-size: 11px; }

      /* ── 左カラムに移動したドロップエリア（file モード時のみ表示） ── */
      #electron-col-future .drop-area {
        margin: 0;
        padding: 16px 12px;
        border-radius: 6px;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      #electron-col-future .drop-area .file-picker {
        flex-wrap: wrap;
        gap: 6px 8px;
      }
      #electron-col-future .drop-area .file-button {
        font-size: 11px !important;
        padding: 4px 9px !important;
      }
      #electron-col-future .drop-area .file-name {
        font-size: 11px !important;
      }
      #electron-col-future .drop-area p {
        font-size: 11px;
        margin: 8px 0 0;
      }

      /* ── タイミングパネル（カード本体） ── */
      #osu-timing-panel {
        padding: 8px 11px;
      }

      .osu-timing-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 3px 0;
      }

      .osu-timing-label {
        font-size: 11.5px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .osu-timing-value {
        font-family: "Consolas", "Courier New", monospace;
        font-size: 13.5px;
        color: #bbb;
        text-align: right;
        margin-left: 6px;
        cursor: pointer;
        user-select: none;
        border-radius: 3px;
        transition: color 0.15s, background 0.15s;
      }
      .osu-timing-value:hover { background: rgba(255,255,255,0.06); }
      .osu-timing-value.etb-copied { color: #6ee79a !important; background: rgba(74,222,128,0.16); }

      #osu-t-timing { font-size: 15px; color: #ddd; letter-spacing: 0.02em; }

      /* ── タブ列（チェックリストカード） ── */
      #electron-col-tabs {
        flex: 1.6 !important;
        overflow: hidden !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
      }
      #electron-col-tabs > .etb-card-body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 12px 6px 6px;
      }

      #electron-col-tabs .tab-buttons {
        position: static !important;
        top: auto !important;
        left: auto !important;
        width: 100% !important;
        display: grid !important;
        /* 列幅に応じて自動で列数を調整（狭い時は1列になり、ボタンが広く使える） */
        grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)) !important;
        align-items: start !important;
        column-gap: 5px !important;
        row-gap: 20px !important;
        box-sizing: border-box !important;
      }

      /* グループ枠とタイトルの背景をカード色に馴染ませる
         （web版のページ背景色だと新カード背景から浮くため上書き） */
      #electron-col-tabs .tab-group {
        width: auto !important;
        min-width: 0 !important;
        background: transparent !important;
        border-color: #3d3d48 !important;
      }
      #electron-col-tabs .tab-group-title {
        background: #26262e !important;
        color: #b6bac6 !important;
      }
      #electron-col-tabs .tab-button {
        font-size: 11px !important;
        padding: 5px 6px !important;
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        /* 切らずに折り返す（狭い時は2行になる） */
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        line-height: 1.2 !important;
        min-height: 28px !important;
        word-break: break-word !important;
      }
      #electron-col-tabs .tab-group-title { font-size: 11px !important; }

      /* 「ツール」グループは最下部に全幅で隔離（上に余白を空けて区切る） */
      #electron-col-tabs .tab-group.etb-tool-group {
        grid-column: 1 / -1 !important;
        margin-top: 16px !important;
      }

      /* 設定モード: 移設したチェック対象選択をカードに馴染ませる */
      #etb-card-loadsettings .osu-source-settings {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
      }

      /* 設定モード: 移設したタブ表示トグルを縦リスト表示にする
         （.tab-settings-panel から出したので元の flex 指定が効かないため再指定） */
      #etb-checklist-settings-body { padding: 10px 12px 8px !important; }
      #etb-checklist-settings-body label {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        font-size: 12px !important;
        color: #cfcfcf !important;
        padding: 4px 2px !important;
        cursor: pointer !important;
        white-space: normal !important;
      }
      #etb-checklist-settings-body input { cursor: pointer; flex-shrink: 0; }

      /* ── タイトルバーに移動した .top-links 要素のスタイル上書き ── */
      #etb-nav > a,
      #etb-nav > button {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        color: #888 !important;
        font-size: 11.5px !important;
        font-family: inherit !important;
        padding: 0 9px !important;
        height: 36px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        box-shadow: none !important;
        margin: 0 !important;
        transition: background 0.1s, color 0.1s !important;
        -webkit-app-region: no-drag !important;
      }

      #etb-nav > a:hover,
      #etb-nav > button:hover {
        background: #2e2e2e !important;
        color: #ccc !important;
      }

      #etb-nav > button.active {
        color: #ccc !important;
        background: #353535 !important;
      }

      /* ── 出力列（チェック結果カード） ── */
      #electron-col-output {
        flex: 5 !important;
        overflow: hidden !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
      }
      #electron-col-output > .etb-card-body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 10px;
      }

      /* Clap/Whistle の #output だけ箱型（黒背景）なので、他の出力 pre と
         同じくカード背景に同化させる */
      #electron-col-output #output {
        background: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
        margin-top: 0 !important;
      }

      /* グラフの再生ヘッド（リアルタイム時刻バー） */
      .etb-playhead {
        position: absolute;
        width: 2px;
        background: #ff5a5a;
        pointer-events: none;
        z-index: 6;
        box-shadow: 0 0 4px rgba(255,90,90,0.7);
      }

      /* 現 Diff との交点マーカー＋値ラベル */
      .etb-chart-marker { position: absolute; pointer-events: none; z-index: 8; }
      .etb-chart-marker-dot {
        position: absolute; left: 0; top: 0;
        width: 12px; height: 12px; border-radius: 50%;
        border: 2px solid #fff; box-sizing: border-box;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 5px rgba(0,0,0,0.6);
      }
      .etb-chart-marker-label {
        position: absolute; left: 10px; top: 0;
        transform: translateY(-50%);
        font-size: 11px; font-weight: 700; color: #fff;
        background: rgba(0,0,0,0.66); padding: 1px 6px; border-radius: 4px;
        white-space: nowrap;
      }

      /* グラフの分離ボタン（各グラフ右上） */
      .etb-chart-detach {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 24px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: rgba(38,38,46,0.85);
        border: 1px solid #4a4a58;
        border-radius: 5px;
        color: #b8b8c6;
        cursor: pointer;
        z-index: 7;
      }
      .etb-chart-detach:hover { background: #3a3a48; color: #fff; }
    `);

    // ─────────────────────────────────────────────
    // DOM 操作・イベント注入
    // ─────────────────────────────────────────────
    win.webContents.executeJavaScript(`
      (function() {
        if (document.getElementById('electron-titlebar')) return;

        var appEl      = document.querySelector('.app');
        var topLinks   = appEl.querySelector('.top-links');
        var dropArea   = appEl.querySelector('.drop-area');
        var tabVis     = appEl.querySelector('.tab-visibility-settings');
        var tabsSec    = appEl.querySelector('.tabs');
        var tabButtons = tabsSec.querySelector('.tab-buttons');
        var tabPanels  = Array.from(tabsSec.querySelectorAll('.tab-panel'));

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
            '<img id="etb-icon" src="${iconUrl}" alt="">' +
            '<span id="etb-title">osu!taiko Modding Helper<span id="etb-title-suffix"> for Desktop</span></span>' +
            '<span id="etb-badge">v${version}</span>' +
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

        layout.appendChild(futureCol);
        layout.appendChild(tabsCol);
        layout.appendChild(outputCol);

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

        /* Electron 既定: 保存設定がまだ無い初回のみ、web では既定 OFF の
           「音声波形・タイムライン・BN評価」を ON にする。
           （localStorage は web と exe で別管理。既存ユーザーの保存設定は尊重） */
        try {
          if (!localStorage.getItem('moddingHelperVisibleTabs')) {
            var defaultOnTabs = ['offsetWaveform', 'timeline', 'bnCompare'];
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

        /* 設定モード: ⚙設定 で ON/OFF。
           ON のとき 左カードを「譜面読み込み設定」、中央カードを「チェックリストの設定」に切替 */
        var settingsMode = false;

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
        var updatePlayheads = function(ms) {
          for (var i = 0; i < playheadChartIds.length; i++) {
            var id = playheadChartIds[i];
            var cv = document.getElementById(id);
            var d  = getPlayheadEl(id);
            var mk = getMarkerEl(id);
            if (!cv || !d) continue;
            var g = cv.__playheadGeom;
            if (ms < 0 || !g || !g.plot || cv.offsetParent === null) {
              d.style.display = 'none'; if (mk) mk.style.display = 'none'; continue;
            }
            var span = g.viewEnd - g.viewStart;
            if (span <= 0) { d.style.display = 'none'; if (mk) mk.style.display = 'none'; continue; }
            var frac = (ms - g.viewStart) / span;
            if (frac < 0 || frac > 1) { d.style.display = 'none'; if (mk) mk.style.display = 'none'; continue; }
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
          }
        };
        var hideAllPlayheads = function() {
          for (var k in playheadEls) { if (playheadEls[k]) playheadEls[k].style.display = 'none'; }
          for (var k2 in markerEls) { if (markerEls[k2]) markerEls[k2].style.display = 'none'; }
        };

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
        var applyPanelModeUi = function() {
          var isOsu = (panelMode === 'osu');
          var s = settingsMode;
          var setDisp = function(id, show) {
            var el = document.getElementById(id);
            if (el) el.style.display = show ? '' : 'none';
          };
          /* 左カラム（設定モード中・分離中のカードは隠す） */
          setDisp('etb-card-meta',         !s && !detachState.metadata);
          setDisp('etb-card-realtime',     !s && isOsu && !detachState.timing);
          setDisp('etb-card-file',         !s && !isOsu);
          setDisp('etb-card-loadsettings',  s);
          /* 中央カラム（チェックリスト） */
          setDisp('etb-checklist-buttons-body',  !s);
          setDisp('etb-checklist-settings-body',  s);
          /* 右カラム（チェック結果）は設定モード中は隠す */
          setDisp('electron-col-output',  !s);
          /* 設定モードは左右カードを 50/50・全高にするため layout にクラス付与 */
          var layoutEl = document.getElementById('electron-layout');
          if (layoutEl) layoutEl.classList.toggle('etb-settings', s);
          /* osu! モード以外・設定モードでは再生ヘッドを隠す */
          if (!isOsu || s) hideAllPlayheads();
          /* チェックリストカードのタイトル切替 */
          var isEn = document.getElementById('langEn') && document.getElementById('langEn').classList.contains('active');
          var clT = document.getElementById('etb-title-checklist');
          if (clT) clT.textContent = s
            ? (isEn ? 'Check list settings' : 'チェックリストの設定')
            : (isEn ? 'Check list' : 'チェックリスト');
          /* 設定ボタンのアクティブ表示 */
          var sBtn = document.getElementById('toggleTabSettings');
          if (sBtn) sBtn.classList.toggle('active', s);
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
          metaForTags.addEventListener('click', function(e) {
            var chip = e.target && e.target.closest ? e.target.closest('.osu-tag-chip') : null;
            if (!chip) return;
            chip.classList.toggle('checked');
            var tag = chip.textContent;
            if (chip.classList.contains('checked')) tagChecked[tag] = true;
            else delete tagChecked[tag];
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
          set('etb-title-checklist',
              settingsMode ? 'チェックリストの設定' : 'チェックリスト',
              settingsMode ? 'Check list settings'  : 'Check list');
          set('etb-title-results',      'チェック結果',       'Check results');
        };
        updatePanelTitles();

        /* ⚙設定 ボタンで設定モードを切替 */
        var settingsToggleBtn = document.getElementById('toggleTabSettings');
        if (settingsToggleBtn) {
          settingsToggleBtn.addEventListener('click', function() {
            settingsMode = !settingsMode;
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

            /* アイコン用 SVG */
            var svgExternalLink = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
            var svgClock = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

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
              { id: 'manualLink',      svg: svgBook          },
              { id: 'etb-other-tools', svg: svgExternalLink  },
              { id: 'updateBtn',       svg: svgClock         },
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

            /* ⚙ ボタンに「設定」テキストを追加 */
            var settingsBtn = document.getElementById('toggleTabSettings');
            if (settingsBtn) settingsBtn.textContent = '⚙ 設定';

            /* Web と GitHub リンクを追加 */
            var svgGlobe = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
            var svgGitHub = '<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

            var extSep = document.createElement('div');
            extSep.style.cssText = 'width:1px;background:#363636;margin:9px 4px;flex-shrink:0;-webkit-app-region:no-drag;';
            navEl.appendChild(extSep);

            var webLink = document.createElement('a');
            webLink.href = 'https://calmeel.github.io/modding-helper/';
            webLink.target = '_blank';
            webLink.rel = 'noopener noreferrer';
            webLink.innerHTML = svgGlobe + ' Webツール';
            navEl.appendChild(webLink);

            var githubLink = document.createElement('a');
            githubLink.href = 'https://github.com/calmeel/modding-helper';
            githubLink.target = '_blank';
            githubLink.rel = 'noopener noreferrer';
            githubLink.innerHTML = svgGitHub + ' GitHub';
            navEl.appendChild(githubLink);
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

          /* メタデータ行をパネルに描画（osu! / file 両モードで共用） */
          var renderMapPanel = function(data) {
            var bg   = document.getElementById('osu-map-bg');
            var meta = document.getElementById('osu-map-meta');
            if (!meta) return;
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
              var chips = data.tags.split(' ').filter(function(t) { return t; })
                .map(function(t) { return '<span class="osu-tag-chip">' + t + '</span>'; })
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
    `).then(function() {
      if (!win.isDestroyed()) win.show();  // 変換完了後に表示（ちらつき防止）
      osuWatcher.setDeliver(broadcastOsuData);
      osuWatcher.start(win);
    }).catch(function() {
      if (!win.isDestroyed()) win.show();
      osuWatcher.setDeliver(broadcastOsuData);
      osuWatcher.start(win);
    });
  });

  win.on('page-title-updated', function(e) { e.preventDefault(); });
  win.on('closed', function() {
    osuWatcher.stop();
    // メインを閉じたら分離ウィンドウも閉じる
    ['metadata', 'timing'].forEach(function(n) {
      if (popoutWindows[n] && !popoutWindows[n].isDestroyed()) popoutWindows[n].destroy();
      popoutWindows[n] = null;
    });
    Object.keys(chartPopouts).forEach(function(id) {
      if (chartPopouts[id] && !chartPopouts[id].isDestroyed()) chartPopouts[id].destroy();
      delete chartPopouts[id];
    });
    mainWin = null;
  });

  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  mainWin = createWindow();

  ipcMain.on('win-minimize',  () => { if (mainWin) mainWin.minimize(); });
  ipcMain.on('win-maximize',  () => {
    if (!mainWin) return;
    mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
  });
  ipcMain.on('win-close',     () => { if (mainWin) mainWin.close(); });
  ipcMain.on('win-open-docs', () => { shell.openExternal('file:///' + docsPath.replace(/\\/g, '/')); });

  // パネルを別ウィンドウに分離（メタデータは現在のチェック状態を引き継ぐ）
  ipcMain.on('detach-panel', (e, name, lang, checked) => {
    if (name === 'metadata') popoutMetaChecked = Array.isArray(checked) ? checked : [];
    openPopout(name, lang);
  });

  // グラフを別ウィンドウに分離
  ipcMain.on('detach-chart', (e, chartId, lang) => openChartPopout(chartId, lang));

  // 分離窓での Tags チェック状態の変化を保持（復帰時にメインへ反映するため）
  ipcMain.on('popout-checked-changed', (e, arr) => {
    popoutMetaChecked = Array.isArray(arr) ? arr : [];
  });

  // file モードのメタデータをメタデータ・ポップアウトへ転送（osu モードは osuWatcher 経由）
  ipcMain.on('popout-map-meta', (e, data) => {
    lastMapInfo = data;
    const w = popoutWindows.metadata;
    if (w && !w.isDestroyed()) { try { w.webContents.send('osu-map-info', data); } catch (_) {} }
  });

  // 現在 osu! で開いている譜面のフォルダを .osz 相当の zip にまとめて返す。
  // knownFolder と同じフォルダなら再構築せず { unchanged:true } を返す。
  ipcMain.handle('osu-get-current-mapset', async (event, knownFolder) => {
    const osuPath = osuWatcher.getCurrentOsuPath();
    if (!osuPath) return null;

    const folder = path.dirname(osuPath);
    if (knownFolder && folder === knownFolder) {
      return { unchanged: true, folder };
    }

    let entries;
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch (_) {
      return null;
    }

    // 解析に必要なファイルのみ（.osu / 音声 / 画像）。動画やストーリーボードは除外。
    const allow = /\.(osu|mp3|ogg|wav|jpg|jpeg|png|bmp)$/i;
    const zip = new JSZip();
    let osuCount = 0;
    for (const ent of entries) {
      if (!ent.isFile() || !allow.test(ent.name)) continue;
      try {
        zip.file(ent.name, fs.readFileSync(path.join(folder, ent.name)));
        if (/\.osu$/i.test(ent.name)) osuCount++;
      } catch (_) { /* 読めないファイルはスキップ */ }
    }
    if (osuCount === 0) return null;

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
    return { name: path.basename(folder) + '.osz', folder, buffer };
  });
});

app.on('window-all-closed', () => app.quit());
