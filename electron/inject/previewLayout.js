// プレビューのDOMを組み立てる。操作イベントと再生状態は呼び出し側で管理する。
function createElectronPreviewLayout(outBody, electronText) {
  var spPanel = document.createElement('section');
  spPanel.className = 'tab-panel';
  spPanel.id = 'tab-spreadPlay';

  /* ツールバー: スナップ選択 + ズーム(+/-) */
  var spBar = document.createElement('div');
  spBar.className = 'etb-spread-toolbar';
  spBar.innerHTML =
    /* 左: ズーム(+/-) */
    '<span class="etb-spread-zoom">' +
    '<button type="button" id="etb-spread-zoomout">−</button>' +
    '<span id="etb-spread-zoomlabel">100%</span>' +
    '<button type="button" id="etb-spread-zoomin">＋</button>' +
    '</span>' +
    '<label class="etb-spread-sfx"><input type="checkbox" id="etb-spread-sfx-cb"> ' +
    '<span id="etb-spread-sfx-text" data-i18n="electronHitSounds">' +
      electronText('electronHitSounds') + '</span></label>' +
    /* 右: 小節/拍 + ビートスナップ(ドラッグ/マウスホイールで変更) */
    '<span class="etb-spread-right">' +
    '<span class="etb-spread-meter" id="etb-spread-meter" data-i18n-title="electronMeasureBeat" title="' +
      electronText('electronMeasureBeat') + '">--:--</span>' +
    '<span class="etb-spread-snap2" id="etb-spread-snap2" data-i18n-title="electronSnapControlHint" title="' +
      electronText('electronSnapControlHint') + '">' +
    '<span id="etb-spread-snap-text" data-i18n="electronBeatSnapDivisor">' +
      electronText('electronBeatSnapDivisor') + '</span> ' +
    '<input type="range" class="etb-spread-snap-slider" id="etb-spread-snap-slider" min="0" step="1">' +
    '<span class="etb-spread-snap-val" id="etb-spread-snap-val">1/4</span>' +
    '</span>' +
    '</span>';
  spPanel.appendChild(spBar);

  var spCanvas = document.createElement('canvas');
  spCanvas.id = 'etb-spread-canvas';
  spPanel.appendChild(spCanvas);

  /* 下部バー（osu!エディタ風）: 左=時間/％, 中央=進捗バー, 右=再生操作+速度 */
  var spBottom = document.createElement('div');
  spBottom.className = 'etb-spread-bottom';
  spBottom.innerHTML =
    '<span class="etb-sb-time" id="etb-sb-time" data-i18n-title="electronCopyTimeHint" title="' +
      electronText('electronCopyTimeHint') + '">00:00:000</span>' +
    '<span class="etb-sb-pct" id="etb-sb-pct">0.0%</span>' +
    '<span class="etb-sb-progress" id="etb-sb-progress" data-i18n-title="electronSeekHint" title="' +
      electronText('electronSeekHint') + '">' +
    '<canvas id="etb-sb-progress-canvas"></canvas>' +
    '</span>' +
    '<span class="etb-sb-controls">' +
    '<button type="button" id="etb-sb-play" data-i18n-title="electronPlay" title="' +
      electronText('electronPlay') + '">▶</button>' +
    '<button type="button" id="etb-sb-pause" data-i18n-title="electronPause" title="' +
      electronText('electronPause') + '">❚❚</button>' +
    '<button type="button" id="etb-sb-stop" data-i18n-title="electronStop" title="' +
      electronText('electronStop') + '">■</button>' +
    '<button type="button" id="etb-sb-test"  title="Test">Test</button>' +
    '</span>' +
    '<span class="etb-spread-speed" id="etb-spread-speed">' +
    '<button type="button" data-rate="0.25">25%</button>' +
    '<button type="button" data-rate="0.5">50%</button>' +
    '<button type="button" data-rate="0.75">75%</button>' +
    '<button type="button" data-rate="1">100%</button>' +
    '<button type="button" data-rate="1.5">150%</button>' +
    '</span>';
  spPanel.appendChild(spBottom);

  outBody.appendChild(spPanel);
  return { panel: spPanel, toolbar: spBar, canvas: spCanvas };
}
