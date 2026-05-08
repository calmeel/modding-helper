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

    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");

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

  const allItems = result.groups.flatMap(group => group.items);

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...allItems.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const svTexts = allItems.map(item => `SV ${formatSvValue(item.beatLength)}`);
  const svWidth = Math.max(
    visibleWidth("SV"),
    ...svTexts.map(text => visibleWidth(text))
  );

  const volumeTexts = allItems.map(item => `vol ${item.volume}`);
  const volumeWidth = Math.max(
    visibleWidth("Volume"),
    ...volumeTexts.map(text => visibleWidth(text))
  );

  for (const group of result.groups) {
    for (const item of group.items) {
      const timeText = formatTimestampLink(item.time);
      const plainTime = msToTimestamp(item.time);

      const svText = `SV ${formatSvValue(item.beatLength)}`;
      const volumeText = `vol ${item.volume}`;

      const timePadding =
        " ".repeat(timeWidth - visibleWidth(plainTime));

      lines.push(
        `${timeText}${timePadding} | ` +
        `${padEndVisual(svText, svWidth)} | ` +
        `${padEndVisual(volumeText, volumeWidth)}`
      );
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

  lines.push(formatKiaiMismatchTable(compared.mismatchSections, results, t));
  return lines.join("\n").trimEnd();
}

function formatKiaiMismatchTable(sections, results, t) {
  const sortedResults = sortResultsForDisplay(results);

  const diffHeaders = sortedResults.map(result => ({
    plain: getDifficultyNameText(result.fileName),
    html: getDifficultyName(result.fileName)
  }));

  const rows = sections.map(section => {
    const values = sortedResults.map(result => {
      const state = section.states.find(s => s.fileName === result.fileName);
      const plain = state?.kiai ? "ON" : "OFF";

      return {
        plain: state?.kiai ? "ON" : "- ",
        html: state?.kiai
          ? "ON"
          : "- "
      };
    });

    const timeText =
      `${formatTimestampLink(section.start)} - ${formatTimestampLink(section.end)}`;

    const plainTimeText =
      `${msToTimestamp(section.start)} - ${msToTimestamp(section.end)}`;

    return {
      timeText,
      plainTimeText,
      values
    };
  });

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...rows.map(row => visibleWidth(row.plainTimeText))
  );

  const colWidths = diffHeaders.map((header, index) => {
    let maxWidth = visibleWidth(header.plain);

    for (const row of rows) {
      maxWidth = Math.max(maxWidth, visibleWidth(row.values[index].plain));
    }

    return Math.max(maxWidth, 3);
  });

  const lines = [];

  lines.push(
    `${padEndVisual("Time", timeWidth)} | ` +
    diffHeaders.map((header, index) => {
      const padding = " ".repeat(colWidths[index] - visibleWidth(header.plain));
      return header.html + padding;
    }).join(" | ")
  );

  lines.push(
    `${"-".repeat(timeWidth)}-+-` +
    colWidths.map(width => "-".repeat(width)).join("-+-")
  );

  for (const row of rows) {
    const timePadding =
      " ".repeat(timeWidth - visibleWidth(row.plainTimeText));

    lines.push(
      `${row.timeText}${timePadding} | ` +
      row.values.map((value, index) => {
        const padding = " ".repeat(colWidths[index] - visibleWidth(value.plain));
        return value.html + padding;
      }).join(" | ")
    );
  }

  return lines.join("\n");
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

  // 列幅計算
  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...result.results.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const typeTexts = result.results.map(item => `Kiai ${item.type}`);
  const typeWidth = Math.max(
    visibleWidth("Type"),
    ...typeTexts.map(text => visibleWidth(text))
  );

  const snapTexts = result.results.map(item => `${item.snap} snap`);
  const snapWidth = Math.max(
    visibleWidth("Snap"),
    ...snapTexts.map(text => visibleWidth(text))
  );

  const diffTexts = result.results.map(item =>
    item.diff === null
      ? "-"
      : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`
  );

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...diffTexts.map(text => visibleWidth(text))
  );

  // 本体
  for (let i = 0; i < result.results.length; i++) {
    const item = result.results[i];

    const timeText = formatTimestampLink(item.time);

    const plainTime = msToTimestamp(item.time);

    const typeText = `Kiai ${item.type}`;
    const snapText = `${item.snap} snap`;

    const diffText =
      item.diff === null
        ? "-"
        : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`;

    const timePadding =
      " ".repeat(timeWidth - visibleWidth(plainTime));

    lines.push(
      `${timeText}${timePadding} | ` +
      `${padEndVisual(typeText, typeWidth)} | ` +
      `${padEndVisual(snapText, snapWidth)} | ` +
      `${padEndVisual(diffText, diffWidth)}`
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

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...result.results.map(item => visibleWidth(msToTimestamp(item.time)))
  );

  const hitTexts = result.results.map(item =>
    `hitobject ${msToTimestamp(item.hitTime)}`
  );

  const hitWidth = Math.max(
    visibleWidth("HitObject"),
    ...hitTexts.map(text => visibleWidth(text))
  );

  const diffTexts = result.results.map(item => {
    const sign = item.diff >= 0 ? "+" : "-";
    return `${sign}${Math.abs(item.diff)} ms`;
  });

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...diffTexts.map(text => visibleWidth(text))
  );

  const volumeTexts = result.results.map(item =>
    `vol ${item.oldVolume} -> ${item.newVolume}`
  );

  const volumeWidth = Math.max(
    visibleWidth("Volume"),
    ...volumeTexts.map(text => visibleWidth(text))
  );

  for (let i = 0; i < result.results.length; i++) {
    const item = result.results[i];

    const timeText = formatTimestampLink(item.time);
    const plainTime = msToTimestamp(item.time);

    const hitText = hitTexts[i];
    const diffText = diffTexts[i];
    const volumeText = volumeTexts[i];

    const timePadding =
      " ".repeat(timeWidth - visibleWidth(plainTime));

    lines.push(
      `${timeText}${timePadding} | ` +
      `${padEndVisual(hitText, hitWidth)} | ` +
      `${padEndVisual(diffText, diffWidth)} | ` +
      `${padEndVisual(volumeText, volumeWidth)}`
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

  const allStates = result.results.flatMap(item => item.states ?? []);
  const sortedStates = sortResultsForDisplay(allStates);

  const uniqueFileNames = [];
  for (const state of sortedStates) {
    if (!uniqueFileNames.includes(state.fileName)) {
      uniqueFileNames.push(state.fileName);
    }
  }

  const diffHeaders = uniqueFileNames.map(fileName => ({
    fileName,
    plain: getDifficultyNameText(fileName),
    html: getDifficultyName(fileName)
  }));

  const rows = result.results.map(item => {
    const timePlain =
      `${msToTimestamp(item.start)} - ${msToTimestamp(item.end)}`;

    const timeHtml =
      `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)}`;

    const diffText = `diff ${item.diff}%`;

    const values = diffHeaders.map(header => {
      const state = item.states.find(s => s.fileName === header.fileName);
      return state?.volume === null || state?.volume === undefined
        ? "N/A"
        : `${state.volume}%`;
    });

    return {
      timePlain,
      timeHtml,
      diffText,
      values
    };
  });

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...rows.map(row => visibleWidth(row.timePlain))
  );

  const diffWidth = Math.max(
    visibleWidth("Diff"),
    ...rows.map(row => visibleWidth(row.diffText))
  );

  const colWidths = diffHeaders.map((header, index) => {
    let maxWidth = visibleWidth(header.plain);

    for (const row of rows) {
      maxWidth = Math.max(maxWidth, visibleWidth(row.values[index]));
    }

    return Math.max(maxWidth, 3);
  });

  lines.push(
    `${padEndVisual("Time", timeWidth)} | ` +
    `${padEndVisual("Diff", diffWidth)} | ` +
    diffHeaders.map((header, index) => {
      const padding = " ".repeat(colWidths[index] - visibleWidth(header.plain));
      return header.html + padding;
    }).join(" | ")
  );

  lines.push(
    `${"-".repeat(timeWidth)}-+-` +
    `${"-".repeat(diffWidth)}-+-` +
    colWidths.map(width => "-".repeat(width)).join("-+-")
  );

  for (const row of rows) {
    const timePadding =
      " ".repeat(timeWidth - visibleWidth(row.timePlain));

    lines.push(
      `${row.timeHtml}${timePadding} | ` +
      `${padEndVisual(row.diffText, diffWidth)} | ` +
      row.values.map((value, index) =>
        padEndVisual(value, colWidths[index])
      ).join(" | ")
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

  lines.push(formatSectionTitle(t("earlyNoteIssueDetails")));
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

  lines.push(formatTagTokenView(sortedResults, t));
  lines.push("");
  lines.push(formatSeparator());
  lines.push("");

  lines.push(formatSectionTitle(t("tagConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("tagNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("tagMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(`${getDifficultyNameText(mismatch.fileName)}`);

      if (mismatch.removed.length) {
        lines.push(`  <span class="result-error">${escapeHtml(t("tagRemoved"))}:</span> ${mismatch.removed.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`);
      }

      if (mismatch.added.length) {
        lines.push(`  <span class="result-error">${escapeHtml(t("tagAdded"))}:</span> ${mismatch.added.map(tag => `<code>${escapeHtml(tag)}</code>`).join(" ")}`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagSpacingCheck")));
  lines.push("");

  const spacingGroups = groupTagSpacingResults(sortedResults);

  if (!spacingGroups.length) {
    lines.push(t("noTagIssues"));
  } else {
    lines.push(
      spacingGroups
        .map(group => formatTagSpacingGroupResult(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagSpellingCheck")));
  lines.push("");

  const spellingGroups = groupTagResultsByNormalizedTags(sortedResults)
    .filter(group => group.representative.spellingSuggestions?.length > 0);

  if (!spellingGroups.length) {
    lines.push(t("noTagSpellingSuggestions"));
  } else {
    lines.push(
      spellingGroups
        .map(group => formatTagSpellingResult(group.representative, t, group))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("tagRelatedCheck")));
  lines.push("");

  const relatedGroups = groupTagResultsByNormalizedTags(sortedResults)
    .filter(group => group.representative.relatedSuggestions?.length > 0);

  if (!relatedGroups.length) {
    lines.push(t("noTagRelatedSuggestions"));
  } else {
    lines.push(
      relatedGroups
        .map(group => formatTagRelatedResult(group.representative, t, group))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  return lines.join("\n").trimEnd();
}

/** Tagを一覧表示 */
function formatTagTokenView(results, t) {
  const groups = groupTagResultsByNormalizedTags(results);

  const lines = [];

  lines.push(formatSectionTitle(t("tagTokenView")));
  lines.push("");

  for (const group of groups) {
    const result = group.representative;
    const tags = getTagWords(result.tags);

    lines.push(formatGroupedTagHeader(group));
    lines.push("");

    if (!tags.length) {
      lines.push(t("tagTokenViewEmpty"));
      lines.push("");
      continue;
    }

    lines.push(
      `<div class="tag-token-list">` +
      tags
        .map(tag => `<span class="tag-token">${escapeHtml(tag)}</span>`)
        .join(" ") +
      `</div>`
    );

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** Artistチェック */
function formatMultipleArtistResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareArtistsAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatMetadataFieldView(sortedResults, t, [
    { key: "artist", label: "Artist" },
    { key: "artistUnicode", label: "ArtistUnicode" }
  ]));
  lines.push("");
  lines.push(formatSeparator());
  lines.push("");


  lines.push(formatSectionTitle(t("artistConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("artistNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("artistMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(getDifficultyNameText(mismatch.fileName));

      if (mismatch.artistMismatch) {
        lines.push(`  ${escapeHtml(t("baseArtist"))}: <code>${escapeHtml(mismatch.baseArtist)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentArtist"))}:</span> <code>${escapeHtml(mismatch.artist)}</code>`);
      }

      if (mismatch.unicodeMismatch) {
        lines.push(`  ${escapeHtml(t("baseRomanisedArtist"))}: <code>${escapeHtml(mismatch.baseArtistUnicode)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentRomanisedArtist"))}:</span> <code>${escapeHtml(mismatch.artistUnicode)}</code>`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("metadataSymbolRomanisationCheck")));
  lines.push("");

  const symbolIssueResults = sortedResults.filter(result =>
    result.symbolIssues?.length > 0
  );

  if (!symbolIssueResults.length) {
    lines.push(t("metadataNoSymbolRomanisationIssues"));
  } else {
    for (const result of symbolIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.symbolIssues) {
        lines.push(
          `<span class="result-warn">${escapeHtml(t("metadataSymbolRomanisationIssue"))}:</span> ` +
          `<code>${escapeHtml(issue.symbol)}</code> → ` +
          issue.expectedList.map(v => `<code>${escapeHtml(v)}</code>`).join(" / ")
        );
        lines.push(`  ${escapeHtml(t("metadataOriginal"))}: <code>${escapeHtml(issue.original)}</code>`);
        lines.push(`  ${escapeHtml(t("metadataRomanised"))}: <code>${escapeHtml(issue.romanised)}</code>`);
        lines.push("");
      }
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("artistFormattingCheck")));
  lines.push("");

  const formattingIssueResults = sortedResults.filter(result =>
    result.formattingIssues?.length > 0
  );

  if (!formattingIssueResults.length) {
    lines.push(t("artistNoFormattingIssues"));
  } else {
    for (const result of formattingIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.formattingIssues) {
        lines.push(
          `<span class="result-warn">${escapeHtml(t("artistFormattingIssue"))}:</span> ` +
          `<code>${escapeHtml(issue.marker)}</code> → <code>${escapeHtml(issue.expected)}</code>`
        );

        lines.push(`  ${escapeHtml(t("detected"))}: <code>${escapeHtml(issue.context)}</code>`);
        lines.push("");
      }
    }
  }

  return lines.join("\n").trimEnd();
}

/** Titleチェック */
function formatMultipleTitleResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareTitlesAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatMetadataFieldView(sortedResults, t, [
    { key: "title", label: "Title" },
    { key: "titleUnicode", label: "TitleUnicode" }
  ]));
  lines.push("");
  lines.push(formatSeparator());
  lines.push("");

  lines.push(formatSectionTitle(t("titleConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("titleNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("titleMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(getDifficultyNameText(mismatch.fileName));

      if (mismatch.titleMismatch) {
        lines.push(`  ${escapeHtml(t("baseTitle"))}: <code>${escapeHtml(mismatch.baseTitle)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentTitle"))}:</span> <code>${escapeHtml(mismatch.title)}</code>`);
      }

      if (mismatch.unicodeMismatch) {
        lines.push(`  ${escapeHtml(t("baseRomanisedTitle"))}: <code>${escapeHtml(mismatch.baseTitleUnicode)}</code>`);
        lines.push(`  <span class="result-error">${escapeHtml(t("currentRomanisedTitle"))}:</span> <code>${escapeHtml(mismatch.titleUnicode)}</code>`);
      }

      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("metadataSymbolRomanisationCheck")));
  lines.push("");

  const symbolIssueResults = sortedResults.filter(result =>
    result.symbolIssues?.length > 0
  );

  if (!symbolIssueResults.length) {
    lines.push(t("metadataNoSymbolRomanisationIssues"));
  } else {
    for (const result of symbolIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.symbolIssues) {
        lines.push(
          `<span class="result-warn">${escapeHtml(t("metadataSymbolRomanisationIssue"))}:</span> ` +
          `<code>${escapeHtml(issue.symbol)}</code> → ` +
          issue.expectedList.map(v => `<code>${escapeHtml(v)}</code>`).join(" / ")
        );

        lines.push(`  ${escapeHtml(t("metadataOriginal"))}: <code>${escapeHtml(issue.original)}</code>`);
        lines.push(`  ${escapeHtml(t("metadataCurrentRomanised"))}: <code>${escapeHtml(issue.romanised)}</code>`);

        if (issue.suggestedRomanised && issue.suggestedRomanised !== issue.romanised) {
          lines.push(
            `  ${escapeHtml(t("metadataSuggestedRomanised"))}: <code>${escapeHtml(issue.suggestedRomanised)}</code>`
          );
        }

        else {
          lines.push(
            `  <span class="result-warn">${escapeHtml(t("metadataSuggestedRomanisedUnavailable"))}</span>`
          );
        }

        lines.push("");
      }
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("titleMarkerCheck")));
  lines.push("");

  const markerIssueResults = sortedResults.filter(result =>
    result.markerIssues?.length > 0
  );

  if (!markerIssueResults.length) {
    lines.push(t("titleNoMarkerIssues"));
  } else {
    for (const result of markerIssueResults) {
      lines.push(getDifficultyNameText(result.fileName));
      lines.push("");

      for (const issue of result.markerIssues) {
        lines.push(
          `<span class="result-warn">${escapeHtml(t("titleMarkerIssue"))}:</span> ` +
          `<code>${escapeHtml(issue.marker)}</code> → <code>${escapeHtml(issue.expected)}</code>`
        );

        if (issue.fieldName) {
          lines.push(`  ${escapeHtml(t("field"))}: <code>${escapeHtml(issue.fieldName)}</code>`);
        }

        if (issue.fieldName) {
          lines.push(`  ${escapeHtml(t("field"))}: <code>${escapeHtml(issue.fieldName)}</code>`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n").trimEnd();
}

/** メタデータ表示の共通関数 */
function formatMetadataFieldView(results, t, fields) {
  const lines = [];

  lines.push(formatSectionTitle(t("metadataFieldView")));
  lines.push("");

  for (const field of fields) {
    const values = [
      ...new Set(
        results
          .map(r => (r[field.key] ?? "").trim())
          .filter(Boolean)
      )
    ];

    lines.push(field.label);
    lines.push("");

    if (!values.length) {
      lines.push(`<code>-</code>`);
      lines.push("");
      continue;
    }

    lines.push(
      `<div class="tag-token-list">` +
      values
        .map(v =>
          `<span class="tag-token">${escapeHtml(v)}</span>`
        )
        .join(" ") +
      `</div>`
    );

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** タグ */
function formatTagSpacingGroupResult(group, t) {
  const lines = [];

  lines.push(formatGroupedTagHeader(group));
  lines.push("");

  for (const item of group.items) {
    if (item.type === "missing") {
      lines.push(`<span class="result-error">${escapeHtml(t("tagMissing"))}</span>`);
      continue;
    }

    const label =
      item.type === "multipleSpaces"
        ? t("tagMultipleSpaces")
        : t("tagFullWidthSpace");

    lines.push(`<span class="result-error">${escapeHtml(label)}: ${escapeHtml(t("detected"))}</span>`);
    lines.push(`  <code>${escapeHtml(item.context)}</code>`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function groupTagSpacingResults(results) {
  const groups = new Map();

  for (const result of results) {
    for (const item of result.results ?? []) {
      const key = getTagSpacingGroupKey(item);

      if (!groups.has(key)) {
        groups.set(key, {
          representative: result,
          fileNames: [],
          items: []
        });
      }

      const group = groups.get(key);

      group.fileNames.push(result.fileName);

      if (!group.items.length) {
        group.items.push(item);
      }
    }
  }

  return [...groups.values()];
}

function getTagSpacingGroupKey(item) {
  if (item.type === "missing") {
    return "missing";
  }

  return [
    item.type,
    item.context ?? ""
  ].join("::");
}

function groupTagResultsByNormalizedTags(results) {
  const groups = new Map();

  for (const result of results) {
    const key = result.normalizedTags ?? "";

    if (!groups.has(key)) {
      groups.set(key, {
        representative: result,
        fileNames: []
      });
    }

    groups.get(key).fileNames.push(result.fileName);
  }

  return [...groups.values()];
}

function formatGroupedTagHeader(group) {
  const names = group.fileNames.map(fileName => getDifficultyNameText(fileName));

  if (names.length === 1) {
    return names[0];
  }

  return names.join(", ");
}

function formatTagSpellingResult(result, t, group = null) {
  const lines = [];

  lines.push(group ? formatGroupedTagHeader(group) : getDifficultyNameText(result.fileName));
  lines.push("");

  for (const item of result.spellingSuggestions) {
    lines.push(
      `<span class="result-error">${escapeHtml(t("tagPossibleTypo"))}:</span> <code>${escapeHtml(item.tag)}</code> → <code>${escapeHtml(item.suggestion)}</code>`
    );
  }

  return lines.join("\n").trimEnd();
}

function formatTagRelatedResult(result, t, group = null) {
  const lines = [];

  lines.push(group ? formatGroupedTagHeader(group) : getDifficultyNameText(result.fileName));
  lines.push("");

  for (const item of result.relatedSuggestions) {
    const present = item.present
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    const alreadyIncluded = (item.presentSuggestions ?? [])
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    const suggestions = item.suggestions
      .map(tag => `<code>${escapeHtml(tag)}</code>`)
      .join(" ");

    lines.push(`<span class="result-warn">${escapeHtml(t("tagRelatedTrigger"))}:</span> ${present}`);

    if (alreadyIncluded) {
      lines.push(`<span class="result-warn">${escapeHtml(t("tagAlreadyIncluded"))}:</span> ${alreadyIncluded}`);
    }

    lines.push(`<span class="result-warn">${escapeHtml(t("tagSuggestedAdditions"))}:</span> ${suggestions}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** メタデータ：東方チェック */
function formatMultipleSourceResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const compared = compareSourcesAcrossDiffs(sortedResults);

  const lines = [];

  lines.push(formatMetadataFieldView(sortedResults, t, [
    { key: "source", label: "Source" }
  ]));
  lines.push("");
  lines.push(formatSeparator());
  lines.push("");

  lines.push(formatSectionTitle(t("sourceConsistencyCheck")));
  lines.push("");

  if (compared.base) {
    lines.push(`(${t("baseDiff")}: ${getDifficultyNameText(compared.base.fileName)})`);
    lines.push("");
  }

  if (!compared.hasMismatch) {
    lines.push(t("sourceNoMismatch"));
  } else {
    lines.push(`<span class="result-error">${escapeHtml(t("sourceMismatchFound"))}</span>`);
    lines.push("");

    for (const mismatch of compared.mismatches) {
      lines.push(`${getDifficultyNameText(mismatch.fileName)}`);
      lines.push(`  ${escapeHtml(t("sourceBase"))}: <code>${escapeHtml(mismatch.baseSource)}</code>`);
      lines.push(`  <span class="result-error">${escapeHtml(t("sourceCurrent"))}:</span> <code>${escapeHtml(mismatch.source)}</code>`);
      lines.push("");
    }
  }

  lines.push("");
  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("sourceCheckTitle")));
  lines.push("");

  const groups = groupSourceResults(sortedResults);

  if (!groups.length) {
    lines.push(t("noSourceIssues"));
  } else {
    lines.push(
      groups
        .map(group => formatSourceGroupResult(group, t))
        .join("\n\n" + formatSeparator() + "\n\n")
    );
  }

  return lines.join("\n").trimEnd();
}

function groupSourceResults(results) {
  const groups = new Map();

  for (const result of results) {
    const key = getSourceGroupKey(result);

    if (!groups.has(key)) {
      groups.set(key, {
        representative: result,
        fileNames: [],
        results: []
      });
    }

    const group = groups.get(key);

    group.fileNames.push(result.fileName);

    // 同じ内容は1回だけ保持
    if (!group.results.length) {
      group.results.push(result);
    }
  }

  return [...groups.values()];
}

function getSourceGroupKey(result) {
  return [
    result.level,
    result.type,
    result.source ?? "",
    result.expected ?? "",
    result.link ?? ""
  ].join("::");
}

function formatSourceGroupResult(group, t) {
  const result = group.results[0];
  const lines = [];

  // Diff一覧
  lines.push(
    group.fileNames
      .map(name => getDifficultyNameText(name))
      .join(", ")
  );

  lines.push("");

  if (result.source) {
    lines.push(`Source: <code>${escapeHtml(result.source)}</code>`);
    lines.push("");
  }

  if (result.level === "ok") {
    lines.push(`<span class="ok">${escapeHtml(t("sourceOk"))}</span>`);

    if (result.link) {
      lines.push(
        `<a href="${escapeHtml(result.link)}" target="_blank">${escapeHtml(result.link)}</a>`
      );
    }

    return lines.join("\n");
  }

  if (result.type === "generic") {
    lines.push(`<span class="result-warn">${escapeHtml(t("sourceGenericTouhou"))}</span>`);
    return lines.join("\n");
  }

  if (result.type === "partial") {
    lines.push(`<span class="result-error">${escapeHtml(t("sourceInvalidTouhou"))}</span>`);
    lines.push(`${escapeHtml(t("sourceExpected"))}: <code>${escapeHtml(result.expected)}</code>`);

    if (result.link) {
      lines.push(
        `<a href="${escapeHtml(result.link)}" target="_blank">${escapeHtml(result.link)}</a>`
      );
    }

    return lines.join("\n");
  }

  if (result.type === "unknown") {
    lines.push(`<span class="result-warn">${escapeHtml(t("sourceUnknownTouhou"))}</span>`);
    return lines.join("\n");
  }

  // 東方作品ではない場合
  lines.push(
    `<span class="result-info">${escapeHtml(t("sourceNotTouhou"))}</span>`
  );

  return lines.join("\n");
}

/** その他：プレビューポイント */
function formatPreviewPointResult(results, t) {
  if (!results || !results.length) {
    return t("noOsuFiles");
  }

  const validResults = results.filter(result => result.previewTime !== null);

  if (!validResults.length) {
    return t("previewPointNotFound");
  }

  const groups = groupPreviewPointResults(validResults);

  const lines = [];

  if (groups.length === 1) {
    const item = groups[0].items[0];
    lines.push(formatPreviewPointSingleResult(item, t));
    return lines.join("\n");
  }

  lines.push(t("previewPointMismatch"));
  lines.push("");

  for (const group of groups) {
    const item = group.items[0];
    lines.push(formatPreviewPointSingleResult(item, t));

    lines.push(
      group.items
        .map(result => getDifficultyNameText(result.fileName))
        .join(", ")
    );

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function groupPreviewPointResults(results) {
  const map = new Map();

  for (const result of results) {
    const key = [
      result.previewTime,
      result.snap,
      result.diff
    ].join("|");

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(result);
  }

  return [...map.values()].map(items => ({ items }));
}

function formatPreviewPointSingleResult(item, t) {
  const diffText =
    item.diff === null
      ? "-"
      : `${item.diff >= 0 ? "+" : "-"}${Math.abs(item.diff)} ms`;

  const levelClass =
    item.level === "warn"
      ? "result-warn"
      : "";

  const status =
    item.level === "warn"
      ? t("warning")
      : t("sourceOk");

  return `<span class="${levelClass}">` +
    `${formatTimestampLink(item.previewTime)} | ` +
    `${item.snap} snap | ` +
    `${diffText} | ` +
    `${status}` +
    `</span>`;
}

/** その他：てんかん警告 */
function formatMultipleEpilepsyWarningResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  return formatByModeIfHybrid(results, formatEpilepsyWarningResult, t);
}

function formatEpilepsyWarningResult(result, t) {
  const lines = [];

  lines.push(`${getDifficultyName(result.fileName)}`);
  lines.push("");

  const flashIssues = result.flashIssues ?? [];
  const bpmIssues = result.bpmIssues ?? [];

  if (!flashIssues.length && !bpmIssues.length) {
    lines.push(t("noEpilepsyWarningIssues"));
    return lines.join("\n");
  }

  lines.push(
    `<span class="note-subtext">` +
    `${t("epilepsyWarningNotice")}` +
    `</span>`
  );

  if (flashIssues.length) {
    lines.push(t("epilepsyKiaiFlashIssues"));
    lines.push("");

    for (const item of flashIssues) {
      const cls = item.level === "warn" ? "result-warn" : "ok";
      const hzText = item.hz.toFixed(2);
      const intervalText = `${Math.round(item.intervalMs)} ms`;

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(item.prevTime)} -> ${formatTimestampLink(item.time)} | ` +
        `${hzText} Hz | ${intervalText}` +
        `</span>`
      );
    }

    lines.push("");
  }

  if (bpmIssues.length) {
    lines.push(t("epilepsyHighBpmKiaiIssues"));
    lines.push("");

    for (const item of bpmIssues) {
      const cls = item.level === "warn" ? "result-warn" : "ok";
      const bpmText = item.bpm.toFixed(3);
      const hzText = item.hz.toFixed(2);

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(item.start)} - ${formatTimestampLink(item.end)} | ` +
        `${bpmText} BPM | ${hzText} Hz` +
        `</span>`
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

function formatSectionTitle(text) {
  return `<h3 class="result-section-title">${escapeHtml(text)}</h3>`;
}

/** 区切り線 */
function formatSeparator() {
  return '<span class="result-separator-line"></span>';
}

/** タイムスタンプのリンク用 */
function formatTimestampLink(ms) {
  const ts = msToTimestamp(ms);
  return `<a class="timestamp-link" href="osu://edit/${ts}">${ts}</a>`;
}