function parseSpreadDifficulty(text) {
  const lines = text.split(/\r?\n/);
  let inDifficulty = false;

  let od = null;
  let hp = null;
  let sliderMultiplier = 1.4; /** .osu に SliderMultiplier: が存在しないケース */

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Difficulty]") {
      inDifficulty = true;
      continue;
    }

    if (inDifficulty) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      if (trimmed.startsWith("OverallDifficulty:")) {
        od = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
      }

      if (trimmed.startsWith("HPDrainRate:")) {
        hp = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
      }

      if (trimmed.startsWith("SliderMultiplier:")) {
        const value = parseFloat(trimmed.slice(trimmed.indexOf(":") + 1));
        if (Number.isFinite(value)) {
          sliderMultiplier = value;
        }
      }
    }
  }

  return {
    od: Number.isFinite(od) ? od : null,
    hp: Number.isFinite(hp) ? hp : null,
    sliderMultiplier
  };
}

function getSpreadSortInfo(fileName) {
  const diffName = getDifficultyNameText(fileName);

  const normalized = diffName
    .toLowerCase()
    .replace(/[\[\]]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let base = 999;
  let modifier = 0;

  const has = (...words) => words.some(word => normalized.includes(word));

  const hasWord = (...words) =>
    words.some(word => new RegExp(`\\b${word}\\b`).test(normalized));

  const isGuestOni =
    /\b.+?'s\s+oni\b/.test(normalized) ||
    /\b.+?s'\s+oni\b/.test(normalized);

  const isPlainOni =
    normalized === "oni";

  const isLiteOni =
    hasWord("lite", "light", "basic") && hasWord("oni");

  const isModifiedOni =
    /\boni\b/.test(normalized) &&
    !isGuestOni &&
    !isPlainOni &&
    !isLiteOni;

  if (has("shokyuu", "syokyuu", "shoshinsha", "beginner")) {
    base = -1;
  } else if (has("kantan")) {
    base = 0;
  } else if (has("futsuu")) {
    base = 1;
  } else if (has("muzukashii")) {
    base = 2;
  } else if (hasWord("oni")) {
    base = 3;

    if (isGuestOni || isPlainOni) {
      modifier = 0;
    } else if (isLiteOni) {
      modifier = -1;
    } else if (hasWord("hell", "lunatic")) {
      modifier = 3;
    } else if (hasWord("ura")) {
      modifier = 2;
    } else if (hasWord("inner")) {
      modifier = 1;
    } else if (isModifiedOni) {
      modifier = 4;
    }
  }

  return {
    base,
    modifier,
    score: base * 10 + modifier
  };
}

function createSpreadDiffOrder(results) {
  if (!results) return [];

  return sortSpreadResults(results).map(result => result.fileName);
}

function applySpreadDiffOrder(results, diffOrder) {
  if (!results) return [];

  const orderMap = new Map(diffOrder.map((fileName, index) => [fileName, index]));

  return [...results].sort((a, b) => {
    const ai = orderMap.has(a.fileName) ? orderMap.get(a.fileName) : 9999;
    const bi = orderMap.has(b.fileName) ? orderMap.get(b.fileName) : 9999;

    if (ai !== bi) return ai - bi;

    return getDifficultyNameText(a.fileName).localeCompare(getDifficultyNameText(b.fileName));
  });
}

function countCircleNotes(text) {
  const lines = text.split(/\r?\n/);

  let inHitObjects = false;
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[HitObjects]") {
      inHitObjects = true;
      continue;
    }

    if (inHitObjects) {
      if (trimmed.startsWith("[")) break;
      if (!trimmed || trimmed.startsWith("//")) continue;

      const parts = trimmed.split(",");
      const type = parseInt(parts[3], 10);

      if (!Number.isNaN(type) && (type & 1) !== 0) {
        count++;
      }
    }
  }

  return count;
}

const SPREAD_CATEGORY_ORDER = {
  belowKantan: -10,
  kantan: 0,
  futsuu: 10,
  muzukashii: 20,
  oni: 30,
  innerPlus: 40,
  unknown: 999
};

function getSpreadAutoCategory(sortInfo) {
  if (!sortInfo || sortInfo.base === 999) return "unknown";

  if (sortInfo.base <= -1) return "belowKantan";
  if (sortInfo.base === 0) return "kantan";
  if (sortInfo.base === 1) return "futsuu";
  if (sortInfo.base === 2) return "muzukashii";

  if (sortInfo.base === 3) {
    return sortInfo.modifier >= 1 ? "innerPlus" : "oni";
  }

  if (sortInfo.base >= 4) return "innerPlus";

  return "unknown";
}

function getSpreadEffectiveCategory(result, manualCategories = {}) {
  return manualCategories[result.fileName] || getSpreadAutoCategory(result.sortInfo);
}

/** spreadのノーツratio条件 */
const SPREAD_NOTE_RATIO_RULES = {
  kantanToFutsuu: {
    errorLow: 1.55,
    warnLow: 1.60,
    warnHigh: 2.15,
    errorHigh: 2.30
  },
  futsuuToMuzukashii: {
    errorLow: 1.20,
    warnLow: 1.27,
    warnHigh: 1.58,
    errorHigh: 1.65
  },
  muzukashiiToOni: {
    errorLow: 1.13,
    warnLow: 1.17,
    warnHigh: 1.48,
    errorHigh: 1.55
  },
  oniToInnerPlus: {
    errorLow: 1.00,
    warnLow: 1.10,
    warnHigh: 1.45,
    errorHigh: 1.55
  },
  innerPlusToInnerPlus: {
    errorLow: 1.00,
    warnLow: 1.02,
    warnHigh: 1.32,
    errorHigh: 1.50
  }
};

function getSpreadNoteRatioLevel(ratio, prevResult = null, curResult = null, manualCategories = {}) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return "none";
  }

  const rule = getSpreadNoteRatioRule(prevResult, curResult, manualCategories);

  if (ratio < rule.errorLow) return "error";
  if (ratio < rule.warnLow) return "warn";
  if (ratio > rule.errorHigh) return "error";
  if (ratio > rule.warnHigh) return "warn";

  return "ok";
}

function getSpreadNoteRatioRule(prevResult, curResult, manualCategories = {}) {
  const prevCategory = prevResult
    ? getSpreadEffectiveCategory(prevResult, manualCategories)
    : "unknown";

  const curCategory = curResult
    ? getSpreadEffectiveCategory(curResult, manualCategories)
    : "unknown";

  if (
    (prevCategory === "belowKantan" && curCategory === "kantan") ||
    (prevCategory === "kantan" && curCategory === "futsuu")
  ) {
    return SPREAD_NOTE_RATIO_RULES.kantanToFutsuu;
  }

  if (prevCategory === "futsuu" && curCategory === "muzukashii") {
    return SPREAD_NOTE_RATIO_RULES.futsuuToMuzukashii;
  }

  if (prevCategory === "muzukashii" && curCategory === "oni") {
    return SPREAD_NOTE_RATIO_RULES.muzukashiiToOni;
  }

  if (prevCategory === "oni" && curCategory === "innerPlus") {
    return SPREAD_NOTE_RATIO_RULES.oniToInnerPlus;
  }

  if (prevCategory === "innerPlus" && curCategory === "innerPlus") {
    return SPREAD_NOTE_RATIO_RULES.innerPlusToInnerPlus;
  }

  // カテゴリが飛んでいる / Unknown / カスタム順の場合の安全側フォールバック
  if (curCategory === "futsuu") return SPREAD_NOTE_RATIO_RULES.kantanToFutsuu;
  if (curCategory === "muzukashii") return SPREAD_NOTE_RATIO_RULES.futsuuToMuzukashii;
  if (curCategory === "oni") return SPREAD_NOTE_RATIO_RULES.muzukashiiToOni;
  if (curCategory === "innerPlus") return SPREAD_NOTE_RATIO_RULES.oniToInnerPlus;

  return SPREAD_NOTE_RATIO_RULES.muzukashiiToOni;
}

function getSpreadCategoryOrder(category) {
  return SPREAD_CATEGORY_ORDER[category] ?? SPREAD_CATEGORY_ORDER.unknown;
}

function moveSpreadDiffToCategory(diffOrder, results, fileName, category, manualCategories = {}) {
  const currentOrder = diffOrder?.length
    ? [...diffOrder]
    : createSpreadDiffOrder(results);

  const withoutTarget = currentOrder.filter(name => name !== fileName);

  const targetOrder = getSpreadCategoryOrder(category);

  let insertIndex = withoutTarget.length;

  for (let i = 0; i < withoutTarget.length; i++) {
    const otherFileName = withoutTarget[i];
    const otherResult = results.find(result => result.fileName === otherFileName);
    if (!otherResult) continue;

    const otherCategory = getSpreadEffectiveCategory(otherResult, manualCategories);
    const otherOrder = getSpreadCategoryOrder(otherCategory);

    if (otherOrder > targetOrder) {
      insertIndex = i;
      break;
    }
  }

  withoutTarget.splice(insertIndex, 0, fileName);
  return withoutTarget;
}

