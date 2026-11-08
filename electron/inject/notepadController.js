// メモ帳のDiff選択、現在時刻への追従、表示行の仮想化を担当する。
function createElectronNotepad({ container, text: electronText, getPanelMode, getCurrentDiffFile, getSpreadTime, getOsuTime }) {
  var active = false;
  /* メモ帳: 元の行を保持し、現在位置の周辺だけを描く（大量のノーツでも軽くする）。 */
  var notepadPanel = document.createElement('section');
  notepadPanel.id = 'etb-notepad';
  notepadPanel.innerHTML =
    '<div class="etb-notepad-toolbar">' +
      '<label for="etb-notepad-diff" data-i18n="electronNotepadDifficulty">' + electronText('electronNotepadDifficulty') + '</label>' +
      '<select id="etb-notepad-diff"></select>' +
      '<span id="etb-notepad-status" role="status"></span>' +
    '</div>' +
    '<div class="etb-notepad-columns">' +
      '<section class="etb-notepad-column"><h3>[TimingPoints]</h3><div class="etb-notepad-viewport"><pre></pre><div class="etb-notepad-playhead"></div></div></section>' +
      '<section class="etb-notepad-column"><h3>[HitObjects]</h3><div class="etb-notepad-viewport"><pre></pre><div class="etb-notepad-playhead"></div></div></section>' +
    '</div>';
  container.appendChild(notepadPanel);
  var notepadSelect = notepadPanel.querySelector('select');
  var notepadStatus = notepadPanel.querySelector('#etb-notepad-status');
  var notepadViews = Array.from(notepadPanel.querySelectorAll('.etb-notepad-viewport'));
  var notepadRawRef = null, notepadSource = null, notepadSelectedFile = null;
  var notepadSections = [[], []];
  var notepadRenderKeys = ['', ''];
  var notepadRaf = null;
  var notepadEmptyDiffs = [];

  var parseNotepadSections = function(text) {
    var sections = [[], []], section = -1;
    String(text || '').split(/\r?\n/).forEach(function(line) {
      var trimmed = line.trim();
      if (/^\[.*\]$/.test(trimmed)) {
        section = trimmed === '[TimingPoints]' ? 0 : trimmed === '[HitObjects]' ? 1 : -1;
        return;
      }
      if (section < 0 || !trimmed || trimmed.indexOf('//') === 0) return;
      var values = line.split(',');
      var value = values[section === 0 ? 0 : 2];
      if (value == null || !value.trim()) return;
      var time = Number(value);
      if (Number.isFinite(time)) sections[section].push({ time: time, text: line });
    });
    sections.forEach(function(rows) { rows.sort(function(a, b) { return a.time - b.time; }); });
    return sections;
  };
  var findNotepadRow = function(rows, time, timingPoints) {
    if (!rows.length) return -1;
    if (time == null) return 0;
    var lo = 0, hi = rows.length;
    while (lo < hi) {
      var mid = (lo + hi) >>> 1;
      if (rows[mid].time <= time) lo = mid + 1;
      else hi = mid;
    }
    var index = Math.max(0, lo - 1);
    if (!timingPoints && lo < rows.length &&
        Math.abs(rows[lo].time - time) < Math.abs(rows[index].time - time)) index = lo;
    return index;
  };
  var refreshNotepad = function() {
    var raw = window.__loadedDiffs || notepadEmptyDiffs;
    if (raw !== notepadRawRef) {
      notepadRawRef = raw;
      notepadSelect.textContent = '';
      raw.forEach(function(diff) {
        var option = document.createElement('option');
        option.value = diff.fileName;
        option.textContent = diff.fileName;
        notepadSelect.appendChild(option);
      });
    }
    // osu! モードでは現在エディタで開いている難易度に追従する。
    var wanted = getPanelMode() === 'osu' && getCurrentDiffFile() ? getCurrentDiffFile() : notepadSelectedFile;
    var source = raw.find(function(diff) { return diff.fileName === wanted; });
    if (!source && !(getPanelMode() === 'osu' && getCurrentDiffFile())) source = raw[0];
    notepadSelect.disabled = getPanelMode() === 'osu' || !raw.length;
    notepadSelect.value = source ? source.fileName : '';
    if (source !== notepadSource) {
      notepadSource = source;
      notepadSections = parseNotepadSections(source && source.text);
      notepadRenderKeys = ['', ''];
    }
    var time = getPanelMode() === 'osu' ? getOsuTime() : getSpreadTime();
    var statusText = !source ? electronText('electronNoBeatmapLoadedPlain')
      : time == null ? electronText('electronNotepadWaiting') : Math.round(time) + ' ms';
    if (notepadStatus.textContent !== statusText) notepadStatus.textContent = statusText;
    notepadViews.forEach(function(view, side) {
      var rows = notepadSections[side];
      var index = findNotepadRow(rows, time, side === 0);
      var height = view.clientHeight;
      var key = index + ':' + height + ':' + document.documentElement.lang;
      if (notepadRenderKeys[side] === key) return;
      notepadRenderKeys[side] = key;
      var pre = view.querySelector('pre');
      pre.textContent = '';
      var half = Math.ceil(height / 48) + 1;
      var start = Math.max(0, index - half), end = Math.min(rows.length, index + half + 1);
      pre.style.top = (height / 2 - 12 + (start - Math.max(0, index)) * 24) + 'px';
      if (!rows.length) {
        pre.textContent = electronText(source ? 'electronNotepadEmptySection' : 'electronNoBeatmapLoadedPlain');
        return;
      }
      for (var row = start; row < end; row++) {
        var line = document.createElement('span');
        line.textContent = rows[row].text;
        if (row === index) line.className = 'etb-notepad-current';
        pre.appendChild(line);
      }
    });
  };
  notepadSelect.addEventListener('change', function() {
    notepadSelectedFile = notepadSelect.value;
    refreshNotepad();
  });
  var notepadLoop = function() {
    notepadRaf = null;
    if (!active) return;
    refreshNotepad();
    notepadRaf = requestAnimationFrame(notepadLoop);
  };

  function setActive(on) {
    active = on;
    if (active && notepadRaf == null) notepadLoop();
    if (!active && notepadRaf != null) {
      cancelAnimationFrame(notepadRaf);
      notepadRaf = null;
    }
  }
  return { setActive };
}
