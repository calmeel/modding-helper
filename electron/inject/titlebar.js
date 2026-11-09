// タイトルバーのDOM、ウィンドウ操作、アップデート進捗表示を担当する。
function createElectronTitlebar({ iconUrl, version, text: electronText }) {
  var svgMin  = '<svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor"><rect x="0" y="5.25" width="12" height="1.5" rx="0.5"/></svg>';
  var svgMax  = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="0.6" y="0.6" width="10.8" height="10.8" rx="0.5"/></svg>';
  var svgRes  = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="0.6" width="8.4" height="8.4" rx="0.5"/><path d="M0.6 3.5v7.4a.5.5 0 0 0 .5.5h7.4"/></svg>';
  var svgX    = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="1.5" y1="1.5" x2="10.5" y2="10.5"/><line x1="10.5" y1="1.5" x2="1.5" y2="10.5"/></svg>';
  /* ── タイトルバー生成 ── */
  var titlebar = document.createElement('div');
  titlebar.id = 'electron-titlebar';
  titlebar.innerHTML =
    '<div id="etb-brand">' +
      '<img id="etb-icon" src="' + iconUrl + '" alt="">' +
      '<span id="etb-title">osu!taiko Modding Helper<span id="etb-title-suffix"> for Desktop</span></span>' +
      '<span id="etb-badge">v' + version + '</span>' +
    '</div>' +
    '<div id="etb-vsep"></div>' +
    '<div id="etb-nav"></div>' +
    '<div id="etb-spacer"></div>' +
    '<div id="etb-language"></div>' +
    '<div id="etb-controls">' +
      '<button class="etb-ctrl" id="etb-min">' + svgMin + '</button>' +
      '<button class="etb-ctrl" id="etb-max">' + svgMax + '</button>' +
      '<button class="etb-ctrl" id="etb-close">' + svgX + '</button>' +
    '</div>';

  function connect() {
    if (window.electronAPI) {
      document.getElementById('etb-min').addEventListener('click', function() {
        window.electronAPI.minimize();
      });
      document.getElementById('etb-max').addEventListener('click', function() {
        window.electronAPI.maximize();
      });
      document.getElementById('etb-close').addEventListener('click', function() {
        window.electronAPI.close();
      });

      window.electronAPI.onMaximize(function() {
        document.getElementById('etb-max').innerHTML = svgRes;
      });
      window.electronAPI.onUnmaximize(function() {
        document.getElementById('etb-max').innerHTML = svgMax;
      });

      /* アップデートのダウンロード進捗バー */
      if (window.electronAPI.onUpdateProgress) {
        var upToast = document.createElement('div');
        upToast.id = 'etb-update-toast';
        upToast.innerHTML =
          '<div class="etb-update-text"><span data-i18n="electronUpdateDownloading">' +
            electronText('electronUpdateDownloading') +
          '</span> <span id="etb-update-pct">0</span>%</div>' +
          '<div class="etb-update-track"><div id="etb-update-fill"></div></div>';
        document.body.appendChild(upToast);
        window.electronAPI.onUpdateProgress(function(pct) {
          if (pct < 0 || pct >= 100) { upToast.style.display = 'none'; return; }
          upToast.style.display = '';
          document.getElementById('etb-update-pct').textContent = pct;
          document.getElementById('etb-update-fill').style.width = pct + '%';
        });
      }

    }
  }
  return { element: titlebar, connect };
}
