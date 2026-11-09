// PCM再生とタイムストレッチ。再生位置は共有AudioContextの時計から求める。
function createElectronPreviewAudio(ensureSpreadAudioCtx) {
  var buffer = null, src = null, gain = null;
  var startCtx = 0, startOffset = 0;   // 再生開始時の ctx 時刻 / 曲位置（秒）
  var playing = false, pausedAt = 0;   // 停止中の曲位置（秒）
  var rate = 1, vol = 1, loadToken = 0;
  var pendingPlay = false;   // デコード完了前に再生を押された
  var listeners = { playing: [], pause: [], ended: [] };
  var emit = function (n) {
    for (var i = 0; i < listeners[n].length; i++) { try { listeners[n][i](); } catch (e) {} }
  };
  /* ── ピッチを保ったまま速度を変える（タイムストレッチ）──
     playbackRate を下げるとピッチも下がってしまうので、速度変更時は
     「元の音を等倍で鳴らした短い粒(grain)を、少しずつ位置をずらしながら
     重ねて並べる」方式で伸ばす。粒はどれも等倍再生なのでピッチは変わらない。
     重なり50%の三角フェードで足すと振幅が一定になり、継ぎ目が目立たない。
     再生位置はこの仕組みとは独立に ctx クロックから求めるので、
     25%再生でも位置は正確なまま。 */
  var GRAIN_SEC = 0.12;            // 1粒の長さ（元音の取り出し長）
  var GRAIN_HOP_OUT = GRAIN_SEC / 2; // 出力側の間隔＝50%重ね
  var STRETCH_LOOKAHEAD = 0.45;    // 何秒先まで予約しておくか
  var grainTimer = null, grainNodes = [];
  var nextOutTime = 0, nextInPos = 0;
  var clearGrains = function () {
    if (grainTimer) { clearInterval(grainTimer); grainTimer = null; }
    for (var i = 0; i < grainNodes.length; i++) {
      try { grainNodes[i].onended = null; grainNodes[i].stop(); } catch (e) {}
    }
    grainNodes = [];
  };
  var pumpGrains = function (ctx) {
    var hopIn = GRAIN_HOP_OUT * rate;   // 元音を進める量（rate<1 なら少しずつ）
    while (nextOutTime < ctx.currentTime + STRETCH_LOOKAHEAD) {
      if (nextInPos >= buffer.duration) {   // 曲の終わり
        clearGrains();
        playing = false; pausedAt = buffer.duration; emit('ended');
        return;
      }
      var g = ctx.createGain();
      var t0 = Math.max(nextOutTime, ctx.currentTime);
      /* 三角フェード（前半で上げ、後半で下げる）。隣の粒と足して常に 1 になる */
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(1, t0 + GRAIN_HOP_OUT);
      g.gain.linearRampToValueAtTime(0, t0 + GRAIN_SEC);
      g.connect(gain);
      var s = ctx.createBufferSource();
      s.buffer = buffer;
      s.connect(g);
      s.start(t0, Math.min(nextInPos, buffer.duration),
              Math.min(GRAIN_SEC, buffer.duration - nextInPos));
      grainNodes.push(s);
      s.onended = (function (node) {
        return function () {
          var i = grainNodes.indexOf(node);
          if (i >= 0) grainNodes.splice(i, 1);
        };
      })(s);
      nextOutTime += GRAIN_HOP_OUT;
      nextInPos += hopIn;
    }
  };
  var startStretch = function (ctx) {
    clearGrains();
    nextOutTime = ctx.currentTime;
    nextInPos = startOffset;
    pumpGrains(ctx);
    grainTimer = setInterval(function () {
      if (!playing) { clearGrains(); return; }
      pumpGrains(ctx);
    }, 100);
  };

  var stopSrc = function () {
    clearGrains();
    if (!src) return;
    try { src.onended = null; src.stop(); } catch (e) {}
    src = null;
  };
  var api = {
    seeking: false,
    get readyState() { return buffer ? 4 : 0; },   // デコード完了までは 0
    get duration() { return buffer ? buffer.duration : NaN; },
    get paused() { return !playing; },
    get currentTime() {
      if (!playing) return pausedAt;
      var ctx = ensureSpreadAudioCtx();
      if (!ctx) return pausedAt;
      return startOffset + (ctx.currentTime - startCtx) * rate;
    },
    set currentTime(v) {
      v = Math.max(0, Number(v) || 0);
      if (playing) { var was = true; api.pause(); pausedAt = v; if (was) api.play(); }
      else pausedAt = v;
    },
    get volume() { return vol; },
    set volume(v) {
      vol = Math.max(0, Math.min(1, Number(v)));
      if (gain) gain.gain.value = vol;
    },
    get playbackRate() { return rate; },
    set playbackRate(v) {
      var next = Number(v) > 0 ? Number(v) : 1;
      if (next === rate) return;
      var pos = api.currentTime;
      rate = next;
      if (playing) { api.pause(); pausedAt = pos; api.play(); }
    },
    addEventListener: function (name, fn) {
      if (listeners[name]) listeners[name].push(fn);
    },
    /* 音源を読み込んでデコードする（url=null で解放） */
    setSrc: function (url) {
      var token = ++loadToken;
      stopSrc(); playing = false; pausedAt = 0; buffer = null; pendingPlay = false;
      if (!url) return;
      var ctx = ensureSpreadAudioCtx();
      if (!ctx) return;
      fetch(url)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { return ctx.decodeAudioData(ab); })
        .then(function (b) {
          if (token !== loadToken) return;
          buffer = b;
          /* デコード前に再生を押されていたら、ここで開始する */
          if (pendingPlay) { pendingPlay = false; api.play(); }
        })
        .catch(function () { /* デコード失敗時は再生されないだけ */ });
    },
    play: function () {
      var ctx = ensureSpreadAudioCtx();
      if (!ctx || playing) return Promise.resolve();
      if (!buffer) { pendingPlay = true; return Promise.resolve(); }  // デコード待ち
      stopSrc();
      if (!gain) { gain = ctx.createGain(); gain.connect(ctx.destination); }
      gain.gain.value = vol;
      startOffset = Math.max(0, Math.min(pausedAt, buffer.duration));
      startCtx = ctx.currentTime;
      playing = true;
      if (rate === 1) {
        /* 等速はそのまま流す（加工なし＝音質最良） */
        src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.onended = function () {   // 自然終了のみ（stop 時は解除済み）
          playing = false; pausedAt = buffer ? buffer.duration : 0; emit('ended');
        };
        src.start(0, startOffset);
      } else {
        startStretch(ctx);            // 速度変更時はピッチを保つ伸縮再生
      }
      emit('playing');
      return Promise.resolve();
    },
    pause: function () {
      pendingPlay = false;
      if (!playing) return;
      pausedAt = api.currentTime;
      playing = false;
      stopSrc();
      emit('pause');
    },
  };
  return api;
}
