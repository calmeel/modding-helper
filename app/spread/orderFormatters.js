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
    const rule = ratio !== null && ratio !== undefined && Number.isFinite(ratio)
      ? getSpreadNoteRatioRule(prev, result, manualCategories)
      : null;
    const statusText = formatSpreadNoteStatus(level, rule);

    return {
      result,
      diff,
      notes,
      delta,
      ratio,
      deltaText,
      ratioText,
      level,
      rule,
      statusText
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
    status: Math.max(7, visibleWidth(headers.status), ...rows.map(r => visibleWidth(r.statusText)))
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

    const statusText = row.statusText;

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

function formatSpreadNoteStatus(level, rule = null) {
  if (level === "ok") return "OK";
  if (level === "none") return "N/A";

  const base =
    level === "error" ? "Error" :
    level === "warn" ? "Warning" :
    "N/A";

  if (!rule) return base;

  return `${base} (recommended: x${rule.warnLow.toFixed(2)}–${rule.warnHigh.toFixed(2)})`;
}

function formatSpreadOdHpDelta(odDelta, hpDelta) {
  if (odDelta === null && hpDelta === null) return "N/A";

  const odText =
    odDelta === null ? "-" : (odDelta >= 0 ? `+${odDelta}` : `${odDelta}`);

  const hpText =
    hpDelta === null ? "-" : (hpDelta >= 0 ? `+${hpDelta}` : `${hpDelta}`);

  return `OD:${odText} HP:${hpText}`;
}
