// osu! 連動時、現在の譜面フォルダを監視して .osu の更新を検知するモジュール。
//
// osu! エディタで保存すると同フォルダの .osu が書き換わるので、それを検知して
// renderer に 'osu-mapset-changed' を送り、譜面を再読み込みさせる（他の譜面に
// 切り替えなくても編集内容が反映されるようにするため）。
const fs = require('fs');

let watcher = null;
let watchedFolder = null;
let debounceTimer = null;

// folder を監視する。同じフォルダなら何もしない。folder=null で監視解除。
// wc: 通知先の webContents
function watch(folder, wc) {
  if (folder === watchedFolder) return; // 既に同フォルダを監視中
  close();
  watchedFolder = folder;
  if (!folder) return;
  try {
    watcher = fs.watch(folder, { persistent: false }, (evt, filename) => {
      // .osu の変更だけに反応（filename 不明時も一応反応）。連続イベントはデバウンス。
      if (filename && !/\.osu$/i.test(String(filename))) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (wc && !wc.isDestroyed()) wc.send('osu-mapset-changed');
      }, 350);
    });
  } catch (_) {
    watcher = null;
    watchedFolder = null;
  }
}

// 監視を停止する（ウィンドウを閉じる時など）
function close() {
  if (watcher) {
    try { watcher.close(); } catch (_) {}
    watcher = null;
  }
  watchedFolder = null;
  clearTimeout(debounceTimer);
}

module.exports = { watch, close };
