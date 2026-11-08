// 太鼓の効果音（ドン/カツ）を Web Audio で合成する。音源ファイル不要。
function createTaikoHitSynth(extCtx) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx && !extCtx) return null;
  const ctx = extCtx || new Ctx();   // 外部 ctx があれば共用（音楽と時計を揃えるため）
  const master = ctx.createGain();       // 音量マスター
  master.gain.value = 1;
  master.connect(ctx.destination);
  const activeSources = new Set();
  const trackSource = (source) => {
    activeSources.add(source);
    source.onended = () => activeSources.delete(source);
    return source;
  };
  const stopAll = () => {
    for (const source of activeSources) {
      try { source.stop(); } catch (_) {}
    }
    activeSources.clear();
  };
  let noiseBuf = null;
  const getNoise = () => {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.1);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };
  const at = (when) => (when && when > ctx.currentTime ? when : ctx.currentTime);
  // ドン（低い太鼓）: サイン波を素早く下げて減衰。when=発音予定時刻(ctx時間)
  const don = (big, when) => {
    const t = at(when);
    const g = ctx.createGain();
    g.connect(master);
    const v = big ? 0.95 : 0.6;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    const o = trackSource(ctx.createOscillator());
    o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.11);
    o.connect(g);
    o.start(t); o.stop(t + 0.2);
  };
  // カツ（高い縁）: バンドパスしたノイズ短音
  const kat = (big, when) => {
    const t = at(when);
    const dur = 0.07;
    const src = trackSource(ctx.createBufferSource());
    src.buffer = getNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.7;
    const g = ctx.createGain();
    const v = big ? 0.7 : 0.42;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  };
  const resume = () => { if (ctx.state === "suspended") ctx.resume(); };
  const setVolume = (v) => { master.gain.value = Math.max(0, Math.min(1, v)); };
  return { don, kat, resume, setVolume, stopAll, ctx };
}

// 自前の音源ファイル（base64データURLのマップ）から効果音キットを作る。
//   soundMap: { don, kat, donBig?, katBig? }（各 data:URL 文字列）
// createTaikoHitSynth と同じ { don(big), kat(big), resume } を返す。
function createTaikoSampleKit(soundMap, extCtx) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if ((!Ctx && !extCtx) || !soundMap || (!soundMap.don && !soundMap.kat)) return null;
  const ctx = extCtx || new Ctx();   // 外部 ctx があれば共用（音楽と時計を揃えるため）
  const master = ctx.createGain();       // 音量マスター
  master.gain.value = 1;
  master.connect(ctx.destination);
  const activeSources = new Set();
  const stopAll = () => {
    for (const source of activeSources) {
      try { source.stop(); } catch (_) {}
    }
    activeSources.clear();
  };
  const buffers = { don: null, kat: null, donBig: null, katBig: null };
  Object.keys(buffers).forEach((k) => {
    if (!soundMap[k]) return;
    fetch(soundMap[k])
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => { buffers[k] = buf; })
      .catch(() => {});
  });
  const play = (buf, vol, when) => {
    if (!buf) return;
    const src = ctx.createBufferSource();
    activeSources.add(src);
    src.onended = () => activeSources.delete(src);
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(master);
    src.start(when && when > ctx.currentTime ? when : ctx.currentTime);
  };
  return {
    don: (big, when) => play(big && buffers.donBig ? buffers.donBig : buffers.don, big ? 1.0 : 0.85, when),
    kat: (big, when) => play(big && buffers.katBig ? buffers.katBig : buffers.kat, big ? 1.0 : 0.85, when),
    resume: () => { if (ctx.state === "suspended") ctx.resume(); },
    setVolume: (v) => { master.gain.value = Math.max(0, Math.min(1, v)); },
    stopAll,
    ctx
  };
}

if (typeof window !== "undefined") {
  window.parseTaikoNotes = parseTaikoNotes;
  window.assignTaikoComboNumbers = assignTaikoComboNumbers;
  window.taikoDrumRollTickTimes = taikoDrumRollTickTimes;
  window.taikoSwellRequiredHits = taikoSwellRequiredHits;
  window.taikoSwellHitTimes = taikoSwellHitTimes;
  window.taikoSwellRemainingHits = taikoSwellRemainingHits;
  window.resolveTaikoBreakRegions = resolveTaikoBreakRegions;
  window.parseTaikoRedTiming = parseTaikoRedTiming;
  window.getTaikoMeasureBeat = getTaikoMeasureBeat;
  window.parseTaikoTimelineMarks = parseTaikoTimelineMarks;
  window.parseTaikoTimingInfoPoints = parseTaikoTimingInfoPoints;
  window.getTaikoTimingInfoAt = getTaikoTimingInfoAt;
  window.getTaikoDominantBpm = getTaikoDominantBpm;
  window.getTaikoEqualSpeedPxPerMs = getTaikoEqualSpeedPxPerMs;
  window.applyTaikoNoteVelocities = applyTaikoNoteVelocities;
  window.applyTaikoStableSwellTimings = applyTaikoStableSwellTimings;
  window.buildTaikoBarlines = buildTaikoBarlines;
  window.drawTaikoProgressBar = drawTaikoProgressBar;
  window.drawTaikoSpread = drawTaikoSpread;
  window.createTaikoHitSynth = createTaikoHitSynth;
  window.createTaikoSampleKit = createTaikoSampleKit;
}
