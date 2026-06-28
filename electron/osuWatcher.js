const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PS1_PATH = path.join(__dirname, 'osuMemory.ps1');

let psProcess = null;
let win_ = null;
let lastSentPath = null;
let cachedTimingPoints = null;
let lastTimingMs = -2;  // -2 = 未初期化、-1 = 取得不可

function parseOsuFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const meta = {};
  const timingPoints = [];
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
    if (section === 'TimingPoints') {
      const parts = line.split(',');
      if (parts.length >= 7) {
        const offset      = parseFloat(parts[0]);
        const beatLength  = parseFloat(parts[1]);
        const volume      = parseInt(parts[5], 10) || 100;
        const uninherited = parseInt(parts[6], 10) === 1;
        if (!isNaN(offset) && !isNaN(beatLength) && beatLength !== 0) {
          timingPoints.push({ offset, beatLength, volume, uninherited });
        }
      }
    }
  }

  timingPoints.sort((a, b) => a.offset - b.offset);
  meta._timingPoints = timingPoints;
  return meta;
}

// 指定 ms 時点でのタイミングプロパティを計算する
// 赤線 (uninherited) ごとに SV をリセットし、直後の緑線 (inherited) で上書き
function computeTimingAt(timingPoints, ms) {
  let bpm = null;
  let sv = 1.0;
  let volume = 100;

  for (const tp of timingPoints) {
    if (tp.offset > ms) break;
    if (tp.uninherited) {
      bpm    = 60000 / tp.beatLength;
      sv     = 1.0;
      volume = tp.volume;
    } else {
      sv     = -100 / tp.beatLength;
      volume = tp.volume;
    }
  }

  return { bpm, sv, volume };
}

function sendMapInfo(filePath) {
  if (!win_ || win_.isDestroyed()) return;
  try {
    const meta = parseOsuFile(filePath);
    cachedTimingPoints = meta._timingPoints || [];
    lastTimingMs = -2;

    const bgFile = meta.Background
      ? path.join(path.dirname(filePath), meta.Background)
      : null;

    let bgDataUrl = null;
    if (bgFile && fs.existsSync(bgFile)) {
      const ext  = path.extname(bgFile).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      bgDataUrl  = `data:${mime};base64,${fs.readFileSync(bgFile).toString('base64')}`;
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
  cachedTimingPoints = null;
  lastTimingMs = -2;
  win_.webContents.send('osu-map-info', null);
  win_.webContents.send('osu-timing-info', null);
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

  // 旧形式との互換性: 裸の .osu パスを beatmap として扱う
  if (trimmed.endsWith('.osu') && trimmed !== lastSentPath) {
    lastSentPath = trimmed;
    sendMapInfo(trimmed);
    return;
  }

  if (trimmed.startsWith('TIME:')) {
    const ms = parseInt(trimmed.slice(5), 10);
    if (!win_ || win_.isDestroyed()) return;

    if (ms < 0) {
      if (lastTimingMs !== -1) {
        lastTimingMs = -1;
        win_.webContents.send('osu-timing-info', null);
      }
      return;
    }

    if (ms === lastTimingMs) return;
    lastTimingMs = ms;

    if (!cachedTimingPoints || cachedTimingPoints.length === 0) {
      win_.webContents.send('osu-timing-info', { time: ms, bpm: null, sv: null, volume: null, vbpm: null });
      return;
    }

    const { bpm, sv, volume } = computeTimingAt(cachedTimingPoints, ms);
    const vbpm = bpm !== null ? bpm * sv : null;
    win_.webContents.send('osu-timing-info', { time: ms, bpm, sv, volume, vbpm });
    return;
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

// 現在 osu! で開いている .osu の絶対パス（なければ null）
function getCurrentOsuPath() {
  return lastSentPath;
}

module.exports = { start, stop, getCurrentOsuPath };
