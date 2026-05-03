function msToTimestamp(ms) {
  if (ms < 0) ms = 0;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(millis).padStart(3, "0")}`;
}

function formatDuration(ms) {
  return msToTimestamp(ms);
}

function getDifficultyName(fileName) {
  const match = fileName.match(/\[([^\[\]]+)\]\.osu$/i);

  if (match) {
    return `[${match[1]}]`;
  }

  return fileName;
}

/** 表示整形関数 */
function formatMultipleResults(results, t, showClap, showWhistle) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  // Hybrid setではない場合：今まで通り、サマリー表を表示
  if (!hasMultipleModes(results)) {
    const sortedResults = sortResultsForDisplay(results);
    const lines = [];

    lines.push(formatClapWhistleSummaryTable(sortedResults, t));
    lines.push("");
    lines.push("==============================");
    lines.push("");

    lines.push(
      sortedResults
        .map(result => formatResult(result, t, showClap, showWhistle))
        .join("\n\n==============================\n\n")
    );

    return lines.join("\n");
  }

  // Hybrid setの場合だけ：modeごとに分ける
  const lines = [];

  for (const [mode, group] of groupByMode(results)) {
    const sortedGroup = sortResultsForDisplay(group);

    lines.push(`[${getModeName(mode)}]`);
    lines.push("");

    lines.push(formatClapWhistleSummaryTable(sortedGroup, t));
    lines.push("");
    lines.push("==============================");
    lines.push("");

    lines.push(
      sortedGroup
        .map(result => formatResult(result, t, showClap, showWhistle))
        .join("\n\n==============================\n\n")
    );

    lines.push("");
    lines.push("==============================");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatClapWhistleSummaryTable(results, t) {
  const diffWidth = Math.max(
    10,
    ...results.map(result => getDifficultyName(result.fileName).length)
  );

  const whistleHeader = t("whistleOnly");
  const clapHeader = t("clapOnly");
  const bothHeader = t("both");

  const lines = [];

  lines.push(
    `${"Diff".padEnd(diffWidth)} | ${whistleHeader.padStart(12)} | ${clapHeader.padStart(12)} | ${bothHeader.padStart(12)}`
  );

  lines.push(
    `${"-".repeat(diffWidth)}-+-${"-".repeat(12)}-+-${"-".repeat(12)}-+-${"-".repeat(12)}`
  );

  for (const result of results) {
    lines.push(
      `${getDifficultyName(result.fileName).padEnd(diffWidth)} | ` +
      `${String(result.counts.whistle).padStart(12)} | ` +
      `${String(result.counts.clap).padStart(12)} | ` +
      `${String(result.counts.both).padStart(12)}`
    );
  }

  return lines.join("\n");
}

function formatResult(result, t, showClap, showWhistle) {
  const { fileName, counts, times } = result;

  const lines = [];

  lines.push(`${getDifficultyName(fileName)}`);
  lines.push("");

  lines.push(...formatTimestampList(t("timestampsBoth"), times.both, t));
  lines.push("");

  if (!showClap || showClap.checked) {
    lines.push(...formatTimestampList(t("timestampsClap"), times.clap, t));
    lines.push("");
  }

  if (!showWhistle || showWhistle.checked) {
    lines.push(...formatTimestampList(t("timestampsWhistle"), times.whistle, t));
    lines.push("");
  }

  return lines.join("\n");
}

function formatTimestampList(label, msList, t) {
  if (!msList.length) {
    return [`${label}: (${t("none")})`];
  }

  const lines = [`${label}:`];
  const sorted = [...msList].sort((a, b) => a - b);

  for (const ms of sorted) {
    lines.push(msToTimestamp(ms));
  }

  return lines;
}

/** 1ms Offset系の表示関数 */
function formatMultipleShiftResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatShiftResult, t);
}

function formatShiftResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.results.length) {
    lines.push(t("noOffset"));
    return lines.join("\n");
  }

  for (const item of result.results) {
    const sign = item.diff > 0 ? "+" : "-";

    const cls =
      item.snap !== 1
        ? "result-error"
        : "result-warn";

    lines.push(
      `<span class="${cls}">${msToTimestamp(item.time)} | ${sign}${Math.abs(item.diff)} ms  [1/${item.snap} ${t("snap")}]</span>`
    );
  }

  return lines.join("\n");
}

/** Double SV系の表示関数 */
function formatMultipleDoubleSvResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatDoubleSvResult, t);
}

function formatDoubleSvResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.groups.length) {
    lines.push(t("noDoubleSv"));
    return lines.join("\n");
  }

  for (const group of result.groups) {
    for (const item of group.items) {
      lines.push(`${msToTimestamp(item.time)} | SV ${formatSvValue(item.beatLength)} | vol ${item.volume}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** Kiai Compare系の表示関数 */
function formatKiaiCompareResult(results, t) {
  const lines = [];

  if (!results.length) {
    return t("noOsuFiles");
  }

  lines.push(t("kiaiTotalDuration"));
  lines.push("");

  for (const result of results) {
    lines.push(`  ${getDifficultyName(result.fileName)} : ${formatDuration(result.totalDuration)}`);

    if (result.hasImplicitKiaiEnd) {
      lines.push(`    ${t("warningImplicitKiaiEnd")}`);
    }
  }

  lines.push("");

  if (results.length < 2) {
    lines.push(t("kiaiMismatchSections"));
    lines.push(`  ${t("needTwoDiffs")}`);
    return lines.join("\n");
  }

  const compared = compareKiaiResults(results);

  lines.push(t("kiaiMismatchSections"));
  lines.push("");

  if (!compared.mismatchSections.length) {
    lines.push(`  ${t("noKiaiMismatch")}`);
    return lines.join("\n");
  }

  for (const section of compared.mismatchSections) {
    const on = section.states
      .filter(s => s.kiai)
      .map(s => getDifficultyName(s.fileName));

    const off = section.states
      .filter(s => !s.kiai)
      .map(s => getDifficultyName(s.fileName));

    lines.push(`  ${msToTimestamp(section.start)} - ${msToTimestamp(section.end)}`);
    lines.push(`    ON : ${on.join(", ") || `(${t("none")})`}`);
    lines.push(`    OFF: ${off.join(", ") || `(${t("none")})`}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** Kiai Snap系の表示関数 */
function formatMultipleKiaiSnapResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatKiaiSnapResult, t);
}

function formatKiaiSnapResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.results.length) {
    lines.push(t("noKiaiSnap"));
    return lines.join("\n");
  }

  for (const item of result.results) {
    const diffText =
      item.diff === null
        ? ""
        : ` | ${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`;

    lines.push(
      `${msToTimestamp(item.time)} | Kiai ${item.type} | ${item.snap} snap${diffText}`
    );
  }

  return lines.join("\n");
}

/** SV volume */
function formatMultipleSvVolumeResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatSvVolumeResult, t);
}

function formatSvVolumeResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.results.length) {
    lines.push(t("noSvVolumeIssues"));
    return lines.join("\n");
  }

  for (const item of result.results) {
    const sign = item.diff >= 0 ? "+" : "-";

    lines.push(
      `${msToTimestamp(item.time)} | hitobject ${msToTimestamp(item.hitTime)} | ${sign}${Math.abs(item.diff)} ms | vol ${item.oldVolume} -> ${item.newVolume}`
    );
  }

  return lines.join("\n");
}

/** 赤線&緑線 */
function formatMultipleRedGreenMatchResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatRedGreenMatchResult, t);
}

function formatRedGreenMatchResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.results.length) {
    lines.push(t("noRedGreenMismatch"));
    return lines.join("\n");
  }

  for (const item of result.results) {
    lines.push(`${msToTimestamp(item.time)}`);

    if (item.volumeMismatch) {
      lines.push(`  ${t("volumeMismatch")} | ${t("red")} ${item.redVolume}% / ${t("green")} ${item.greenVolume}%`);
    }

    if (item.kiaiMismatch) {
      lines.push(`  ${t("kiaiMismatch")} | red ${formatKiaiState(item.redKiai)} / green ${formatKiaiState(item.greenKiai)}`);
    }

    if (item.sampleSetMismatch) {
      lines.push(
        `  ${t("sampleSetMismatch")} | ${t("red")} ${item.redSampleSet} (${getSampleSetName(item.redSampleSet)}) / ${t("green")} ${item.greenSampleSet} (${getSampleSetName(item.greenSampleSet)})`
      );
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatKiaiState(enabled) {
  return enabled ? "ON" : "OFF";
}

/** sampleSet */
function formatMultipleSampleSetResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatSampleSetResult, t);
}

function formatSampleSetResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  if (!result.timingIssues.length && !result.objectIssues.length) {
    lines.push(t("noSampleSetIssues"));
    return lines.join("\n");
  }

  if (result.timingIssues.length) {
    lines.push(t("timingPoints"));
    for (const item of result.timingIssues) {
      lines.push(
        `${msToTimestamp(item.time)} | ${item.lineType} | sampleSet ${item.sampleSet} (${item.sampleSetName})`
      );
    }
    lines.push("");
  }

  if (result.objectIssues.length) {
    lines.push(t("hitObjects"));
    for (const item of result.objectIssues) {
      lines.push(
        `${msToTimestamp(item.time)} | ${item.objectType} | ${item.field} ${item.sampleSet} (${item.sampleSetName})`
      );
    }
  }

  return lines.join("\n").trimEnd();
}

/** modeのグループ関数 */
function hasMultipleModes(results) {
  const modes = new Set(results.map(result => result.mode ?? 0));
  return modes.size >= 2;
}

function groupByMode(results) {
  const groups = new Map();

  for (const result of results) {
    const mode = result.mode ?? 0;

    if (!groups.has(mode)) {
      groups.set(mode, []);
    }

    groups.get(mode).push(result);
  }

  return groups;
}

function getModeName(mode) {
  switch (mode) {
    case 0: return "Standard";
    case 1: return "Taiko";
    case 2: return "Catch";
    case 3: return "Mania";
    default: return `Mode ${mode}`;
  }
}

function formatByModeIfHybrid(results, formatter, t) {
  if (!hasMultipleModes(results)) {
    return sortResultsForDisplay(results)
      .map(result => formatter(result, t))
      .join("\n\n==============================\n\n");
  }

  const lines = [];

  for (const [mode, group] of groupByMode(results)) {
    lines.push(`[${getModeName(mode)}]`);
    lines.push("");

    lines.push(
      sortResultsForDisplay(group)
        .map(result => formatter(result, t))
        .join("\n\n==============================\n\n")
    );

    lines.push("");
    lines.push("==============================");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** Taiko用ソート関数 */
function sortResultsForDisplay(results) {
  return [...results].sort((a, b) => {
    const modeA = a.mode ?? 0;
    const modeB = b.mode ?? 0;

    // modeが違う場合は既存順を維持
    if (modeA !== modeB) return 0;

    // Taiko以外は既存順を維持
    if (modeA !== 1) return 0;

    return getTaikoDifficultySortKey(a.fileName) - getTaikoDifficultySortKey(b.fileName);
  });
}

function getTaikoDifficultySortKey(fileName) {
  const name = normalizeDifficultyName(getDifficultyName(fileName));

  // Guest diff: "___'s Oni" → "Oni" を拾う
  if (/\bkantan\b/.test(name)) return 10;
  if (/\bfutsuu\b/.test(name)) return 20;
  if (/\bmuzukashii\b/.test(name)) return 30;

  // Hell Oni は Inner Oni より後ろ
  if (/\bhell\s+oni\b/.test(name)) return 60;

  // Inner / Ura / Extra / Another など + Oni
  if (/\b(inner|ura)\s+oni\b/.test(name)) return 50;

  // 通常 Oni
  if (/\boni\b/.test(name)) return 40;

  // それ以外のカスタム難易度
  return 1000;
}

function normalizeDifficultyName(name) {
  return String(name)
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** HTMLエスケープ関数 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
