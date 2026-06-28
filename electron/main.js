const { app, BrowserWindow, session, Menu, screen } = require('electron');
const path = require('path');

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
    win.webContents.insertCSS('h1, p[data-i18n="subtitle"] { display: none !important; }');
  });

  win.on('page-title-updated', (e) => {
    e.preventDefault();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
