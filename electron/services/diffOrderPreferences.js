const fs = require('fs');
const path = require('path');

const CATEGORIES = new Set(['belowKantan', 'kantan', 'futsuu', 'muzukashii', 'oni', 'innerPlus', 'unknown']);
const MAX_SAVED_MAPSETS = 1000;

function normalizeFolder(folder) {
  if (typeof folder !== 'string' || !path.win32.isAbsolute(folder)) return null;
  return path.win32.normalize(folder).replace(/[\\/]+$/, '').toLowerCase();
}

function sanitizePreferences(value) {
  if (!value || !Array.isArray(value.diffOrder)) return null;
  const diffOrder = [...new Set(value.diffOrder.filter(name => typeof name === 'string' && name))];
  const names = new Set(diffOrder);
  return {
    ...(value.keyType === 'version' ? { keyType: 'version' } : {}),
    diffOrder,
    manualCategories: Object.fromEntries(Object.entries(value.manualCategories || {})
      .filter(([name, category]) => names.has(name) && CATEGORIES.has(category)))
  };
}

function createDiffOrderPreferences(userDataDirectory, { io = fs.promises, saveDelay = 400, now = Date.now } = {}) {
  const file = path.join(userDataDirectory, 'diff-order-preferences.json');
  let data = { version: 1, mapsets: {} };
  let revision = 0;
  let savedRevision = 0;
  let saveTimer = null;
  let writing = null;
  let activeFolder = null;
  // 起動時に一度だけ読み、以後はメモリ上の状態を使用する。
  const ready = (async () => {
    try {
      const loaded = JSON.parse(await io.readFile(file, 'utf8'));
      if (loaded?.version === 1 && loaded.mapsets && typeof loaded.mapsets === 'object' &&
          !Array.isArray(loaded.mapsets)) data = loaded;
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('Could not read Diff order preferences:', error.message);
    }
  })();

  function prune(protectedFolder = activeFolder) {
    const folders = Object.keys(data.mapsets);
    const excess = folders.length - MAX_SAVED_MAPSETS;
    if (excess <= 0) return false;
    const lastUsed = folder => Number.isFinite(data.mapsets[folder]?.lastUsedAt)
      ? data.mapsets[folder].lastUsedAt : 0;
    const oldest = folders.filter(folder => folder !== protectedFolder)
      .sort((a, b) => lastUsed(a) - lastUsed(b));
    for (const folder of oldest.slice(0, excess)) delete data.mapsets[folder];
    return true;
  }

  function scheduleSave() {
    revision++;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void flush().catch(error => console.warn('Could not save Diff order preferences:', error.message));
    }, saveDelay);
  }

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    // 同じ一時ファイルへの書き込みを直列化する。書き込み中の変更も続けて保存する。
    if (!writing) {
      writing = ready.then(async () => {
        // 上限導入前の保存データも、次の保存・終了時に整理する。
        if (prune()) revision++;
        while (savedRevision < revision) {
          const targetRevision = revision;
          const contents = JSON.stringify(data);
          await io.mkdir(userDataDirectory, { recursive: true });
          await io.writeFile(file + '.tmp', contents, 'utf8');
          await io.rename(file + '.tmp', file);
          savedRevision = targetRevision;
        }
      }).finally(() => { writing = null; });
    }
    return writing;
  }

  return {
    async load(folder) {
      await ready;
      const key = normalizeFolder(folder);
      if (!key) return null;
      activeFolder = key;
      const value = sanitizePreferences(data.mapsets[key]);
      let touched = false;
      const lastUsedAt = now();
      if (value && data.mapsets[key].lastUsedAt !== lastUsedAt) {
        data.mapsets[key].lastUsedAt = lastUsedAt;
        touched = true;
      }
      if (prune(key) || touched) scheduleSave();
      return value;
    },
    async save(folder, preferences) {
      const key = normalizeFolder(folder);
      const value = sanitizePreferences(preferences);
      if (!key || !value) return false;
      await ready;
      const changed = JSON.stringify(sanitizePreferences(data.mapsets[key])) !== JSON.stringify(value);
      if (changed) data.mapsets[key] = { ...value, lastUsedAt: now() };
      if (prune(activeFolder || key) || changed) scheduleSave();
      return true;
    },
    flush
  };
}

module.exports = { createDiffOrderPreferences };
