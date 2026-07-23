const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 960, height: 640, show: true, useContentSize: true });
  await win.loadFile(path.join(__dirname, 'index.html'));
  await new Promise(r => setTimeout(r, 500));
  console.log('候補数: ' + await win.webContents.executeJavaScript('window.renderAll()'));
  await new Promise(r => setTimeout(r, 500));
  fs.writeFileSync(path.join(__dirname, 'cmp.png'), (await win.webContents.capturePage()).toPNG());
  app.exit(0);
});
