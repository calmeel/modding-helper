// 太鼓プレビューの進捗バー描画。
// 下部の進捗バー（音源長を 100% とした3段の帯）。
//   上段: BPM(赤)
//   中段: BPM(赤) + SV(緑、赤より前面)
//   下段: Bookmark(青) + プレビューポイント(黄)
// 中段と下段の境界を白い時間軸とし、その周囲に kiai のオレンジ帯を表示する。
function paintTaikoProgressStatic(canvas, marks, durationMs, forcedCssW, forcedCssH, forcedDpr) {
  const wrap = canvas.parentElement || canvas;
  const cssW = forcedCssW || Math.max(40, canvas.clientWidth || wrap.clientWidth || 300);
  const cssH = forcedCssH || Math.max(12, canvas.clientHeight || 27);
  const dpr = forcedDpr || window.devicePixelRatio || 1;
  if (canvas.width  !== Math.round(cssW * dpr)) canvas.width  = Math.round(cssW * dpr);
  if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#15151a";
  ctx.fillRect(0, 0, cssW, cssH);

  const dur = durationMs > 0 ? durationMs : 0;
  const xOf = (t) => (dur > 0 ? Math.max(0, Math.min(cssW, (t / dur) * cssW)) : 0);
  const upperY = Math.round(cssH / 3) + 0.5;       // 上段と中段の境界
  const axisY = Math.round(cssH * 2 / 3) + 0.5;    // 中段と下段の境界（時間軸）
  const kiaiHalf = Math.max(2, Math.round(cssH / 6)); // kiai 帯の上下の厚み
  const vseg = (t, color, w, y0, y1) => {
    /* CSS座標の +0.5 はDPI 125%/150%で物理ピクセル中央から外れるため、
       物理ピクセルへ変換した同一の整数矩形として描く。 */
    const deviceWidth = Math.max(1, Math.round((w || 1) * dpr));
    const deviceLeft = Math.round(xOf(t) * dpr - deviceWidth / 2);
    const deviceTop = Math.round(y0 * dpr);
    const deviceBottom = Math.round(y1 * dpr);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.max(0, Math.min(canvas.width - deviceWidth, deviceLeft)),
      deviceTop,
      deviceWidth,
      Math.max(1, deviceBottom - deviceTop)
    );
    ctx.restore();
  };

  // kiai: 中段と下段の境界線の周囲だけをオレンジで塗る（全高は塗らない）
  if (dur > 0 && marks && marks.kiai) {
    ctx.fillStyle = "rgba(245,150,40,0.55)";
    for (const k of marks.kiai) {
      const s = xOf(k.start);
      const e = xOf(k.end == null ? dur : k.end);
      if (e > s) ctx.fillRect(s, axisY - kiaiHalf, Math.max(1, e - s), kiaiHalf * 2);
    }
  }

  // 上段と中段の境界線
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, upperY); ctx.lineTo(cssW, upperY); ctx.stroke();

  // 中段と下段の間の白い細線（時間軸）
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, axisY); ctx.lineTo(cssW, axisY); ctx.stroke();

  if (dur > 0 && marks) {
    // BPM(赤)は上段から中段まで。SV(緑)を後から中段に描き、重なり時は前面にする。
    if (marks.bpm) for (const t of marks.bpm) {
      vseg(t, "rgba(240,70,70,1)", 1, 1, axisY);
    }
    if (marks.sv) for (const t of marks.sv) {
      vseg(t, "rgba(80,220,120,1)", 1, upperY, axisY);
    }
    // 下段: Bookmark(青) / プレビューポイント(黄)
    if (marks.bookmarks) for (const t of marks.bookmarks) {
      vseg(t, "rgba(80,150,255,1)", 1, axisY, cssH - 1);
    }
    if (marks.preview != null) {
      vseg(marks.preview, "rgba(250,220,60,1)", 1, axisY, cssH - 1);
    }
  }

  ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

}

function drawTaikoProgressBar(canvas, marks, durationMs, curMs) {
  const wrap = canvas.parentElement || canvas;
  const cssW = Math.max(40, canvas.clientWidth || wrap.clientWidth || 300);
  const cssH = Math.max(12, canvas.clientHeight || wrap.clientHeight || 27);
  const dpr = window.devicePixelRatio || 1;
  const pixelW = Math.round(cssW * dpr);
  const pixelH = Math.round(cssH * dpr);
  if (canvas.width !== pixelW) canvas.width = pixelW;
  if (canvas.height !== pixelH) canvas.height = pixelH;

  const dur = durationMs > 0 ? durationMs : 0;
  let staticCache = canvas.__taikoProgressStatic;
  const canCache = typeof document !== "undefined" && document.createElement;
  if (canCache && (
    !staticCache ||
    staticCache.marks !== marks ||
    staticCache.duration !== dur ||
    staticCache.cssW !== cssW ||
    staticCache.cssH !== cssH ||
    staticCache.dpr !== dpr
  )) {
    const staticCanvas = document.createElement("canvas");
    staticCanvas.width = pixelW;
    staticCanvas.height = pixelH;
    paintTaikoProgressStatic(staticCanvas, marks, dur, cssW, cssH, dpr);
    staticCache = { canvas: staticCanvas, marks, duration: dur, cssW, cssH, dpr };
    canvas.__taikoProgressStatic = staticCache;
  }

  const ctx = canvas.getContext("2d");
  if (staticCache && staticCache.canvas) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.drawImage(
      staticCache.canvas,
      0,
      0,
      staticCache.canvas.width,
      staticCache.canvas.height,
      0,
      0,
      cssW,
      cssH
    );
  } else {
    paintTaikoProgressStatic(canvas, marks, dur);
  }

  // 再生位置（全高の白線）だけを毎回描く。
  if (dur > 0 && curMs != null && Number.isFinite(curMs)) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    const x = Math.round(Math.max(0, Math.min(cssW, (curMs / dur) * cssW))) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssH);
    ctx.stroke();
  }
}

