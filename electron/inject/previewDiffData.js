// 生の.osuテキストから、プレビューが使用するノーツ・タイミング情報を準備する。
function prepareElectronPreviewDiffs(raw) {
  return (raw || []).map(function (d) {
    var name = (typeof parseMetadataValue === 'function' && d.text
      && parseMetadataValue(d.text, 'Version')) || d.fileName || '';
    var notes = window.parseTaikoNotes(d.text);
    var red   = window.parseTaikoRedTiming ? window.parseTaikoRedTiming(d.text) : [];
    var green = (typeof parseInheritedTimingPoints === 'function')
      ? parseInheritedTimingPoints(d.text) : [];
    var sm = (typeof parseHitObjectEndSliderMultiplier === 'function')
      ? parseHitObjectEndSliderMultiplier(d.text) : 1.4;
    /* ゲーム画面表示(SV適用)用に、各ノーツのスクロール速度を1回だけ計算 */
    if (window.applyTaikoNoteVelocities) {
      window.applyTaikoNoteVelocities(notes, red, green, sm);
    }
    /* Test画面のスピナーは osu!stable の表示タイミングを再現する。
       単一のTiming Point一覧を使うため、先頭が緑線のlegacy挙動も保持される。 */
    if (window.applyTaikoStableSwellTimings) {
      window.applyTaikoStableSwellTimings(notes, d.text, sm);
    }
    var marks = window.parseTaikoTimelineMarks
      ? window.parseTaikoTimelineMarks(d.text) : null;
    var timingInfoPoints = window.parseTaikoTimingInfoPoints
      ? window.parseTaikoTimingInfoPoints(d.text) : [];
    var lastNoteEnd = null;
    if (notes.length) {
      var lastNote = notes[notes.length - 1];
      lastNoteEnd = lastNote.endTime != null ? lastNote.endTime : lastNote.time;
    }
    var dominantBpm = window.getTaikoDominantBpm
      ? window.getTaikoDominantBpm(red, lastNoteEnd)
      : null;
    /* 小節線も1回だけ生成（osu!stable の生成処理を再現） */
    var barlines = [];
    if (window.buildTaikoBarlines && notes.length) {
      barlines = window.buildTaikoBarlines(
        d.text,
        red,
        green,
        sm
      );
    }
    return {
      name: name,
      fileName: d.fileName || '',
      notes: notes,
      red: red,
      dominantBpm: dominantBpm,
      barlines: barlines,
      timingInfoPoints: timingInfoPoints,
      /* 進捗バー用マーカー(kiai/SV/BPM/PreviewTime/Bookmarks)を1回だけ解析 */
      marks: marks
    };
  });
}

function getElectronPreviewTimeRange(diffs) {
  /* 全難易度の時間範囲（ノーツの最初〜最後）を求めてクランプ範囲にする */
  var minT = Infinity, maxT = -Infinity;
  diffs.forEach(function (d) {
    var ns = d.notes;
    if (ns && ns.length) {
      if (ns[0].time < minT) minT = ns[0].time;
      var last = ns[ns.length - 1];
      var e = last.endTime != null ? last.endTime : last.time;
      if (e > maxT) maxT = e;
    }
  });
  return minT <= maxT ? [minT - 2000, maxT + 2000] : null;
}
