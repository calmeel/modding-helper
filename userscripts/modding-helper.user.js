// ==UserScript==
// @name         Modding Helper — taiko mapset check
// @namespace    https://github.com/calmeel/modding-helper
// @version      0.1.1
// @updateURL    https://calmeel.github.io/modding-helper/userscripts/modding-helper.user.js
// @downloadURL  https://calmeel.github.io/modding-helper/userscripts/modding-helper.user.js
// @description  Open all taiko difficulties in Modding Helper without downloading audio or backgrounds.
// @match        https://osu.ppy.sh/*
// @match        https://calmeel.github.io/modding-helper/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_openInTab
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  "use strict";
  const helperUrl = "https://calmeel.github.io/modding-helper/";
  const prefix = "modding-helper-import:";
  const ttl = 15 * 60 * 1000;
  const japanese = (document.documentElement.lang || navigator.language).startsWith("ja");
  const label = (ja, en) => japanese ? ja : en;
  const keyFor = token => prefix + token;

  // Remove abandoned transfers, including those whose tab was never opened.
  for (const key of GM_listValues()) {
    if (key.startsWith(prefix)) {
      const value = GM_getValue(key);
      if (!value || Date.now() - value.createdAt > ttl) GM_deleteValue(key);
    }
  }

  if (location.origin === new URL(helperUrl).origin && location.pathname.startsWith("/modding-helper/")) {
    const token = new URLSearchParams(location.hash.slice(1)).get("osu-import");
    if (!/^[a-f0-9-]{36}$/.test(token || "")) return;
    const transfer = GM_getValue(keyFor(token));
    const showError = message => {
      const node = document.createElement("p");
      node.setAttribute("role", "alert");
      node.textContent = message;
      (document.querySelector(".drop-area") || document.body).after(node);
    };
    if (!transfer || Date.now() - transfer.createdAt > ttl) {
      showError(label("譜面データの有効期限が切れています。osu! のページから再実行してください。", "Beatmap transfer expired. Please retry from the osu! page."));
      return;
    }
    let sent = false;
    let finished = false;
    const stop = () => {
      finished = true;
      clearInterval(timer);
      clearTimeout(deadline);
      document.removeEventListener("modding-helper-import-state", receive);
    };
    function receive() {
      if (finished) return;
      const bridge = document.getElementById("modding-helper-import-bridge");
      if (!bridge || bridge.dataset.token !== token) return;
      if (bridge.dataset.state === "ready" && !sent) {
        sent = true;
        bridge.textContent = JSON.stringify(transfer.payload);
        bridge.dispatchEvent(new Event("modding-helper-import-data"));
      } else if (bridge.dataset.state === "complete" && sent) {
        GM_deleteValue(keyFor(token));
        stop();
        bridge.remove();
      } else if (bridge.dataset.state === "error") stop();
    }
    document.addEventListener("modding-helper-import-state", receive);
    // Read persistent state as well as events, so either side may start first.
    const timer = setInterval(receive, 250);
    const deadline = setTimeout(() => {
      stop();
      showError(label("連携がタイムアウトしました。スクリプトと Web 版の両方を更新し、osu! のページから再実行してください。", "Import timed out. Update both the userscript and web app, then retry from osu!."));
    }, 60000);
    receive();
    return;
  }

  async function fetchText(url) {
    const response = await fetch(url, { credentials: "same-origin", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  function mount() {
    const match = location.pathname.match(/^\/beatmapsets\/(\d+)\/?$/);
    const host = document.querySelector(".beatmapset-header__buttons");
    const existing = document.getElementById("modding-helper-launch");
    if (!match || !host) { existing?.remove(); return; }
    if (existing?.dataset.setId === match[1] && host.contains(existing)) return;
    existing?.remove();
    const wrapper = document.createElement("div");
    wrapper.id = "modding-helper-launch";
    wrapper.dataset.setId = match[1];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-osu-big btn-osu-big--beatmapset-header";
    button.textContent = label("taiko 全難易度をチェック", "Check all taiko difficulties");
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    status.style.cssText = "display:block;font-size:12px;max-width:300px;white-space:normal";
    wrapper.append(button, status);
    host.append(wrapper);
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        status.textContent = label("難易度一覧を取得中…", "Fetching difficulties…");
        const setId = Number(wrapper.dataset.setId);
        // Fetch a fresh snapshot: embedded JSON can be stale after SPA navigation.
        const html = await fetchText(`https://osu.ppy.sh/beatmapsets/${setId}`);
        const page = new DOMParser().parseFromString(html, "text/html");
        const set = JSON.parse(page.querySelector("#json-beatmapset")?.textContent || "null");
        if (set?.id !== setId || !Array.isArray(set.beatmaps)) throw new Error(label("難易度一覧を取得できませんでした。", "Could not read the difficulty list."));
        const maps = set.beatmaps.filter(map => map.mode === "taiko" || map.mode_int === 1);
        if (!maps.length) throw new Error(label("taiko の難易度がありません。", "No taiko difficulties found."));
        if (maps.length > 256) throw new Error("Too many difficulties.");
        const payload = { setId, maps: [] };
        let size = 0;
        for (const map of maps) {
          if (!Number.isSafeInteger(map.id) || map.id <= 0) throw new Error("Invalid beatmap ID.");
          status.textContent = label(`譜面を取得中… ${payload.maps.length + 1}/${maps.length}`, `Fetching beatmaps… ${payload.maps.length + 1}/${maps.length}`);
          const text = await fetchText(`https://osu.ppy.sh/osu/${map.id}`);
          if (!/^\uFEFF?osu file format v\d+/.test(text) || !/^Mode\s*:\s*1\s*$/m.test(text)) throw new Error(label("taiko 譜面を取得できませんでした。再実行してください。", "Could not fetch a taiko beatmap. Please retry."));
          size += text.length;
          if (text.length > 10 * 1024 * 1024 || size > 32 * 1024 * 1024) throw new Error("Beatmap set is too large.");
          payload.maps.push({ id: map.id, text });
          if (payload.maps.length < maps.length) await new Promise(resolve => setTimeout(resolve, 150));
        }
        const token = crypto.randomUUID();
        GM_setValue(keyFor(token), { createdAt: Date.now(), payload });
        try {
          GM_openInTab(`${helperUrl}#osu-import=${token}`, { active: true, insert: true });
        } catch (error) {
          GM_deleteValue(keyFor(token));
          throw error;
        }
        status.textContent = label(`${maps.length} 難易度を取得しました。`, `Fetched ${maps.length} difficulties.`);
      } catch (error) {
        status.textContent = label("取得失敗: ", "Import failed: ") + error.message;
      } finally {
        button.disabled = false;
      }
    });
  }
  // osu! uses client-side navigation and replaces the header on difficulty changes.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); });
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", mount);
  document.addEventListener("turbo:load", mount);
  document.addEventListener("turbolinks:load", mount);
  mount();
})();
