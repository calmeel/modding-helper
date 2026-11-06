const { contextBridge, ipcRenderer, webFrame, webUtils } = require('electron');

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

// Expose payloads only; neither the IPC event nor ipcRenderer may cross the bridge.
function subscribe(channel, callback) {
  ipcRenderer.on(channel, (_, ...args) => callback(...args));
}

contextBridge.exposeInMainWorld('electronAPI', {
  revealStartupUI,
  setLanguage: (lang) => ipcRenderer.send('app-language-changed', lang),
  copyText: (text) => ipcRenderer.invoke('clipboard-write-text', String(text)),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  onOsuMapInfo:  (cb) => subscribe('osu-map-info', cb),
  onTimingInfo:  (cb) => subscribe('osu-timing-info', cb),
  getCurrentMapset: (knownFolder, options) => ipcRenderer.invoke('osu-get-current-mapset', knownFolder, options),
  calculateSr:      (beatmaps, mods, rulesetId) => ipcRenderer.invoke('sr-calculate', { beatmaps, mods, rulesetId }),
  cancelSrCalculation: () => ipcRenderer.send('sr-cancel'),
  requestMapInfo:   () => ipcRenderer.send('osu-request-map-info'),
  onMapsetChanged:  (cb) => subscribe('osu-mapset-changed', cb),
  setChartSourceFile: (source) => ipcRenderer.send('chart-source-file', source),
  onChartSourceFile: (cb) => subscribe('chart-source-file', cb),
  setChartSourceMode: (mode) => ipcRenderer.send('chart-source-mode', mode),
  onChartSourceMode: (cb) => subscribe('chart-source-mode', cb),
  getCurrentMapActions: () => ipcRenderer.invoke('osu-get-current-map-actions'),
  openCurrentMapFolder: () => ipcRenderer.invoke('osu-open-current-folder'),
  openCurrentBeatmapPage: () => ipcRenderer.invoke('osu-open-current-beatmap-page'),
  detachPanel:      (name, lang, checked) => ipcRenderer.send('detach-panel', name, lang, checked),
  detachChart:      (chartId, lang) => ipcRenderer.send('detach-chart', chartId, lang),
  onUpdateProgress: (cb) => subscribe('update-progress', cb),
  onPanelOpened:    (cb)         => subscribe('panel-opened', cb),
  onPanelRedocked:  (cb)         => subscribe('panel-redocked', cb),
  sendMapMetaToPopout: (data)    => ipcRenderer.send('popout-map-meta', data),
  sendPopoutChecked: (arr)       => ipcRenderer.send('popout-checked-changed', arr),
  onPopoutSetChecked: (cb)       => subscribe('popout-set-checked', cb),
  minimize:      ()   => ipcRenderer.send('win-minimize'),
  maximize:      ()   => ipcRenderer.send('win-maximize'),
  standardSize:  ()   => ipcRenderer.send('win-standard-size'),
  maximizeFull:  ()   => ipcRenderer.send('win-maximize-full'),
  close:         ()   => ipcRenderer.send('win-close'),
  openDocs:      ()   => ipcRenderer.send('win-open-docs'),
  onMaximize:    (cb) => subscribe('win-maximized', cb),
  onUnmaximize:  (cb) => subscribe('win-unmaximized', cb),
});
