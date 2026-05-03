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

  const lines = [];

  lines.push(formatClapWhistleSummaryTable(results, t));
  lines.push("");
  lines.push("==============================");
  lines.push("");

  lines.push(
    results
      .map(result => formatResult(result, t, showClap, showWhistle))
      .join("\n\n==============================\n\n")
  );

  return lines.join("\n");
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

  return results
    .map(result => formatShiftResult(result, t))
    .join("\n\n==============================\n\n");
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

  return results
    .map(result => formatDoubleSvResult(result, t))
    .join("\n\n==============================\n\n");
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

  return results
    .map(result => formatKiaiSnapResult(result, t))
    .join("\n\n==============================\n\n");
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

  return results
    .map(result => formatSvVolumeResult(result, t))
    .join("\n\n==============================\n\n");
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

  return results
    .map(result => formatRedGreenMatchResult(result, t))
    .join("\n\n==============================\n\n");
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

  return results
    .map(result => formatSampleSetResult(result, t))
    .join("\n\n==============================\n\n");
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

/** HTMLエスケープ関数 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
