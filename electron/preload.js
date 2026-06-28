const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOsuMapInfo:  (cb) => ipcRenderer.on('osu-map-info',    (_, data) => cb(data)),
  onTimingInfo:  (cb) => ipcRenderer.on('osu-timing-info', (_, data) => cb(data)),
  getCurrentMapset: (knownFolder) => ipcRenderer.invoke('osu-get-current-mapset', knownFolder),
  minimize:      ()   => ipcRenderer.send('win-minimize'),
  maximize:      ()   => ipcRenderer.send('win-maximize'),
  close:         ()   => ipcRenderer.send('win-close'),
  openDocs:      ()   => ipcRenderer.send('win-open-docs'),
  onMaximize:    (cb) => ipcRenderer.on('win-maximized',   cb),
  onUnmaximize:  (cb) => ipcRenderer.on('win-unmaximized', cb),
});
