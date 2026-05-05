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
  if (!fileName) return "[Unknown]";

  const match = fileName.match(/\[([^\[\]]+)\]\.osu$/i);

  const name = match ? match[1] : fileName;

  return `<span class="diff-name">[${name}]</span>`;
}

function getDifficultyNameText(fileName) {
  if (!fileName) return "[Unknown]";

  const match = fileName.match(/\[([^\[\]]+)\]\.osu$/i);

  if (match) {
    return `[${match[1]}]`;
  }

  return fileName;
}

function getDifficultyName(fileName) {
  return `<span class="diff-name">${escapeHtml(getDifficultyNameText(fileName))}</span>`;
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

    lines.push(`<span class="mode-name">[${getModeName(mode)}]</span>`);
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
  const diffNames = results.map(result => getDifficultyNameText(result.fileName));

  const diffWidth = Math.max(
    10,
    ...diffNames.map(name => name.length)
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
    const plainName = getDifficultyNameText(result.fileName);
    const coloredName = getDifficultyName(result.fileName);

    const padding = " ".repeat(diffWidth - plainName.length);

    lines.push(
      `${coloredName}${padding} | ` +
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
    lines.push(formatTimestampLink(ms));
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

    const absDiff = Math.abs(item.diff);

    const cls =
      absDiff >= 2
        ? "result-error"
        : "";

    const targetText =
      item.target === "sliderTail"
        ? ` | ${t("sliderTail")}`
        : item.target === "spinnerTail"
          ? ` | ${t("spinnerTail")}`
          : "";

    lines.push(
      `<span class="${cls}">${formatTimestampLink(item.time)}${targetText} | ${sign}${Math.abs(item.diff)} ms  [1/${item.snap} ${t("snap")}]</span>`
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
      lines.push(`${formatTimestampLink(item.time)} | SV ${formatSvValue(item.beatLength)} | vol ${item.volume}`);
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

  results = sortResultsForDisplay(results);

  const diffNames = results.map(result => getDifficultyNameText(result.fileName));
  const diffWidth = Math.max(
    10,
    ...diffNames.map(name => name.length)
  );

  for (const result of results) {
    const plainName = getDifficultyNameText(result.fileName);
    const coloredName = getDifficultyName(result.fileName);
    const padding = " ".repeat(diffWidth - plainName.length);

    lines.push(
      `  ${coloredName}${padding} | ${formatDuration(result.totalDuration)}`
    );

    if (result.hasImplicitKiaiEnd) {
      lines.push(`  ${" ".repeat(diffWidth)} | ${t("warningImplicitKiaiEnd")}`);
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

    lines.push(`  ${formatTimestampLink(section.start)} - ${formatTimestampLink(section.end)}`);
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
      `${formatTimestampLink(item.time)} | Kiai ${item.type} | ${item.snap} snap${diffText}`
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
      `${formatTimestampLink(item.time)} | hitobject ${msToTimestamp(item.hitTime)} | ${sign}${Math.abs(item.diff)} ms | vol ${item.oldVolume} -> ${item.newVolume}`
    );
  }

  return lines.join("\n");
}

/** volume比較 */
function formatVolumeCompareResult(result, t) {
  const lines = [];

  if (!result) {
    return t("noFileLoaded");
  }

  if (result.needTwoDiffs) {
    lines.push(t("needTwoDiffs"));
    return lines.join("\n");
  }

  if (!result.results.length) {
    lines.push(t("noVolumeCompareMismatch"));
    return lines.join("\n");
  }

  for (const item of result.results) {
    lines.push(`${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)} | diff ${item.diff}%`);

    const sortedStates = sortResultsForDisplay(item.states);

    const diffNames = sortedStates.map(state => getDifficultyNameText(state.fileName));
    const diffWidth = Math.max(
      10,
      ...diffNames.map(name => name.length)
    );

    for (const state of sortedStates) {
      const plainName = getDifficultyNameText(state.fileName);
      const coloredName = getDifficultyName(state.fileName);
      const padding = " ".repeat(diffWidth - plainName.length);
      const volumeText = state.volume === null ? "N/A" : `${state.volume}%`;

      lines.push(`  ${coloredName}${padding} | ${volumeText}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
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
    lines.push(`${formatTimestampLink(item.time)}`);

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
        `${formatTimestampLink(item.time)} | ${item.lineType} | sampleSet ${item.sampleSet} (${item.sampleSetName})`
      );
    }
    lines.push("");
  }

  if (result.objectIssues.length) {
    lines.push(t("hitObjects"));
    for (const item of result.objectIssues) {
      lines.push(
        `${formatTimestampLink(item.time)} | ${item.objectType} | ${item.field} ${item.sampleSet} (${item.sampleSetName})`
      );
    }
  }

  return lines.join("\n").trimEnd();
}

/** Slider設定 */
function formatMultipleSliderSettingsResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const lines = [];

  lines.push(formatSliderSettingsSummaryTable(sortedResults, t));

  const issueResults = sortedResults.filter(result => result.issues.length > 0);

  lines.push("");
  lines.push("==============================");
  lines.push("");

  if (!issueResults.length) {
    lines.push(t("noSliderSettingsIssues"));
    return lines.join("\n");
  }

  lines.push(t("sliderSettingsIssueDetails"));
  lines.push("");

  lines.push(
    issueResults
      .map(result => formatSliderSettingsIssueDetail(result, t))
      .join("\n\n==============================\n\n")
  );

  return lines.join("\n").trimEnd();
}

function formatSliderSettingsSummaryTable(results, t) {
  const rows = results.map(result => {
    const diff = getDifficultyNameText(result.fileName);
    const ratio = `${(result.tripletRatio * 100).toFixed(1)}%`;
    const sm = `${formatSliderSettingValue(result.sliderMultiplier)} (${t("expected")}: 1.4)`;
    const str = `${formatSliderSettingValue(result.sliderTickRate)} (${t("expected")}: ${result.expectedTickRate})`;
    const status = result.issues.length ? t("warning") : "OK";

    return { result, diff, ratio, sm, str, status };
  });

  const headers = {
    diff: "Diff",
    ratio: t("tripletSnapRatio"),
    sm: "SliderMultiplier",
    str: "SliderTickRate",
    status: t("status")
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    ratio: Math.max(10, visibleWidth(headers.ratio), ...rows.map(r => visibleWidth(r.ratio))),
    sm: Math.max(16, visibleWidth(headers.sm), ...rows.map(r => visibleWidth(r.sm))),
    str: Math.max(14, visibleWidth(headers.str), ...rows.map(r => visibleWidth(r.str))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.status)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.ratio, widths.ratio)} | ` +
    `${padStartVisual(headers.sm, widths.sm)} | ` +
    `${padStartVisual(headers.str, widths.str)} | ` +
    `${padStartVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.ratio)}-+-` +
    `${"-".repeat(widths.sm)}-+-` +
    `${"-".repeat(widths.str)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const diffText = getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const statusPadded = padStartVisual(row.status, widths.status);
    const statusText = row.result.issues.length
      ? `<span class="result-warn">${escapeHtml(statusPadded)}</span>`
      : `<span class="ok">${escapeHtml(statusPadded)}</span>`;

    lines.push(
      `${diffText} | ` +
      `${padStartVisual(row.ratio, widths.ratio)} | ` +
      `${padStartVisual(row.sm, widths.sm)} | ` +
      `${padStartVisual(row.str, widths.str)} | ` +
      `${statusText}`
    );
  }

  return lines.join("\n");
}

function visibleWidth(text) {
  return [...String(text)].reduce((sum, ch) => {
    return sum + (/[^\x00-\xff]/.test(ch) ? 2 : 1);
  }, 0);
}

function padEndVisual(text, width) {
  const s = String(text);
  return s + " ".repeat(Math.max(0, width - visibleWidth(s)));
}

function padStartVisual(text, width) {
  const s = String(text);
  return " ".repeat(Math.max(0, width - visibleWidth(s))) + s;
}

function formatSliderSettingsIssueDetail(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  for (const issue of result.issues) {
    if (issue.type === "sliderMultiplier") {
      lines.push(
        `<span class="result-warn">${t("sliderMultiplierIssue")} | ${formatSliderSettingValue(issue.value)} (${t("expected")}: ${issue.expected})</span>`
      );
    }

    if (issue.type === "sliderTickRate") {
      lines.push(
        `<span class="result-warn">${t("sliderTickRateIssue")} | ${formatSliderSettingValue(issue.value)} (${t("expected")}: ${issue.expected})</span>`
      );
    }
  }

  return lines.join("\n");
}

function formatSliderSettingValue(value) {
  return value === null || value === undefined ? "N/A" : String(value);
}

/** プチフリ */
function formatMultipleEarlyNoteResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const lines = [];

  lines.push(formatEarlyNoteSummaryTable(sortedResults, t));

  const issueResults = sortedResults.filter(result =>
    result.level === "warn" || result.level === "error"
  );

  lines.push("");
  lines.push("==============================");
  lines.push("");

  if (!issueResults.length) {
    lines.push(t("noEarlyNoteIssues"));
    return lines.join("\n");
  }

  lines.push(t("earlyNoteIssueDetails"));
  lines.push("");

  lines.push(
    issueResults
      .map(result => formatEarlyNoteIssueDetail(result, t))
      .join("\n\n==============================\n\n")
  );

  return lines.join("\n").trimEnd();
}

function formatEarlyNoteSummaryTable(results, t) {
  const rows = results.map(result => {
    const diff = getDifficultyNameText(result.fileName);

    const firstNote =
      result.firstHitTime === null
        ? "N/A"
        : msToTimestamp(result.firstHitTime);

    const bpm =
      result.bpm === null
        ? "N/A"
        : result.bpm.toFixed(3);

    const sv =
      result.sv === null
        ? "N/A"
        : result.sv.toFixed(3);

    const visibleTime =
      result.visibleTime === null
        ? "N/A"
        : `${Math.round(result.visibleTime)} ms`;

    const position =
      result.positionPercent === null
        ? "N/A"
        : `${result.positionPercent.toFixed(1)}%`;

    const status =
      result.level === "error"
        ? "Error"
        : result.level === "warn"
          ? "Warning"
          : "OK";

    return {
      result,
      diff,
      firstNote,
      bpm,
      sv,
      visibleTime,
      position,
      status
    };
  });

  const headers = {
    diff: "Diff",
    firstNote: "First Note",
    bpm: "BPM",
    sv: "SV",
    visibleTime: "Visible",
    position: "Remain",
    status: "Status"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    firstNote: Math.max(10, visibleWidth(headers.firstNote), ...rows.map(r => visibleWidth(r.firstNote))),
    bpm: Math.max(7, visibleWidth(headers.bpm), ...rows.map(r => visibleWidth(r.bpm))),
    sv: Math.max(6, visibleWidth(headers.sv), ...rows.map(r => visibleWidth(r.sv))),
    visibleTime: Math.max(10, visibleWidth(headers.visibleTime), ...rows.map(r => visibleWidth(r.visibleTime))),
    position: Math.max(10, visibleWidth(headers.position), ...rows.map(r => visibleWidth(r.position))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.status)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.firstNote, widths.firstNote)} | ` +
    `${padStartVisual(headers.bpm, widths.bpm)} | ` +
    `${padStartVisual(headers.sv, widths.sv)} | ` +
    `${padStartVisual(headers.visibleTime, widths.visibleTime)} | ` +
    `${padStartVisual(headers.position, widths.position)} | ` +
    `${padStartVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.firstNote)}-+-` +
    `${"-".repeat(widths.bpm)}-+-` +
    `${"-".repeat(widths.sv)}-+-` +
    `${"-".repeat(widths.visibleTime)}-+-` +
    `${"-".repeat(widths.position)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const diffText =
      getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const statusPadded = padStartVisual(row.status, widths.status);

    const statusText =
      row.result.level === "error"
        ? `<span class="result-error">${escapeHtml(statusPadded)}</span>`
        : row.result.level === "warn"
          ? `<span class="result-warn">${escapeHtml(statusPadded)}</span>`
          : `<span class="ok">${escapeHtml(statusPadded)}</span>`;

    lines.push(
      `${diffText} | ` +
      `${padStartVisual(row.firstNote, widths.firstNote)} | ` +
      `${padStartVisual(row.bpm, widths.bpm)} | ` +
      `${padStartVisual(row.sv, widths.sv)} | ` +
      `${padStartVisual(row.visibleTime, widths.visibleTime)} | ` +
      `${padStartVisual(row.position, widths.position)} | ` +
      `${statusText}`
    );
  }

  return lines.join("\n");
}

function formatEarlyNoteIssueDetail(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  const cls =
    result.level === "error"
      ? "result-error"
      : "result-warn";

  lines.push(`${t("earlyNoteFirstNote")}: ${formatTimestampLink(result.firstHitTime)}`);
  lines.push(`${t("earlyNoteBpm")}: ${result.bpm.toFixed(3)}`);
  lines.push(`${t("earlyNoteSv")}: ${result.sv.toFixed(3)}`);
  lines.push(`${t("earlyNoteEstimatedVisibleTime")}: ${Math.round(result.visibleTime)} ms`);
  lines.push(
    `<span class="${cls}">${t("earlyNotePosition")}: ${t("earlyNotePositionSuffix")} ${result.positionPercent.toFixed(1)}%</span>`
  );

  return lines.join("\n");
}

/** Tagチェック */
function formatMultipleTagResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareTagsAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(t("tagConsistencyCheck"));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyName(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("tagNoMismatch"));
  } else {
    lines.push(t("tagMismatchFound"));
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(`${getDifficultyName(mismatch.fileName)}`);

      if (mismatch.removed.length) {
        lines.push(`  ${t("tagRemoved")}: ${mismatch.removed.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`);
      }

      if (mismatch.added.length) {
        lines.push(`  ${t("tagAdded")}: ${mismatch.added.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push("==============================");
  lines.push("");
  lines.push(t("tagSpacingCheck"));
  lines.push("");

  const spacingIssueResults = sortedResults.filter(result => result.results.length > 0);

  if (!spacingIssueResults.length) {
    lines.push(t("noTagIssues"));
  } else {
    lines.push(
      spacingIssueResults
        .map(result => formatTagSpacingResult(result, t))
        .join("\n\n==============================\n\n")
    );
  }

  lines.push("");
  lines.push("==============================");
  lines.push("");
  lines.push(t("tagSpellingCheck"));
  lines.push("");

  const spellingIssueResults = sortedResults.filter(result => result.spellingSuggestions?.length > 0);

  if (!spellingIssueResults.length) {
    lines.push(t("noTagSpellingSuggestions"));
  } else {
    lines.push(
      spellingIssueResults
        .map(result => formatTagSpellingResult(result, t))
        .join("\n\n==============================\n\n")
    );
  }

  lines.push("");
  lines.push("==============================");
  lines.push("");
  lines.push(t("tagRelatedCheck"));
  lines.push("");

  const relatedIssueResults = sortedResults.filter(result => result.relatedSuggestions?.length > 0);

  if (!relatedIssueResults.length) {
    lines.push(t("noTagRelatedSuggestions"));
  } else {
    lines.push(
      relatedIssueResults
        .map(result => formatTagRelatedResult(result, t))
        .join("\n\n==============================\n\n")
    );
  }

  return lines.join("\n").trimEnd();
}

function formatTagSpacingResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  for (const item of result.results) {
    if (item.type === "missing") {
      lines.push(t("tagMissing"));
      continue;
    }

    const label =
      item.type === "multipleSpaces"
        ? t("tagMultipleSpaces")
        : t("tagFullWidthSpace");

    lines.push(`${label}: ${t("detected")}`);
    lines.push(`  <code>${escapeHtml(item.context)}</code>`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatTagSpellingResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  for (const item of result.spellingSuggestions) {
    lines.push(
      `${t("tagPossibleTypo")}: <code>${escapeHtml(item.tag)}</code> → <code>${escapeHtml(item.suggestion)}</code>`
    );
  }

  return lines.join("\n").trimEnd();
}

function formatTagRelatedResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  for (const item of result.relatedSuggestions) {
    lines.push(
      `${t("tagRelatedSuggestion")}: ` +
      `${item.present.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")} ` +
      `→ ${item.suggestions.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`
    );
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
    lines.push(`<span class="mode-name">[${getModeName(mode)}]</span>`);
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

/** タイムスタンプのリンク用 */
function formatTimestampLink(ms) {
  const ts = msToTimestamp(ms);
  return `<a class="timestamp-link" href="osu://edit/${ts}">${ts}</a>`;
}