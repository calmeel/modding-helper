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
    lines.push(formatSeparator());

    lines.push(
      sortedResults
        .map(result => formatResult(result, t, showClap, showWhistle))
        .join("\n\n")
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
    lines.push(formatSeparator());

    lines.push(
      sortedGroup
        .map(result => formatResult(result, t, showClap, showWhistle))
        .join("\n\n")
    );
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
    const sign = item.diff > 0 ? "+" : "";
    const className = item.level === "warn" ? "result-warn" : "result-error";
    const objectText = getOffsetObjectTypeLabel(item, t);
    const targetText =
      item.target === "sliderTail"
        ? ` | ${t("sliderTail")}`
        : item.target === "spinnerTail"
          ? ` | ${t("spinnerTail")}`
          : "";
    const compatibilityText = item.compatibility
      ? t(
          item.compatibility === "stableOnly"
            ? "offsetStableOnly"
            : "offsetLazerOnly"
        ).replace("{diff}", `${sign}${item.diff} ms`)
      : null;

    lines.push(
      `<span class="${className}">${formatTimestampLink(item.time)} | ` +
      `${escapeHtml(objectText)}${targetText} ` +
      `${compatibilityText
        ? escapeHtml(compatibilityText)
        : `${escapeHtml(t("offsetUnsnappedBy"))} ${sign}${item.diff} ms`} ` +
      `[1/${item.snap} ${escapeHtml(t("snap"))}]</span>`
    );
  }

  return lines.join("\n");
}

function getOffsetObjectTypeLabel(item, t) {
  if (item.objectType === "slider") return t("offsetObjectSlider");
  if (item.objectType === "spinner") return t("offsetObjectSpinner");
  return t("offsetObjectCircle");
}

function formatSvValue(beatLength) {
  const value = beatLength < 0 ? -100 / beatLength : 1;
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 1000) / 1000).toString();
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

  const svTexts = allItems.map(item => `SV x${formatSvValue(item.beatLength)}`);
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

      const svText = `SV x${formatSvValue(item.beatLength)}`;
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

/** Barline系の表示関数 */
function formatMultipleBarlineResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  if (!hasMultipleModes(results)) {
    return formatBarlineResultGroup(sortResultsForDisplay(results), t);
  }

  const lines = [];

  for (const [mode, group] of groupByMode(results)) {
    lines.push(`<span class="mode-name">[${getModeName(mode)}]</span>`);
    lines.push("");
    lines.push(formatBarlineResultGroup(sortResultsForDisplay(group), t));
    lines.push("");
    lines.push("==============================");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatBarlineResultGroup(results, t) {
  const lines = [];

  lines.push(formatSectionTitle(t("barlineDoubleBarline")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineDoubleBarlineLines(result, t));
    lines.push("");
  }

  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("barlineNegativeStartBug")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineNegativeStartWarningLines(result, t));
    lines.push("");
  }

  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("barlineDetachedBarline")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineDetachedBarlineLines(result, t));
    lines.push("");
  }

  lines.push(formatSeparator());
  lines.push("");
  lines.push(formatSectionTitle(t("barlineIntentionalDetachedBarline")));

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push(...formatBarlineIntentionalDetachedBarlineLines(result, t));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatBarlineDoubleBarlineLines(result, t) {
  if (!result.doubleBarlines.length) {
    return [t("barlineNoDoubleBarline")];
  }

  return result.doubleBarlines.map(item =>
    `<span class="result-error">` +
    `${formatTimestampLink(item.barlineTime)} -> ${formatTimestampLink(item.redLineTime)} | ` +
    `${escapeHtml(t("barlineMissingOmitFirst"))}` +
    `</span>`
  );
}

function formatBarlineNegativeStartWarningLines(result, t) {
  if (!result.negativeStartBarlineWarnings?.length) {
    return [t("barlineNoNegativeStartBug")];
  }

  return result.negativeStartBarlineWarnings.map(item =>
    `<span class="result-warn">` +
    `${formatTimestampLink(item.nextRedLineTime)} | ` +
    `${escapeHtml(t(item.stableLazerMessageKey))}` +
    `</span>`
  );
}

function formatBarlineDetachedBarlineLines(result, t) {
  if (!result.detachedBarlines.length) {
    return [t("barlineNoDetachedBarline")];
  }

  return result.detachedBarlines.map(item =>
    formatBarlineDetachedBarlineLine(item, t, "result-error")
  );
}

function formatBarlineIntentionalDetachedBarlineLines(result, t) {
  if (!result.intentionalDetachedBarlines?.length) {
    return [t("barlineNoIntentionalDetachedBarline")];
  }

  return result.intentionalDetachedBarlines.map(item =>
    formatBarlineDetachedBarlineLine(item, t, "result-warn")
  );
}

function formatBarlineDetachedBarlineLine(item, t, className) {
  const deltaSign = item.delta > 0 ? "+" : "";
  return (
    `<span class="${className}">` +
    `${formatTimestampLink(item.barlineTime)} -> ${formatTimestampLink(item.noteTime)} | ` +
    `${escapeHtml(t("barlineGeneratedBarline"))}: ${formatBarlineSpeed(item.barlineSpeed)} px/s | ` +
    `${escapeHtml(t("barlineNote"))}: ${formatBarlineSpeed(item.noteSpeed)} px/s | ` +
    `${escapeHtml(t("barlineDelta"))}: ${deltaSign}${formatBarlineSpeed(item.delta)} px/s` +
    `</span>`
  );
}

function formatMultipleUnappliedSvResults(results, t) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = sortResultsForDisplay(results);
  const lines = [];

  lines.push(formatSectionTitle(t("unappliedSvNoteTitle")));
  lines.push(...formatUnappliedSvResultsByDiff(
    sortedResults,
    "noteIssues",
    "unappliedSvNoNoteIssues",
    "unappliedSvNoteMessage",
    t
  ));

  lines.push("");
  lines.push(formatSectionTitle(t("unappliedSvBarlineTitle")));
  lines.push(...formatUnappliedSvResultsByDiff(
    sortedResults,
    "barlineIssues",
    "unappliedSvNoBarlineIssues",
    "unappliedSvBarlineMessage",
    t
  ));

  return lines.join("\n").trimEnd();
}

function formatUnappliedSvResultsByDiff(results, issueKey, noIssueKey, messageKey, t) {
  const lines = [];

  for (const result of results) {
    lines.push(getDifficultyName(result));

    const issues = result[issueKey] ?? [];
    if (!issues.length) {
      lines.push(t(noIssueKey));
    } else {
      for (const issue of issues) {
        lines.push(formatUnappliedSvIssueLine(issue, t, messageKey));
      }
    }

    lines.push("");
  }

  return lines;
}

function formatUnappliedSvIssueLine(issue, t, messageKey) {
  const targetSvLabel =
    issue.targetType === "barline"
      ? t("unappliedSvBarlineSvLabel")
      : t("unappliedSvNoteSvLabel");
  const targetSv = getUnappliedSvNumericValue(issue.targetGreenLine);
  const followingSv = getUnappliedSvNumericValue(issue.greenLine);
  const targetSvText = `${targetSvLabel} x${formatUnappliedSvNumber(targetSv)}`;
  const followingSvText = `${t("unappliedSvFollowingSvLabel")} x${formatUnappliedSvNumber(followingSv)}`;
  const deltaText = `${t("unappliedSvDeltaLabel")} ${formatUnappliedSvDelta(followingSv - targetSv)}`;
  const svText = `${targetSvText} -> ${followingSvText} (${deltaText})`;
  const message = t(messageKey).replace("{offset}", `+${issue.offset} ms`);

  return `<span class="result-warn">` +
    `${formatTimestampLink(issue.targetTime)} -> ` +
    `${formatTimestampLink(issue.greenTime)} | ` +
    `+${issue.offset} ms | ` +
    `${escapeHtml(svText)} | ` +
    `${escapeHtml(message)}` +
    `</span>`;
}

function getUnappliedSvNumericValue(greenLine) {
  if (!greenLine) return 1;
  return greenLine.beatLength < 0 ? -100 / greenLine.beatLength : 1;
}

function formatUnappliedSvNumber(value) {
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 1000) / 1000).toString();
}

function formatUnappliedSvDelta(value) {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = Math.round(value * 1000) / 1000;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function formatBarlineSpeed(value) {
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 100) / 100).toString();
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

    const line =
      `${timeText}${timePadding} | ` +
      `${padEndVisual(typeText, typeWidth)} | ` +
      `${padEndVisual(snapText, snapWidth)} | ` +
      `${padEndVisual(diffText, diffWidth)}`;

    const isError =
      item.snap === "unknown" ||
      item.diff !== 0;

    lines.push(
      isError
        ? `<span class="result-error">${line}</span>`
        : line
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
      lines.push(`<span class="result-warn">  ${t("volumeMismatch")} | ${t("red")} ${item.redVolume}% / ${t("green")} ${item.greenVolume}%</span>`);
    }

    if (item.kiaiMismatch) {
      lines.push(`<span class="result-warn">  ${t("kiaiMismatch")} | red ${formatKiaiState(item.redKiai)} / green ${formatKiaiState(item.greenKiai)}</span>`);
    }

    if (item.sampleSetMismatch) {
      lines.push(
        `<span class="result-warn">  ${t("sampleSetMismatch")} | ${t("red")} ${item.redSampleSet} (${getSampleSetName(item.redSampleSet)}) / ${t("green")} ${item.greenSampleSet} (${getSampleSetName(item.greenSampleSet)})</span>`
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
        `${formatTimestampLink(item.time)} | ${item.lineType} | ${formatSampleSetIssueText(item)}`
      );
    }
    lines.push("");
  }

  if (result.objectIssues.length) {
    lines.push(t("hitObjects"));
    for (const item of result.objectIssues) {
      lines.push(
        `${formatTimestampLink(item.time)} | ${item.objectType} | ${formatSampleSetIssueText(item)}`
      );
    }
  }

  return lines.join("\n").trimEnd();
}

/** sampleindexの際の処理 */
function formatSampleSetIssueText(item) {
  if (item.field === "sampleIndex") {
    return `sampleIndex: ${item.sampleIndex}`;
  }

  if (item.field === "customFileName") {
    return `custom file: ${escapeHtml(item.customFileName)}`;
  }

  if (item.field === "edgeSounds") {
    return `edgeSounds[${item.edgeIndex}]: ${item.edgeSound}`;
  }

  if (
    item.field === "sampleSet" ||
    item.field === "normalSet" ||
    item.field === "additionSet" ||
    item.field === "edgeSets.normalSet" ||
    item.field === "edgeSets.additionSet"
  ) {
    const edgePrefix = item.edgeIndex !== undefined
      ? `[${item.edgeIndex}] `
      : "";

    return `${edgePrefix}${item.field}: ${item.sampleSet} (${item.sampleSetName})`;
  }

  return item.field;
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
  lines.push(formatSeparator());

  if (!issueResults.length) {
    lines.push(t("noSliderSettingsIssues"));
    return lines.join("\n");
  }

  lines.push(t("sliderSettingsIssueDetails"));
  lines.push("");

  lines.push(
    issueResults
      .map(result => formatSliderSettingsIssueDetail(result, t))
      .join("\n\n")
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
  lines.push(formatSeparator());

  if (!issueResults.length) {
    lines.push(t("noEarlyNoteIssues"));
    return lines.join("\n");
  }

  lines.push(formatSectionTitle(t("earlyNoteIssueDetails")));
  lines.push("");

  lines.push(
    issueResults
      .map(result => formatEarlyNoteIssueDetail(result, t))
      .join("\n\n")
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

  if (result.reason === "firstNoteBeforeFirstRedLine") {
    lines.push(
      `<span class="${cls}">${escapeHtml(t("earlyNoteBeforeFirstRedLine"))}</span>`
    );
    lines.push(`BPM: N/A`);
    lines.push(`SV: N/A`);
    lines.push(`${t("earlyNoteEstimatedVisibleTime")}: N/A`);
    lines.push(`${t("earlyNotePosition")}: N/A`);
    lines.push("");
    lines.push(
      `<span class="${cls}">${escapeHtml(t("earlyNoteRecommendation"))}</span>`
    );

    return lines.join("\n");
  }

  lines.push(`${t("earlyNoteBpm")}: ${result.bpm === null ? "N/A" : result.bpm.toFixed(3)}`);
  lines.push(`${t("earlyNoteSv")}: ${result.sv === null ? "N/A" : result.sv.toFixed(3)}`);
  lines.push(`${t("earlyNoteEstimatedVisibleTime")}: ${result.visibleTime === null ? "N/A" : `${Math.round(result.visibleTime)} ms`}`);

  const positionText =
    result.positionPercent === null
      ? "N/A"
      : `${t("earlyNotePositionSuffix")} ${result.positionPercent.toFixed(1)}%`;

  lines.push(
    `<span class="${cls}">${t("earlyNotePosition")}: ${positionText}</span>`
  );

  lines.push("");
  lines.push(
    `<span class="${cls}">${escapeHtml(t("earlyNoteRecommendation"))}</span>`
  );

  return lines.join("\n");
}