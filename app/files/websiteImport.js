// The userscript bridges its private GM storage to this page. No opener is required.
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
  let busy = false;
  const reply = (type, extra = {}) => window.postMessage({ channel: "modding-helper-import", token, type, ...extra }, location.origin);
  const timeout = setTimeout(() => {
    window.removeEventListener("message", receive);
    status.textContent = t("websiteImportError").replace("{error}", "Tampermonkey との接続がタイムアウトしました / Userscript connection timed out.");
  }, 60000);
  async function receive(event) {
    const data = event.data;
    if (event.source !== window || event.origin !== location.origin ||
        data?.channel !== "modding-helper-import" || data.token !== token) return;
    if (data.type === "hello" && !busy) reply("ready");
    if (data.type !== "data" || busy) return;
    busy = true;
    clearTimeout(timeout);
    try {
      const payload = validateWebsiteImport(data.payload);
      const zip = new JSZip();
      // IDs are unique; display labels come from Version inside each .osu.
      for (const map of payload.maps) zip.file(`${map.id}.osu`, map.text);
      const bytes = await zip.generateAsync({ type: "uint8array" });
      const file = new File([bytes], `osu-${payload.setId}-taiko.osz`, { type: "application/zip" });
      const loaded = await loadFile(file, { websiteImport: true });
      if (loaded !== true) throw new Error("Beatmap checks could not be loaded.");
      status.textContent = t("websiteImportLoaded").replace("{count}", payload.maps.length);
      reply("complete");
      const url = new URL(location.href);
      url.hash = "";
      history.replaceState(null, "", url);
    } catch (error) {
      status.textContent = t("websiteImportError").replace("{error}", error.message);
      reply("error");
    } finally {
      window.removeEventListener("message", receive);
    }
  }
  window.addEventListener("message", receive);
}
