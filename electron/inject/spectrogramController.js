// スペクトログラムの音源デコード、表示設定、再描画監視を担当する。
function setupElectronSpectrogram({ text: electronText, ensureSpreadAudioCtx, getSeekEnabled, setSeekEnabled, onSeekChanged }) {
  /* ── スペクトログラムタブ（exe 限定）──
   音源をデコードして周波数成分を可視化する。高音カット（低品質再エンコード）を見つける用途。
   data-electron-only を外して露出し、タブが表示された時に計算＆描画する。 */

  if (!window.computeTaikoSpectrogram || !window.drawTaikoSpectrogram) return;
  /* web では隠している要素を exe で見せる */
  Array.prototype.slice.call(
    document.querySelectorAll('[data-electron-only] [data-target-tab="spectrogram"], ' +
      '.tab-button[data-tab="spectrogram"], #tab-spectrogram')
  ).forEach(function (el) {
    var host = el.closest ? el.closest('[data-electron-only]') : null;
    (host || el).removeAttribute('data-electron-only');
  });

  var canvas = document.getElementById('spectrogramCanvas');
  var wrap   = document.getElementById('spectrogramChartWrap');
  var empty  = document.getElementById('spectrogramEmpty');
  var colorSelect = document.getElementById('spectrogramColorSelect');
  var seekToggle  = document.getElementById('spectrogramSeekToggle');
  if (!canvas || !wrap) return;

  var specData = null, specForUrl = null, computing = false;
  /* カラーマップ: 'spek'（マグマ, 既定）/ 'alt'（レインボー）。localStorage に保存 */
  var colorMap = 'spek';
  try { if (localStorage.getItem('moddingHelperSpectrogramColor') === 'alt') colorMap = 'alt'; } catch (e) {}
  if (colorSelect) colorSelect.value = colorMap;
  /* シークバー(再生ヘッド)の表示。既定 OFF。localStorage に保存 */
  try { setSeekEnabled((localStorage.getItem('moddingHelperSpectrogramSeek') === '1')); } catch (e) {}
  if (seekToggle) seekToggle.checked = getSeekEnabled();

  var isEn = function () {
    var le = document.getElementById('langEn');
    return !!(le && le.classList.contains('active'));
  };
  var setEmpty = function (show, text) {
    if (empty) { empty.hidden = !show; if (text != null) empty.textContent = text; }
    wrap.hidden = show;
  };
  var redraw = function () {
    if (!specData) return;
    window.drawTaikoSpectrogram(canvas, specData, { colorMap: colorMap });
  };
  /* 音源をデコードしてスペクトログラム行列を作る（URL が変わった時だけ） */
  var ensureComputed = function () {
    var a = window.__loadedAudio;
    var url = a && a.url ? a.url : null;
    if (!url) { specData = null; specForUrl = null; setEmpty(true,
      // A loaded .osu does not mean audio is available to this tab.
      window.__loadedDiffs && !window.__loadedDiffs.length
        ? electronText('noOsuFiles') : electronText('noFileLoaded')); return; }
    if (url === specForUrl && specData) { setEmpty(false); redraw(); return; }
    if (computing) return;
    computing = true;
    setEmpty(true, isEn() ? 'Analyzing audio…' : '音声を解析中…');
    fetch(url).then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) {
        /* decodeAudioData は AudioContext のレートにリサンプルして返す。
           縦軸上限(ナイキスト)をファイル本来のレートで出すため、ヘッダから
           本来のレートを読み、そのレートの OfflineAudioContext でデコードする。
           読めなければ通常の ctx（＝出力レート）にフォールバック。 */
        var nativeRate = null;
        try { nativeRate = window.taikoSniffSampleRate(ab); } catch (e) {}
        var ctx;
        if (nativeRate && nativeRate >= 8000 && nativeRate <= 96000) {
          var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          ctx = new OAC(1, 1, nativeRate);
        } else {
          ctx = (typeof ensureSpreadAudioCtx === 'function' && ensureSpreadAudioCtx())
            || new (window.AudioContext || window.webkitAudioContext)();
        }
        return ctx.decodeAudioData(ab);
      })
      .then(function (buf) {
        if (!window.__loadedAudio || window.__loadedAudio.url !== url) {
          computing = false;
          ensureComputed();
          return;
        }
        specData = window.computeTaikoSpectrogram(buf, { fftSize: 2048, targetCols: 1600 });
        specForUrl = url; computing = false;
        setEmpty(false); redraw();
      })
      .catch(function () {
        computing = false; specData = null;
        if (!window.__loadedAudio || window.__loadedAudio.url !== url) {
          ensureComputed();
          return;
        }
        setEmpty(true, isEn() ? 'Could not analyze the audio.' : '音声を解析できませんでした。');
      });
  };

  /* 配色プルダウン */
  if (colorSelect) colorSelect.addEventListener('change', function () {
    colorMap = (colorSelect.value === 'alt') ? 'alt' : 'spek';
    try { localStorage.setItem('moddingHelperSpectrogramColor', colorMap); } catch (e) {}
    redraw();
  });
  /* シークバーの表示 ON/OFF（再生ヘッドの表示を切り替える） */
  if (seekToggle) seekToggle.addEventListener('change', function () {
    setSeekEnabled(seekToggle.checked);
    try { localStorage.setItem('moddingHelperSpectrogramSeek', getSeekEnabled() ? '1' : '0'); } catch (e) {}
    onSeekChanged();
  });

  /* このタブが今アクティブか */
  var isActive = function () {
    var p = document.getElementById('tab-spectrogram');
    return p && p.classList.contains('active');
  };
  /* タブボタンのクリックで計算＆描画（app/ui/setup.js の切替が active を付けた後に走る） */
  var btnEl = document.querySelector('.tab-button[data-tab="spectrogram"]');
  if (btnEl) btnEl.addEventListener('click', function () { setTimeout(ensureComputed, 0); });
  /* 表示中にウィンドウサイズが変わったら描き直し（分離窓の高さ追従にも効く） */
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () { if (isActive() && !wrap.hidden) redraw(); }).observe(wrap);
  }
  /* アクティブな間だけ、音源の差し替えを監視して作り直す。
     ensureComputed は URL が変わった時しか再計算しないので軽い。
     非アクティブ時は何もしない（バックグラウンド負荷なし）。 */
  var lastSeenUrl = null;
  var lastSeenDiffs = null;
  var lastSeenEnglish = null;
  setInterval(function () {
    if (!isActive()) return;
    var a = window.__loadedAudio;
    var url = a && a.url ? a.url : null;
    var diffs = window.__loadedDiffs;
    var english = isEn();
    if (url !== lastSeenUrl || diffs !== lastSeenDiffs || english !== lastSeenEnglish) {
      lastSeenUrl = url;
      lastSeenDiffs = diffs;
      lastSeenEnglish = english;
      ensureComputed();
    }
  }, 600);
  /* 起動直後に既にアクティブなら描く */
  if (isActive()) setTimeout(ensureComputed, 300);
}
