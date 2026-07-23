function getSpreadRestMomentOptionsFromDom(dom) {
  const findElement = (key, id) => (
    dom?.[key] ??
    (typeof dom?.getElementById === "function" ? dom.getElementById(id) : null) ??
    (typeof document !== "undefined" ? document.getElementById(id) : null)
  );
  const readNumber = (element, fallback) => {
    if (!element) return fallback;
    const value = parseFloat(element.value);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const highEnabled = findElement("spreadRestHighBpmEnabled", "spreadRestHighBpmEnabled");
  const highBpm = findElement("spreadRestHighBpmThreshold", "spreadRestHighBpmThreshold");
  const highScale = findElement("spreadRestHighBpmScale", "spreadRestHighBpmScale");
  const lowEnabled = findElement("spreadRestLowBpmEnabled", "spreadRestLowBpmEnabled");
  const lowBpm = findElement("spreadRestLowBpmThreshold", "spreadRestLowBpmThreshold");
  const lowScale = findElement("spreadRestLowBpmScale", "spreadRestLowBpmScale");
  const ignoreSliders = findElement("spreadRestIgnoreSliders", "spreadRestIgnoreSliders");
  const ignoreSpinners = findElement("spreadRestIgnoreSpinners", "spreadRestIgnoreSpinners");
  const useAdjustedThresholds = findElement("spreadRestUseAdjustedThresholds", "spreadRestUseAdjustedThresholds");
  const useMsGap = findElement("spreadRestUseMsGap", "spreadRestUseMsGap");
  const useMsThresholds = findElement("spreadRestUseMsThresholds", "spreadRestUseMsThresholds");

  return {
    highEnabled: (useMsGap?.checked ?? false) ? false : (highEnabled?.checked ?? true),
    highBpm: readNumber(highBpm, 270),
    highScale: readNumber(highScale, 0.5),
    lowEnabled: (useMsGap?.checked ?? false) ? false : (lowEnabled?.checked ?? true),
    lowBpm: readNumber(lowBpm, 110),
    lowScale: readNumber(lowScale, 2),
    ignoreSliders: ignoreSliders?.checked ?? true,
    ignoreSpinners: ignoreSpinners?.checked ?? true,
    useAdjustedThresholds: (useMsThresholds?.checked ?? false) ? false : (useAdjustedThresholds?.checked ?? true),
    useMsGap: useMsGap?.checked ?? false,
    useMsThresholds: useMsThresholds?.checked ?? false
  };
}

function applySpreadRestMomentOptions(results, options) {
  return (results ?? []).map(result => ({
    ...result,
    restMoments: typeof reanalyzeSpreadRestMoments === "function"
      ? reanalyzeSpreadRestMoments(result.restMoments, options)
      : result.restMoments
  }));
}

function formatSpreadRestThresholdTable(results, t, diffOrder = null, options = {}) {
  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results ?? [], diffOrder)
    : sortSpreadResults(results ?? []);
  const dominantBpm = getSpreadRestDominantScaledBpm(sortedResults, options);
  const multiplier = dominantBpm > 0 ? 180 / dominantBpm : 1;
  const showAdjustedThresholds = (options.useAdjustedThresholds ?? true) && !options.useMsThresholds;
  const dominantBpmText = dominantBpm > 0
    ? formatSpreadRestThresholdNumber(dominantBpm)
    : "-";
  const multiplierText = dominantBpm > 0
    ? formatSpreadRestThresholdNumber(multiplier)
    : "-";
  const baseThresholdLabel = t("spreadRestThresholdBaseGroup").replace("{bpm}", "180");
  const scaledThresholdLabel = t("spreadRestThresholdScaledGroup")
    .replace("{bpm}", dominantBpmText)
    .replace("{multiplier}", multiplierText);

  const rows = [
    ["Kantan", formatSpreadRestThresholdGap(SPREAD_REST_MOMENT_RULES.kantan, options), SPREAD_REST_MOMENT_RULES.kantan],
    ["Futsuu", formatSpreadRestThresholdGap(SPREAD_REST_MOMENT_RULES.futsuu, options), SPREAD_REST_MOMENT_RULES.futsuu],
    ["Muzukashii", formatSpreadRestThresholdGap(SPREAD_REST_MOMENT_RULES.muzukashii, options), SPREAD_REST_MOMENT_RULES.muzukashii],
    ["Oni", formatSpreadRestThresholdGap(SPREAD_REST_MOMENT_RULES.oni, options), SPREAD_REST_MOMENT_RULES.oni]
  ];
  const valueColCount = showAdjustedThresholds ? 4 : 2;

  return `
    <section class="spread-rest-threshold-section">
      <div class="spread-rest-threshold-header">
        <h4>${escapeHtml(t("spreadRestThresholdTableTitle"))}</h4>
      </div>
      <table class="spread-rest-threshold-table">
        <colgroup>
          <col class="spread-rest-threshold-difficulty-col">
          <col class="spread-rest-threshold-gap-col">
          ${Array.from({ length: valueColCount }, () => `<col class="spread-rest-threshold-value-col">`).join("")}
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">${escapeHtml(t("spreadRestThresholdDifficulty"))}</th>
            <th rowspan="2">${escapeHtml(t("spreadRestThresholdGap"))}</th>
            <th colspan="2">${escapeHtml(baseThresholdLabel)}</th>
            ${showAdjustedThresholds ? `<th colspan="2">${escapeHtml(scaledThresholdLabel)}</th>` : ""}
          </tr>
          <tr>
            <th class="spread-rest-threshold-warn">${escapeHtml(t("spreadRestThresholdWarning"))}</th>
            <th class="spread-rest-threshold-error">${escapeHtml(t("spreadRestThresholdError"))}</th>
            ${showAdjustedThresholds ? `
              <th class="spread-rest-threshold-warn">${escapeHtml(t("spreadRestThresholdWarning"))}</th>
              <th class="spread-rest-threshold-error">${escapeHtml(t("spreadRestThresholdError"))}</th>
            ` : ""}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([difficulty, gap, rule]) => `
            <tr>
              <th>${escapeHtml(difficulty)}</th>
              <td>${escapeHtml(gap)}</td>
              <td class="spread-rest-threshold-warn">${escapeHtml(formatSpreadRestThresholdValue(rule.minorLimit, options))}</td>
              <td class="spread-rest-threshold-error">${escapeHtml(formatSpreadRestThresholdValue(rule.warningLimit, options))}</td>
              ${showAdjustedThresholds ? `
                <td class="spread-rest-threshold-warn">${escapeHtml(formatSpreadRestThresholdBeat(rule.minorLimit * multiplier))}</td>
                <td class="spread-rest-threshold-error">${escapeHtml(formatSpreadRestThresholdBeat(rule.warningLimit * multiplier))}</td>
              ` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function getSpreadRestDominantScaledBpm(results, options = {}) {
  const result = (results ?? []).find(item => item.restMoments?.timingPoints?.length);
  if (!result) return null;

  const timingPoints = result.restMoments.timingPoints;
  const endTime = result.restMoments.endTime ?? 0;
  const durationsByBpm = new Map();

  for (let i = 0; i < timingPoints.length; i++) {
    const point = timingPoints[i];
    const next = timingPoints[i + 1];
    const start = Math.max(0, point.time);
    const end = Math.max(start, next ? next.time : endTime);
    const duration = end - start;
    const bpm = 60000 / point.beatLength;
    const scale = getSpreadRestMomentBpmScale(point.beatLength, options);
    const scaledBpm = bpm * scale;

    if (!Number.isFinite(scaledBpm) || scaledBpm <= 0 || duration <= 0) continue;

    const key = scaledBpm.toFixed(6);
    durationsByBpm.set(key, (durationsByBpm.get(key) ?? 0) + duration);
  }

  let dominantBpm = null;
  let dominantDuration = -1;

  for (const [key, duration] of durationsByBpm.entries()) {
    const bpm = parseFloat(key);
    if (duration > dominantDuration) {
      dominantBpm = bpm;
      dominantDuration = duration;
    }
  }

  return dominantBpm;
}

function formatSpreadRestThresholdBeat(value) {
  return `${formatSpreadRestThresholdNumber(value)}/1`;
}

function formatSpreadRestThresholdValue(value, options = {}) {
  if (options.useMsThresholds) {
    return `${formatSpreadRestThresholdMs(value * SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH)} ms`;
  }

  return formatSpreadRestThresholdBeat(value);
}

function formatSpreadRestThresholdGap(rule, options = {}) {
  if (!options.useMsGap) return getSpreadRestThresholdBeatGap(rule);

  return rule.acceptableRests
    .map(rest => {
      const ms = rest.beats * SPREAD_REST_MOMENT_BPM180_BEAT_LENGTH;
      const count = rest.consecutiveGaps > 1 ? ` x${rest.consecutiveGaps}` : " x1";
      return `${formatSpreadRestThresholdMs(ms)} ms${count}`;
    })
    .join(" or ");
}

function getSpreadRestThresholdBeatGap(rule) {
  return rule.gapType ?? rule.breakType;
}

function formatSpreadRestThresholdNumber(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatSpreadRestThresholdMs(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function getSpreadRestMomentsIssueLevel(results, manualCategories = {}) {
  let level = "none";

  if (getSpreadRestTimingPointMismatches(results).length) {
    return "error";
  }

  for (const result of results ?? []) {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    const issues = result.restMoments?.issuesByCategory?.[category] ?? [];

    if (issues.some(issue => issue.level === "error")) {
      return "error";
    }

    if (issues.some(issue => issue.level === "warn")) {
      level = "warn";
    }
  }

  return level;
}

function formatSpreadFinishersTable(results, t, diffOrder = null) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const times = collectAllSpreadFinisherTimes(sortedResults);

  if (!times.length) {
    return "No finishers found.";
  }

  const groups = classifySpreadFinisherTimes(sortedResults, times);

  const sections = [];

  sections.push(formatSpreadFinisherSection(
    t("spreadFinishersMissing"),
    groups.missing,
    sortedResults
  ));

  sections.push(formatSpreadFinisherSection(
    t("spreadFinishersMismatch"),
    groups.mismatch,
    sortedResults
  ));

  sections.push(formatSpreadFinisherSection(
    t("spreadFinishersMatched"),
    groups.matched,
    sortedResults
  ));

  return sections.filter(Boolean).join("\n\n");
}

function formatSpreadRestMomentsResult(results, t, diffOrder = null, manualCategories = {}) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);
  const lines = [];
  let hasAny = false;

  lines.push(t("spreadRestMomentsIssues"));

  const timingMismatches = getSpreadRestTimingPointMismatches(sortedResults);
  if (timingMismatches.length) {
    hasAny = true;
    lines.push("");
    lines.push(`<span class="result-error">${escapeHtml(t("spreadRestTimingMismatch"))}</span>`);
    for (const mismatch of timingMismatches) {
      lines.push(
        `<span class="result-error">` +
        `${escapeHtml(getDifficultyName(mismatch.fileName))}: ` +
        `${escapeHtml(formatSpreadRestTimingMismatch(mismatch, t))}` +
        `</span>`
      );
    }
  }

  for (const result of sortedResults) {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    const issues = result.restMoments?.issuesByCategory?.[category] ?? [];

    if (!issues.length) continue;

    hasAny = true;
    lines.push("");
    lines.push(`${getDifficultyName(result.fileName)} (${formatSpreadRestMomentCategory(category)})`);

    for (const issue of issues) {
      const cls = issue.level === "error" ? "result-error" : "result-warn";
      const message = t("spreadRestMomentMessage")
        .replace("{break}", issue.breakType)
        .replace("{length}", formatSpreadRestMomentIssueLength(issue));

      lines.push(
        `<span class="${cls}">` +
        `${formatTimestampLink(issue.start)} -> ${formatTimestampLink(issue.end)} - ` +
        `${escapeHtml(message)}` +
        `</span>`
      );
    }
  }

  if (!hasAny) {
    lines.push("");
    lines.push(t("spreadNoRestMomentIssues"));
  }

  return lines.join("\n");
}

function formatSpreadRestMomentIssueLength(issue) {
  if (issue.lengthUnit === "ms") {
    return `${formatSpreadRestThresholdMs(issue.beats)} ms`;
  }

  return `${issue.beats}/1`;
}

function getSpreadRestTimingPointMismatches(results) {
  const sortedResults = (results ?? []).filter(
    result => result.restMoments?.timingPoints?.length
  );
  if (sortedResults.length <= 1) return [];

  const base = sortedResults[0];
  const basePoints = base.restMoments.timingPoints;
  const mismatches = [];

  for (const result of sortedResults.slice(1)) {
    const points = result.restMoments.timingPoints;

    if (points.length !== basePoints.length) {
      mismatches.push({
        fileName: result.fileName,
        type: "count",
        actual: points.length,
        expected: basePoints.length
      });
      continue;
    }

    for (let i = 0; i < basePoints.length; i++) {
      const basePoint = basePoints[i];
      const point = points[i];
      const sameTime = Math.abs(point.time - basePoint.time) <= 0.5;
      const sameBeatLength = Math.abs(point.beatLength - basePoint.beatLength) <= 0.0001;

      if (!sameTime || !sameBeatLength) {
        mismatches.push({
          fileName: result.fileName,
          type: "line",
          index: i + 1,
          baseFileName: base.fileName
        });
        break;
      }
    }
  }

  return mismatches;
}

function formatSpreadRestTimingMismatch(mismatch, t) {
  if (mismatch.type === "count") {
    return t("spreadRestTimingMismatchCount")
      .replace("{actual}", mismatch.actual)
      .replace("{expected}", mismatch.expected);
  }

  return t("spreadRestTimingMismatchLine")
    .replace("{index}", mismatch.index)
    .replace("{base}", getDifficultyName(mismatch.baseFileName));
}

function formatSpreadRestMomentCategory(category) {
  switch (category) {
    case "kantan": return "Kantan";
    case "futsuu": return "Futsuu";
    case "muzukashii": return "Muzukashii";
    case "oni": return "Oni";
    case "innerPlus": return "Oni+";
    case "belowKantan": return "Kantan-";
    default: return "Unknown";
  }
}

function classifySpreadFinisherTimes(results, times) {
  const groups = {
    missing: [],
    mismatch: [],
    matched: []
  };

  for (const time of times) {
    const values = results.map(result => getSpreadFinisherAtTime(result, time));

    const hasMissing = values.some(value => value === "-");

    if (hasMissing) {
      groups.missing.push(time);
      continue;
    }

    const unique = new Set(values);

    if (unique.size === 1) {
      groups.matched.push(time);
    } else {
      groups.mismatch.push(time);
    }
  }

  return groups;
}

function formatSpreadFinisherSection(title, times, sortedResults) {
  const lines = [];

  lines.push(`[${title}]`);
  lines.push("");

  if (!times.length) {
    lines.push("(none)");
    return lines.join("\n");
  }

  lines.push(formatSpreadFinisherTimeTable(times, sortedResults));

  return lines.join("\n");
}

function formatSpreadFinisherTimeTable(times, sortedResults) {
  const diffNames = sortedResults.map(result =>
    getDifficultyNameText(result.fileName)
  );

  const colWidths = diffNames.map((name, index) => {
    let maxWidth = visibleWidth(name);

    for (const time of times) {
      const value = getSpreadFinisherAtTime(sortedResults[index], time);
      maxWidth = Math.max(maxWidth, visibleWidth(value));
    }

    return Math.max(maxWidth, 3);
  });

  const timeWidth = Math.max(
    visibleWidth("Time"),
    ...times.map(time => visibleWidth(msToTimestamp(time)))
  );

  const lines = [];

  lines.push(
    `${padEndVisual("Time", timeWidth)} | ` +
    diffNames.map((name, i) =>
      padEndVisual(name, colWidths[i])
    ).join(" | ")
  );

  lines.push(
    `${"-".repeat(timeWidth)}-+-` +
    colWidths.map(width => "-".repeat(width)).join("-+-")
  );

  for (const time of times) {
    const row = [];

    row.push(padEndVisual(formatTimestampLink(time), timeWidth));

    sortedResults.forEach((result, i) => {
      const value = getSpreadFinisherAtTime(result, time);
      const padded = padEndVisual(value, colWidths[i]);

      row.push(formatSpreadFinisherCellPadded(value, padded));
    });

    lines.push(row.join(" | "));
  }

  return lines.join("\n");
}

function formatSpreadFinisherCellPadded(value, padded) {
  if (value === "D") {
    return `<span class="spread-finisher-d">${padded}</span>`;
  }

  if (value === "K") {
    return `<span class="spread-finisher-k">${padded}</span>`;
  }

  return `<span class="ok">${padded}</span>`;
}

const SPREAD_FINISHER_TIME_TOLERANCE_MS = 1;

function collectAllSpreadFinisherTimes(results) {
  const times = [];

  for (const result of results) {
    for (const item of result.finishers ?? []) {
      const existingTime = findSpreadFinisherMatchingTime(times, item.time);

      if (existingTime === null) {
        times.push(item.time);
      }
    }
  }

  return times.sort((a, b) => a - b);
}

function getSpreadFinisherAtTime(result, time) {
  const item = (result.finishers ?? []).find(finisher =>
    Math.abs(finisher.time - time) <= SPREAD_FINISHER_TIME_TOLERANCE_MS
  );

  return item ? item.kind : "-";
}

function findSpreadFinisherMatchingTime(times, targetTime) {
  for (const time of times) {
    if (Math.abs(time - targetTime) <= SPREAD_FINISHER_TIME_TOLERANCE_MS) {
      return time;
    }
  }

  return null;
}

/** 低難易度のスクロール速度 */
