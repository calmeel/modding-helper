// Share JSON text through DOM, which is visible across userscript sandboxes.
// Do not pass JS objects or compare sandboxed window identities.
function validateWebsiteImport(payload) {
  if (!payload || !Number.isSafeInteger(payload.setId) || payload.setId <= 0 ||
      !Array.isArray(payload.maps) || !payload.maps.length || payload.maps.length > 256) {
    throw new Error("Invalid beatmap set.");
  }
  const ids = new Set();
  let size = 0;
  for (const map of payload.maps) {
    if (!Number.isSafeInteger(map.id) || map.id <= 0 || ids.has(map.id) ||
        typeof map.text !== "string" || map.text.length > 10 * 1024 * 1024 ||
        !/^\uFEFF?osu file format v\d+/.test(map.text) || parseMode(map.text) !== 1 ||
        Number(parseMetadataValue(map.text, "BeatmapID")) !== map.id ||
        Number(parseMetadataValue(map.text, "BeatmapSetID")) !== payload.setId) {
      throw new Error("Invalid taiko beatmap data.");
    }
    ids.add(map.id);
    size += map.text.length;
  }
  if (size > 32 * 1024 * 1024) throw new Error("Beatmap set is too large.");
  return payload;
}

function setupWebsiteImport({ loadFile, t }) {
  const token = new URLSearchParams(location.hash.slice(1)).get("osu-import");
  if (!/^[a-f0-9-]{36}$/.test(token || "") || window.electronAPI) return;
  const status = document.createElement("p");
  status.id = "websiteImportStatus";
  status.setAttribute("role", "status");
  document.querySelector(".drop-area").after(status);
  status.textContent = t("websiteImportLoading");
  const bridge = document.createElement("div");
  bridge.id = "modding-helper-import-bridge";
  bridge.hidden = true;
  bridge.dataset.token = token;
  let busy = false;
  let expired = false;
  const reply = state => {
    bridge.dataset.state = state;
    bridge.dispatchEvent(new Event("modding-helper-import-state", { bubbles: true }));
  };
  const timeout = setTimeout(() => {
    expired = true;
    clearInterval(poll);
    bridge.removeEventListener("modding-helper-import-data", receive);
    bridge.textContent = "";
    reply("error");
    const reason = busy
      ? "チェック処理がタイムアウトしました / Beatmap processing timed out."
      : "Tampermonkey から譜面データを受信できませんでした。スクリプトと Web 版の両方を更新してください / No userscript data received. Update both the userscript and web app.";
    status.textContent = t("websiteImportError").replace("{error}", reason);
  }, 60000);
  async function receive() {
    if (bridge.dataset.token !== token || busy || expired || !bridge.textContent) return;
    busy = true;
    clearInterval(poll);
    try {
      status.textContent = t("websiteImportProcessing");
      reply("loading");
      const json = bridge.textContent;
      bridge.textContent = "";
      if (json.length > 64 * 1024 * 1024) throw new Error("Beatmap transfer is too large.");
      const payload = validateWebsiteImport(JSON.parse(json));
      const zip = new JSZip();
      // IDs are unique; display labels come from Version inside each .osu.
      for (const map of payload.maps) zip.file(`${map.id}.osu`, map.text);
      const bytes = await zip.generateAsync({ type: "uint8array" });
      if (expired) return;
      const file = new File([bytes], `osu-${payload.setId}-taiko.osz`, { type: "application/zip" });
      const loaded = await loadFile(file, { websiteImport: true });
      if (expired) return;
      if (loaded !== true) throw new Error("Beatmap checks could not be loaded.");
      status.textContent = t("websiteImportLoaded").replace("{count}", payload.maps.length);
      const url = new URL(location.href);
      url.hash = "";
      history.replaceState(null, "", url);
      reply("complete");
    } catch (error) {
      if (expired) return;
      status.textContent = t("websiteImportError").replace("{error}", error.message);
      reply("error");
    } finally {
      clearTimeout(timeout);
      bridge.textContent = "";
      bridge.removeEventListener("modding-helper-import-data", receive);
    }
  }
  // Sandboxed DOM events can be suppressed. The JSON text remains in the DOM,
  // so inspect it too; this interval makes no network requests.
  const poll = setInterval(receive, 250);
  bridge.addEventListener("modding-helper-import-data", receive);
  document.body.append(bridge);
  reply("ready");
}
