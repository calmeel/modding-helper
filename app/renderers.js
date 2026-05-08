function renderClapWhistleResult(results, dom, t) {
  if (!results || !dom.output) return;

  dom.output.innerHTML = formatMultipleResults(
    results,
    t,
    dom.showClap,
    dom.showWhistle
  );
}

function renderOffsetResult(results, dom, t) {
  if (!results || !dom.shiftOutput) return;

  dom.shiftOutput.innerHTML = formatMultipleShiftResults(results, t);
}

function renderOffsetResultFromSources(sources, dom, t) {
  if (!dom.shiftOutput) return null;

  if (!sources) {
    dom.shiftOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const includeAdvancedSnaps = dom.includeAdvancedOffsetSnaps
    ? dom.includeAdvancedOffsetSnaps.checked
    : false;

  const results = sources.map(source => ({
    ...runOffset1msCheck(source.text, source.fileName, {
      includeAdvancedSnaps
    }),
    mode: source.mode
  }));

  dom.shiftOutput.innerHTML = formatMultipleShiftResults(results, t);

  return results;
}

function renderDoubleSvResultFromSources(sources, dom, t) {
  if (!dom.doubleSvOutput) return;

  if (!sources) {
    dom.doubleSvOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const results = analyzeDoubleSvSourcesFromSources(sources, dom);
  dom.doubleSvOutput.innerHTML = formatMultipleDoubleSvResults(results, t);

  return results;
}

function renderKiaiCompareResult(results, dom, t) {
  if (!dom.kiaiOutput) return;

  if (!results) {
    dom.kiaiOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.kiaiOutput.innerHTML = formatKiaiCompareResult(results, t);
}

function renderKiaiSnapResultFromResults(results, dom, t) {
  if (!dom.kiaiSnapOutput) return;

  if (!results) {
    dom.kiaiSnapOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.kiaiSnapOutput.innerHTML = formatMultipleKiaiSnapResults(results, t);
}

function analyzeDoubleSvSourcesFromSources(sources, dom) {
  if (!sources) return null;

  const maxGapMs = dom.doubleSvGap
    ? parseInt(dom.doubleSvGap.value, 10)
    : 2;

  const includeExactSame = dom.includeExactSameSv
    ? dom.includeExactSameSv.checked
    : true;

  return sources.map(source => ({
    ...runDoubleSvCheck(source.text, source.fileName, {
      maxGapMs,
      includeExactSame
    }),
    mode: source.mode
  }));
}

function renderSvVolumeResultFromSources(sources, dom, t) {
  if (!dom.svVolumeOutput) return;

  if (!sources) {
    dom.svVolumeOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const thresholdMode = dom.svVolumeThreshold
    ? dom.svVolumeThreshold.value
    : "16snap";

  const largeChangeOnly = dom.svVolumeLargeChangeOnly
    ? dom.svVolumeLargeChangeOnly.checked
    : false;

  const results = sources.map(source => ({
    ...runSvVolumeCheck(source.text, source.fileName, {
      thresholdMode,
      largeChangeOnly,
      largeChangeThreshold: 15
    }),
    mode: source.mode
  }));
  
  dom.svVolumeOutput.innerHTML = formatMultipleSvVolumeResults(results, t);

  return results;
}

function renderRedGreenMatchResultFromResults(results, dom, t) {
  if (!dom.redGreenMatchOutput) return;

  if (!results) {
    dom.redGreenMatchOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.redGreenMatchOutput.innerHTML = formatMultipleRedGreenMatchResults(results, t);
}

function renderSampleSetResultFromResults(results, dom, t) {
  if (!dom.sampleSetOutput) return;

  if (!results) {
    dom.sampleSetOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.sampleSetOutput.innerHTML = formatMultipleSampleSetResults(results, t);
}

function renderVolumeCompareResultFromSources(sources, dom, t) {
  if (!dom.volumeCompareOutput) return null;

  if (!sources) {
    dom.volumeCompareOutput.innerHTML = t("noFileLoaded");
    return null;
  }

  const thresholdOnly = dom.volumeCompareThresholdOnly
    ? dom.volumeCompareThresholdOnly.checked
    : false;

  const result = runVolumeCompareCheck(sources, {
    thresholdOnly: dom.volumeCompareThresholdOnly?.checked ?? true,
    thresholdPercent: 5,
    minDurationOnly: dom.volumeCompareMinDurationOnly?.checked ?? true,
    minDurationMs: 50
  });

  dom.volumeCompareOutput.innerHTML = formatVolumeCompareResult(result, t);

  return result;
}

function renderTagResultFromResults(results, dom, t) {
  if (!dom.tagOutput) return;

  if (!results) {
    dom.tagOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.tagOutput.innerHTML = formatMultipleTagResults(results, t);
}

function renderSourceResultFromResults(results, dom, t) {
  if (!dom.sourceOutput) return;

  if (!results) {
    dom.sourceOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.sourceOutput.innerHTML = formatMultipleSourceResults(results, t);
}

function renderSliderSettingsResultFromResults(results, dom, t) {
  if (!dom.sliderSettingsOutput) return;

  if (!results) {
    dom.sliderSettingsOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.sliderSettingsOutput.innerHTML = formatMultipleSliderSettingsResults(results, t);
}

function renderEarlyNoteResultFromResults(results, dom, t) {
  if (!dom.earlyNoteOutput) return;

  if (!results) {
    dom.earlyNoteOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.earlyNoteOutput.innerHTML = formatMultipleEarlyNoteResults(results, t);
}

/** スプレッドタブ */
function renderSpreadResultFromResults(spreadState, dom, t) {
  const results = spreadState?.results;

  if (!results) {
    if (dom.spreadOrderOutput) dom.spreadOrderOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadOdHpOutput) dom.spreadOdHpOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadScrollSpeedOutput) dom.spreadScrollSpeedOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadNoteCountOutput) dom.spreadNoteCountOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadDensityOutput) dom.spreadDensityOutput.innerHTML = t("noFileLoaded");
    if (dom.spreadFinishersOutput) dom.spreadFinishersOutput.innerHTML = t("noFileLoaded");
    return;
  }

  if (dom.spreadOrderOutput) {
    dom.spreadOrderOutput.innerHTML = formatSpreadDiffOrderTable(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadOdHpOutput) {
    dom.spreadOdHpOutput.innerHTML = formatSpreadOdHpTable(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadNoteCountOutput) {
    dom.spreadNoteCountOutput.innerHTML = formatSpreadNoteCountTable(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  if (dom.spreadDensityOutput) {
    dom.spreadDensityOutput.innerHTML = formatSpreadDensityResult(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories,
      dom.spreadDensityMinDiff
        ? parseInt(dom.spreadDensityMinDiff.value, 10)
        : 1
    );
  }

  if (dom.spreadFinishersOutput) {
    dom.spreadFinishersOutput.innerHTML = formatSpreadFinishersTable(
      results,
      t,
      spreadState.diffOrder
    );
  }

  if (dom.spreadScrollSpeedOutput) {
    dom.spreadScrollSpeedOutput.innerHTML = formatSpreadScrollSpeedResult(
      results,
      t,
      spreadState.diffOrder,
      spreadState.manualCategories
    );
  }

  updateSpreadSubtabIssueStates(spreadState);
}

function updateSpreadSubtabIssueStates(spreadState) {
  const results = spreadState?.results;
  const diffOrder = spreadState?.diffOrder;
  const manualCategories = spreadState?.manualCategories ?? {};

  setSpreadSubtabIssueLevel("order", "none");
  setSpreadSubtabIssueLevel("odhp", "none");
  setSpreadSubtabIssueLevel("notes", "none");
  setSpreadSubtabIssueLevel("density", "none");
  setSpreadSubtabIssueLevel("scroll", "none");

  if (!results || !results.length) return;

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const hasUnknownCategory = sortedResults.some(result =>
    getSpreadEffectiveCategory(result, manualCategories) === "unknown"
  );

  if (hasUnknownCategory) {
    setSpreadSubtabIssueLevel("order", "error");
  }

  const hasOdHpWarning = sortedResults.some((result, index) => {
    const prev = sortedResults[index - 1];

    const odLevel = getSpreadOdLevel(result, manualCategories);
    const hpLevel = getSpreadHpLevel(result, manualCategories);
    const ruleLevel = getSpreadOdHpLevel(result, manualCategories);

    let odDeltaWarn = false;
    let hpDeltaWarn = false;

    if (prev) {
      if (prev.od !== null && prev.od !== undefined && result.od !== null && result.od !== undefined) {
        odDeltaWarn = result.od - prev.od < 0;
      }

      if (prev.hp !== null && prev.hp !== undefined && result.hp !== null && result.hp !== undefined) {
        hpDeltaWarn = result.hp - prev.hp > 0;
      }
    }

    return (
      odLevel === "warn" ||
      hpLevel === "warn" ||
      ruleLevel === "warn" ||
      odDeltaWarn ||
      hpDeltaWarn
    );
  });

  if (hasOdHpWarning) {
    setSpreadSubtabIssueLevel("odhp", "warn");
  }

  let noteLevel = "none";

  for (let i = 1; i < sortedResults.length; i++) {
    const prev = sortedResults[i - 1];
    const cur = sortedResults[i];

    const prevNotes = prev.noteCount ?? 0;
    const curNotes = cur.noteCount ?? 0;

    if (prevNotes <= 0) continue;

    const ratio = curNotes / prevNotes;
    const level = getSpreadNoteRatioLevel(ratio, prev, cur, manualCategories);

    if (level === "error") {
      noteLevel = "error";
      break;
    }

    if (level === "warn") {
      noteLevel = "warn";
    }
  }

  let scrollLevel = "none";

  setSpreadSubtabIssueLevel("notes", noteLevel);

  for (const result of sortedResults) {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    const rapidChanges = result.scrollSpeed?.rapidChanges ?? [];

    const hasWarn = rapidChanges.some(change =>
      getSpreadRapidScrollLevel(change, category) === "warn"
    );

    if (hasWarn) {
      scrollLevel = "warn";
      break;
    }
  }

  const densityMinDiff = document.getElementById("spreadDensityMinDiff")
    ? parseInt(document.getElementById("spreadDensityMinDiff").value, 10)
    : 1;

  const densityAnalysis = analyzeSpreadDensityInversions(
    sortedResults,
    manualCategories,
    densityMinDiff
  );

  if (densityAnalysis.issueGroups.length) {
    setSpreadSubtabIssueLevel("density", "warn");
  }

  const progression = analyzeSpreadScrollSpeedProgressionByEvent(sortedResults, manualCategories);

  if (progression.issueGroups.length) {
    scrollLevel = "warn";
  }

  const consistency = analyzeSpreadScrollChangeConsistency(sortedResults, manualCategories);

  if (consistency.issueGroups.length) {
    scrollLevel = "warn";
  }

  setSpreadSubtabIssueLevel("scroll", scrollLevel);
}

function setSpreadSubtabIssueLevel(tabName, level) {
  const button = document.querySelector(`.spread-subtab-button[data-spread-subtab="${tabName}"]`);
  if (!button) return;

  button.classList.remove("has-warnings", "has-errors");

  if (level === "error") {
    button.classList.add("has-errors");
  } else if (level === "warn") {
    button.classList.add("has-warnings");
  }
}

function formatSpreadDiffOrderTable(results, t, diffOrder = null, manualCategories = {}) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const rows = sortedResults.map((result, index) => {
    const order = String(index + 1);
    const diff = getDifficultyNameText(result.fileName);
    const estimated = formatSpreadSortLabel(result.sortInfo);
    const category = getSpreadEffectiveCategory(result, manualCategories);

    return { result, order, diff, estimated, category, index };
  });

  const headers = {
    order: "Order",
    move: "Move",
    diff: "Diff",
    category: "Category",
    estimated: "Estimated"
  };

  const widths = {
    order: Math.max(5, visibleWidth(headers.order), ...rows.map(r => visibleWidth(r.order))),
    move: 7,
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    category: 16,
    estimated: Math.max(12, visibleWidth(headers.estimated), ...rows.map(r => visibleWidth(r.estimated)))
  };

  const lines = [];

  lines.push(
    `${padStartVisual(headers.order, widths.order)} | ` +
    `${padEndVisual(headers.move, widths.move)} | ` +
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padEndVisual(headers.category, widths.category)} | ` +
    `${padEndVisual(headers.estimated, widths.estimated)}`
  );

  lines.push(
    `${"-".repeat(widths.order)}-+-` +
    `${"-".repeat(widths.move)}-+-` +
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.category)}-+-` +
    `${"-".repeat(widths.estimated)}`
  );

  for (const row of rows) {
    const upDisabled = row.index === 0 ? " disabled" : "";
    const downDisabled = row.index === rows.length - 1 ? " disabled" : "";

    const moveButtons =
      `<button class="spread-order-button" data-spread-order-action="up" data-file-name="${escapeHtml(row.result.fileName)}"${upDisabled}>↑</button>` +
      `<button class="spread-order-button" data-spread-order-action="down" data-file-name="${escapeHtml(row.result.fileName)}"${downDisabled}>↓</button>`;

    const categorySelect = formatSpreadCategorySelect(row.result.fileName, row.category);

    const diffText = getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    lines.push(
      `${padStartVisual(row.order, widths.order)} | ` +
      `${moveButtons} | ` +
      `${diffText} | ` +
      `${categorySelect} | ` +
      `${padEndVisual(row.estimated, widths.estimated)}`
    );
  }

  return `<pre>${lines.join("\n")}</pre>`;
}

function formatSpreadCategorySelect(fileName, selectedCategory) {
  const options = [
    ["kantan", "Kantan"],
    ["futsuu", "Futsuu"],
    ["muzukashii", "Muzukashii"],
    ["oni", "Oni"],
    ["innerPlus", "Inner Oni+"],
    ["unknown", "Unknown"]
  ];

  const extraClass = selectedCategory === "unknown"
    ? " spread-category-unknown"
    : "";

  return `<select class="spread-category-select${extraClass}" data-file-name="${escapeHtml(fileName)}">` +
    options.map(([value, label]) => {
      const selected = value === selectedCategory ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    }).join("") +
    `</select>`;
}

function formatSpreadSortLabel(sortInfo) {
  if (!sortInfo) return "Unknown";

  const baseNames = {
    "-1": "Below Kantan",
    "0": "Kantan",
    "1": "Futsuu",
    "2": "Muzukashii",
    "3": "Oni",
    "4": "Above Oni",
    "999": "Unknown"
  };

  const base = baseNames[String(sortInfo.base)] ?? "Unknown";

  if (sortInfo.modifier < 0) return `Lite ${base}`;
  if (sortInfo.modifier === 1) return `Inner ${base}`;
  if (sortInfo.modifier === 2) return `Ura ${base}`;
  if (sortInfo.modifier >= 3) return `Above Inner ${base}`;

  return base;
}

function getSpreadOdHpRule(category) {
  switch (category) {
    case "belowKantan":
    case "kantan":
      return { od: "<= 3", hp: ">= 8", odMax: 3, hpMin: 8 };
    case "futsuu":
      return { od: "<= 4", hp: ">= 7", odMax: 4, hpMin: 7 };
    case "muzukashii":
      return { od: "<= 5", hp: ">= 6", odMax: 5, hpMin: 6 };
    case "oni":
      return { od: ">= 5", hp: ">= 5", odMin: 5, hpMin: 5 };
    case "innerPlus":
      return { od: ">= 6", hp: ">= 5", odMin: 6, hpMin: 5 };
    default:
      return null;
  }
}

function getSpreadOdHpLevel(result, manualCategories = {}) {
  const category = getSpreadEffectiveCategory(result, manualCategories);
  const rule = getSpreadOdHpRule(category);

  const od = result.od;
  const hp = result.hp;

  // ① Unknownカテゴリは常にWarning
  if (category === "unknown" || !rule) {
    return "warn";
  }

  // ③ ルール違反のみError
  if (rule.odMax !== undefined && od > rule.odMax) return "warn";
  if (rule.odMin !== undefined && od < rule.odMin) return "warn";
  if (rule.hpMin !== undefined && hp < rule.hpMin) return "warn";

  return "ok";
}

function getSpreadOdLevel(result, manualCategories = {}) {
  const category = getSpreadEffectiveCategory(result, manualCategories);
  const rule = getSpreadOdHpRule(category);

  if (category === "unknown" || !rule) return "warn";

  const od = result.od;
  if (od === null || od === undefined) return "warn";

  if (rule.odMax !== undefined && od > rule.odMax) return "warn";
  if (rule.odMin !== undefined && od < rule.odMin) return "warn";

  return "ok";
}

function getSpreadHpLevel(result, manualCategories = {}) {
  const category = getSpreadEffectiveCategory(result, manualCategories);
  const rule = getSpreadOdHpRule(category);

  if (category === "unknown" || !rule) return "warn";

  const hp = result.hp;
  if (hp === null || hp === undefined) return "warn";

  if (rule.hpMin !== undefined && hp < rule.hpMin) return "warn";

  return "ok";
}

function formatSpreadOdHpRuleText(category) {
  const rule = getSpreadOdHpRule(category);

  if (!rule) return "Unknown";

  return `OD ${rule.od} / HP ${rule.hp}`;
}

function formatSpreadOdHpStatus(level) {
  if (level === "warn") return "Warning";
  if (level === "error") return "Error";
  return "ok";
}

function formatSpreadOdHpTable(results, t, diffOrder = null, manualCategories = {}) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const rows = sortedResults.map((result, index) => {
    const prev = sortedResults[index - 1];

    const diff = getDifficultyNameText(result.fileName);
    const od = formatSpreadValue(result.od);
    const hp = formatSpreadValue(result.hp);

    const category = getSpreadEffectiveCategory(result, manualCategories);
    const rule = formatSpreadOdHpRuleText(category);

    let odDelta = null;
    let hpDelta = null;

    if (prev) {
      if (prev.od !== null && prev.od !== undefined && result.od !== null && result.od !== undefined) {
        odDelta = result.od - prev.od;
      }

      if (prev.hp !== null && prev.hp !== undefined && result.hp !== null && result.hp !== undefined) {
        hpDelta = result.hp - prev.hp;
      }
    }

    const ruleLevel = getSpreadOdHpLevel(result, manualCategories);
    const odLevel = getSpreadOdLevel(result, manualCategories);
    const hpLevel = getSpreadHpLevel(result, manualCategories);

    // ODは上がるのが正常。下がったらWarning（+0 もwarning）
    const odDeltaLevel =
      odDelta !== null && odDelta < 0
        ? "warn"
        : "ok";

    // HPは下がるのが正常。上がったらWarning（+0 はwarningしない）
    const hpDeltaLevel =
      hpDelta !== null && hpDelta !== undefined && hpDelta > 0
        ? "warn"
        : "ok";

    const statusLevel =
      ruleLevel === "warn" || odDeltaLevel === "warn" || hpDeltaLevel === "warn"
        ? "warn"
        : "ok";

    const status = formatSpreadOdHpStatus(statusLevel);

    return {
      result,
      diff,
      od,
      hp,
      odDelta,
      hpDelta,
      category,
      rule,
      ruleLevel,
      odLevel,
      hpLevel,
      odDeltaLevel,
      hpDeltaLevel,
      statusLevel,
      status
    };
  });

  const headers = {
    diff: "Diff",
    od: "OD",
    odDelta: "Delta OD",
    hp: "HP",
    hpDelta: "Delta HP",
    rule: "Rule",
    status: "Status"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    od: Math.max(4, visibleWidth(headers.od), ...rows.map(r => visibleWidth(r.od))),
    odDelta: Math.max(4, visibleWidth(headers.odDelta), ...rows.map(r => visibleWidth(formatSpreadDelta(r.odDelta)))),
    hp: Math.max(4, visibleWidth(headers.hp), ...rows.map(r => visibleWidth(r.hp))),
    hpDelta: Math.max(4, visibleWidth(headers.hpDelta), ...rows.map(r => visibleWidth(formatSpreadDelta(r.hpDelta)))),
    rule: Math.max(16, visibleWidth(headers.rule), ...rows.map(r => visibleWidth(r.rule))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.status)))
  };

  const lines = [];

  // ヘッダー：1回だけ
  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.od, widths.od)} | ` +
    `${padStartVisual(headers.odDelta, widths.odDelta)} | ` +
    `${padStartVisual(headers.hp, widths.hp)} | ` +
    `${padStartVisual(headers.hpDelta, widths.hpDelta)} | ` +
    `${padEndVisual(headers.rule, widths.rule)} | ` +
    `${padStartVisual(headers.status, widths.status)}`
  );

  // 区切り線：1回だけ
  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.od)}-+-` +
    `${"-".repeat(widths.odDelta)}-+-` +
    `${"-".repeat(widths.hp)}-+-` +
    `${"-".repeat(widths.hpDelta)}-+-` +
    `${"-".repeat(widths.rule)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  // データ行：ここだけループ
  for (const row of rows) {
    const diffText = getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const odText = padStartVisual(row.od, widths.od);
    const odDeltaText = padStartVisual(formatSpreadDelta(row.odDelta), widths.odDelta);
    const hpText = padStartVisual(row.hp, widths.hp);
    const hpDeltaText = padStartVisual(formatSpreadDelta(row.hpDelta), widths.hpDelta);
    const ruleText = padEndVisual(row.rule, widths.rule);
    const statusText = padStartVisual(row.status, widths.status);

    lines.push(
      `${diffText} | ` +
      `${wrapSpreadLevel(odText, row.odLevel)} | ` +
      `${wrapSpreadLevel(odDeltaText, row.odDeltaLevel)} | ` +
      `${wrapSpreadLevel(hpText, row.hpLevel)} | ` +
      `${wrapSpreadLevel(hpDeltaText, row.hpDeltaLevel)} | ` +
      `${wrapSpreadLevel(ruleText, row.ruleLevel)} | ` +
      `${wrapSpreadLevel(statusText, row.statusLevel)}`
    );
  }

  return lines.join("\n");
}

function sortSpreadResults(results) {
  return [...results].sort((a, b) => {
    const sa = a.sortInfo?.score ?? 9999;
    const sb = b.sortInfo?.score ?? 9999;

    if (sa !== sb) return sa - sb;

    const aCategory = getSpreadAutoCategory(a.sortInfo);
    const bCategory = getSpreadAutoCategory(b.sortInfo);

    if (
      aCategory === "unknown" &&
      bCategory === "unknown"
    ) {
      if (a.noteCount !== b.noteCount) {
        return a.noteCount - b.noteCount;
      }
    }

    return getDifficultyNameText(a.fileName)
      .localeCompare(getDifficultyNameText(b.fileName));
  });
}

function formatSpreadValue(value) {
  return value === null || value === undefined ? "N/A" : String(value);
}

function formatSpreadDelta(delta) {
  if (delta === null || delta === undefined) return "N/A";

  const rounded = Math.round(delta * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return rounded >= 0 ? `+${text}` : text;
}

function formatSpreadRatio(ratio) {
  if (ratio === null || ratio === undefined) return "N/A";
  return `x${ratio.toFixed(2)}`;
}

function wrapSpreadLevel(text, level) {
  if (level === "error") {
    return `<span class="result-error">${escapeHtml(text)}</span>`;
  }

  if (level === "warn") {
    return `<span class="result-warn">${escapeHtml(text)}</span>`;
  }

  return escapeHtml(text);
}

function formatSpreadNoteCountTable(results, t, diffOrder = null, manualCategories = {}) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const rows = sortedResults.map((result, index) => {
    const prev = sortedResults[index - 1];

    const diff = getDifficultyNameText(result.fileName);
    const notes = result.noteCount ?? 0;

    let delta = null;
    let ratio = null;

    if (prev) {
      const prevNotes = prev.noteCount ?? 0;
      delta = notes - prevNotes;
      ratio = prevNotes > 0 ? notes / prevNotes : null;
    }

    const deltaText = formatSpreadDelta(delta);
    const ratioText = formatSpreadRatio(ratio);
    const level = getSpreadNoteRatioLevel(ratio, prev, result, manualCategories);

    return {
      result,
      diff,
      notes,
      delta,
      ratio,
      deltaText,
      ratioText,
      level
    };
  });

  const headers = {
    diff: "Diff",
    notes: "Notes",
    delta: "Delta prev",
    ratio: "Ratio",
    status: "Status"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    notes: Math.max(5, visibleWidth(headers.notes), ...rows.map(r => visibleWidth(String(r.notes)))),
    delta: Math.max(6, visibleWidth(headers.delta), ...rows.map(r => visibleWidth(r.deltaText))),
    ratio: Math.max(5, visibleWidth(headers.ratio), ...rows.map(r => visibleWidth(r.ratioText))),
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(formatSpreadNoteStatus(r.level))))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.notes, widths.notes)} | ` +
    `${padStartVisual(headers.delta, widths.delta)} | ` +
    `${padStartVisual(headers.ratio, widths.ratio)} | ` +
    `${padStartVisual(headers.status, widths.status)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.notes)}-+-` +
    `${"-".repeat(widths.delta)}-+-` +
    `${"-".repeat(widths.ratio)}-+-` +
    `${"-".repeat(widths.status)}`
  );

  for (const row of rows) {
    const diffText = getDifficultyName(row.result.fileName) +
      " ".repeat(widths.diff - visibleWidth(row.diff));

    const statusText = formatSpreadNoteStatus(row.level);

    lines.push(
      `${diffText} | ` +
      `${padStartVisual(String(row.notes), widths.notes)} | ` +
      `${wrapSpreadLevel(padStartVisual(row.deltaText, widths.delta), row.level)} | ` +
      `${wrapSpreadLevel(padStartVisual(row.ratioText, widths.ratio), row.level)} | ` +
      `${wrapSpreadLevel(padStartVisual(statusText, widths.status), row.level)}`
    );
  }

  return lines.join("\n");
}

function formatSpreadNoteStatus(level) {
  if (level === "error") return "Error";
  if (level === "warn") return "Warning";
  if (level === "ok") return "OK";
  return "N/A";
}

function formatSpreadOdHpDelta(odDelta, hpDelta) {
  if (odDelta === null && hpDelta === null) return "N/A";

  const odText =
    odDelta === null ? "-" : (odDelta >= 0 ? `+${odDelta}` : `${odDelta}`);

  const hpText =
    hpDelta === null ? "-" : (hpDelta >= 0 ? `+${hpDelta}` : `${hpDelta}`);

  return `OD:${odText} HP:${hpText}`;
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

  return sections.filter(Boolean).join("\n\n==============================\n\n");
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

/** その他タブ：東方のソースチェック */
function renderSourceResult(results, dom, t) {
  if (!dom.sourceOutput) return;

  if (!results) {
    dom.sourceOutput.innerHTML = t("noFileLoaded");
    return;
  }

  const lines = [];

  for (const result of results) {
    lines.push(`${getDifficultyName(result.fileName)}`);
    lines.push("");

    if (result.level === "ok") {
      lines.push(`OK`);
      lines.push(`<a href="${result.link}" target="_blank">${result.link}</a>`);
    } else if (result.type === "generic") {
      lines.push(`作品名を記述する必要があるかもしれません`);
    } else if (result.type === "partial") {
      lines.push(`表記が不正です`);
      lines.push(`→ ${result.expected}`);
    } else if (result.type === "unknown") {
      lines.push(`自分で検索して正しいSourceを確認してください`);
    }

    lines.push("");
    lines.push("==============================");
    lines.push("");
  }

  dom.sourceOutput.innerHTML = lines.join("\n");
}

/** その他タブ：プレビューポイント */
function renderPreviewPointResultFromResults(results, dom, t) {
  if (!dom.previewPointOutput) return;

  if (!results) {
    dom.previewPointOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.previewPointOutput.innerHTML = formatPreviewPointResult(results, t);
}

/** その他タブ：てんかん警告 */
function renderEpilepsyWarningResultFromResults(results, dom, t) {
  if (!dom.epilepsyWarningOutput) return;

  if (!results) {
    dom.epilepsyWarningOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.epilepsyWarningOutput.innerHTML = formatMultipleEpilepsyWarningResults(results, t);
}

/** アーティスト・タイトル */
function renderArtistResultFromResults(results, dom, t) {
  if (!dom.artistOutput) return;

  if (!results) {
    dom.artistOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.artistOutput.innerHTML = formatMultipleArtistResults(results, t);
}

function renderTitleResultFromResults(results, dom, t) {
  if (!dom.titleOutput) return;

  if (!results) {
    dom.titleOutput.innerHTML = t("noFileLoaded");
    return;
  }

  dom.titleOutput.innerHTML = formatMultipleTitleResults(results, t);
}

/** 低難易度のスクロール速度 */
function formatSpreadScrollSpeedResult(results, t, diffOrder = null, manualCategories = {}) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const lines = [];

  lines.push(formatSpreadScrollSpeedSummaryTable(sortedResults, t, manualCategories));
  lines.push("");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(formatSpreadRapidScrollChanges(sortedResults, t, manualCategories));
  lines.push("");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(formatSpreadScrollSpeedProgressionByEvent(sortedResults, t, manualCategories));
  lines.push("");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(formatSpreadScrollChangeConsistency(sortedResults, t, manualCategories));

  return lines.join("\n").trimEnd();
}

function formatSpreadScrollSpeedSummaryTable(results, t, manualCategories = {}) {
  const rows = results.map(result => {
    const summary = result.scrollSpeed?.summary;
    const category = getSpreadEffectiveCategory(result, manualCategories);

    return {
      result,
      diff: getDifficultyNameText(result.fileName),
      category,
      min: summary ? formatSpreadScrollSpeed(summary.minSpeed) : "N/A",
      max: summary ? formatSpreadScrollSpeed(summary.maxSpeed) : "N/A",
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
    category: "Category",
    min: "Min px/s",
    max: "Max px/s",
    delta: "Delta",
    ratio: "Ratio",
    sv: "SV range",
    sm: "SM"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    category: Math.max(8, visibleWidth(headers.category), ...rows.map(r => visibleWidth(r.category))),
    min: Math.max(8, visibleWidth(headers.min), ...rows.map(r => visibleWidth(r.min))),
    max: Math.max(8, visibleWidth(headers.max), ...rows.map(r => visibleWidth(r.max))),
    delta: Math.max(7, visibleWidth(headers.delta), ...rows.map(r => visibleWidth(r.delta))),
    ratio: Math.max(5, visibleWidth(headers.ratio), ...rows.map(r => visibleWidth(r.ratio))),
    sv: Math.max(8, visibleWidth(headers.sv), ...rows.map(r => visibleWidth(r.sv))),
    sm: Math.max(4, visibleWidth(headers.sm), ...rows.map(r => visibleWidth(String(r.sm))))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padEndVisual(headers.category, widths.category)} | ` +
    `${padStartVisual(headers.min, widths.min)} | ` +
    `${padStartVisual(headers.max, widths.max)} | ` +
    `${padStartVisual(headers.delta, widths.delta)} | ` +
    `${padStartVisual(headers.ratio, widths.ratio)} | ` +
    `${padEndVisual(headers.sv, widths.sv)} | ` +
    `${padStartVisual(headers.sm, widths.sm)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.category)}-+-` +
    `${"-".repeat(widths.min)}-+-` +
    `${"-".repeat(widths.max)}-+-` +
    `${"-".repeat(widths.delta)}-+-` +
    `${"-".repeat(widths.ratio)}-+-` +
    `${"-".repeat(widths.sv)}-+-` +
    `${"-".repeat(widths.sm)}`
  );

  for (const row of rows) {
    lines.push(
      `${getDifficultyName(row.result.fileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${padEndVisual(row.category, widths.category)} | ` +
      `${padStartVisual(row.min, widths.min)} | ` +
      `${padStartVisual(row.max, widths.max)} | ` +
      `${padStartVisual(row.delta, widths.delta)} | ` +
      `${padStartVisual(row.ratio, widths.ratio)} | ` +
      `${padEndVisual(row.sv, widths.sv)} | ` +
      `${padStartVisual(String(row.sm), widths.sm)}`
    );
  }

  return lines.join("\n");
}

function formatSpreadRapidScrollChanges(results, t, manualCategories = {}) {
  const lines = [];

  lines.push(t("spreadRapidScrollChanges"));

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
const SPREAD_SCROLL_CONSISTENCY_GROUP_TOLERANCE_MS = 10;
const SPREAD_SCROLL_CONSISTENCY_MIN_ABS_DELTA = 80;
const SPREAD_SCROLL_CONSISTENCY_STRONGER_RATIO = 1.5;
const SPREAD_SCROLL_CONSISTENCY_STRONGER_DELTA = 150;
const SPREAD_SCROLL_CONSISTENCY_DIRECTION_DELTA = 120;

function formatSpreadScrollChangeConsistency(results, t, manualCategories = {}) {
  const analysis = analyzeSpreadScrollChangeConsistency(results, manualCategories);

  const lines = [];

  lines.push(t("spreadScrollChangeConsistency"));

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
const SPREAD_SCROLL_PROGRESSION_GROUP_TOLERANCE_MS = 10;
const SPREAD_SCROLL_PROGRESSION_MIN_ABS_DELTA = 80;
const SPREAD_SCROLL_PROGRESSION_SPEED_TOLERANCE = 5;

function formatSpreadScrollSpeedProgressionByEvent(results, t, manualCategories = {}) {
  const analysis = analyzeSpreadScrollSpeedProgressionByEvent(results, manualCategories);

  const lines = [];

  lines.push(t("spreadScrollSpeedProgression"));

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

function analyzeSpreadScrollSpeedProgressionByEvent(results, manualCategories = {}) {
  const comparableResults = results.filter(result => {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    return category !== "unknown";
  });

  const events = [];

  for (const result of comparableResults) {
    for (const change of result.scrollSpeed?.rapidChanges ?? []) {
      if (change.absDelta < SPREAD_SCROLL_PROGRESSION_MIN_ABS_DELTA) continue;

      events.push({
        fileName: result.fileName,
        time: change.toTime,
        event: change
      });
    }
  }

  events.sort((a, b) => a.time - b.time);

  const groups = [];

  for (const event of events) {
    const last = groups[groups.length - 1];

    if (
      last &&
      Math.abs(event.time - last.time) <= SPREAD_SCROLL_PROGRESSION_GROUP_TOLERANCE_MS
    ) {
      last.items.push(event);
      last.time = Math.round(
        last.items.reduce((sum, item) => sum + item.time, 0) / last.items.length
      );
    } else {
      groups.push({
        time: event.time,
        items: [event]
      });
    }
  }

  const issueGroups = [];

  for (const group of groups) {
    const byFileName = new Map(
      group.items.map(item => [item.fileName, item.event])
    );

    const rows = comparableResults
      .map(result => ({
        fileName: result.fileName,
        event: byFileName.get(result.fileName) ?? null
      }))
      .filter(row => row.event);

    if (rows.length < 3) continue;

    const issues = [];
    let expectedDirection = "flat";

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];

      const delta = cur.event.afterSpeed - prev.event.afterSpeed;
      const direction = getSpreadScrollProgressionDirection(delta);

      if (direction === "flat") continue;

      if (expectedDirection === "flat") {
        expectedDirection = direction;
        continue;
      }

      if (direction !== expectedDirection) {
        issues.push({
          type: "scrollSpeedProgressionMismatch",
          prev,
          cur,
          prevDirection: expectedDirection,
          curDirection: direction
        });
      }
    }

    if (issues.length) {
      issueGroups.push({
        ...group,
        issues
      });
    }
  }

  return {
    groups,
    issueGroups
  };
}

function getSpreadScrollProgressionDirection(delta) {
  if (Math.abs(delta) <= SPREAD_SCROLL_PROGRESSION_SPEED_TOLERANCE) {
    return "flat";
  }

  return delta > 0 ? "up" : "down";
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

function analyzeSpreadScrollChangeConsistency(results, manualCategories = {}) {
  const comparableResults = results.filter(result => {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    return category !== "unknown";
  });

  const events = [];

  for (const result of comparableResults) {
    for (const change of result.scrollSpeed?.rapidChanges ?? []) {
      if (change.absDelta < SPREAD_SCROLL_CONSISTENCY_MIN_ABS_DELTA) continue;

      events.push({
        fileName: result.fileName,
        time: change.toTime,
        event: change
      });
    }
  }

  events.sort((a, b) => a.time - b.time);

  const groups = [];

  for (const event of events) {
    const last = groups[groups.length - 1];

    if (
      last &&
      Math.abs(event.time - last.time) <= SPREAD_SCROLL_CONSISTENCY_GROUP_TOLERANCE_MS
    ) {
      last.items.push(event);
      last.time = Math.round(
        last.items.reduce((sum, item) => sum + item.time, 0) / last.items.length
      );
    } else {
      groups.push({
        time: event.time,
        items: [event]
      });
    }
  }

  const issueGroups = [];

  for (const group of groups) {
    const issues = [];

    const byFileName = new Map(
      group.items.map(item => [item.fileName, item.event])
    );

    for (let i = 1; i < comparableResults.length; i++) {
      const lower = comparableResults[i - 1];
      const higher = comparableResults[i];

      const lowerEvent = byFileName.get(lower.fileName);
      const higherEvent = byFileName.get(higher.fileName);

      if (!lowerEvent || !higherEvent) continue;

      const lowerAbs = lowerEvent.absDelta;
      const higherAbs = higherEvent.absDelta;

      if (
        higherAbs > 0 &&
        lowerAbs >= higherAbs * SPREAD_SCROLL_CONSISTENCY_STRONGER_RATIO &&
        lowerAbs - higherAbs >= SPREAD_SCROLL_CONSISTENCY_STRONGER_DELTA
      ) {
        issues.push({
          type: "strongerLowerDiff",
          lower: {
            fileName: lower.fileName,
            event: lowerEvent
          },
          higher: {
            fileName: higher.fileName,
            event: higherEvent
          }
        });
      }

      const lowerDirection = Math.sign(lowerEvent.delta);
      const higherDirection = Math.sign(higherEvent.delta);

      if (
        lowerDirection !== 0 &&
        higherDirection !== 0 &&
        lowerDirection !== higherDirection &&
        lowerAbs >= SPREAD_SCROLL_CONSISTENCY_DIRECTION_DELTA &&
        higherAbs >= SPREAD_SCROLL_CONSISTENCY_DIRECTION_DELTA
      ) {
        issues.push({
          type: "directionMismatch",
          lower: {
            fileName: lower.fileName,
            event: lowerEvent
          },
          higher: {
            fileName: higher.fileName,
            event: higherEvent
          }
        });
      }
    }

    if (issues.length) {
      issueGroups.push({
        ...group,
        issues
      });
    }
  }

  return {
    groups,
    issueGroups
  };
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
const SPREAD_DENSITY_GROUP_TOLERANCE_MS = 10;

function formatSpreadDensityResult(results, t, diffOrder = null, manualCategories = {}, minDiff = 1) {
  if (!results.length) {
    return t("noOsuFiles");
  }

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const analysis = analyzeSpreadDensityInversions(sortedResults, manualCategories, minDiff);

  const lines = [];

  lines.push(t("spreadDensityInversions"));

  if (!analysis.issueGroups.length) {
    lines.push("");
    lines.push(t("spreadNoDensityInversions"));
    return lines.join("\n");
  }

  for (const group of analysis.issueGroups) {
    lines.push("");
    lines.push(`${formatTimestampLink(group.start)} - ${formatTimestampLink(group.end)}`);
    lines.push(formatSpreadDensityGroupTable(group, sortedResults));

    lines.push("");
    lines.push(t("spreadDensityReview"));

    for (const issue of group.issues) {
      lines.push(
        `<span class="result-warn">` +
        `${getDifficultyName(issue.lower.fileName)} ${t("spreadHasMoreNotesThan")} ${getDifficultyName(issue.higher.fileName)} ` +
        `(${issue.lower.count} > ${issue.higher.count})` +
        `</span>`
      );
    }
  }

  return lines.join("\n");
}

function analyzeSpreadDensityInversions(results, manualCategories = {}, minDiff = 1) {
  const comparableResults = results.filter(result => {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    return category !== "unknown";
  });

  const groups = createSpreadDensityComparisonGroups(comparableResults);
  const issueGroups = [];

  for (const group of groups) {
    const issues = [];

    for (let i = 1; i < comparableResults.length; i++) {
      const lower = comparableResults[i - 1];
      const higher = comparableResults[i];

      const lowerMeasure = group.measuresByFileName.get(lower.fileName);
      const higherMeasure = group.measuresByFileName.get(higher.fileName);

      if (!lowerMeasure || !higherMeasure) continue;

      if (lowerMeasure.noteCount - higherMeasure.noteCount >= minDiff) {
        issues.push({
          lower: {
            fileName: lower.fileName,
            count: lowerMeasure.noteCount
          },
          higher: {
            fileName: higher.fileName,
            count: higherMeasure.noteCount
          }
        });
      }
    }

    if (issues.length) {
      issueGroups.push({
        ...group,
        issues
      });
    }
  }

  return {
    groups,
    issueGroups
  };
}

function createSpreadDensityComparisonGroups(results) {
  const rawItems = [];

  for (const result of results) {
    for (const measure of result.density?.measures ?? []) {
      rawItems.push({
        fileName: result.fileName,
        start: measure.start,
        end: measure.end,
        noteCount: measure.noteCount
      });
    }
  }

  rawItems.sort((a, b) => a.start - b.start);

  const groups = [];

  for (const item of rawItems) {
    const last = groups[groups.length - 1];

    if (
      last &&
      Math.abs(item.start - last.start) <= SPREAD_DENSITY_GROUP_TOLERANCE_MS
    ) {
      last.items.push(item);
      last.start = Math.round(
        last.items.reduce((sum, x) => sum + x.start, 0) / last.items.length
      );
      last.end = Math.round(
        last.items.reduce((sum, x) => sum + x.end, 0) / last.items.length
      );
    } else {
      groups.push({
        start: item.start,
        end: item.end,
        items: [item]
      });
    }
  }

  return groups.map(group => ({
    ...group,
    measuresByFileName: new Map(
      group.items.map(item => [item.fileName, item])
    )
  }));
}

function formatSpreadDensityGroupTable(group, results) {
  const rows = results.map(result => {
    const measure = group.measuresByFileName.get(result.fileName);

    return {
      fileName: result.fileName,
      diff: getDifficultyNameText(result.fileName),
      count: measure ? String(measure.noteCount) : "-"
    };
  });

  const headers = {
    diff: "Diff",
    count: "Notes / measure"
  };

  const widths = {
    diff: Math.max(10, visibleWidth(headers.diff), ...rows.map(r => visibleWidth(r.diff))),
    count: Math.max(15, visibleWidth(headers.count), ...rows.map(r => visibleWidth(r.count)))
  };

  const lines = [];

  lines.push(
    `${padEndVisual(headers.diff, widths.diff)} | ` +
    `${padStartVisual(headers.count, widths.count)}`
  );

  lines.push(
    `${"-".repeat(widths.diff)}-+-` +
    `${"-".repeat(widths.count)}`
  );

  for (const row of rows) {
    lines.push(
      `${getDifficultyName(row.fileName)}${" ".repeat(widths.diff - visibleWidth(row.diff))} | ` +
      `${padStartVisual(row.count, widths.count)}`
    );
  }

  return lines.join("\n");
}