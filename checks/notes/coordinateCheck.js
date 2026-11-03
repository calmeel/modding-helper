function runCoordinateCheck(text, fileName) {
  const counts = { center: 0, other: 0 };
  const issues = [];

  for (const line of parseHitObjects(text)) {
    const parts = line.split(",");
    if (parts.length < 4) continue;
    const [x, y, time, type] = parts.slice(0, 4).map(value =>
      value.trim() === "" ? NaN : Number(value)
    );
    if (![x, y, time, type].every(Number.isFinite)) continue;
    // Only circles and slider starts; spinner coordinates and slider paths
    // are outside the scope of this check. New-combo/colour bits are ignored.
    const objectType = (type & 2) !== 0 ? "slider" : (type & 1) !== 0 ? "note" : null;
    if (!objectType) continue;

    if (x === 256 && y === 192) {
      counts.center++;
    } else {
      counts.other++;
      issues.push({ time, objectType, x, y });
    }
  }

  issues.sort((a, b) => a.time - b.time);
  return { fileName, counts, issues };
}
