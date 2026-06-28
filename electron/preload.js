const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOsuMapInfo: (callback) => ipcRenderer.on('osu-map-info', (_, data) => callback(data)),
});
