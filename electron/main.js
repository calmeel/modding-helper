const { app, BrowserWindow, session, Menu, screen, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { autoUpdater } = require('electron-updater');
// リアルタイム(osu!メモリ監視)は非公開ファイル（GitHub には上げない方針）。
// 欠落していても web プレビュー等は動くよう no-op スタブにフォールバックする。
let osuWatcher;
try {
  osuWatcher = require('./osuWatcher');
} catch (e) {
  osuWatcher = {
    setDeliver: function () {},
    start: function () {},
    stop: function () {},
    getCurrentOsuPath: function () { return null; }
  };
}

const root     = path.join(__dirname, '..');
const { version } = require('../package.json');
const iconUrl  = 'file:///' + path.join(root, 'images', 'icon.png').replace(/\\/g, '/');
const docsPath = path.join(root, 'docs', 'docs.html');

let mainWin = null;

// スプレッド表示の効果音: 指定フォルダの音源を base64 データURLで読み込む。
//   期待するファイル名（拡張子は wav/ogg/mp3 のいずれか。無い物は省略可）:
//     don / kat（必須）, don-big / kat-big（任意: 大音符。無ければ don/kat を大きめに鳴らす）
//   osu!taiko 標準スキン名（taiko-normal-hitnormal 等）も認識する。
// renderer は file://・asar の直接 fetch が制限されるため、メインで fs 読み込みして注入する。
function loadTaikoSoundMapFrom(dir) {
  const exts = ['.wav', '.ogg', '.mp3'];
  const mime = { '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
  const bases = {
    don:    ['don',     'taiko-normal-hitnormal'],
    kat:    ['kat',     'taiko-normal-hitclap', 'taiko-normal-hitwhistle'],
    donBig: ['don-big', 'taiko-normal-hitfinish'],
    katBig: ['kat-big', 'taiko-normal-hitwhistle']
  };
  const map = {};
  for (const key of Object.keys(bases)) {
    let found = false;
    for (const base of bases[key]) {
      for (const ext of exts) {
        const p = path.join(dir, base + ext);
        try {
          if (fs.existsSync(p)) {
            map[key] = 'data:' + mime[ext] + ';base64,' + fs.readFileSync(p).toString('base64');
            found = true;
            break;
          }
        } catch (_) { /* 読めなければスキップ */ }
      }
      if (found) break;
    }
  }
  return map;
}

// sounds/ 配下のセット一覧を返す。
//   サブフォルダがあれば各フォルダ=1セット（フォルダ名=ラベル）。
//   サブフォルダが無ければ sounds/ 直下を単一セット 'default' とする。
// 戻り値: [{ id, label, sounds: {don,kat,donBig,katBig} }, ...]
function loadTaikoSoundSets() {
  const dir = path.join(root, 'sounds');
  const sets = [];
  let subdirs = [];
  try {
    subdirs = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (_) { subdirs = []; }

  if (subdirs.length) {
    for (const name of subdirs) {
      const sounds = loadTaikoSoundMapFrom(path.join(dir, name));
      if (sounds.don || sounds.kat) sets.push({ id: name, label: name, sounds });
    }
  }
  if (!sets.length) {
    const sounds = loadTaikoSoundMapFrom(dir);
    if (sounds.don || sounds.kat) sets.push({ id: 'default', label: 'Default', sounds });
  }
  return sets;
}

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
    // リアルタイム表示窓: 最小サイズを現在サイズに固定し、高さは現在値で上限固定（横のみ拡張可）
    minWidth:  name === 'timing' ? conf.width  : undefined,
    minHeight: name === 'timing' ? popHeight    : undefined,
    maxHeight: name === 'timing' ? popHeight    : undefined,
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
    // スプレッド表示の効果音源セット（sounds/<セット>/ にあれば）を注入。無ければ合成音にフォールバック
    try {
      win.webContents.executeJavaScript(
        'window.__taikoSoundSets = ' + JSON.stringify(loadTaikoSoundSets()) + ';'
      ).catch(() => {});
    } catch (_) {}
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

      /* アップデートのダウンロード進捗バー */
      #etb-update-toast {
        position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
        z-index: 99999; background: #23232c; border: 1px solid #3d3d48;
        border-radius: 8px; padding: 9px 14px; min-width: 250px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5); display: none;
        -webkit-app-region: no-drag;
      }
      .etb-update-text { font-size: 12px; color: #cfcfe0; margin-bottom: 6px; text-align: center; }
      .etb-update-track { height: 6px; background: #15151a; border-radius: 3px; overflow: hidden; }
      #etb-update-fill { height: 100%; width: 0%; background: #5b9bd5; transition: width 0.15s; }

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
        /* BG を 25% 暗くする（dim 0.25 = 表示輝度 75%）。値を変えると暗さを調整可 */
        filter: brightness(0.75);
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
      /* ダブルクリックでコピーした瞬間のフラッシュ */
      .osu-tag-chip.copied {
        background: rgba(91,155,213,0.4) !important;
        border-color: #5b9bd5 !important;
        color: #fff !important;
      }

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

      /* スプレッド表示パネル（プレビュータブ専用。通常は非表示） */
      #electron-col-output #tab-spreadPlay { padding: 0 !important; }

      /* ── プレビューモード: スプレッド表示を全面に、他カラム/サブタブを隠す ── */
      #electron-layout.etb-preview #electron-col-future,
      #electron-layout.etb-preview #electron-col-tabs { display: none !important; }
      #electron-layout.etb-preview #electron-col-output { flex: 1 1 100% !important; }
      #electron-layout.etb-preview #electron-col-output > .etb-card-head { display: none !important; }
      #electron-layout.etb-preview #electron-col-output .tab-visibility-settings { display: none !important; }
      #electron-layout.etb-preview #electron-col-output .tab-panel:not(#tab-spreadPlay) { display: none !important; }
      #electron-layout.etb-preview #tab-spreadPlay {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
      }
      #etb-spread-canvas {
        display: block;
        width: 100%;
        flex: 1 1 auto;
        min-height: 200px;
        background: #1a1a1f;
        cursor: grab;
      }
      .etb-spread-toolbar {
        display: flex; align-items: center; gap: 14px;
        flex: 0 0 auto;
        padding: 6px 10px;
        border-bottom: 1px solid #2a2a33;
        font-size: 12px; color: #cfcfcf;
      }
      .etb-spread-toolbar .etb-spread-snaplabel,
      .etb-spread-toolbar .etb-spread-sfx { display: inline-flex; align-items: center; gap: 6px; }
      .etb-spread-toolbar .etb-spread-sfx { cursor: pointer; user-select: none; }
      .etb-spread-toolbar .etb-spread-sfx input { cursor: pointer; }

      /* 設定画面の「効果音の種類」 */
      .etb-sfx-settings { margin-top: 12px; padding-top: 10px; border-top: 1px solid #2a2a33; }
      .etb-sfx-settings-title { font-size: 12px; color: #9fb0c0; margin-bottom: 6px; }
      .etb-sfx-settings .etb-sfx-opt {
        display: flex; align-items: center; gap: 7px;
        font-size: 13px; color: #ddd; padding: 4px 2px; cursor: pointer;
      }
      .etb-sfx-settings .etb-sfx-opt input { cursor: pointer; flex-shrink: 0; }
      .etb-sfx-settings .etb-sfx-none { font-size: 12px; color: #777; }
      .etb-sfx-settings .etb-sfx-vol {
        display: flex; align-items: center; gap: 8px; margin-top: 8px;
      }
      .etb-sfx-settings .etb-sfx-vol-label { font-size: 13px; color: #ddd; flex-shrink: 0; }
      .etb-sfx-settings .etb-sfx-vol-range { flex: 1 1 auto; min-width: 60px; cursor: pointer; }
      .etb-sfx-settings .etb-sfx-vol-num {
        width: 56px; flex-shrink: 0;
        background: #2a2a33; color: #eee;
        border: 1px solid #3a3a45; border-radius: 4px; padding: 2px 4px; font-size: 12px;
      }
      .etb-spread-toolbar select {
        background: #2a2a33; color: #eee;
        border: 1px solid #3a3a45; border-radius: 4px;
        padding: 2px 4px; font-size: 12px; cursor: pointer;
      }
      .etb-spread-zoom { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
      .etb-spread-zoom button {
        width: 24px; height: 22px; line-height: 1; font-size: 14px;
        display: inline-flex; align-items: center; justify-content: center;
        background: #2a2a33; color: #eee;
        border: 1px solid #3a3a45; border-radius: 4px; cursor: pointer;
        padding: 0;
      }
      .etb-spread-zoom button:hover { background: #34343f; }
      #etb-spread-zoomlabel { min-width: 44px; text-align: center; font-variant-numeric: tabular-nums; }

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
            '<label class="etb-spread-snaplabel"><span id="etb-spread-snap-text">スナップ</span> ' +
            '<select id="etb-spread-snap">' +
            '<option value="1">1/1</option><option value="2">1/2</option>' +
            '<option value="3">1/3</option><option value="4" selected>1/4</option>' +
            '<option value="6">1/6</option><option value="8">1/8</option>' +
            '<option value="12">1/12</option><option value="16">1/16</option>' +
            '</select></label>' +
            '<label class="etb-spread-sfx"><input type="checkbox" id="etb-spread-sfx-cb"> ' +
            '<span id="etb-spread-sfx-text">効果音</span></label>' +
            '<span class="etb-spread-zoom">' +
            '<button type="button" id="etb-spread-zoomout">−</button>' +
            '<span id="etb-spread-zoomlabel">100%</span>' +
            '<button type="button" id="etb-spread-zoomin">＋</button>' +
            '</span>';
          spPanel.appendChild(spBar);

          var spCanvas = document.createElement('canvas');
          spCanvas.id = 'etb-spread-canvas';
          spPanel.appendChild(spCanvas);
          outBody.appendChild(spPanel);

          /* 表示状態: スナップ分割・ズーム(pxPerMs) */
          var spSnap = 4;
          var SP_BASE_PX = 0.32, SP_ZOOM_MIN = 0.06, SP_ZOOM_MAX = 2.2;
          var spPxPerMs = SP_BASE_PX;
          var updateSpZoomLabel = function () {
            var l = document.getElementById('etb-spread-zoomlabel');
            if (l) l.textContent = Math.round(spPxPerMs / SP_BASE_PX * 100) + '%';
          };
          var setSpZoom = function (v) {
            spPxPerMs = Math.max(SP_ZOOM_MIN, Math.min(SP_ZOOM_MAX, v));
            updateSpZoomLabel();
          };
          var spSnapSel = spBar.querySelector('#etb-spread-snap');
          if (spSnapSel) spSnapSel.addEventListener('change', function () {
            var v = parseInt(spSnapSel.value, 10); if (v > 0) spSnap = v;
          });
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
          /* 選択中のセットで効果音キットを作り直す（合成音フォールバック付き） */
          var buildSfxKit = function () {
            if (spSynth && spSynth.ctx && spSynth.ctx.close) { try { spSynth.ctx.close(); } catch (e) {} }
            spSynth = null;
            var set = getSelectedSfxSet();
            var sm = set && set.sounds;
            if (sm && (sm.don || sm.kat) && window.createTaikoSampleKit) {
              spSynth = window.createTaikoSampleKit(sm);
            }
            if (!spSynth && window.createTaikoHitSynth) {
              spSynth = window.createTaikoHitSynth(); // 音源が無ければ合成音
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

          /* 設定画面（譜面読み込み設定カード）に「効果音の種類」ラジオを追加 */
          if (typeof loadSettingsBody !== 'undefined' && loadSettingsBody) {
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

            loadSettingsBody.appendChild(sfxSection);
          }

          var spSfxCb = spBar.querySelector('#etb-spread-sfx-cb');
          if (spSfxCb) spSfxCb.addEventListener('change', function () {
            spHitSounds = spSfxCb.checked;
            if (spHitSounds && !spSynth) buildSfxKit();
            if (spHitSounds && spSynth) spSynth.resume(); // ユーザー操作なので AudioContext を起動
            spSfxLastSong = null; spSfxSchedTo = null; // 有効化直後に過去分を鳴らさない
          });

          /* 難易度キャッシュ（__loadedDiffs が差し替わった時だけ再解析） */
          var spCacheRef = null, spCacheDiffs = [];
          var spreadTimeRange = null; // 手動シークのクランプ用 [min, max]
          var getSpreadDiffs = function () {
            var raw = window.__loadedDiffs;
            if (raw === spCacheRef) return spCacheDiffs;
            spCacheRef = raw;
            spCacheDiffs = (raw || []).map(function (d) {
              var name = (typeof parseMetadataValue === 'function' && d.text
                && parseMetadataValue(d.text, 'Version')) || d.fileName || '';
              return {
                name: name,
                fileName: d.fileName || '',
                notes: window.parseTaikoNotes(d.text),
                red: window.parseTaikoRedTiming ? window.parseTaikoRedTiming(d.text) : []
              };
            });
            /* 難易度順（易→難）の逆順 = 難→易 に並べ替え（上のレーンほど難しい）。
               順序に無い難易度は末尾へ。安定ソートで元の相対順を保持。 */
            var order = window.__loadedDiffOrder;
            if (order && order.length) {
              var rank = Object.create(null);
              for (var oi = 0; oi < order.length; oi++) rank[order[oi]] = oi;
              spCacheDiffs.sort(function (a, b) {
                var ra = a.fileName in rank ? rank[a.fileName] : -1;
                var rb = b.fileName in rank ? rank[b.fileName] : -1;
                return rb - ra; // 降順: rank大(難しい)を先頭、未知(-1)は末尾
              });
            }
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

          /* マウス操作:
             - ドラッグ = スクラブ（右=戻る / 左=進む。開始時に音楽停止）
             - 動かさずクリック = そのレーンを効果音の対象に選択
             閾値を超えて初めてドラッグ扱いにする。 */
          var SP_DRAG_THRESH = 5;
          var spPendingDown = false, spDownX = 0, spDownY = 0, spDragLastX = 0;
          spCanvas.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            spPendingDown = true;
            spDownX = e.clientX; spDownY = e.clientY; spDragLastX = e.clientX;
            e.preventDefault();
          });
          window.addEventListener('mousemove', function (e) {
            if (!spPendingDown && !spreadDragging) return;
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
          });
          window.addEventListener('mouseup', function (e) {
            if (spreadDragging) { spreadDragging = false; spCanvas.style.cursor = ''; spPendingDown = false; return; }
            if (!spPendingDown) return;
            spPendingDown = false;
            /* 動かさずクリック → クリックしたレーンを効果音の対象に選択 */
            var geom = spCanvas.__spreadGeom;
            if (!geom || !geom.n) return;
            var rect = spCanvas.getBoundingClientRect();
            var relY = e.clientY - rect.top;
            if (e.clientX < rect.left || e.clientX > rect.right || relY < 0 || relY > rect.height) return;
            var idx = Math.floor((relY - geom.topPad) / geom.laneH);
            spSoundLane = Math.max(0, Math.min(geom.n - 1, idx));
          });

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
          spAudio.volume = spMusicVolume01; // 設定した曲の音量を反映
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
          spAudio.addEventListener('play',  function () { spreadAudioPlaying = true; });
          spAudio.addEventListener('pause', function () { spreadAudioPlaying = false; });
          spAudio.addEventListener('ended', function () { spreadAudioPlaying = false; });

          var toggleSpreadPlay = function () {
            syncSpreadAudioSrc();
            if (!spAudioSrcRef) return; // 音源が無い
            if (spAudio.paused) {
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

          /* スペースキーで再生/一時停止（スプレッド表示中・入力欄以外） */
          document.addEventListener('keydown', function (e) {
            if (!spPreviewOn) return;
            if (e.code !== 'Space' && e.key !== ' ') return;
            var t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            e.preventDefault();
            toggleSpreadPlay();
          });

          /* 効果音を Web Audio クロックに「先読みスケジュール」して鳴らす。
             描画ループ(約16ms)で通過検出→即再生 だと検出遅れぶん遅延するため、
             少し先(SP_SFX_LOOKAHEAD_MS)までのノーツを正確な発音時刻で予約する。 */
          var SP_SFX_LOOKAHEAD_MS = 120;
          var SP_SFX_OFFSET_MS = 0;   // 微調整用（+で遅らせ / -で早める）
          var spSfxLastSong = null;   // 前フレームの曲時刻（シーク検出用）
          var spSfxSchedTo = null;    // ここまでの曲時刻を予約済み
          var scheduleSpreadHitSounds = function (diffs, playing) {
            if (!spHitSounds || !spSynth || !spSynth.ctx || !playing) {
              spSfxLastSong = null; spSfxSchedTo = null; return;
            }
            var songNow = spAudio.currentTime * 1000;
            var ctxNow  = spSynth.ctx.currentTime;
            /* シーク/巻き戻し/大ジャンプ → 予約位置をリセット（過去を鳴らさない） */
            if (spSfxLastSong == null || songNow < spSfxLastSong - 5 || songNow - spSfxLastSong > 300) {
              spSfxSchedTo = songNow;
            }
            spSfxLastSong = songNow;
            var from = Math.max(spSfxSchedTo == null ? songNow : spSfxSchedTo, songNow);
            var horizon = songNow + SP_SFX_LOOKAHEAD_MS;
            var diff = diffs[Math.min(spSoundLane, diffs.length - 1)];
            if (diff && diff.notes) {
              var notes = diff.notes;
              for (var k = 0; k < notes.length; k++) {
                var nt = notes[k].time;
                if (nt <= from) continue;
                if (nt > horizon) break; // ソート済み → 以降は先
                var when = ctxNow + (nt - songNow + SP_SFX_OFFSET_MS) / 1000;
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
            var diffs = getSpreadDiffs();
            var curTime = getSpreadTime();
            /* 効果音（音楽再生中のみ、先読みスケジュール） */
            scheduleSpreadHitSounds(diffs, spreadAudioPlaying && !spAudio.paused);
            var isEn = false;
            try {
              var le = document.getElementById('langEn');
              isEn = !!(le && le.classList.contains('active'));
            } catch (e) {}
            window.drawTaikoSpread(spCanvas, diffs, curTime, {
              pxPerMs: spPxPerMs,
              snap: spSnap,
              soundLane: spHitSounds ? Math.min(spSoundLane, diffs.length - 1) : -1,
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
          var pv = previewMode;
          var setDisp = function(id, show) {
            var el = document.getElementById(id);
            if (el) el.style.display = show ? '' : 'none';
          };
          /* 左カラム（設定モード中・分離中のカードは隠す。カラム全体はプレビューで CSS が隠す） */
          setDisp('etb-card-meta',         !s && !detachState.metadata);
          setDisp('etb-card-realtime',     !s && isOsu && !detachState.timing);
          setDisp('etb-card-file',         !s && !isOsu);
          setDisp('etb-card-loadsettings',  s);
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
          set('etb-title-checklist',
              settingsMode ? 'チェックリストの設定' : 'チェックリスト',
              settingsMode ? 'Check list settings'  : 'Check list');
          set('etb-title-results',      'チェック結果',       'Check results');
          set('etb-tab-main',           'チェック',          'Check');
          set('etb-tab-preview',        'プレビュー',        'Preview');
          set('toggleTabSettings',      '設定',              'Settings');
          set('etb-spread-snap-text',   'スナップ',          'Snap');
          set('etb-spread-sfx-text',    '効果音',            'Hit sounds');
          set('etb-sfx-settings-title', '効果音の種類',      'Hit sound set');
          set('etb-sfx-vol-label',      '効果音の音量',      'Hit sound vol.');
          set('etb-music-vol-label',    '曲の音量',          'Music vol.');
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

            /* ナビの並び順を指定どおりに整える:
               メイン/設定 | 区切り | 日本語/English | 区切り | 説明書 | 他のツール | Webツール | GitHub | 更新履歴
               （appendChild は既存要素を移動するので、望む順に付け直すだけで並び替わる） */
            [
              document.getElementById('etb-tab-main'),      // チェック
              document.getElementById('etb-tab-preview'),   // プレビュー
              document.getElementById('toggleTabSettings'), // 設定
              langSep,                                      // 区切り
              document.getElementById('langJa'),            // 日本語
              document.getElementById('langEn'),            // English
              extSep,                                       // 区切り
              document.getElementById('manualLink'),        // 説明書
              document.getElementById('etb-other-tools'),   // 他のツールを見る
              webLink,                                      // Webツール
              githubLink,                                   // GitHub
              document.getElementById('updateBtn')          // 更新履歴
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
            /* プレビュー(スプレッド)の追従は Edit 中(data.editing)のみ許可。
               ゲームプレイ中(status!=Edit)は追従させない＝デュアルスクリーンでの
               先読みチート対策。※リアルタイム表示カードは下で常時更新（プレイ中OK）。
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

// ── 自動アップデート（GitHub Releases + electron-updater）──
// 起動時に最新版を確認し、あれば「アップデートしますか?」ダイアログ → DL → 再起動で適用。
function setupAutoUpdate() {
  if (!app.isPackaged) return;  // 開発時(electron .)は更新しない
  autoUpdater.autoDownload = false;              // ダイアログで承諾を得てから DL する
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableDifferentialDownload = true; // 差分DLの不具合を避け、確実なフルDLにする

  let dialogOpen = false;
  let updating = false;

  const sendProgress = (pct) => {
    if (!mainWin || mainWin.isDestroyed()) return;
    mainWin.setProgressBar(pct >= 0 && pct < 100 ? pct / 100 : -1);  // タスクバー進捗
    try { mainWin.webContents.send('update-progress', pct); } catch (_) {}  // アプリ内進捗バー
  };

  const onUpdateError = (err) => {
    console.error('[updater]', err && err.message ? err.message : err);
    if (!updating) return;  // ユーザーが更新を開始していない時は黙る
    updating = false;
    sendProgress(-1);
    dialog.showMessageBox(mainWin && !mainWin.isDestroyed() ? mainWin : null, {
      type: 'error', title: 'アップデート', noLink: true, buttons: ['OK'],
      message: 'アップデートに失敗しました。',
      detail: (err && err.message ? err.message : String(err)) +
        '\n\nお手数ですが、最新版を手動でインストールしてください。',
    }).catch(() => {});
  };

  autoUpdater.on('update-available', (info) => {
    if (dialogOpen || updating) return;
    dialogOpen = true;
    dialog.showMessageBox(mainWin && !mainWin.isDestroyed() ? mainWin : null, {
      type: 'info',
      title: 'アップデート',
      message: '新しいバージョン v' + info.version + ' があります。',
      detail: '今すぐアップデートしますか？\n（ダウンロード後、自動で再起動して適用します）',
      buttons: ['アップデート', '後で'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    }).then((res) => {
      dialogOpen = false;
      if (res.response === 0) {
        updating = true;
        sendProgress(0);  // ダウンロード開始を即時表示
        autoUpdater.downloadUpdate().catch(onUpdateError);
      }
    }).catch(() => { dialogOpen = false; });
  });

  autoUpdater.on('download-progress', (p) => { sendProgress(Math.round(p.percent)); });

  autoUpdater.on('update-downloaded', (info) => {
    updating = false;
    sendProgress(-1);
    dialog.showMessageBox(mainWin && !mainWin.isDestroyed() ? mainWin : null, {
      type: 'info',
      title: 'アップデート',
      message: 'v' + info.version + ' のダウンロードが完了しました。',
      detail: '再起動して適用します。',
      buttons: ['今すぐ再起動', '後で'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    }).then((res) => {
      if (res.response === 0) {
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    }).catch(() => {});
  });

  autoUpdater.on('error', onUpdateError);

  // メイン窓が表示された後に確認（UI 表示前にダイアログが出ないよう少し遅延）
  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 4000);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  mainWin = createWindow();
  setupAutoUpdate();

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
