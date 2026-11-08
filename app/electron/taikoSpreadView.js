// 太鼓プレビューのCanvas描画。解析・タイミング・音声は隣接モジュールが担当する。
const TAIKO_COLORS = {
  don: "#f24b4b",
  kat: "#5b9bd5",
  roll: "rgba(245,180,0,0.92)",   // 連打(drumroll): 黄
  rollOpaque: "rgb(245,180,0)",   // 内部透過時の枠線・始点は不透明
  rollTick: "rgba(140,95,0,0.55)", // 連打のティック（黄と同系のやや暗い琥珀。茶色すぎると浮く）
  denden: "rgba(205,205,212,0.9)", // 風船/スピナー(denden): 薄いグレー（TaikoEditor風）
  dendenText: "#2b2b34",          // 風船に出す必要打数（薄い本体の上なので暗い色）
  swellFill: "#d9dce2",           // ゲーム画面表示のスピナー本体（白寄りのライトグレー）
  swellCore: "#747983",           // 中央の残り打数を載せるグレー
  swellRing: "rgba(244,246,250,0.9)", // 進捗・接近リング
  ncBar: "rgba(120,220,255,0.95)", // NCシンバルが鳴る小節線（major）
  selRing: "rgba(255,105,215,0.95)", // 選択中のノーツの縁（osu!エディタ風のピンク）
  selGlow: "rgba(255,60,200,0.95)",  // その外側のモヤ
  /* 休憩時間(break)の帯。TaikoEditor の ObjectView.java の2段階（breakColor /
     faintBreakColor）に倣う。ただし向こうより背景が暗いので、同じ不透明度では
     ほぼ見えないため、2段階の関係は保ったまま濃さを上げてある。 */
  breakMain:  "rgba(165,165,175,0.42)", // break 区間そのもの
  breakFaint: "rgba(140,140,150,0.22)", // その前後の余白
};
const TAIKO_SWELL_FADE_OUT_MS = 300;

function taikoTruncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

// ゲーム画面表示用の風船。
// stable と同じく、予告リングは S-P ～ S-trunc(0.6P)、本体は S-1 ～ S+200 で
// 個別にフェードインする。終了後のフェードアウトはプレビュー独自の自然な遷移。
function drawTaikoGameSwell(ctx, x, y, radius, laneH, note, currentTime) {
  const requiredHits = Number.isFinite(note.requiredHits)
    ? Math.max(2, Math.trunc(note.requiredHits))
    : 2;
  const remaining = taikoSwellRemainingHits(note, currentTime);
  const completion = Math.max(0, Math.min(1, 1 - remaining / requiredHits));
  const start = note.time;
  const end = note.endTime != null ? note.endTime : start;
  const duration = Math.max(1, end - start);
  const timeProgress = Math.max(0, Math.min(1, (currentTime - start) / duration));
  const active = currentTime >= start;
  const preempt = Number.isFinite(note.stableSwellPreemptMs)
    ? Math.max(0, note.stableSwellPreemptMs) : 0;
  const warningFadeStart = start - preempt;
  const warningFadeComplete = start - Math.trunc(0.6 * preempt);
  const warningFadeDuration = warningFadeComplete - warningFadeStart;
  const warningAlpha = warningFadeDuration > 0
    ? Math.max(0, Math.min(1, (currentTime - warningFadeStart) / warningFadeDuration))
    : (currentTime >= start ? 1 : 0);
  const bodyAlpha = Math.max(0, Math.min(1, (currentTime - (start - 1)) / 201));
  const fadeProgress = Math.max(0, Math.min(1, (currentTime - end) / TAIKO_SWELL_FADE_OUT_MS));
  /* smoothstep の逆。終点では不透明のまま、300msかけて両端が滑らかに減衰する。 */
  const fadeAlpha = 1 - fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
  const outerR = Math.min(
    laneH * 0.47,
    radius * (active ? 1.48 - timeProgress * 0.26 : 1.48)
  );

  ctx.save();

  /* 打数が進むほど少し外へ広がる進捗リング。 */
  if (active && completion > 0) {
    ctx.globalAlpha = bodyAlpha * fadeAlpha;
    const progressRingR = Math.min(
      laneH * 0.48,
      outerR + radius * completion * 0.28
    );
    ctx.beginPath();
    ctx.arc(x, y, progressRingR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(232,235,242," + (0.2 + completion * 0.3) + ")";
    ctx.lineWidth = Math.max(1, radius * 0.12);
    ctx.stroke();
  }

  /* stable の予告スプライトに相当する接近リング。 */
  ctx.globalAlpha = warningAlpha * fadeAlpha;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = TAIKO_COLORS.swellRing;
  ctx.lineWidth = Math.max(1.5, radius * 0.13);
  ctx.stroke();

  /* stable のスピナー本体。開始直前から開始後200msまでフェードインする。 */
  ctx.globalAlpha = bodyAlpha * fadeAlpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = TAIKO_COLORS.swellFill;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.96)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = TAIKO_COLORS.swellCore;
  ctx.fill();

  const digits = String(remaining).length;
  const fontScale = digits >= 3 ? 0.7 : digits === 2 ? 0.9 : 1.15;
  ctx.font = "bold " + Math.max(8, Math.round(radius * fontScale)) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(remaining), x, y + 0.5);
  ctx.restore();
}

// 難易度名を単語優先で折り返し、maxLines 行に収める。
//   ・1 行しか使えない時は従来どおり末尾「…」で省略。
//   ・1 単語が幅を超える場合は文字単位で分割する。
//   ・全部を収めきれない時は最終行末尾を「…」にして続きがあることを示す。
function taikoWrapLines(ctx, text, maxW, maxLines) {
  text = String(text == null ? "" : text);
  if (maxLines <= 1) return [taikoTruncate(ctx, text, maxW)];
  const words = text.split(/\s+/).filter(Boolean);
  const all = [];
  let cur = "";
  const flush = function () { if (cur) { all.push(cur); cur = ""; } };
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    if (cur && ctx.measureText(cur + " " + w).width <= maxW) { cur += " " + w; continue; }
    flush();
    if (ctx.measureText(w).width <= maxW) { cur = w; continue; }
    // 幅を超える長い単語は文字単位で折る
    let seg = "";
    for (let ci = 0; ci < w.length; ci++) {
      if (ctx.measureText(seg + w[ci]).width <= maxW || !seg) { seg += w[ci]; }
      else { all.push(seg); seg = w[ci]; }
    }
    cur = seg;
  }
  flush();
  if (!all.length) return [""];
  if (all.length <= maxLines) return all;
  // 溢れた分は最終行を「…」で省略
  const kept = all.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
  kept[maxLines - 1] = last + "…";
  return kept;
}

// カプセル（連打バー）。roundRect は Electron 13(Chromium91)に無いので arc で描く
function taikoCapsule(ctx, x1, x2, yMid, r) {
  const left = Math.min(x1, x2), right = Math.max(x1, x2);
  ctx.beginPath();
  ctx.arc(left, yMid, r, Math.PI / 2, Math.PI * 1.5);
  ctx.lineTo(right, yMid - r);
  ctx.arc(right, yMid, r, Math.PI * 1.5, Math.PI / 2);
  ctx.closePath();
}

function taikoGcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }

// ビート内の細分割位置に応じた色（osu!エディタ風のスナップ色）
function taikoTickColor(beatPos, snap) {
  if (beatPos === 0) return null;
  const g = taikoGcd(beatPos, snap) || 1;
  const den = snap / g;
  if (den === 2) return "rgba(237,80,80,0.45)";   // 1/2 赤
  if (den === 4) return "rgba(90,140,230,0.45)";   // 1/4 青
  if (den === 3) return "rgba(200,95,215,0.42)";   // 1/3 マゼンタ
  if (den === 6) return "rgba(150,95,215,0.42)";   // 1/6 紫
  if (den === 8) return "rgba(220,200,70,0.40)";   // 1/8 黄
  return "rgba(150,150,160,0.36)";                  // その他 灰
}

// 全レーン貫通のスナップグリッド
function drawTaikoGrid(ctx, red, currentTime, judgmentX, pxPerMs, x0, x1, y0, y1, snap, showNcCymbal) {
  if (!red || !red.length) return;
  const leftTime  = currentTime - (judgmentX - x0) / pxPerMs;
  const rightTime = currentTime + (x1 - judgmentX) / pxPerMs;
  for (let i = 0; i < red.length; i++) {
    const seg = red[i];
    const beat = seg.beatLength;
    if (!Number.isFinite(beat) || beat <= 0) continue;
    const meter = Number.isFinite(seg.meter) && seg.meter > 0 ? seg.meter : 4;
    const segStart = seg.time;
    const segEnd = i + 1 < red.length ? red[i + 1].time : rightTime + beat;
    if (segEnd < leftTime || segStart > rightTime) continue;

    const step = beat / snap;
    if (!(step > 0)) continue;
    const drawMinor = step * pxPerMs >= 5;   // 細かすぎる時はビート線のみ
    const drawBeat  = beat * pxPerMs >= 4;   // ビートも潰れる時は小節線のみ
    const lastT = Math.min(segEnd, rightTime);

    let j = Math.ceil((Math.max(segStart, leftTime) - segStart) / step - 1e-6);
    if (j < 0) j = 0;
    let guard = 0;
    for (; ; j++) {
      if (++guard > 6000) break;
      const t = segStart + j * step;
      if (t > lastT) break;
      const beatPos = ((j % snap) + snap) % snap;
      const isBeat = beatPos === 0;
      const beatsFromStart = Math.floor(j / snap);
      const isMeasure = isBeat && (((beatsFromStart % meter) + meter) % meter === 0);

      let color, w;
      if (isMeasure) {
        const measureIndex = Math.floor(beatsFromStart / meter);
        const major =
          showNcCymbal &&
          measureIndex % NC_CYMBAL_MEASURES === 0;
        color = major
          ? TAIKO_COLORS.ncBar
          : "rgba(255,255,255,0.32)";
        w = major ? 2 : 1.5;
      } else if (isBeat) {
        if (!drawBeat) continue;
        color = "rgba(255,255,255,0.14)";
        w = 1;
      } else {
        if (!drawMinor) continue;
        color = taikoTickColor(beatPos, snap);
        w = 1;
      }

      const x = judgmentX + (t - currentTime) * pxPerMs;
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    }
  }
}

// 昇順のノーツから time 以下の最後の要素の「次」を返す。
// 等速表示で曲末から全ノーツを毎フレーム走査しないために使う。
function upperBoundTaikoNoteTime(notes, time) {
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].time <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

let taikoKiaiGlowImage = null;
let taikoKiaiGlowLoadStarted = false;

function getTaikoKiaiGlowImage() {
  if (
    !taikoKiaiGlowLoadStarted &&
    typeof Image !== "undefined" &&
    typeof document !== "undefined"
  ) {
    taikoKiaiGlowLoadStarted = true;
    taikoKiaiGlowImage = new Image();
    taikoKiaiGlowImage.decoding = "async";
    taikoKiaiGlowImage.onerror = () => {
      taikoKiaiGlowImage = null;
    };
    taikoKiaiGlowImage.src = new URL(
      "images/taiko-glow.png",
      document.baseURI
    ).href;
  }

  return (
    taikoKiaiGlowImage &&
    taikoKiaiGlowImage.complete &&
    taikoKiaiGlowImage.naturalWidth > 0
  )
    ? taikoKiaiGlowImage
    : null;
}

const TAIKO_KIAI_GLOW_FADE_OUT_MS = 300;

function taikoKiaiGlowAlphaAt(marks, time) {
  if (!marks?.kiai?.length || !Number.isFinite(time)) return 0;
  let alpha = 0;
  for (const interval of marks.kiai) {
    if (time >= interval.start && (interval.end == null || time < interval.end)) return 1;
    if (interval.end == null || time < interval.end) continue;
    const progress = (time - interval.end) / TAIKO_KIAI_GLOW_FADE_OUT_MS;
    if (progress >= 1) continue;
    /* smoothstep の逆。Kiai終了時から300msかけて自然に透明化する。 */
    const clamped = Math.max(0, progress);
    const fade = 1 - clamped * clamped * (3 - 2 * clamped);
    alpha = Math.max(alpha, fade);
  }
  return alpha;
}

function drawTaikoKiaiBands(
  ctx,
  diffs,
  currentTime,
  judgmentX,
  pxPerMs,
  playX0,
  playX1,
  topPad,
  laneH
) {
  ctx.fillStyle = "rgba(245, 154, 48, 0.13)";

  for (let i = 0; i < diffs.length; i++) {
    const intervals = diffs[i].marks?.kiai ?? [];
    const y = topPad + i * laneH;

    for (const interval of intervals) {
      const rawStart = judgmentX + (interval.start - currentTime) * pxPerMs;
      const rawEnd = interval.end == null
        ? playX1
        : judgmentX + (interval.end - currentTime) * pxPerMs;
      const start = Math.max(playX0, rawStart);
      const end = Math.min(playX1, rawEnd);

      if (end > start) {
        ctx.fillRect(start, y, end - start, laneH);
      }
    }
  }
}

function drawTaikoKiaiGlow(
  ctx,
  judgmentX,
  yMid,
  yTop,
  laneH,
  bigRadius,
  playX0,
  playX1,
  fadeAlpha
) {
  const size = Math.min(
    laneH * 1.3,
    Math.max(laneH, bigRadius * 3.35)
  );
  const image = getTaikoKiaiGlowImage();

  ctx.save();
  ctx.beginPath();
  ctx.rect(playX0, yTop, playX1 - playX0, laneH);
  ctx.clip();

  if (image) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.56 * fadeAlpha;
    ctx.drawImage(
      image,
      judgmentX - size / 2,
      yMid - size / 2,
      size,
      size
    );
  } else {
    ctx.globalAlpha = fadeAlpha;
    const radius = Math.max(bigRadius * 1.35, laneH * 0.42);
    const gradient = ctx.createRadialGradient(
      judgmentX,
      yMid,
      bigRadius * 0.45,
      judgmentX,
      yMid,
      radius
    );
    gradient.addColorStop(0, "rgba(255, 210, 45, 0.52)");
    gradient.addColorStop(0.55, "rgba(255, 145, 25, 0.24)");
    gradient.addColorStop(1, "rgba(255, 100, 10, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(judgmentX, yMid, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// diffs: [{name, notes, red}], currentTime: ms(or null)
// opts: {pxPerMs, snap, emptyText, idleText}
function drawTaikoSpread(canvas, diffs, currentTime, opts) {
  opts = opts || {};
  const wrap = canvas.parentElement || canvas;
  const cssW = Math.max(360, canvas.clientWidth || wrap.clientWidth || 800);
  const cssH = Math.max(120, canvas.clientHeight || wrap.clientHeight || 360);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width  !== Math.round(cssW * dpr)) canvas.width  = Math.round(cssW * dpr);
  if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#1a1a1f";
  ctx.fillRect(0, 0, cssW, cssH);

  /* 左の難易度名カラム幅。情報表示ON時は、その右へTiming Point情報カラムを足す。 */
  const diffLabelW = Math.round(Math.min(190, Math.max(120, cssW * 0.15)));
  const timingInfoW = opts.showTimingInfo ? TAIKO_TIMING_INFO_WIDTH : 0;
  const labelW = diffLabelW + timingInfoW;
  const playX0 = labelW;
  const playX1 = cssW;
  /* 判定ラインの位置（プレイフィールド幅に対する割合）。既定 0.5＝中央。
     左に寄せると過去側が狭く未来側が広くなり、先の譜面を長く見渡せる。 */
  const judgeFrac = Number.isFinite(opts.judgeFrac)
    ? Math.max(0.05, Math.min(0.95, opts.judgeFrac)) : 0.5;
  const judgmentX = playX0 + (playX1 - playX0) * judgeFrac;
  const pxPerMs = opts.pxPerMs || 0.32;
  const snap = Number.isFinite(opts.snap) && opts.snap > 0 ? opts.snap : 4;
  const soundLane = Number.isFinite(opts.soundLane) ? opts.soundLane : -1; // 効果音を鳴らすレーン
  const isSelected = typeof opts.isSelected === "function" ? opts.isSelected : null; // 選択中判定
  const showNcCymbal = !!opts.showNcCymbal;   // NCシンバル位置(major小節線)の強調
  const highlightKiai = opts.highlightKiai !== false; // Kiai背景・判定枠の炎
  const transparentSliders = !!opts.transparentSliders;
  /* クリック判定配列と要素は毎フレーム再利用する。密度の高い譜面で大量の短命
     オブジェクトを作り、周期的なGC停止を起こすことを避ける。 */
  const spreadGeom = canvas.__spreadGeom || {};
  const hits = Array.isArray(spreadGeom.hits) ? spreadGeom.hits : [];
  let hitCount = 0;
  const svMode  = !!opts.svMode;              // true = ゲーム画面表示（SV/BPM適用）
  /* osu!px → 画面px の換算。判定点→右端の到達時間が実機と一致するように、
     「このビューの接近距離 ÷ osu!のプレイフィールド長」で縮尺を決める（ズーム非依存）。
     基準は「判定ライン中央」時の接近距離で固定する。判定ラインを左に寄せても
     ノーツの大きさとスクロール速度（px/ms）が変わらないようにするため
     （左寄せでは接近距離が伸びるぶん、ノーツが見え始めてからの時間が長くなる）。 */
  const svScale = ((playX1 - playX0) / 2) / OSU_TAIKO_PLAYFIELD_PX;

  const n = diffs.length;
  if (n === 0) {
    hits.length = 0;
    spreadGeom.topPad = 0;
    spreadGeom.laneH = 0;
    spreadGeom.n = 0;
    spreadGeom.hits = hits;
    spreadGeom.playX0 = playX0;
    canvas.__spreadGeom = spreadGeom;
    ctx.fillStyle = "#666"; ctx.font = "13px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(opts.emptyText || "譜面が読み込まれていません", cssW / 2, cssH / 2);
    return;
  }

  const topPad = 4, botPad = 4;
  /* レーン高さはノーツに合わせたタイトなサイズ。
     大音符の直径は radius*3 なので、それに少しだけ余白を足した高さを基準にし、
     譜面数が多くて入りきらない場合だけ均等割りに縮める。 */
  const rWant  = (OSU_TAIKO_NOTE_PX / 2) * svScale;
  const availH = (cssH - topPad - botPad) / n;
  const laneH  = Math.max(24, Math.min(rWant * 3.3, availH));
  /* サークル半径は常に実機縮尺（等速表示でも同じ大きさ）。
     譜面数が多くレーンが縮んだ時だけ、大音符が収まるように小さくする。 */
  const radius = Math.max(4, Math.min(rWant, laneH * 0.32)); // 大音符=laneH*0.48 まで
  const bigR   = radius * 1.5;
  /* ゲーム画面表示(svMode)の横スクロール縮尺。
     ノーツが実機縮尺(rWant)より小さくクランプされた分だけ、横方向も同じ比率で縮める。
     こうしないと「ノーツの大きさ : 接近距離」の比が崩れ、譜面数が多い（レーンが
     縮む）ほどノーツ間隔だけ実際より広く見えてゲームプレイ再現から外れる。
     縮んでいない時は radius===rWant なので係数1＝従来と同じ。 */
  const svHScale = svScale * (radius / rWant);
  const gridY1 = topPad + n * laneH;
  const playable = currentTime != null && Number.isFinite(currentTime);

  // レーン背景（交互）
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#202028" : "#1b1b22";
    ctx.fillRect(playX0, topPad + i * laneH, playX1 - playX0, laneH);
  }

  /* 等速表示では、各DiffのKiai区間を時間位置に沿った薄い背景色で示す。 */
  if (playable && !svMode && highlightKiai) {
    drawTaikoKiaiBands(
      ctx,
      diffs,
      currentTime,
      judgmentX,
      pxPerMs,
      playX0,
      playX1,
      topPad,
      laneH
    );
  }

  // グリッド + ノーツ（プレイフィールドにクリップ）
  ctx.save();
  ctx.beginPath();
  ctx.rect(playX0, 0, playX1 - playX0, cssH);
  ctx.clip();

  if (playable) {
    /* 休憩時間(break)の帯。グリッドやノーツより先に描いて背面にする。
       等速表示のみ（SV適用時は位置がノーツと合わなくなるため。グリッドと同じ扱い） */
    if (!svMode) {
      for (let i = 0; i < n; i++) {
        const diff = diffs[i];
        if (diff._breakRegions == null) {
          diff._breakRegions = resolveTaikoBreakRegions(diff.notes, diff.marks && diff.marks.breaks);
        }
        const regions = diff._breakRegions;
        if (!regions.length) continue;
        const yTop = topPad + i * laneH;
        for (let b = 0; b < regions.length; b++) {
          const rg = regions[b];
          const bs = judgmentX + (rg.breakStart - currentTime) * pxPerMs;
          const be = judgmentX + (rg.breakEnd   - currentTime) * pxPerMs;
          // 前後にノーツが無い側は画面端まで伸ばす
          const s = rg.start == null ? playX0 : judgmentX + (rg.start - currentTime) * pxPerMs;
          const e = rg.end   == null ? playX1 : judgmentX + (rg.end   - currentTime) * pxPerMs;
          if (e < playX0 || s > playX1) continue;
          ctx.fillStyle = TAIKO_COLORS.breakFaint;
          if (bs > s) ctx.fillRect(s,  yTop, bs - s, laneH);
          if (e > be) ctx.fillRect(be, yTop, e - be, laneH);
          ctx.fillStyle = TAIKO_COLORS.breakMain;
          ctx.fillRect(bs, yTop, be - bs, laneH);
        }
      }
    }
    /* グリッドは等速表示のみ（SV適用時はノーツと合わなくなるため出さない＝ゲーム画面に近い） */
    if (!svMode) {
      let refRed = null;
      for (let i = 0; i < n; i++) {
        if (diffs[i].red && diffs[i].red.length) {
          refRed = diffs[i].red;
          break;
        }
      }
      drawTaikoGrid(
        ctx,
        refRed,
        currentTime,
        judgmentX,
        pxPerMs,
        playX0,
        playX1,
        topPad,
        gridY1,
        snap,
        showNcCymbal
      );
    }

    const futureMs = (playX1 - judgmentX) / pxPerMs;
    const pastMs   = (judgmentX - playX0) / pxPerMs;
    const marginMs = 40 / pxPerMs;

    const futCut  = futureMs + marginMs;
    const pastCut = -pastMs - marginMs;
    for (let i = 0; i < n; i++) {
      const diff = diffs[i];
      const notes = diff.notes;
      const yTop = topPad + i * laneH;
      const yMid = yTop + laneH / 2;
      // 連打(尾)の最長長さをキャッシュ。過去側 break の安全マージンに使う
      // （head が画面外でも尾が見えている連打を消さないため）。
      if (diff._maxRollMs == null) {
        let m = 0;
        for (let q = 0; q < notes.length; q++) {
          const e = notes[q].endTime;
          if (e != null) { const d = e - notes[q].time; if (d > m) m = d; }
        }
        diff._maxRollMs = m;
      }
      /* ゲーム画面表示: 小節線（ノーツと同じSV速度で流れる） */
      if (svMode && diff.barlines && diff.barlines.length) {
        for (let b = 0; b < diff.barlines.length; b++) {
          const bar = diff.barlines[b];
          const bv = (bar.vel != null && Number.isFinite(bar.vel) && bar.vel > 0) ? bar.vel : 0.3;
          const bx = judgmentX + (bar.time - currentTime) * bv * svHScale;
          if (bx < playX0 - 4 || bx > playX1 + 4) continue;
          /* NCシンバルが鳴る小節線は太く色を変えて強調 */
          const major = showNcCymbal && bar.major;
          ctx.strokeStyle = major ? TAIKO_COLORS.ncBar : "rgba(255,255,255,0.28)";
          ctx.lineWidth = major ? 2 : 1;
          const px = Math.round(bx) + 0.5;
          ctx.beginPath(); ctx.moveTo(px, yTop); ctx.lineTo(px, yTop + laneH); ctx.stroke();
        }
      }
      /* ゲーム画面表示: 判定枠（受け口）。ノーツより先に描いて背面にする */
      if (svMode) {
        const kiaiGlowAlpha = highlightKiai
          ? taikoKiaiGlowAlphaAt(diff.marks, currentTime)
          : 0;
        if (kiaiGlowAlpha > 0) {
          drawTaikoKiaiGlow(
            ctx,
            judgmentX,
            yMid,
            yTop,
            laneH,
            bigR,
            playX0,
            playX1,
            kiaiGlowAlpha
          );
        }
        ctx.beginPath();
        ctx.arc(judgmentX, yMid, bigR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath();
        ctx.arc(judgmentX, yMid, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.stroke();
      }
      /* 時刻の降順で描く＝時間的に先（判定ラインに近い側）のノーツが後から塗られて前面に来る。
         osu! と同じく「早いオブジェクトが遅いオブジェクトを隠す」。
         連打と円で描画パスを分けると、時刻に関係なく円が前面になってしまうので分けない。 */
      /* 等速表示では右端より未来のノーツを二分探索で丸ごと飛ばす。
         従来は常に曲末から逆走査していたため、曲前半ほど全譜面の大半を
         毎フレーム読み飛ばしていた。SV表示は時刻順と画面順が一致しないため従来どおり。 */
      const firstDrawIndex = svMode
        ? notes.length - 1
        : upperBoundTaikoNoteTime(notes, currentTime + futCut) - 1;
      for (let k = firstDrawIndex; k >= 0; k--) {
        const note = notes[k];
        const dt = note.time - currentTime;            // head
        const isDen = note.kind === "denden";
        const isRoll = note.kind === "drumroll" || note.kind === "denden";
        const endT = note.endTime != null ? note.endTime : note.time;
        const isGameSwell = svMode && isDen;
        let x, x2;
        if (svMode) {
          /* ゲーム画面表示: ノーツごとの速度(SV/BPM/SliderMultiplier)で位置を決める。
             SV により画面上の順序が入れ替わり得るので、時間による打ち切りはせず
             各ノーツの x 範囲で可視判定する。 */
          const vel = (note.vel != null && Number.isFinite(note.vel) && note.vel > 0) ? note.vel : 0.3;
          if (isDen) {
            /* stable の表示寿命 L(S) と共通プリエンプト P から予告開始を決める。
               接近中の位置は通常ノーツと同じ note.vel（SliderMultiplier / SV / BPM）で
               求め、S で判定枠へ到達した後は終了までそこに留める。
               P<L(S) の場合は、画面内へ入っていても S-P まで透明のまま。 */
            if (currentTime >= endT + TAIKO_SWELL_FADE_OUT_MS) continue;
            const stableLifetime = Number.isFinite(note.stableSwellLifetimeMs)
              ? Math.max(0, note.stableSwellLifetimeMs)
              : Math.max(0, (playX1 - judgmentX) / (vel * svHScale));
            const stablePreempt = Number.isFinite(note.stableSwellPreemptMs)
              ? Math.max(0, note.stableSwellPreemptMs)
              : stableLifetime;
            const warningStart = note.time - Math.min(stablePreempt, stableLifetime);
            if (currentTime < warningStart) continue;
            x = judgmentX + Math.max(0, dt) * vel * svHScale;
            x2 = x;
          } else {
            x  = judgmentX + dt * vel * svHScale;
            x2 = judgmentX + (endT - currentTime) * vel * svHScale;
          }
          const lo = Math.min(x, x2), hi = Math.max(x, x2);
          if (hi < playX0 - 60 || lo > playX1 + 60) continue;
        } else {
          if (dt > futCut) continue;                   // head が右外 → まだ未来
          // これ以上前は、最長連打でも視界に届かない → 打ち切り
          if (dt < pastCut - diff._maxRollMs) break;
          // 可視判定: 連打は尾(endTime)で判定。head が左外でも尾が見えていれば描く
          const endDt = isRoll ? (endT - currentTime) : dt;
          if (endDt < pastCut) continue;               // 全体が左外
          x  = judgmentX + dt * pxPerMs;
          x2 = judgmentX + (endT - currentTime) * pxPerMs;
        }
        const r = (isRoll && isDen) ? radius : (note.big ? bigR : radius);
        const selected = isSelected ? !!isSelected(note) : false;

        /* 選択中はピンクのモヤ（osu!エディタの選択表示に合わせる）。
           ノーツ本体より先に描いて、はみ出した分だけが縁に残るようにする。 */
        if (selected) {
          ctx.save();
          ctx.shadowColor = TAIKO_COLORS.selGlow;
          ctx.shadowBlur = Math.max(10, r * 0.9);
          ctx.strokeStyle = TAIKO_COLORS.selRing;
          ctx.lineWidth = 3;
          for (let g = 0; g < 2; g++) {   // 2度描いて濃くする
            if (isRoll && !isGameSwell) { taikoCapsule(ctx, x, x2, yMid, r + 2); ctx.stroke(); }
            else { ctx.beginPath(); ctx.arc(x, yMid, r + 2, 0, Math.PI * 2); ctx.stroke(); }
          }
          ctx.restore();
        }

        if (isGameSwell) {
          drawTaikoGameSwell(ctx, x, yMid, r, laneH, note, currentTime);
        } else if (isRoll) {
          const transparentRoll = transparentSliders && !isDen;
          ctx.fillStyle = isDen ? TAIKO_COLORS.denden : TAIKO_COLORS.roll; // スピナーは薄いグレー
          taikoCapsule(ctx, x, x2, yMid, r);
          if (transparentRoll) {
            ctx.strokeStyle = TAIKO_COLORS.rollOpaque;
            ctx.lineWidth = Math.max(1.5, r * 0.1);
            ctx.stroke();
          } else {
            ctx.fill();
          }
          if (isDen) {
            ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5;
            taikoCapsule(ctx, x, x2, yMid, r); ctx.stroke();
          }
          /* 連打のティック（風船には無い）。時刻→位置は head/tail の線形補間で求めるので
             等速表示でも SV 適用表示でも同じコードで正しい位置になる。 */
          if (!isDen && note.tickSpacing > 0) {
            const dur = endT - note.time;
            if (dur > 0) {
              const times = taikoDrumRollTickTimes(note);
              /* ティックの点の大きさは lazer 準拠。
                 TickPiece の tick_size=0.35（ノーツ径に対する比）＝ ノーツ半径 r × 0.35。
                 r は Finisher連打で bigR(=radius×1.5) になるので、IsStrong(強連打)の
                 大小はここに自動で反映される（lazer の STRONG_SCALE≒1.538 に相当）。
                 出典: osu.Game.Rulesets.Taiko/Skinning/Default/TickPiece.cs
                       osu.Game.Rulesets.Taiko/Objects/Drawables/DrawableDrumRollTick.cs */
              const tickR = Math.max(1.2, r * (transparentRoll ? 0.06 : 0.35));
              ctx.fillStyle = TAIKO_COLORS.rollTick;
              if (transparentRoll) {
                ctx.strokeStyle = "rgba(255,255,255,0.7)";
                ctx.lineWidth = 1;
              }
              for (let ti = 0; ti < times.length; ti++) {
                const tx = x + ((times[ti] - note.time) / dur) * (x2 - x);
                if (tx < playX0 - tickR || tx > playX1 + tickR) continue;
                ctx.beginPath();
                ctx.arc(tx, yMid, tickR, 0, Math.PI * 2);
                if (transparentRoll) ctx.stroke();
                else ctx.fill();
              }
            }
          }
          /* 始点・終点の円（TaikoEditor 風）。本体とティックの上に重ねて、
             どこが頭でどこが尾かひと目で分かるようにする。 */
          ctx.fillStyle = isDen ? TAIKO_COLORS.denden
            : transparentRoll ? TAIKO_COLORS.rollOpaque : TAIKO_COLORS.roll;
          ctx.strokeStyle = transparentRoll ? "rgb(255,255,255)" : "rgba(255,255,255,0.9)";
          ctx.lineWidth = 2;
          // 透過時は始点だけを塗り、終点は本体の枠線をそのまま見せる。
          for (let cap = 0; cap < (transparentRoll ? 1 : 2); cap++) {
            const cx = cap === 0 ? x : x2;
            if (cx < playX0 - r || cx > playX1 + r) continue;
            ctx.beginPath();
            ctx.arc(cx, yMid, r, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          }
          /* 風船は必要打数を本体の中央に出す。
             長い風船で端が画面外でも読めるよう、表示位置は画面内に寄せる。 */
          if (isDen && note.requiredHits > 0) {
            const left = Math.min(x, x2), right = Math.max(x, x2);
            /* 端の円に重ならないよう本体の内側に置きたいが、短い風船では
               内側の余地が無い。その時は素直に中央へ置く
               （内側だけで判定すると短い風船で数字が出なくなる）。 */
            const inL = left + r, inR = right - r;
            let tx = inR > inL ? (inL + inR) / 2 : (left + right) / 2;
            /* 長い風船で端が画面外でも読めるよう、見えている範囲に寄せる */
            const visL = Math.max(left, playX0 + 3);
            const visR = Math.min(right, playX1 - 3);
            if (visR >= visL) {
              tx = Math.max(visL, Math.min(visR, tx));
              ctx.save();
              ctx.font = "bold " + Math.max(9, Math.round(r * 1.05)) + "px sans-serif";
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillStyle = TAIKO_COLORS.dendenText;
              ctx.fillText(String(note.requiredHits), tx, yMid + 0.5);
              ctx.restore();
            }
          }
        } else {
          ctx.beginPath();
          ctx.fillStyle = note.kind === "kat" ? TAIKO_COLORS.kat : TAIKO_COLORS.don;
          ctx.arc(x, yMid, r, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
        }
        /* クリック判定用に、実際に描いた位置と大きさを残す
           （描画順のまま push するので、後ろの要素ほど前面） */
        let hit = hits[hitCount];
        if (!hit) {
          hit = {};
          hits[hitCount] = hit;
        }
        hit.note = note;
        hit.diff = diff;
        hit.lane = i;
        hit.x = x;
        hit.x2 = isRoll ? x2 : x;
        hit.y = yMid;
        hit.r = r;
        hitCount++;
      }
    }
  }
  ctx.restore();

  // 判定ライン（中央・全高）
  ctx.strokeStyle = "#ff5a5a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(judgmentX, 0); ctx.lineTo(judgmentX, cssH); ctx.stroke();

  // レーン区切り線（全幅）
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    const y = topPad + i * laneH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cssW, y); ctx.stroke();
  }

  // 左の難易度名・Timing Point情報カラム（ノーツの上に被せる）
  ctx.fillStyle = "#16161b";
  ctx.fillRect(0, 0, labelW, cssH);
  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 1;
  if (timingInfoW > 0) {
    ctx.beginPath(); ctx.moveTo(diffLabelW, 0); ctx.lineTo(diffLabelW, cssH); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(labelW, 0); ctx.lineTo(labelW, cssH); ctx.stroke();
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const labelLineH = 13;               // 折り返し1行の高さ
  for (let i = 0; i < n; i++) {
    const yTop = topPad + i * laneH;
    const yMid = yTop + laneH / 2;
    const isSound = i === soundLane;
    if (isSound) {
      // 効果音を鳴らすレーンを強調
      ctx.fillStyle = "rgba(110,231,154,0.14)";
      ctx.fillRect(0, yTop, labelW, laneH);
      ctx.fillStyle = "#6ee79a";
      ctx.fillRect(0, yTop, 3, laneH);
      ctx.beginPath(); ctx.arc(diffLabelW - 8, yMid, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = isSound ? "#dffbe8" : "#cfcfe0";
    /* テキストは x=10 から。右側は余白（効果音レーンは丸印ぶん多め）を空ける。
       レーンの高さに収まる行数だけ折り返し、縦中央に配置する。 */
    const textMaxW = diffLabelW - 10 - (isSound ? 14 : 6);
    const maxLines = Math.max(1, Math.floor((laneH - 2) / labelLineH));
    const labelText = diffs[i].name || "Diff " + (i + 1);
    const labelKey = labelText + "|" + textMaxW + "|" + maxLines;
    let labelCache = diffs[i]._spreadLabelCache;
    if (!labelCache || labelCache.key !== labelKey) {
      labelCache = { key: labelKey, lines: taikoWrapLines(ctx, labelText, textMaxW, maxLines) };
      diffs[i]._spreadLabelCache = labelCache;
    }
    const lines = labelCache.lines;
    let ty = yMid - ((lines.length - 1) * labelLineH) / 2;
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], 10, ty);
      ty += labelLineH;
    }

    if (timingInfoW > 0) {
      const info = getTaikoTimingInfoAt(diffs[i].timingInfoPoints, currentTime);
      const compactLineH = Math.max(7, Math.min(14, (laneH - 2) / 3));
      const infoFontPx = Math.max(7, Math.min(12, Math.floor(compactLineH - 1)));
      const infoLineH = Math.max(
        infoFontPx,
        Math.min(16, (laneH - infoFontPx - 2) / 2)
      );
      const tx = diffLabelW + timingInfoW / 2;
      let infoY = yMid - infoLineH;
      ctx.font = infoFontPx + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff7777";
      ctx.fillText(info ? formatTaikoTimingBpm(info.bpm) : "—", tx, infoY);
      infoY += infoLineH;
      ctx.fillStyle = "#75df91";
      ctx.fillText(info && info.sv != null ? "x" + info.sv.toFixed(2) : "—", tx, infoY);
      infoY += infoLineH;
      ctx.fillStyle = "#a799ff";
      ctx.fillText(info && info.volume != null ? Math.round(info.volume) + "%" : "—", tx, infoY);
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
    }
  }

  if (!playable) {
    ctx.fillStyle = "#777"; ctx.font = "12px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(opts.idleText || "osu! を再生すると流れます", (labelW + cssW) / 2, cssH - 6);
  }

  /* ドラッグ中の選択範囲（ラバーバンド）。ノーツより後＝最前面に描く */
  const mq = opts.marquee;
  if (mq) {
    const mx = Math.min(mq.x0, mq.x1), my = Math.min(mq.y0, mq.y1);
    const mw = Math.abs(mq.x1 - mq.x0), mh = Math.abs(mq.y1 - mq.y0);
    ctx.fillStyle = "rgba(255,105,215,0.13)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = TAIKO_COLORS.selRing; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(mx) + 0.5, Math.round(my) + 0.5, Math.round(mw), Math.round(mh));
  }

  /* クリック判定用のジオメトリを保存（レーン選択・ノーツ選択の両方で使う）。
     playX0 = プレイフィールドの左端。ここより左は難易度名のラベル列で、
     ノーツの上に被せて描いている＝見えていないので、ノーツ判定から除外させる。 */
  hits.length = hitCount;
  spreadGeom.topPad = topPad;
  spreadGeom.laneH = laneH;
  spreadGeom.n = n;
  spreadGeom.hits = hits;
  spreadGeom.playX0 = playX0;
  canvas.__spreadGeom = spreadGeom;
}
