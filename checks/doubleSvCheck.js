function runDoubleSvCheck(text, fileName, options = {}) {
  const maxGapMs = options.maxGapMs ?? 2;
  const includeExactSame = options.includeExactSame ?? true;

  const svLines = parseInheritedTimingPoints(text);
  const groups = detectDoubleSvGroups(svLines, maxGapMs, includeExactSame);

  return {
    fileName,
    groups
  };
}

function detectDoubleSvGroups(svLines, maxGapMs, includeExactSame) {
  if (!svLines.length) return [];

  const groups = [];
  let currentGroup = [svLines[0]];

  for (let i = 1; i < svLines.length; i++) {
    const cur = svLines[i];
    const prev = currentGroup[currentGroup.length - 1];
    const diff = cur.time - prev.time;

    let ok = false;

    if (includeExactSame && diff >= 0 && diff <= maxGapMs) {
      ok = true;
    } else if (!includeExactSame && diff >= 1 && diff <= maxGapMs) {
      ok = true;
    }

    if (ok) {
      currentGroup.push(cur);
    } else {
      if (currentGroup.length >= 2) {
        groups.push({
          startTime: currentGroup[0].time,
          endTime: currentGroup[currentGroup.length - 1].time,
          items: [...currentGroup]
        });
      }

      currentGroup = [cur];
    }
  }

  if (currentGroup.length >= 2) {
    groups.push({
      startTime: currentGroup[0].time,
      endTime: currentGroup[currentGroup.length - 1].time,
      items: [...currentGroup]
    });
  }

  return groups;
}

function formatSvValue(beatLength) {
  if (beatLength === 0) return "N/A";

  const sv = -100 / beatLength;
  return Number.isFinite(sv) ? sv.toPrecision(6).replace(/\.?0+$/, "") : "N/A";
}