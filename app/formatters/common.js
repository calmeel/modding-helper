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

function getDifficultyNameText(fileNameOrResult) {
  if (fileNameOrResult && typeof fileNameOrResult === "object") {
    if (fileNameOrResult.difficultyName) {
      return `[${fileNameOrResult.difficultyName}]`;
    }

    return getDifficultyNameText(fileNameOrResult.fileName);
  }

  const fileName = fileNameOrResult;
  if (!fileName) return "[Unknown]";

  const registeredDifficultyName = getRegisteredDifficultyName(fileName);
  if (registeredDifficultyName) {
    return `[${registeredDifficultyName}]`;
  }

  const match = fileName.match(/\[(.*)\]\.osu$/i);

  if (match) {
    return `[${match[1]}]`;
  }

  return fileName;
}

function getDifficultyName(fileNameOrResult) {
  return `<span class="diff-name">${escapeHtml(getDifficultyNameText(fileNameOrResult))}</span>`;
}

function getRegisteredDifficultyName(fileName) {
  if (typeof window === "undefined") return null;

  const registry = window.moddingHelperDifficultyNames;
  if (!registry || typeof registry.get !== "function") return null;

  return registry.get(fileName) || null;
}

/** 表示整形関数 */
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
  const name = normalizeDifficultyName(getDifficultyNameText(fileName));

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
