// Electronの読み込みモード、保存監視、再読み込みと状態表示を管理する。
function createOsuSourceController({ t, invalidateLoads, handleFile, clearResults, onModeChanged }) {
  let osuSourceMode        = "file";
  let osuLastLoadedFolder  = null;
  let osuLastSkipped = false;
  let osuLoadId = 0;
  let skipMultipleAudioMapsets = true;
  let osuStatusKey         = "";
  let osuStatusCls         = "";
  function refreshOsuSourceStatus() {
    const el = document.getElementById("osuSourceStatus");
    if (!el) return;
    el.classList.remove("error", "ok");
    if (!osuStatusKey) { el.textContent = ""; return; }
    el.textContent = t(osuStatusKey);
    if (osuStatusCls) el.classList.add(osuStatusCls);
  }

  function setOsuStatus(key, cls) {
    osuStatusKey = key;
    osuStatusCls = cls || "";
    refreshOsuSourceStatus();
  }

  function applyOsuSourceMode(mode) {
    ++osuLoadId;
    invalidateLoads();
    osuLastLoadedFolder = null;
    osuLastSkipped = false;
    osuSourceMode = (mode === "osu") ? "osu" : "file";
    const skipOption = document.getElementById("skipMultipleAudioMapsets");
    if (skipOption) {
      skipOption.disabled = osuSourceMode !== "osu";
      skipOption.checked = osuSourceMode === "osu" && skipMultipleAudioMapsets;
    }
    try { localStorage.setItem("moddingHelperCheckSource", osuSourceMode); } catch {}
    if (window.electronAPI && typeof window.electronAPI.setChartSourceMode === "function") {
      window.electronAPI.setChartSourceMode(osuSourceMode);
    }

    const reloadBtn = document.getElementById("osuReloadBtn");
    if (reloadBtn) reloadBtn.hidden = (osuSourceMode !== "osu");

    if (osuSourceMode === "file") setOsuStatus("", "");
    onModeChanged(osuSourceMode);
  }

  async function loadFromOsu(force) {
    if (osuSourceMode !== "osu") return;
    const loadId = ++osuLoadId;
    invalidateLoads();
    setOsuStatus("osuSourceLoading", "");

    let res;
    try {
      res = await window.electronAPI.getCurrentMapset(force ? null : osuLastLoadedFolder, {
        skipMultipleAudio: skipMultipleAudioMapsets
      });
    } catch {
      if (loadId !== osuLoadId || osuSourceMode !== "osu") return;
      setOsuStatus("osuSourceNoMap", "error");
      return;
    }
    if (loadId !== osuLoadId || osuSourceMode !== "osu") return;

    if (!res) {
      osuLastLoadedFolder = null;
      setOsuStatus("osuSourceNoMap", "error");
      return;
    }
    if (res.unchanged) {
      setOsuStatus(osuLastSkipped ? "osuSourceMultipleAudioSkipped" : "osuSourceLoaded", osuLastSkipped ? "" : "ok");
      return;
    }
    if (res.skipped === "multiple-audio") {
      osuLastLoadedFolder = res.folder;
      osuLastSkipped = true;
      clearResults();
      setOsuStatus("osuSourceMultipleAudioSkipped", "");
      return;
    }

    osuLastSkipped = false;
    try {
      const file = new File([res.buffer], res.name, { type: "application/octet-stream" });
      const songFolderName = String(res.folder ?? "")
        .split(/[\\/]/)
        .filter(Boolean)
        .pop() ?? "";
      await handleFile(file, { songFolderName, mapsetFolder: res.folder });
      if (loadId !== osuLoadId || osuSourceMode !== "osu") return;
      osuLastLoadedFolder = res.folder;
      // フォルダ監視による再解析では osu! 側のファイルパス自体は変わらないため、
      // osuWatcher はメタデータを自動では読み直さない。現在開いている .osu を
      // 明示的に再読込し、メタデータカード（分離窓を含む）とTiming情報を更新する。
      if (typeof window.electronAPI.requestMapInfo === "function") {
        window.electronAPI.requestMapInfo();
      }
      setOsuStatus("osuSourceLoaded", "ok");
    } catch {
      if (loadId !== osuLoadId || osuSourceMode !== "osu") return;
      setOsuStatus("osuSourceNoMap", "error");
    }
  }

  function setupOsuSourceMode() {
    const settings = document.getElementById("osuSourceSettings");
    if (!settings ||
        !window.electronAPI ||
        typeof window.electronAPI.getCurrentMapset !== "function") {
      return;
    }
    settings.hidden = false;

    let saved = "file";
    try { saved = localStorage.getItem("moddingHelperCheckSource") || "file"; } catch {}
    try {
      skipMultipleAudioMapsets = localStorage.getItem("moddingHelperSkipMultipleAudioMapsets") !== "false";
    } catch {}
    const skipOption = document.getElementById("skipMultipleAudioMapsets");
    if (skipOption) skipOption.addEventListener("change", () => {
      if (osuSourceMode !== "osu") return;
      skipMultipleAudioMapsets = skipOption.checked;
      try { localStorage.setItem("moddingHelperSkipMultipleAudioMapsets", String(skipMultipleAudioMapsets)); } catch {}
      osuLastLoadedFolder = null;
      osuLastSkipped = false;
      loadFromOsu(true);
    });

    settings.querySelectorAll('input[name="osuSource"]').forEach(radio => {
      radio.checked = (radio.value === saved);
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        applyOsuSourceMode(radio.value);
        if (radio.value === "osu") loadFromOsu(true);
      });
    });

    const reloadBtn = document.getElementById("osuReloadBtn");
    if (reloadBtn) reloadBtn.addEventListener("click", () => loadFromOsu(true));

    // osu! 側で譜面が変わったら（osu モード時）自動で再読み込み
    if (typeof window.electronAPI.onOsuMapInfo === "function") {
      window.electronAPI.onOsuMapInfo(() => {
        if (osuSourceMode === "osu") loadFromOsu(false);
      });
    }

    // 同じ譜面の .osu が更新（osu! エディタで保存）されたら強制再読み込み
    if (typeof window.electronAPI.onMapsetChanged === "function") {
      window.electronAPI.onMapsetChanged(() => {
        if (osuSourceMode === "osu") loadFromOsu(true);
      });
    }

    applyOsuSourceMode(saved);
    if (saved === "osu") loadFromOsu(true);
  }

  return { setup: setupOsuSourceMode, setMode: applyOsuSourceMode, refreshStatus: refreshOsuSourceStatus,
    get mode() { return osuSourceMode; } };
}
