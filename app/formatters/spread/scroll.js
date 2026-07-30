function formatSpreadScrollSpeedResult(
  results,
  t,
  diffOrder = null,
  manualCategories = {},
  gradientMode = "linear",
  ignoreFinishers = false
) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const lines = [];

  lines.push(formatSpreadScrollSpeedSummaryTable(sortedResults, t, manualCategories));

  lines.push(formatSeparator());
  lines.push(formatSpreadRapidScrollChanges(sortedResults, t, manualCategories));
  lines.push(formatSeparator());
  lines.push(formatSpreadScrollSpeedProgressionByEvent(sortedResults, t, manualCategories));

  lines.push(formatSeparator());
  lines.push(formatSpreadScrollChangeConsistency(sortedResults, t, manualCategories));

  if (isSpreadLinearSvFeatureEnabled()) {
    lines.push(formatSeparator());
    lines.push(formatSpreadLinearSvGradients(
      sortedResults,
      t,
      gradientMode,
      ignoreFinishers
    ));
  }

  return lines.join("\n").trimEnd();
}

function formatSpreadScrollSpeedSectionTitle(text) {
  return formatSectionTitle(String(text).replace(/[:\uFF1A]\s*$/, ""));
}

function getSpreadScrollGradientModeFromDom(dom) {
  const select =
    dom?.spreadScrollGradientMode ??
    (typeof dom?.getElementById === "function"
      ? dom.getElementById("spreadScrollGradientMode")
      : null) ??
    (typeof document !== "undefined"
      ? document.getElementById("spreadScrollGradientMode")
      : null);
  return select?.value === "geometric" ? "geometric" : "linear";
}

function getSpreadScrollIgnoreFinishersFromDom(dom) {
  const checkbox =
    dom?.spreadScrollIgnoreFinishers ??
    (typeof dom?.getElementById === "function"
      ? dom.getElementById("spreadScrollIgnoreFinishers")
      : null) ??
    (typeof document !== "undefined"
      ? document.getElementById("spreadScrollIgnoreFinishers")
      : null);
  return checkbox?.checked ?? false;
}

function getSpreadScrollSpeedGradients(
  scrollSpeed,
  gradientMode = "linear",
  ignoreFinishers = false
) {
  if (gradientMode === "geometric") {
    return ignoreFinishers
      ? scrollSpeed?.geometricGradientsWithoutFinishers ?? []
      : scrollSpeed?.geometricGradients ?? [];
  }

  return ignoreFinishers
    ? scrollSpeed?.linearGradientsWithoutFinishers ?? []
    : scrollSpeed?.linearGradients ?? [];
}

function formatSpreadLinearSvGradients(
  results,
  t,
  gradientMode = "linear",
  ignoreFinishers = false
) {
  const lines = [
    formatSpreadScrollSpeedSectionTitle(t("spreadLinearSvGradients")),
    formatSpreadSvGradientOptions(t, gradientMode, ignoreFinishers)
  ];
  let hasAny = false;

  for (const result of results) {
    const gradients = getSpreadScrollSpeedGradients(
      result.scrollSpeed,
      gradientMode,
      ignoreFinishers
    );
    if (!gradients.length) continue;

    hasAny = true;
    lines.push("");
    lines.push(getDifficultyName(result.fileName));
    lines.push(formatSpreadLinearSvGradientTable(gradients, t));
  }

  if (!hasAny) {
    lines.push("");
    lines.push(t("spreadNoLinearSvGradients"));
  }

  return lines.join("\n");
}

function formatSpreadSvGradientOptions(
  t,
  gradientMode = "linear",
  ignoreFinishers = false
) {
  const isGeometric = gradientMode === "geometric";
  return (
    `<div class="result-option-group spread-scroll-gradient-options">` +
    `<label>` +
    `<span>${escapeHtml(t("spreadScrollGradientMode"))}</span>` +
    `<select id="spreadScrollGradientMode">` +
    `<option value="linear"${isGeometric ? "" : " selected"}>` +
    `${escapeHtml(t("spreadScrollGradientModeLinear"))}` +
    `</option>` +
    `<option value="geometric"${isGeometric ? " selected" : ""}>` +
    `${escapeHtml(t("spreadScrollGradientModeGeometric"))}` +
    `</option>` +
    `</select>` +
    `</label>` +
    `<label>` +
    `<input type="checkbox" id="spreadScrollIgnoreFinishers"` +
    `${ignoreFinishers ? " checked" : ""}>` +
    `<span>${escapeHtml(t("spreadScrollIgnoreFinishers"))}</span>` +
    `</label>` +
    `</div>`
  );
}

function formatSpreadLinearSvGradientTable(gradients, t) {
  const rows = gradients.map(gradient => ({
    gradient,
    time:
      `${formatTimestampLink(gradient.startTime)} - ` +
      `${formatTimestampLink(gradient.endTime)}`,
    timeText:
      `${msToTimestamp(gradient.startTime)} - ` +
      `${msToTimestamp(gradient.endTime)}`,
    sv:
      `x${formatSpreadGradientSv(gradient.startSv)} -> ` +
      `x${formatSpreadGradientSv(gradient.endSv)}`,
    type: getSpreadSvGradientTypeLabel(gradient, t),
    status:
      gradient.status === "warn"
        ? "Warning"
        : "OK"
  }));

  const headers = {
    time: t("spreadLinearSvTime"),
    sv: "SV",
    type: t("spreadLinearSvKind"),
    status: "Status"
  };
  const widths = {
    time: Math.max(
      visibleWidth(headers.time),
      ...rows.map(row => visibleWidth(row.timeText))
    ),
    sv: Math.max(
      visibleWidth(headers.sv),
      ...rows.map(row => visibleWidth(row.sv))
    ),
    type: Math.max(
      visibleWidth(headers.type),
      ...rows.map(row => visibleWidth(row.type))
    ),
    status: Math.max(
      visibleWidth(headers.status),
      ...rows.map(row => visibleWidth(row.status))
    )
  };
  const lines = [
    `${padEndVisual(headers.time, widths.time)} | ` +
    `${padEndVisual(headers.sv, widths.sv)} | ` +
    `${padEndVisual(headers.type, widths.type)} | ` +
    `${padEndVisual(headers.status, widths.status)}`,
    `${"-".repeat(widths.time)}-+-` +
    `${"-".repeat(widths.sv)}-+-` +
    `${"-".repeat(widths.type)}-+-` +
    `${"-".repeat(widths.status)}`
  ];

  for (const row of rows) {
    const status = row.gradient.status === "warn"
      ? `<span class="result-warn">${padEndVisual(row.status, widths.status)}</span>`
      : padEndVisual(row.status, widths.status);

    lines.push(
      `${row.time}${" ".repeat(widths.time - visibleWidth(row.timeText))} | ` +
      `${padEndVisual(row.sv, widths.sv)} | ` +
      `${padEndVisual(row.type, widths.type)} | ` +
      status
    );

    if (row.gradient.status === "warn") {
      for (const outlier of row.gradient.outliers) {
        lines.push(formatSpreadLinearSvOutlierLine(outlier, t));
      }
    }
  }

  return lines.join("\n");
}

function getSpreadSvGradientTypeLabel(gradient, t) {
  return gradient.type === "geometric"
    ? t("spreadGeometricSvType")
    : t("spreadLinearSvType");
}

function formatSpreadLinearSvOutlierLine(outlier, t) {
  const errorText =
    `${outlier.error >= 0 ? "+" : ""}${formatSpreadGradientSv(outlier.error)}`;

  return (
    `  <span class="result-warn">` +
    `${formatTimestampLink(outlier.time)} | ` +
    `${t("spreadBrokenSvCurrent")}: x${formatSpreadGradientSv(outlier.actualSv)} | ` +
    `${t("spreadBrokenSvExpected")}: x${formatSpreadGradientSv(outlier.expectedSv)} | ` +
    `${t("spreadBrokenSvError")}: ${errorText}` +
    `</span>`
  );
}

function formatSpreadGradientSv(value) {
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(3);
}

function formatSpreadScrollSpeedSummaryTable(results, t, manualCategories = {}) {
  const rows = results.map(result => {
    const summary = result.scrollSpeed?.summary;
    const category = getSpreadEffectiveCategory(result, manualCategories);

    const tooFastLevel = getSpreadTooFastScrollLevel(result.scrollSpeed, category);
    const limitValue = getSpreadTooFastScrollRule(category);

    return {
      result,
      diff: getDifficultyNameText(result.fileName),
      category,
      categoryLabel: category,
      min: summary ? formatSpreadScrollSpeed(summary.minSpeed) : "N/A",
      max: summary ? formatSpreadScrollSpeed(summary.maxSpeed) : "N/A",
      p90: summary ? formatSpreadScrollSpeed(summary.percentile90Speed) : "N/A",
      limitValue,
      tooFastLevel,
      status: tooFastLevel === "warn" ? "Warning" : "OK",
      delta: summary ? formatSpreadScrollSpeed(summary.deltaSpeed) : "N/A",
      ratio: summary ? formatSpreadRatio(summary.ratio) : "N/A",
      sv: summary
        ? `${formatSpreadSv(summary.minSv)} - ${formatSpreadSv(summary.maxSv)}`
        : "N/A",
      sm: result.scrollSpeed?.sliderMultiplier ?? result.sliderMultiplier ?? "N/A"
    };
  });

  const headers = {
    diff: "Diff",
    min: "Min px/s",
    max: "Max px/s",
    p90: "90% px/s",
    delta: "Delta",
    ratio: "Ratio",
    sv: "SV range",
    sm: "SliderMultiplier",
    status: "Status"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    min: Math.max(8, visibleWidth(headers.min), ...rows.map(r => visibleWidth(r.min))),
    max: Math.max(8, visibleWidth(headers.max), ...rows.map(r => visibleWidth(r.max))),
    p90: Math.max(8, visibleWidth(headers.p90), ...rows.map(r => visibleWidth(r.p90))),
    delta: Math.max(7, visibleWidth(headers.delta), ...rows.map(r => visibleWidth(r.delta))),
    ratio: Math.max(5, visibleWidth(headers.ratio), ...rows.map(r => visibleWidth(r.ratio))),
    sv: Math.max(8, visibleWidth(headers.sv), ...rows.map(r => visibleWidth(r.sv))),
    sm: Math.max(16, visibleWidth(headers.sm), ...rows.map(r => visibleWidth(String(r.sm)))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.status)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.min, widths.min)} | ` +
    `${padStartVisual(headers.max, widths.max)} | ` +
    `${padStartVisual(headers.p90, widths.p90)} | ` +
    `${padStartVisual(headers.delta, widths.delta)} | ` +
    `${padStartVisual(headers.ratio, widths.ratio)} | ` +
    `${padEndVisual(headers.sv, widths.sv)} | ` +
    `${padStartVisual(headers.sm, widths.sm)} | ` +
    `${padEndVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.min)}-+-` +
    `${"-".repeat(widths.max)}-+-` +
    `${"-".repeat(widths.p90)}-+-` +
    `${"-".repeat(widths.delta)}-+-` +
    `${"-".repeat(widths.ratio)}-+-` +
    `${"-".repeat(widths.sv)}-+-` +
    `${"-".repeat(widths.sm)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const isWarn = row.tooFastLevel === "warn";

    const p90Html =
      isWarn
        ? `<span class="result-warn">${row.p90}</span>`
        : row.p90;

    const statusHtml = isWarn
      ? `<span class="result-warn">${row.status}</span>`
      : row.status;

    lines.push(
      `${getDifficultyName(row.result.fileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${padStartVisual(row.min, widths.min)} | ` +
      `${padStartVisual(row.max, widths.max)} | ` +
      `${isWarn
        ? `<span class="result-warn">${padStartVisual(row.p90, widths.p90)}</span>`
        : padStartVisual(row.p90, widths.p90)
      } | ` +
      `${padStartVisual(row.delta, widths.delta)} | ` +
      `${padStartVisual(row.ratio, widths.ratio)} | ` +
      `${padEndVisual(row.sv, widths.sv)} | ` +
      `${padStartVisual(String(row.sm), widths.sm)} | ` +
      `${isWarn
        ? `<span class="result-warn">${padEndVisual(row.status, widths.status)}</span>`
        : padEndVisual(row.status, widths.status)
      }`
    );
  }

  const tooFastRows = rows.filter(row => row.tooFastLevel === "warn");

  if (tooFastRows.length) {
    lines.push(formatSeparator());
    lines.push(formatSpreadScrollSpeedSectionTitle("速すぎるスクロール速度の可能性:"));

    for (const row of tooFastRows) {
      lines.push(
        `<span class="result-warn">` +
        `${getDifficultyName(row.result.fileName)}: ` +
        `${row.categoryLabel} のスクロール速度が速すぎる可能性があります。` +
        `90% px/s を ${formatSpreadScrollSpeed(row.limitValue)} 以下にすることを検討してください。` +
        `</span>`
      );
    }
  }

  return lines.join("\n");
}

function formatSpreadRapidScrollChanges(results, t, manualCategories = {}) {
  const lines = [];

  lines.push(formatSpreadScrollSpeedSectionTitle(t("spreadRapidScrollChanges")));

  let hasAny = false;

  for (const result of results) {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    const rapidChanges = result.scrollSpeed?.rapidChanges ?? [];

    const warned = rapidChanges.filter(change =>
      getSpreadRapidScrollLevel(change, category) === "warn"
    );

    if (!warned.length) continue;

    hasAny = true;

    lines.push("");
    lines.push(getDifficultyName(result.fileName));

    for (const change of warned) {
      const speedText =
        `${formatSpreadScrollSpeed(change.beforeSpeed)} -> ${formatSpreadScrollSpeed(change.afterSpeed)}`;

      const deltaText =
        `${change.delta >= 0 ? "+" : ""}${formatSpreadScrollSpeed(change.delta)}`;

      const ratioText =
        formatSpreadRatio(change.ratio);

      lines.push(
        `<span class="result-warn">` +
        `${formatTimestampLink(change.fromTime)} -> ${formatTimestampLink(change.toTime)} | ` +
        `${speedText} px/s | ` +
        `Δ ${deltaText} | ` +
        `${ratioText} | ` +
        `${change.gapMs} ms` +
        `</span>`
      );
    }
  }

  if (!hasAny) {
    lines.push("");
    lines.push(t("spreadNoRapidScrollChanges"));
  }

  return lines.join("\n");
}

/** スクロール Progression */
function formatSpreadScrollSpeed(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return String(Math.round(value));
}

function formatSpreadSv(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toFixed(2);
}

/** スクロール変化量 */
function formatSpreadScrollChangeConsistency(results, t, manualCategories = {}) {
  const analysis = analyzeSpreadScrollChangeConsistency(results, manualCategories);

  const lines = [];

  lines.push(formatSpreadScrollSpeedSectionTitle(t("spreadScrollChangeConsistency")));

  if (!analysis.issueGroups.length) {
    lines.push("");
    lines.push(t("spreadNoScrollChangeConsistencyIssues"));
    return lines.join("\n");
  }

  for (const group of analysis.issueGroups) {
    lines.push("");
    lines.push(`${formatTimestampLink(group.time)}`);

    lines.push(formatSpreadScrollChangeConsistencyTable(group, results));

    lines.push("");
    lines.push(t("spreadScrollChangeConsistencyReview"));

    for (const issue of group.issues) {
      if (issue.type === "strongerLowerDiff") {
        lines.push(
          `<span class="result-warn">` +
          `${getDifficultyName(issue.lower.fileName)} ${t("spreadHasStrongerScrollChangeThan")} ${getDifficultyName(issue.higher.fileName)} ` +
          `(|Δ| ${formatSpreadScrollSpeed(issue.lower.event.absDelta)} > ${formatSpreadScrollSpeed(issue.higher.event.absDelta)})` +
          `</span>`
        );
      }

      if (issue.type === "directionMismatch") {
        lines.push(
          `<span class="result-warn">` +
          `${getDifficultyName(issue.lower.fileName)} / ${getDifficultyName(issue.higher.fileName)} ${t("spreadScrollDirectionMismatch")}` +
          `</span>`
        );
      }
    }
  }

  return lines.join("\n");
}

/** スクロール速度 Progression */
function formatSpreadScrollSpeedProgressionByEvent(results, t, manualCategories = {}) {
  const analysis = analyzeSpreadScrollSpeedProgressionByEvent(results, manualCategories);

  const lines = [];

  lines.push(formatSpreadScrollSpeedSectionTitle(t("spreadScrollSpeedProgression")));

  if (!analysis.issueGroups.length) {
    lines.push("");
    lines.push(t("spreadNoScrollSpeedProgressionIssues"));
    return lines.join("\n");
  }

  for (const group of analysis.issueGroups) {
    lines.push("");
    lines.push(`${formatTimestampLink(group.time)}`);

    lines.push(formatSpreadScrollSpeedProgressionEventTable(group, results));

    lines.push("");
    lines.push(t("spreadScrollSpeedProgressionReview"));

    for (const issue of group.issues) {
      lines.push(
        `<span class="result-warn">` +
        `${getDifficultyName(issue.prev.fileName)} -> ${getDifficultyName(issue.cur.fileName)}: ` +
        `${formatSpreadScrollSpeed(issue.prev.event.afterSpeed)} -> ${formatSpreadScrollSpeed(issue.cur.event.afterSpeed)} px/s ` +
        `(${issue.prevDirection} -> ${issue.curDirection})` +
        `</span>`
      );
    }
  }

  return lines.join("\n");
}

function formatSpreadScrollSpeedProgressionEventTable(group, results) {
  const byFileName = new Map(
    group.items.map(item => [item.fileName, item.event])
  );

  const rows = results.map(result => {
    const event = byFileName.get(result.fileName);

    return {
      fileName: result.fileName,
      diff: getDifficultyNameText(result.fileName),
      event
    };
  });

  const headers = {
    diff: "Diff",
    before: "Before",
    after: "After",
    delta: "Δ px/s",
    interval: "Note Interval"
  };

  const rowTexts = rows.map(row => {
    if (!row.event) {
      return {
        ...row,
        before: "-",
        after: "-",
        delta: "-",
        interval: "-"
      };
    }

    const sign = row.event.delta >= 0 ? "+" : "";

    return {
      ...row,
      before: `${formatSpreadScrollSpeed(row.event.beforeSpeed)}`,
      after: `${formatSpreadScrollSpeed(row.event.afterSpeed)}`,
      delta: `${sign}${formatSpreadScrollSpeed(row.event.delta)}`,
      interval: `${row.event.gapMs} ms`
    };
  });

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rowTexts.map(row => visibleWidth(row.diff))),
    before: Math.max(8, visibleWidth(headers.before), ...rowTexts.map(row => visibleWidth(row.before))),
    after: Math.max(8, visibleWidth(headers.after), ...rowTexts.map(row => visibleWidth(row.after))),
    delta: Math.max(8, visibleWidth(headers.delta), ...rowTexts.map(row => visibleWidth(row.delta))),
    interval: Math.max(13, visibleWidth(headers.interval), ...rowTexts.map(row => visibleWidth(row.interval)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.before, widths.before)} | ` +
    `${padStartVisual(headers.after, widths.after)} | ` +
    `${padStartVisual(headers.delta, widths.delta)} | ` +
    `${padStartVisual(headers.interval, widths.interval)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.before)}-+-` +
    `${"-".repeat(widths.after)}-+-` +
    `${"-".repeat(widths.delta)}-+-` +
    `${"-".repeat(widths.interval)}`
  );

  for (const row of rowTexts) {
    const diffText =
      getDifficultyName(row.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const cls = row.event ? "" : "ok";

    lines.push(
      `<span class="${cls}">` +
      `${diffText} | ` +
      `${padStartVisual(row.before, widths.before)} | ` +
      `${padStartVisual(row.after, widths.after)} | ` +
      `${padStartVisual(row.delta, widths.delta)} | ` +
      `${padStartVisual(row.interval, widths.interval)}` +
      `</span>`
    );
  }

  return lines.join("\n");
}

function formatSpreadScrollChangeConsistencyTable(group, results) {
  const byFileName = new Map(
    group.items.map(item => [item.fileName, item.event])
  );

  const rows = results.map(result => {
    const event = byFileName.get(result.fileName);

    return {
      fileName: result.fileName,
      diff: getDifficultyNameText(result.fileName),
      event
    };
  });

  const headers = {
    diff: "Diff",
    delta: "Δ px/s",
    speed: "Speed Multiplier",
    interval: "Note Interval"
  };

  const rowTexts = rows.map(row => {
    if (!row.event) {
      return {
        ...row,
        delta: "-",
        speed: "-",
        interval: "-"
      };
    }

    const sign = row.event.delta >= 0 ? "+" : "";

    return {
      ...row,
      delta: `${sign}${formatSpreadScrollSpeed(row.event.delta)}`,
      speed:
        `${formatSpreadScrollSpeed(row.event.beforeSpeed)} -> ` +
        `${formatSpreadScrollSpeed(row.event.afterSpeed)} ` +
        `(${formatSpreadRatio(row.event.ratio)})`,
      interval: `${row.event.gapMs} ms`
    };
  });

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rowTexts.map(r => visibleWidth(r.diff))),
    delta: Math.max(7, visibleWidth(headers.delta), ...rowTexts.map(r => visibleWidth(r.delta))),
    speed: Math.max(18, visibleWidth(headers.speed), ...rowTexts.map(r => visibleWidth(r.speed))),
    interval: Math.max(13, visibleWidth(headers.interval), ...rowTexts.map(r => visibleWidth(r.interval)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.delta, widths.delta)} | ` +
    `${padEndVisual(headers.speed, widths.speed)} | ` +
    `${padStartVisual(headers.interval, widths.interval)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.delta)}-+-` +
    `${"-".repeat(widths.speed)}-+-` +
    `${"-".repeat(widths.interval)}`
  );

  for (const row of rowTexts) {
    lines.push(
      `${getDifficultyName(row.fileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${padStartVisual(row.delta, widths.delta)} | ` +
      `${padEndVisual(row.speed, widths.speed)} | ` +
      `${padStartVisual(row.interval, widths.interval)}`
    );
  }

  return lines.join("\n");
}

/** ノーツ密度 */
