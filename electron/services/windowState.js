// ウィンドウの位置・サイズ・最大化状態を保存/復元するモジュール。
//
// 表示モード（ワイド/コンパクト）は localStorage = レンダラー側にあるが、
// ウィンドウの大きさはウィンドウを作る前＝メインプロセスで決める必要があるため、
// userData に JSON で持つ。これが無いと「コンパクトで終了したのに次回は全画面」
// という食い違いが起きる。
const { app, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const FILE_NAME = 'window-state.json';
// 保存が無い初回の既定。最大化で開き、元に戻すと標準サイズになる
const DEFAULT_STATE = { width: 1280, height: 800, maximized: true };
const MIN_W = 560, MIN_H = 400;

let saveTimer = null;

function filePath() {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    if (raw && typeof raw === 'object') return raw;
  } catch (_) { /* 初回や壊れている時は既定を使う */ }
  return null;
}

// 保存値が現在のディスプレイ構成で使えるか検証する。
// モニタを外した後などに画面外へ出てしまうのを防ぐ。
function sanitize(state) {
  const out = Object.assign({}, DEFAULT_STATE, state || {});
  out.width  = Math.max(MIN_W, Math.round(Number(out.width)  || DEFAULT_STATE.width));
  out.height = Math.max(MIN_H, Math.round(Number(out.height) || DEFAULT_STATE.height));
  out.maximized = !!out.maximized;

  const hasPos = Number.isFinite(out.x) && Number.isFinite(out.y);
  if (!hasPos) { delete out.x; delete out.y; return out; }

  // ウィンドウの左上がどれかのディスプレイの作業領域に入っているか
  const displays = screen.getAllDisplays();
  const visible = displays.some((d) => {
    const wa = d.workArea;
    return out.x >= wa.x - 40 && out.y >= wa.y - 40 &&
           out.x <= wa.x + wa.width - 80 && out.y <= wa.y + wa.height - 80;
  });
  if (!visible) { delete out.x; delete out.y; return out; }

  // 復元先の作業領域より大きい場合は縮める
  const wa = screen.getDisplayMatching({ x: out.x, y: out.y, width: out.width, height: out.height }).workArea;
  out.width  = Math.min(out.width,  wa.width);
  out.height = Math.min(out.height, wa.height);
  return out;
}

// BrowserWindow に渡す初期状態
function getInitialState() {
  return sanitize(readState());
}

function writeState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    // 最大化中は getBounds() が最大化後の値を返すので、
    // 「元に戻した時の大きさ」= getNormalBounds() を保存する
    const b = win.getNormalBounds ? win.getNormalBounds() : win.getBounds();
    const state = {
      x: b.x, y: b.y, width: b.width, height: b.height,
      maximized: win.isMaximized(),
    };
    fs.writeFileSync(filePath(), JSON.stringify(state), 'utf8');
  } catch (_) { /* 保存に失敗しても動作には影響させない */ }
}

// リサイズ/移動の連続イベントをまとめて保存する
function scheduleSave(win) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeState(win), 400);
}

// ウィンドウの変化を監視して保存する。close 時は確実に同期書き込みする。
function track(win) {
  if (!win) return;
  ['resize', 'move', 'maximize', 'unmaximize'].forEach((ev) => {
    win.on(ev, () => scheduleSave(win));
  });
  win.on('close', () => { clearTimeout(saveTimer); writeState(win); });
}

module.exports = { getInitialState, track };
