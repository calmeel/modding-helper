const { contextBridge, ipcRenderer, clipboard, webFrame } = require('electron');

// メインウィンドウでは Web 版レイアウトを最初の1フレームも描画しない。
// Electron 用 DOM・CSS の注入完了後に main.js から解除する。
let startupCloakCssKey = null;
if (process.argv.includes('--modding-helper-main-window')) {
  startupCloakCssKey = webFrame.insertCSS(
    'html { visibility: hidden !important; background-color: #1e1e1e !important; }'
  );
}

function revealStartupUI() {
  if (startupCloakCssKey == null) return;
  webFrame.removeInsertedCSS(startupCloakCssKey);
  startupCloakCssKey = null;
}

contextBridge.exposeInMainWorld('electronAPI', {
  revealStartupUI,
  setLanguage: (lang) => ipcRenderer.send('app-language-changed', lang),
  copyText: (text) => clipboard.writeText(String(text)),
  onOsuMapInfo:  (cb) => ipcRenderer.on('osu-map-info',    (_, data) => cb(data)),
  onTimingInfo:  (cb) => ipcRenderer.on('osu-timing-info', (_, data) => cb(data)),
  getCurrentMapset: (knownFolder) => ipcRenderer.invoke('osu-get-current-mapset', knownFolder),
  calculateSr:      (beatmaps, mods, rulesetId) => ipcRenderer.invoke('sr-calculate', { beatmaps, mods, rulesetId }),
  cancelSrCalculation: () => ipcRenderer.send('sr-cancel'),
  requestMapInfo:   () => ipcRenderer.send('osu-request-map-info'),
  onMapsetChanged:  (cb) => ipcRenderer.on('osu-mapset-changed', () => cb()),
  getCurrentMapActions: () => ipcRenderer.invoke('osu-get-current-map-actions'),
  openCurrentMapFolder: () => ipcRenderer.invoke('osu-open-current-folder'),
  openCurrentBeatmapPage: () => ipcRenderer.invoke('osu-open-current-beatmap-page'),
  detachPanel:      (name, lang, checked) => ipcRenderer.send('detach-panel', name, lang, checked),
  detachChart:      (chartId, lang) => ipcRenderer.send('detach-chart', chartId, lang),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, pct) => cb(pct)),
  onPanelRedocked:  (cb)         => ipcRenderer.on('panel-redocked', (_, name, checked) => cb(name, checked)),
  sendMapMetaToPopout: (data)    => ipcRenderer.send('popout-map-meta', data),
  sendPopoutChecked: (arr)       => ipcRenderer.send('popout-checked-changed', arr),
  onPopoutSetChecked: (cb)       => ipcRenderer.on('popout-set-checked', (_, arr) => cb(arr)),
  minimize:      ()   => ipcRenderer.send('win-minimize'),
  maximize:      ()   => ipcRenderer.send('win-maximize'),
  standardSize:  ()   => ipcRenderer.send('win-standard-size'),
  maximizeFull:  ()   => ipcRenderer.send('win-maximize-full'),
  close:         ()   => ipcRenderer.send('win-close'),
  openDocs:      ()   => ipcRenderer.send('win-open-docs'),
  onMaximize:    (cb) => ipcRenderer.on('win-maximized',   cb),
  onUnmaximize:  (cb) => ipcRenderer.on('win-unmaximized', cb),
});
