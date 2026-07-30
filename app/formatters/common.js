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

function formatSvValue(beatLength) {
  const value = beatLength < 0 ? -100 / beatLength : 1;
  if (!Number.isFinite(value)) return "N/A";
  return (Math.round(value * 1000) / 1000).toString();
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

/** Taiko結果の表示整形関数 */
function formatSortedResults(results, formatter, t) {
  return sortResultsForDisplay(results)
    .map(result => formatter(result, t))
    .join("\n\n");
}

/** Taiko用ソート関数 */
function sortResultsForDisplay(results) {
  return [...results].sort(
    (a, b) => getTaikoDifficultySortKey(a) - getTaikoDifficultySortKey(b)
  );
}

function getTaikoDifficultySortKey(fileNameOrResult) {
  // スプレッド比較・Electronプレビューと同じ難易度分類を使用する。
  // これにより Overdrive Oni などの修飾語付き Oni も Inner Oni より上に並ぶ。
  if (typeof getSpreadSortInfo === "function") {
    const sortInfo = getSpreadSortInfo(fileNameOrResult);

    if (Number.isFinite(sortInfo?.score)) {
      return sortInfo.score;
    }
  }

  const name = normalizeDifficultyName(getDifficultyNameText(fileNameOrResult));

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
