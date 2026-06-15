function runDoubleSvCheck(text, fileName, options = {}) {
  const maxGapMs = options.maxGapMs ?? 2;

  const svLines = parseInheritedTimingPoints(text);
  const groups = detectDoubleSvGroups(svLines, maxGapMs);

  return {
    fileName,
    groups
  };
}

function detectDoubleSvGroups(svLines, maxGapMs) {
  if (!svLines.length) return [];

  const groups = [];
  let currentGroup = [svLines[0]];

  for (let i = 1; i < svLines.length; i++) {
    const cur = svLines[i];
    const prev = currentGroup[currentGroup.length - 1];
    const diff = cur.time - prev.time;

    const ok = diff >= 0 && diff <= maxGapMs;

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
