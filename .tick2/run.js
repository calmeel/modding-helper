const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 150, show: true, useContentSize: true });
  await win.loadFile(path.join(__dirname, 'index.html'));
  await new Promise(r => setTimeout(r, 400));
  await win.webContents.executeJavaScript('window.render()');
  await new Promise(r => setTimeout(r, 400));
  fs.writeFileSync(path.join(__dirname, 'after.png'), (await win.webContents.capturePage()).toPNG());
  app.exit(0);
});
