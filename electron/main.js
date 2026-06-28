const { app, BrowserWindow, session, Menu, screen } = require('electron');
const path = require('path');
const osuWatcher = require('./osuWatcher');

const root = path.join(__dirname, '..');
const { version } = require('../package.json');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    title: `Modding Helper v${version}`,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(root, 'images', 'icon.ico'),
  });

  // CDN経由のjszipをローカルのnpm版にリダイレクト
  const jszipLocal = path.join(root, 'node_modules', 'jszip', 'dist', 'jszip.min.js');
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['https://cdn.jsdelivr.net/npm/jszip*'] },
    (details, callback) => {
      callback({ redirectURL: `file://${jszipLocal.replace(/\\/g, '/')}` });
    }
  );

  win.loadFile(path.join(root, 'index.html'));

  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      h1, p[data-i18n="subtitle"] { display: none !important; }

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

      .top-links { flex-shrink: 0 !important; }

      #electron-layout {
        display: flex !important;
        flex: 1 !important;
        overflow: hidden !important;
        min-height: 0 !important;
      }

      #electron-col-future {
        flex: 2 !important;
        border-right: 1px solid var(--border-strong, #555) !important;
        overflow-y: auto !important;
        min-width: 0 !important;
      }

      #osu-map-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-size: 12px;
        color: #ddd;
      }

      #osu-map-bg-wrap {
        padding: 8px 8px 0 8px;
      }

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

      .osu-map-row {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .osu-map-label {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .osu-map-value {
        color: #eee;
        word-break: break-all;
        font-size: 12px;
      }

      .osu-map-value.unicode {
        color: #aac4ff;
      }

      #osu-map-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-top: 2px;
      }

      .osu-tag-chip {
        display: inline-block;
        background: rgba(255, 255, 255, 0.07);
        color: #bbb;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 999px;
        padding: 1px 7px;
        font-size: 10px;
        line-height: 1.6;
        white-space: nowrap;
      }

      #osu-map-waiting {
        padding: 12px 8px;
        color: #666;
        font-size: 11px;
      }

      #electron-col-tabs {
        flex: 1.6 !important;
        border-right: 1px solid var(--border-strong, #555) !important;
        overflow-y: auto !important;
        padding: 20px 6px 6px !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
      }

      /* position:fixed を解除してコンテナ内に収める */
      #electron-col-tabs .tab-buttons {
        position: static !important;
        top: auto !important;
        left: auto !important;
        width: 100% !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        align-items: start !important;
        column-gap: 4px !important;
        row-gap: 22px !important;
        box-sizing: border-box !important;
      }

      #electron-col-tabs .tab-group {
        width: auto !important;
        min-width: 0 !important;
      }

      #electron-col-tabs .tab-button {
        font-size: 11px !important;
        padding: 6px 4px !important;
      }

      #electron-col-tabs .tab-group-title {
        font-size: 11px !important;
      }

      #electron-col-tabs .tab-button {
        width: 100% !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #electron-col-output {
        flex: 5 !important;
        overflow: auto !important;
        padding: 8px !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
      }
    `);

    win.webContents.executeJavaScript(`
      (function() {
        if (document.getElementById('electron-layout')) return;

        const app        = document.querySelector('.app');
        const topLinks   = app.querySelector('.top-links');
        const dropArea   = app.querySelector('.drop-area');
        const tabVis     = app.querySelector('.tab-visibility-settings');
        const tabsSec    = app.querySelector('.tabs');
        const tabButtons = tabsSec.querySelector('.tab-buttons');
        const tabPanels  = Array.from(tabsSec.querySelectorAll('.tab-panel'));

        const layout = document.createElement('div');
        layout.id = 'electron-layout';

        const futureCol = document.createElement('div');
        futureCol.id = 'electron-col-future';

        const tabsCol = document.createElement('div');
        tabsCol.id = 'electron-col-tabs';
        tabsCol.appendChild(tabButtons);

        const outputCol = document.createElement('div');
        outputCol.id = 'electron-col-output';
        outputCol.appendChild(dropArea);
        outputCol.appendChild(tabVis);
        tabPanels.forEach(p => outputCol.appendChild(p));

        // 左パネル：osu!マップ情報
        futureCol.innerHTML = \`
          <div id="osu-map-panel">
            <div id="osu-map-bg-wrap">
              <img id="osu-map-bg" src="" alt="BG">
            </div>
            <div id="osu-map-meta">
              <div id="osu-map-waiting">osu! で譜面を選択すると<br>ここに情報が表示されます</div>
            </div>
          </div>
        \`;

        layout.appendChild(futureCol);
        layout.appendChild(tabsCol);
        layout.appendChild(outputCol);

        app.appendChild(layout);
        tabsSec.remove();

        // IPC: osu! マップ情報を受信して左パネルを更新
        if (window.electronAPI) {
          window.electronAPI.onOsuMapInfo((data) => {
            const bg  = document.getElementById('osu-map-bg');
            const meta = document.getElementById('osu-map-meta');

            if (!data) {
              bg.src = '';
              meta.innerHTML = '<div id="osu-map-waiting">osu! で譜面を選択すると<br>ここに情報が表示されます</div>';
              return;
            }

            bg.src = data.bgDataUrl || '';

            const row = (label, value, cls = '') =>
              value ? \`<div class="osu-map-row">
                <span class="osu-map-label">\${label}</span>
                <span class="osu-map-value \${cls}">\${value}</span>
              </div>\` : '';

            meta.innerHTML = [
              row('Artist (Unicode)', data.artistUnicode, 'unicode'),
              row('Artist',           data.artist),
              row('Title (Unicode)',  data.titleUnicode,  'unicode'),
              row('Title',            data.title),
              row('Source',           data.source),
              data.tags ? \`<div class="osu-map-row">
                <span class="osu-map-label">Tags</span>
                <div id="osu-map-tags">\${
                  data.tags.split(' ').filter(t => t).map(t =>
                    \`<span class="osu-tag-chip">\${t}</span>\`
                  ).join('')
                }</div>
              </div>\` : '',
            ].join('');
          });
        }
      })();
    `).then(() => {
      // executeJavaScript 完了後（IPC リスナー登録済み）に watcher 起動
      osuWatcher.start(win);
    }).catch(() => {
      osuWatcher.start(win);
    });
  });

  win.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  win.on('closed', () => {
    osuWatcher.stop();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
