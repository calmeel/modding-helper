const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyText: (text) => clipboard.writeText(String(text)),
  onOsuMapInfo:  (cb) => ipcRenderer.on('osu-map-info',    (_, data) => cb(data)),
  onTimingInfo:  (cb) => ipcRenderer.on('osu-timing-info', (_, data) => cb(data)),
  getCurrentMapset: (knownFolder) => ipcRenderer.invoke('osu-get-current-mapset', knownFolder),
  detachPanel:      (name, lang, checked) => ipcRenderer.send('detach-panel', name, lang, checked),
  detachChart:      (chartId, lang) => ipcRenderer.send('detach-chart', chartId, lang),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, pct) => cb(pct)),
  onPanelRedocked:  (cb)         => ipcRenderer.on('panel-redocked', (_, name, checked) => cb(name, checked)),
  sendMapMetaToPopout: (data)    => ipcRenderer.send('popout-map-meta', data),
  sendPopoutChecked: (arr)       => ipcRenderer.send('popout-checked-changed', arr),
  onPopoutSetChecked: (cb)       => ipcRenderer.on('popout-set-checked', (_, arr) => cb(arr)),
  minimize:      ()   => ipcRenderer.send('win-minimize'),
  maximize:      ()   => ipcRenderer.send('win-maximize'),
  close:         ()   => ipcRenderer.send('win-close'),
  openDocs:      ()   => ipcRenderer.send('win-open-docs'),
  onMaximize:    (cb) => ipcRenderer.on('win-maximized',   cb),
  onUnmaximize:  (cb) => ipcRenderer.on('win-unmaximized', cb),
});
