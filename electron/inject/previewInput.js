// プレビューの選択状態、ポインター操作、シークとキーボード操作を管理する。
function createElectronPreviewInput({ canvas: spCanvas, playback, isActive,
  getDiffs, getRed, getSnap, getPxPerMs, setZoom, getTime, setManual,
  getAudio, hasAudio, getDuration, silenceWheelSounds, resetHitSounds,
  selectSoundLane, copyCurrentTimestamp, togglePlay }) {
  /* ── ノーツ選択（Ctrl+C のタイムスタンプ用） ──
     選択は 1 難易度内に限定する（osu! のタイムスタンプが 1 譜面を指すため）。
     ノーツはオブジェクト参照で保持する。譜面を読み直すと配列ごと作り直され、
     参照が変わってしまうので、その時は選択をクリアする。 */
  var spSelNotes = [];   // 選択中のノーツ(参照)
  var spSelDiff  = null; // 選択中の難易度
  var spMarquee  = null; // ドラッグ中の選択範囲 {x0,y0,x1,y1}（CSS px）
  var spClearSelection = function () { spSelNotes = []; spSelDiff = null; };
  var spIsSelected = function (note) { return spSelNotes.indexOf(note) >= 0; };

  /* スナップ1目盛り分ステップ（ホイール用）。グリッドに吸着して dir 方向へ */
  /* ホイール加速: ゆっくり回すと1目盛り、速く連続で回すと段々多く進む */
  var SP_WHEEL_MAX = 6;   // 加速時の最大目盛り/ノッチ
  var SP_WHEEL_GAP = 90;  // この間隔(ms)以内の連続回転で加速
  var spWheelLast = 0, spWheelAccel = 1;
  /* ホイールシーク中は効果音を鳴らさない。最後の入力から少し待って再開する。 */
  var spreadSnapStep = function (red, t, snap, dir, steps) {
    steps = steps || 1; // 1ノッチで動くスナップ目盛り数
    if (!red || !red.length) return t + dir * steps * 100;
    var seg = red[0];
    for (var i = 0; i < red.length; i++) { if (red[i].time <= t) seg = red[i]; else break; }
    var tick = seg.beatLength / snap;
    if (!(tick > 0)) return t + dir * steps * 100;
    var k = Math.round((t - seg.time) / tick);
    return seg.time + (k + dir * steps) * tick;
  };

  var hitTesting = createElectronPreviewHitTesting(spCanvas);
  var spCanvasPos = hitTesting.point;
  var spHitTest = hitTesting.hitTest;
  var spHitsInRect = hitTesting.hitsInRect;

  /* マウス操作:
     - 左ドラッグ  = ノーツを範囲選択（ラバーバンド。開始したレーン内に限定）
     - 左クリック  = ノーツを選択 / 何も無い所は選択解除（＋効果音レーンの切替）
     - Ctrl+左     = 選択に追加・解除（クリック / ドラッグとも）
     - 右ドラッグ  = スクラブ（右=戻る / 左=進む。開始時に音楽停止）
     閾値を超えて初めてドラッグ扱いにする。 */
  var SP_DRAG_THRESH = 5;
  var spPendingDown = false, spDownX = 0, spDownY = 0, spDragLastX = 0;
  var spPendingSel = false, spSelDragging = false;
  var spSelBase = null;    // Ctrl+ドラッグ開始時点の選択（これに足していく）
  var spSelDragDiff = null;
  spCanvas.addEventListener('mousedown', function (e) {
    /* ツールバー等に残ったフォーカスを外す（スペースが吸われないように） */
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (_) {}
    if (e.button === 2) {              // 右 = スクラブ
      spPendingDown = true;
      spDownX = e.clientX; spDownY = e.clientY; spDragLastX = e.clientX;
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    var p = spCanvasPos(e);
    spPendingSel = true;
    spDownX = e.clientX; spDownY = e.clientY;
    spMarquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    /* ドラッグ開始位置のレーン（=難易度）に選択を閉じ込める */
    var geom = spCanvas.__spreadGeom;
    var laneIdx = geom && geom.laneH ? Math.floor((p.y - geom.topPad) / geom.laneH) : -1;
    var diffs = getDiffs();
    spSelDragDiff = (laneIdx >= 0 && laneIdx < diffs.length) ? diffs[laneIdx] : null;
    /* Ctrl+ドラッグでの追加は、既存の選択と同じ難易度の時だけ（選択は 1 譜面に限定） */
    spSelBase = ((e.ctrlKey || e.metaKey) && spSelDiff && spSelDiff === spSelDragDiff)
      ? spSelNotes.slice() : [];
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    /* 右ドラッグ = スクラブ */
    if (spPendingDown || playback.dragging) {
      if (!playback.dragging) {
        if (Math.abs(e.clientX - spDownX) + Math.abs(e.clientY - spDownY) < SP_DRAG_THRESH) return;
        playback.dragging = true;
        if (getAudio() && !getAudio().paused) getAudio().pause(); // スクラブ開始で音楽停止
        var base0 = getTime(); if (base0 == null) base0 = 0;
        setManual(base0);
        spDragLastX = e.clientX;
        spCanvas.style.cursor = 'grabbing';
      }
      var dx = e.clientX - spDragLastX;
      spDragLastX = e.clientX;
      var base = playback.manualTime != null ? playback.manualTime : (playback.lastTime || 0);
      setManual(base - dx / getPxPerMs());
      return;
    }
    /* 左ドラッグ = ラバーバンド選択 */
    if (!spPendingSel) return;
    if (!spSelDragging) {
      if (Math.abs(e.clientX - spDownX) + Math.abs(e.clientY - spDownY) < SP_DRAG_THRESH) return;
      spSelDragging = true;
    }
    var p2 = spCanvasPos(e);
    spMarquee.x1 = p2.x; spMarquee.y1 = p2.y;
    var found = spHitsInRect(spMarquee.x0, spMarquee.y0, spMarquee.x1, spMarquee.y1, spSelDragDiff);
    var sel = spSelBase.slice();
    for (var i = 0; i < found.length; i++) {
      if (sel.indexOf(found[i].note) < 0) sel.push(found[i].note);
    }
    spSelNotes = sel;
    if (sel.length) spSelDiff = spSelDragDiff || spSelDiff;
  });
  window.addEventListener('mouseup', function (e) {
    if (playback.dragging) { playback.dragging = false; spCanvas.style.cursor = ''; spPendingDown = false; return; }
    spPendingDown = false;
    if (!spPendingSel) return;
    spPendingSel = false;
    spMarquee = null;
    if (spSelDragging) { spSelDragging = false; return; } // ドラッグ確定済み
    /* ここからは「動かさずクリック」 */
    var p = spCanvasPos(e);
    if (p.x < 0 || p.x > p.rect.width || p.y < 0 || p.y > p.rect.height) return;
    var hit = spHitTest(p.x, p.y);
    var additive = e.ctrlKey || e.metaKey;
    if (hit) {
      if (!additive || spSelDiff !== hit.diff) {  // 別譜面に移ったら選択し直し
        spSelNotes = [hit.note]; spSelDiff = hit.diff;
      } else {
        var at = spSelNotes.indexOf(hit.note);
        if (at >= 0) spSelNotes.splice(at, 1); else spSelNotes.push(hit.note);
        if (!spSelNotes.length) spSelDiff = null;
      }
      return;
    }
    /* ノーツ以外をクリック → Ctrl でなければ選択解除。
       加えて、そのレーンを効果音の対象にする（従来どおり）。
       レーンの範囲内をクリックした時だけ。クランプすると余白クリックで
       最下段が選ばれてしまうため。 */
    if (!additive) spClearSelection();
    var geom = spCanvas.__spreadGeom;
    if (!geom || !geom.n) return;
    var idx = Math.floor((p.y - geom.topPad) / geom.laneH);
    if (idx < 0 || idx >= geom.n) return;
    selectSoundLane(idx);
  });
  /* 右ドラッグでコンテキストメニューが出ないように */
  spCanvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ホイール: 通常=スナップ単位でシーク / Ctrl+ホイール=ズーム */
  spCanvas.addEventListener('wheel', function (e) {
    if (e.ctrlKey) {
      setZoom(getPxPerMs() * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      e.preventDefault();
      return;
    }
    var wasPlaying = !!(getAudio() && !getAudio().paused);
    /* すでに先読み予約された音も止め、連続ホイール中の重なりを防ぐ。 */
    silenceWheelSounds();
    /* 連続で速く回すほど1ノッチの移動目盛りを増やす（単発はきっちり1目盛り） */
    var now = performance.now();
    if (now - spWheelLast < SP_WHEEL_GAP) spWheelAccel = Math.min(spWheelAccel + 1, SP_WHEEL_MAX);
    else spWheelAccel = 1;
    spWheelLast = now;
    var base = getTime(); if (base == null) base = 0;
    var red = getRed();
    var dir = e.deltaY > 0 ? 1 : -1; // 下回し=進む
    var target = spreadSnapStep(red, base, getSnap(), dir, spWheelAccel);
    if (wasPlaying && hasAudio()) {
      /* 再生中は音源も移動先へ合わせる。getAudio().currentTime の setter が
         再生ソースを新しい位置から作り直すため、一時停止状態にはならない。 */
      var durMs = (getAudio().duration && isFinite(getAudio().duration))
        ? getAudio().duration * 1000
        : Infinity;
      target = Math.max(0, Math.min(target, durMs - 1));
      setManual(target);
      try { getAudio().currentTime = target / 1000; } catch (_) {}
      /* 効果音の先読み位置も破棄し、移動先のタイムラインから予約し直す。 */
      resetHitSounds();
      /* 将来別の音源実装へ差し替えて setter が再開しない場合にも再生を維持する。 */
      if (getAudio().paused) getAudio().play().catch(function () {});
    } else {
      setManual(target);
    }
    e.preventDefault();
  }, { passive: false });

  /* ノーツをダブルクリックすると、そのノーツの開始時刻へシークする。 */
  spCanvas.addEventListener('dblclick', function (e) {
    var p = spCanvasPos(e);
    var hit = spHitTest(p.x, p.y);
    if (hit && hit.note && Number.isFinite(hit.note.time)) {
      var target = hit.note.time;
      /* 音源がある場合は、再生中・停止中を問わず音楽側の位置も揃える。 */
      if (getAudio() && hasAudio()) {
        try { getAudio().currentTime = target / 1000; } catch (_) {}
      }
      setManual(target);
    }
    e.preventDefault();
  });

  /* スプレッド表示中のキーボード +/- でもズーム */
  document.addEventListener('keydown', function (e) {
    if (!isActive()) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === '+' || e.key === '=') { setZoom(getPxPerMs() * 1.25); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { setZoom(getPxPerMs() / 1.25); e.preventDefault(); }
  });

  /* プレビュー表示中の Ctrl+C でコピー（文字入力中は通常のコピーを優先） */
  document.addEventListener('keydown', function (e) {
    if (!isActive()) return;
    if (!(e.ctrlKey || e.metaKey) || (e.key !== 'c' && e.key !== 'C')) return;
    var t = e.target;
    if (t) {
      if (t.isContentEditable) return;
      var tag = t.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (tag === 'INPUT') {
        var ty = (t.type || 'text').toLowerCase();
        if (ty !== 'checkbox' && ty !== 'radio' && ty !== 'button' &&
            ty !== 'submit' && ty !== 'reset' && ty !== 'range') return;
      }
    }
    e.preventDefault();
    copyCurrentTimestamp();
  });
  /* Esc でノーツの選択を解除 */
  document.addEventListener('keydown', function (e) {
    if (!isActive() || e.key !== 'Escape') return;
    if (spSelNotes.length) { spClearSelection(); e.preventDefault(); }
  });
  var spProgWrap = document.getElementById('etb-sb-progress');
  /* 進捗バー: クリック / 左右ボタンでのドラッグ（押しながら左右）でシーク */
  var spProgDragging = false;
  var seekProgressAt = function (clientX) {
    var dur = getDuration();
    if (!(dur > 0) || !spProgWrap) return;
    var r = spProgWrap.getBoundingClientRect();
    if (r.width <= 0) return;
    var frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    var target = frac * dur;
    if (getAudio() && hasAudio()) { try { getAudio().currentTime = target / 1000; } catch (_) {} }
    /* 音源長の範囲内なので、ノーツ範囲へのクランプは通さず直接指定 */
    playback.manualTime = target;
  };
  if (spProgWrap) {
    spProgWrap.addEventListener('mousedown', function (e) {
      if (e.button !== 0 && e.button !== 2) return; // 左/右ボタン
      spProgDragging = true;
      seekProgressAt(e.clientX);
      e.preventDefault();
    });
    /* 右ドラッグ中にコンテキストメニューが出ないように */
    spProgWrap.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('mousemove', function (e) {
      if (!spProgDragging) return;
      seekProgressAt(e.clientX); // バー外へ出ても端にクランプして追従
    });
    window.addEventListener('mouseup', function () { spProgDragging = false; });
  }
  /* スペースキーで再生/一時停止（スプレッド表示中）。
     直前に触ったチェックボックス/ボタンにフォーカスが残っていても、
     スペースを奪われず再生を優先する。文字入力中だけは邪魔しない。 */
  document.addEventListener('keydown', function (e) {
    if (!isActive()) return;
    if (e.code !== 'Space' && e.key !== ' ') return;
    var t = e.target;
    if (t) {
      if (t.isContentEditable) return;
      var tag = t.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (tag === 'INPUT') {
        var ty = (t.type || 'text').toLowerCase();
        /* チェック/ラジオ/ボタン/スライダー以外（＝文字入力系）はスペースを譲る */
        if (ty !== 'checkbox' && ty !== 'radio' && ty !== 'button' &&
            ty !== 'submit' && ty !== 'reset' && ty !== 'range') return;
      }
    }
    e.preventDefault();
    togglePlay();
  });
  return {
    clearSelection: spClearSelection, isSelected: spIsSelected,
    get notes() { return spSelNotes; },
    get marquee() { return spMarquee; }
  };
}
