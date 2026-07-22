const { app, BrowserWindow, session, Menu, screen, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { loadTaikoSoundSets } = require('./services/sounds');
const mapsetWatcher = require('./osu/mapsetWatcher');
const popouts = require('./windows/popouts');
const updater = require('./services/updater');
// リアルタイム(osu!メモリ監視)は非公開ファイル（GitHub には上げない方針）。
// 欠落していても web プレビュー等は動くよう no-op スタブにフォールバックする。
let osuWatcher;
try {
  osuWatcher = require('./osu/osuWatcher');
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

// ── renderer への注入コード ──
// 巨大な文字列を main.js に埋めると編集も構文チェックもできないため、
// electron/inject/ に実ファイルとして置き、実行時に読み込んで注入する。
// ui.js 側は iconUrl / version をラッパー引数 __etbIconUrl / __etbVersion で受け取る。
const INJECT_DIR = path.join(__dirname, 'inject');
let injectCssCache = null;
let injectJsCache  = null;
function loadInjectCss() {
  if (injectCssCache == null) {
    injectCssCache = fs.readFileSync(path.join(INJECT_DIR, 'ui.css'), 'utf8');
  }
  return injectCssCache;
}
function buildInjectJs() {
  if (injectJsCache == null) {
    injectJsCache = fs.readFileSync(path.join(INJECT_DIR, 'ui.js'), 'utf8');
  }
  return '(function(__etbIconUrl, __etbVersion){\n' + injectJsCache + '\n})(' +
    JSON.stringify(iconUrl) + ',' + JSON.stringify(version) + ');';
}

let mainWin = null;



function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    // これ以上狭めるとタイトルバーのタブがウィンドウ操作ボタンを押し出すため下限を設ける
    minWidth: 560,
    minHeight: 400,
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
    win.webContents.insertCSS(loadInjectCss());

    // ─────────────────────────────────────────────
    // DOM 操作・イベント注入
    // ─────────────────────────────────────────────
    win.webContents.executeJavaScript(buildInjectJs()).then(function() {
      if (!win.isDestroyed()) win.show();  // 変換完了後に表示（ちらつき防止）
      osuWatcher.setDeliver(popouts.broadcastOsuData);
      osuWatcher.start(win);
    }).catch(function() {
      if (!win.isDestroyed()) win.show();
      osuWatcher.setDeliver(popouts.broadcastOsuData);
      osuWatcher.start(win);
    });
  });

  win.on('page-title-updated', function(e) { e.preventDefault(); });
  win.on('closed', function() {
    osuWatcher.stop();
    mapsetWatcher.close();
    popouts.closeAll(); // メインを閉じたら分離ウィンドウも閉じる
    mainWin = null;
  });

  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // 別モジュールにも mainWin の取得方法を渡す（循環 require を避けるため関数で渡す）
  popouts.init({ getMainWin: () => mainWin });
  updater.init({ getMainWin: () => mainWin });
  mainWin = createWindow();
  updater.setupAutoUpdate();

  ipcMain.on('win-minimize',  () => { if (mainWin) mainWin.minimize(); });
  ipcMain.on('win-maximize',  () => {
    if (!mainWin) return;
    mainWin.isMaximized() ? mainWin.unmaximize() : mainWin.maximize();
  });
  ipcMain.on('win-close',     () => { if (mainWin) mainWin.close(); });
  ipcMain.on('win-open-docs', () => { shell.openExternal('file:///' + docsPath.replace(/\\/g, '/')); });

  // パネルを別ウィンドウに分離（メタデータは現在のチェック状態を引き継ぐ）
  ipcMain.on('detach-panel', (e, name, lang, checked) => {
    if (name === 'metadata') popouts.setMetaChecked(checked);
    popouts.openPopout(name, lang);
  });

  // グラフを別ウィンドウに分離
  ipcMain.on('detach-chart', (e, chartId, lang) => popouts.openChartPopout(chartId, lang));

  // 分離窓での Tags チェック状態の変化を保持（復帰時にメインへ反映するため）
  ipcMain.on('popout-checked-changed', (e, arr) => {
    popouts.setMetaChecked(arr);
  });

  // file モードのメタデータをメタデータ・ポップアウトへ転送（osu モードは osuWatcher 経由）
  ipcMain.on('popout-map-meta', (e, data) => {
    popouts.sendMapMetaToPopout(data);
  });

  // 現在 osu! で開いている譜面のフォルダを .osz 相当の zip にまとめて返す。
  // knownFolder と同じフォルダなら再構築せず { unchanged:true } を返す。
  ipcMain.handle('osu-get-current-mapset', async (event, knownFolder) => {
    const osuPath = osuWatcher.getCurrentOsuPath();
    if (!osuPath) { mapsetWatcher.watch(null); return null; }

    const folder = path.dirname(osuPath);
    // このフォルダの .osu 更新を監視（保存で自動反映）
    mapsetWatcher.watch(folder, event.sender);
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
