const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PS1_PATH = path.join(__dirname, 'osuMemory.ps1');

let psProcess = null;
let win_ = null;
let lastSentPath = null;

function parseOsuFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const meta = {};
  let section = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1);
      continue;
    }
    if (section === 'Metadata') {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        meta[key] = val;
      }
    }
    if (section === 'Events') {
      const match = line.match(/^0,0,"(.+?)"/);
      if (match) meta.Background = match[1];
    }
  }
  return meta;
}

function sendMapInfo(filePath) {
  if (!win_ || win_.isDestroyed()) return;
  try {
    const meta = parseOsuFile(filePath);
    const bgFile = meta.Background
      ? path.join(path.dirname(filePath), meta.Background)
      : null;

    let bgDataUrl = null;
    if (bgFile && fs.existsSync(bgFile)) {
      const ext = path.extname(bgFile).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      bgDataUrl = `data:${mime};base64,${fs.readFileSync(bgFile).toString('base64')}`;
    }

    win_.webContents.send('osu-map-info', {
      title:         meta.Title         || '',
      titleUnicode:  meta.TitleUnicode  || '',
      artist:        meta.Artist        || '',
      artistUnicode: meta.ArtistUnicode || '',
      source:        meta.Source        || '',
      tags:          meta.Tags          || '',
      bgDataUrl,
    });
  } catch (_) {}
}

function clearMapInfo() {
  if (!win_ || win_.isDestroyed()) return;
  win_.webContents.send('osu-map-info', null);
}

function handleLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (trimmed === 'NOT_RUNNING' || trimmed === 'NOT_FOUND') {
    if (lastSentPath !== null) {
      lastSentPath = null;
      clearMapInfo();
    }
    return;
  }

  // .osu ファイルの絶対パス
  if (trimmed.endsWith('.osu') && trimmed !== lastSentPath) {
    lastSentPath = trimmed;
    sendMapInfo(trimmed);
  }
}

function spawnWatcher() {
  if (!win_ || win_.isDestroyed()) return;

  psProcess = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-File', PS1_PATH,
  ], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  let buf = '';
  psProcess.stdout.on('data', (data) => {
    buf += data.toString('utf8');
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) handleLine(line);
  });

  psProcess.on('exit', () => {
    psProcess = null;
    // 異常終了した場合は 3 秒後に再起動
    if (win_ && !win_.isDestroyed()) {
      setTimeout(spawnWatcher, 3000);
    }
  });
}

function start(win) {
  win_ = win;
  spawnWatcher();
}

function stop() {
  win_ = null;
  if (psProcess) {
    psProcess.kill();
    psProcess = null;
  }
}

module.exports = { start, stop };
