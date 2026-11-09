// 音楽と共有するAudioContextの時計に効果音を先読み予約する。
function createElectronPreviewHitSounds(baseDelayMs) {
  var SP_SFX_BASE_DELAY_MS = baseDelayMs;
  /* 効果音を Web Audio クロックに「先読みスケジュール」して鳴らす。
     描画ループ(約16ms)で通過検出→即再生 だと検出遅れぶん遅延するため、
     少し先(SP_SFX_LOOKAHEAD_MS)までのノーツを正確な発音時刻で予約する。 */
  /* 速度を落とした時の追加補正[ms]。
     タイムストレッチは1つの打点を複数の粒に分けて重ねるため、曲の打点が
     本来より早く聴こえる（25%では1打点が約8粒に現れる）。その分だけ
     効果音も前倒しする必要があり、ズレ量は速度が遅いほど大きい。
     値は実際に聴いて合わせた実測値。基準(100%)は「効果音タイミング補正」設定側で調整する。 */
  var SP_SFX_RATE_ADJUST = { '1': 0, '0.75': -20, '0.5': -50, '0.25': -80 };
  var spSfxRateAdjust = function (r) {
    var v = SP_SFX_RATE_ADJUST[String(r)];
    return typeof v === 'number' ? v : 0;
  };

  var SP_SFX_LOOKAHEAD_MS = 120;
  /* 再生開始直後に効果音の予約を見送る時間。
     昔 <audio> 再生だった頃は currentTime が開始直後に不正確で、安定を待つため
     200ms 見送っていた（そのぶん出だしの効果音が鳴らずラグに聞こえた）。
     現在は AudioContext の PCM 再生で currentTime が開始の瞬間から正確なので、
     見送りは不要。0 = 開始直後から鳴らす。 */
  var SP_SFX_SETTLE_MS = 0;
  var spSfxPlayFrom = null;    // この再生セッションの開始曲位置
  var spSfxLastSong = null;   // 前フレームの曲時刻（シーク検出用）
  var spSfxSchedTo = null;    // ここまでの曲時刻を予約済み
  var scheduleSpreadHitSounds = function (diffs, state) {
    var playing = state.playing, spHitSounds = state.enabled, spSynth = state.synth;
    var spAudio = state.audio, spPlaybackRate = state.rate, spSoundLane = state.lane;
    var spSfxWheelSilentUntil = state.silentUntil;
    /* ホイールシーク中は予約しない。終了後はその時点から新しく予約する。 */
    if (performance.now() < spSfxWheelSilentUntil) {
      spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null; return;
    }
    if (!spHitSounds || !spSynth || !spSynth.ctx || !playing) {
      spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null; return;
    }
    /* シーク中・バッファ待ちの間は予約しない（実音が出ていない間に先走るのを防ぐ）。
       再開時は下のシーク検出で予約位置がリセットされる。 */
    if (spAudio.seeking || spAudio.readyState < 3) {
      spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null; return;
    }
    var songNow = spAudio.currentTime * 1000;
    var ctxNow  = spSynth.ctx.currentTime;
    var rate    = spPlaybackRate || 1; // 曲時刻→実時間の換算（再生速度）
    /* 音楽も同じ ctx を通しているので出力レイテンシは共通＝相殺される。
       追加の補正は不要（設定画面の「効果音タイミング補正」で手動微調整のみ）。 */
    /* シーク/巻き戻し/大ジャンプ → 予約位置をリセット（過去を鳴らさない） */
    if (spSfxLastSong == null || songNow < spSfxLastSong - 5 || songNow - spSfxLastSong > 300) {
      spSfxSchedTo = songNow;
      spSfxPlayFrom = null; // シーク直後も立ち上がりを待ち直す
    }
    spSfxLastSong = songNow;
    /* 再生/シーク直後は currentTime と実際の出音がまだ一致していないことがある
       （曲・デコーダ依存）。開始位置から十分進むまでは予約を見送る。 */
    if (spSfxPlayFrom == null) spSfxPlayFrom = songNow;
    if (songNow - spSfxPlayFrom < SP_SFX_SETTLE_MS) { spSfxSchedTo = songNow; return; }
    var from = Math.max(spSfxSchedTo == null ? songNow : spSfxSchedTo, songNow);
    var horizon = songNow + SP_SFX_LOOKAHEAD_MS;
    var diff = diffs[Math.min(spSoundLane, diffs.length - 1)];
    if (diff && diff.notes) {
      var notes = diff.notes;
      /* 曲時間 → 実時間。基準遅延とタイミング補正は実時間の定数なので割らない
         （割ると 25% 再生で4倍に効いてしまう）。
         さらに速度ごとの補正を足す（下の SP_SFX_RATE_ADJUST を参照）。 */
        var offMs = SP_SFX_BASE_DELAY_MS + state.timingAdjustment + spSfxRateAdjust(rate);
      var realWhen = function (songMs) {
        return ctxNow + (songMs - songNow) / 1000 / rate + offMs / 1000;
      };
      for (var k = 0; k < notes.length; k++) {
        var note = notes[k];
        var nt = note.time;
        if (nt > horizon) break; // ソート済み → 以降は先
        if (note.kind === 'drumroll') {
          /* 連打はティックごとに鳴らす（通常＝小ドン / Finisher＝大ドン）。
             開始が過去でもティックが窓に入ることがあるので、
             開始時刻ではなく終端で打ち切る。 */
          var end = note.endTime != null ? note.endTime : nt;
          var spacing = note.tickSpacing || 0;
          if (end + spacing <= from) continue;
          if (!note._tickTimes && window.taikoDrumRollTickTimes) {
            note._tickTimes = window.taikoDrumRollTickTimes(note); // 1回だけ計算
          }
          var ticks = note._tickTimes || [];
          for (var ti = 0; ti < ticks.length; ti++) {
            var tt = ticks[ti];
            if (tt <= from) continue;
            if (tt > horizon) break;
            spSynth.don(note.big, realWhen(tt));
          }
          continue;
        }
        if (note.kind === 'denden') {
          /* 風船は必要打数を区間内に等間隔で置き、ドン開始でドン/カツを交互に鳴らす。
             osu!本体では最初の面/縁はどちらでもよく、以降の交互入力だけが必須。
             プレビューでは出音を一意にするためドン開始に固定する。 */
          var swellEnd = note.endTime != null ? note.endTime : nt;
          if (swellEnd <= from) continue;
          if (!note._swellHitTimes && window.taikoSwellHitTimes) {
            note._swellHitTimes = window.taikoSwellHitTimes(note); // 1回だけ計算
          }
          var swellHits = note._swellHitTimes || [];
          for (var si = 0; si < swellHits.length; si++) {
            var st = swellHits[si];
            if (st <= from) continue;
            if (st > horizon) break;
            if (si % 2 === 0) spSynth.don(false, realWhen(st));
            else spSynth.kat(false, realWhen(st));
          }
          continue;
        }
        if (nt <= from) continue;
        if (note.kind === 'don') spSynth.don(note.big, realWhen(nt));
        else if (note.kind === 'kat') spSynth.kat(note.big, realWhen(nt));
      }
    }
    spSfxSchedTo = horizon;
  };
  return {
    schedule: scheduleSpreadHitSounds,
    reset: function () {
      spSfxLastSong = null; spSfxSchedTo = null; spSfxPlayFrom = null;
    }
  };
}
