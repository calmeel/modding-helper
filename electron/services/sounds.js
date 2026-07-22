// スプレッド表示（プレビュー）の効果音セットを読み込むモジュール。
//
// renderer は file:// や asar 内を直接 fetch できないため、メインプロセスで fs 読み込みし
// base64 データURL 化して注入する（main.js が window.__taikoSoundSets として渡す）。
const path = require('path');
const fs = require('fs');

// 音源は exe 専用アセットなので electron/sounds/ に置いている（web ツールは合成音）
const SOUNDS_DIR = path.join(__dirname, '..', 'sounds');

// 指定フォルダから 1 セット分の音源を読む。
//   期待するファイル名（拡張子は wav/ogg/mp3 のいずれか。無い物は省略可）:
//     don / kat（必須）, don-big / kat-big（任意: 大音符。無ければ don/kat を大きめに鳴らす）
//   osu!taiko 標準スキン名（taiko-normal-hitnormal 等）も認識する。
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
  const dir = SOUNDS_DIR;
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

module.exports = { loadTaikoSoundSets, loadTaikoSoundMapFrom };
