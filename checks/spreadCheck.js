function runSpreadCheck(text, fileName) {
  const difficulty = parseSpreadDifficulty(text);

  return {
    fileName,
    od: difficulty.od,
    hp: difficulty.hp,
    noteCount: countCircleNotes(text),
    finishers: collectSpreadFinishers(text),
    sortInfo: getSpreadSortInfo(fileName)
  };
}

function collectSpreadFinishers(text) {
  const hitObjects = parseHitObjects(text);
  const finishers = [];

  for (const line of hitObjects) {
    const parts = line.split(",");
    if (parts.length < 5) continue;

    const time = parseInt(parts[2], 10);
    const type = parseInt(parts[3], 10);
    const hitSound = parseInt(parts[4], 10) || 0;

    if (Number.isNaN(time) || Number.isNaN(type)) continue;

    // Circleのみ対象。Slider / Spinnerは除外
    if ((type & 1) === 0) continue;

    const hasFinish = (hitSound & 4) !== 0;
    if (!hasFinish) continue;

    const hasWhistle = (hitSound & 2) !== 0;
    const hasClap = (hitSound & 8) !== 0;
    const isKat = hasWhistle || hasClap;

    finishers.push({
      time,
      kind: isKat ? "K" : "D"
    });
  }

  return finishers;
}

function parseSpreadDifficulty(text) {
  const lines = text.split(/\r?\n/);
  let inDifficulty = false;

  let od = null;
  let hp = null;

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
    }
  }

  return {
    od: Number.isFinite(od) ? od : null,
    hp: Number.isFinite(hp) ? hp : null
  };
}

function getSpreadSortInfo(fileName) {
  const diffName = getDifficultyNameText(fileName);

  const normalized = diffName
    .toLowerCase()
    .replace(/[\[\]]/g, "")
    .replace(/[_-]/g, " ");

  let base = 999;
  let modifier = 0;

  const has = (...words) => words.some(word => normalized.includes(word));

  const isGuestOni =
    /\b.+?'s\s+oni\b/.test(normalized);

  const isPlainOni =
    normalized.trim() === "oni";

  const isModifiedOni =
    /\boni\b/.test(normalized) &&
    !isGuestOni &&
    !isPlainOni;

  if (has("shokyuu", "syokyuu", "shoshinsha", "beginner")) {
    base = -1;
  } else if (has("kantan")) {
    base = 0;
  } else if (has("futsuu")) {
    base = 1;
  } else if (has("muzukashii")) {
    base = 2;
  } else if (has("oni")) {
    base = 3;

    // Oni系の並び順
    // Oni / Guest's Oni      -> 0
    // Inner Oni              -> 1
    // Ura Oni                -> 2
    // その他の「~~~ Oni」    -> 4
    // Hell / Lunatic Oni     -> 3
    if (has("hell", "lunatic")) {
      modifier = 3;
    } else if (has("ura")) {
      modifier = 2;
    } else if (has("inner")) {
      modifier = 1;
    } else if (isModifiedOni) {
      modifier = 4;
    }
  }

  // 下位寄りの修飾子
  if (has("lite", "light", "basic")) {
    modifier -= 1;
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