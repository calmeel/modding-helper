// オートアップデート（electron-updater + GitHub Releases）を設定するモジュール。
//
// 起動少し後に更新を確認し、ダイアログで承諾を得てからダウンロード＆再起動する。
// 進捗はタスクバーとアプリ内バーの両方に出す。
const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

let getMainWin = () => null;

// 生きているメイン窓（無ければ null）。ダイアログの親に使う
function liveWin() {
  const w = getMainWin();
  return w && !w.isDestroyed() ? w : null;
}

// main.js から mainWin の取得方法を受け取る
function init(opts) {
  if (opts && typeof opts.getMainWin === 'function') getMainWin = opts.getMainWin;
}

// electron-updater のイベントを配線し、少し遅らせて更新確認を開始する
function setupAutoUpdate() {
  if (!app.isPackaged) return;  // 開発時(electron .)は更新しない
  autoUpdater.autoDownload = false;              // ダイアログで承諾を得てから DL する
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableDifferentialDownload = true; // 差分DLの不具合を避け、確実なフルDLにする

  let dialogOpen = false;
  let updating = false;

  const sendProgress = (pct) => {
    const w = liveWin();
    if (!w) return;
    w.setProgressBar(pct >= 0 && pct < 100 ? pct / 100 : -1);  // タスクバー進捗
    try { w.webContents.send('update-progress', pct); } catch (_) {}  // アプリ内進捗バー
  };

  const onUpdateError = (err) => {
    console.error('[updater]', err && err.message ? err.message : err);
    if (!updating) return;  // ユーザーが更新を開始していない時は黙る
    updating = false;
    sendProgress(-1);
    dialog.showMessageBox(liveWin(), {
      type: 'error', title: 'アップデート', noLink: true, buttons: ['OK'],
      message: 'アップデートに失敗しました。',
      detail: (err && err.message ? err.message : String(err)) +
        '\n\nお手数ですが、最新版を手動でインストールしてください。',
    }).catch(() => {});
  };

  autoUpdater.on('update-available', (info) => {
    if (dialogOpen || updating) return;
    dialogOpen = true;
    dialog.showMessageBox(liveWin(), {
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
    dialog.showMessageBox(liveWin(), {
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

module.exports = { init, setupAutoUpdate };
