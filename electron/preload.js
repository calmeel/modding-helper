const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOsuMapInfo:  (cb) => ipcRenderer.on('osu-map-info',    (_, data) => cb(data)),
  onTimingInfo:  (cb) => ipcRenderer.on('osu-timing-info', (_, data) => cb(data)),
  getCurrentMapset: (knownFolder) => ipcRenderer.invoke('osu-get-current-mapset', knownFolder),
  detachPanel:      (name, lang) => ipcRenderer.send('detach-panel', name, lang),
  onPanelRedocked:  (cb)         => ipcRenderer.on('panel-redocked', (_, name) => cb(name)),
  sendMapMetaToPopout: (data)    => ipcRenderer.send('popout-map-meta', data),
  minimize:      ()   => ipcRenderer.send('win-minimize'),
  maximize:      ()   => ipcRenderer.send('win-maximize'),
  close:         ()   => ipcRenderer.send('win-close'),
  openDocs:      ()   => ipcRenderer.send('win-open-docs'),
  onMaximize:    (cb) => ipcRenderer.on('win-maximized',   cb),
  onUnmaximize:  (cb) => ipcRenderer.on('win-unmaximized', cb),
});
