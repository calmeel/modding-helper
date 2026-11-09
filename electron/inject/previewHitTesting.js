// 描画ジオメトリに対する点・矩形の当たり判定。選択状態は呼び出し側が所有する。
function createElectronPreviewHitTesting(spCanvas) {
  /* キャンバス座標（CSS px）に変換 */
  var spCanvasPos = function (e) {
    var rect = spCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect: rect };
  };
  /* 点とノーツ（円 or カプセル）の当たり判定。線分までの距離で見る */
  var spHitOne = function (h, px, py) {
    var dy = py - h.y;
    var lo = Math.min(h.x, h.x2), hi = Math.max(h.x, h.x2);
    var dx = px < lo ? px - lo : (px > hi ? px - hi : 0); // 線分内なら水平距離0
    return dx * dx + dy * dy <= h.r * h.r;
  };
  /* その座標にあるノーツ。描画順の後ろ＝前面から探す。
     難易度名のラベル列（playX0 より左）はノーツの上に被せて描いていて
     ノーツは見えていないので、そこのクリックはノーツ判定の対象外にする
     （でないとラベルを押したのにノーツ選択に吸われる）。 */
  var spHitTest = function (px, py) {
    var geom = spCanvas.__spreadGeom;
    var hits = geom && geom.hits;
    if (!hits) return null;
    if (geom.playX0 != null && px < geom.playX0) return null;
    for (var i = hits.length - 1; i >= 0; i--) {
      if (spHitOne(hits[i], px, py)) return hits[i];
    }
    return null;
  };
  /* 矩形に触れているノーツを列挙（diff 指定時はその難易度に限る） */
  var spHitsInRect = function (x0, y0, x1, y1, diff) {
    var geom = spCanvas.__spreadGeom;
    var hits = geom && geom.hits;
    var out = [];
    if (!hits) return out;
    var lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    var top = Math.min(y0, y1), bot = Math.max(y0, y1);
    /* ラベル列に隠れている部分は選択対象にしない（クリック判定と同じ理由） */
    if (geom.playX0 != null) { lo = Math.max(lo, geom.playX0); if (hi < lo) return out; }
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      if (diff && h.diff !== diff) continue;
      var nl = Math.min(h.x, h.x2) - h.r, nr = Math.max(h.x, h.x2) + h.r;
      if (nr < lo || nl > hi) continue;            // 横が重ならない
      if (h.y + h.r < top || h.y - h.r > bot) continue; // 縦が重ならない
      out.push(h);
    }
    return out;
  };

  return { point: spCanvasPos, hitTest: spHitTest, hitsInRect: spHitsInRect };
}
