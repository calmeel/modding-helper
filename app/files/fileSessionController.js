// ファイル読み込みの世代管理、結果反映、Diff設定と音源・メタデータの公開を管理する。
function createFileSessionController({ state, dom, t, isChartPopout,
  getSourceMode, getReceivedDiffOrder, synchronizeDiffOrder, renderLoadedFileResults, onCleared }) {
  const { openBeatmapPage, fileName, timelineOutput, output } = dom;
  let activeMapsetFolder = null;
  async function persistDiffPreferences() {
    if (isChartPopout || !activeMapsetFolder || getSourceMode() !== 'osu' ||
        !window.electronAPI?.saveDiffOrderPreferences) return;
    try {
      const saved = await window.electronAPI.saveDiffOrderPreferences(activeMapsetFolder,
        serializeSpreadDiffPreferences(state.offsetSources, state.spread));
      if (!saved) console.warn('Could not save Diff order preferences.');
    } catch (error) {
      console.warn('Could not save Diff order preferences:', error);
    }
  }
  let beatmapPageUrl = null;
  let beatmapPageLoadId = 0;
  if (openBeatmapPage) {
    openBeatmapPage.addEventListener("click", () => {
      if (beatmapPageUrl) window.open(beatmapPageUrl, "_blank", "noopener,noreferrer");
    });
  }
  async function handleFile(file, processOptions = {}) {
    if (!file) return;

    const pageLoadId = ++beatmapPageLoadId;
    beatmapPageUrl = null;
    if (openBeatmapPage) openBeatmapPage.disabled = true;

    state.selectedFileName = file.name;

    if (fileName) {
      fileName.textContent = state.selectedFileName;
    }

    try {
      const result = await processFile(file, processOptions);
      if (pageLoadId !== beatmapPageLoadId) return;
      const preferencesFolder = !isChartPopout && processOptions.mapsetFolder &&
        window.electronAPI?.loadDiffOrderPreferences ? processOptions.mapsetFolder : null;
      let savedPreferences = preferencesFolder && activeMapsetFolder === preferencesFolder
        ? serializeSpreadDiffPreferences(state.offsetSources, state.spread)
        : null;
      if (preferencesFolder) {
        try {
          savedPreferences = await window.electronAPI.loadDiffOrderPreferences(preferencesFolder) || savedPreferences;
        } catch (error) {
          console.warn('Could not load Diff order preferences:', error);
        }
        if (pageLoadId !== beatmapPageLoadId) return;
      }
      if (pageLoadId === beatmapPageLoadId) {
        beatmapPageUrl = getBeatmapPageUrlFromSources(result.offsetSources);
        if (openBeatmapPage) openBeatmapPage.disabled = !beatmapPageUrl;
      }

      state.clapWhistle = result.clapWhistle;
      state.coordinates = result.coordinates;
      state.offsetSources = result.offsetSources;
      state.timelineSources = result.offsetSources;
      // スプレッド表示(exe)用に全難易度のテキストを公開
      window.__loadedDiffs = result.offsetSources;
      // スプレッド表示(exe)の音楽再生用に、先頭難易度の音源を Blob URL で公開
      try {
        if (window.__loadedAudioUrl) {
          URL.revokeObjectURL(window.__loadedAudioUrl);
          window.__loadedAudioUrl = null;
        }
        const wfs = (result.offsetWaveformSources || []).find(s => s && s.audioBlob);
        if (wfs && wfs.audioBlob) {
          window.__loadedAudioUrl = URL.createObjectURL(wfs.audioBlob);
          window.__loadedAudio = { url: window.__loadedAudioUrl, durationMs: wfs.audioDurationMs || 0 };
        } else {
          window.__loadedAudio = null;
        }
      } catch (e) {
        window.__loadedAudio = null;
      }
      state.offset = result.offset;
      state.timeline = null;
      state.doubleSvSources = result.doubleSvSources;
      state.barlineSources = result.barlineSources;
      state.unappliedSv = result.unappliedSv;
      state.kiaiCompare = result.kiaiCompare;
      state.kiaiSnap = result.kiaiSnap;
      state.svVolumeSources = result.svVolumeSources;
      state.volumeCompareSources = result.volumeCompareSources;
      state.redGreenMatch = result.redGreenMatch;
      state.sampleSet = result.sampleSet;
      state.earlyNote = result.earlyNote;
      state.sliderSettings = result.sliderSettings;
      state.artist = result.artist;
      state.title = result.title;
      state.source = result.source;
      state.tag = result.tag;
      state.previewPoint = result.previewPoint;
      state.bgOffset = result.bgOffset;
      state.fileCheck = result.fileCheck;
      state.songFolderCheck = result.songFolderCheck;
      state.epilepsyWarning = result.epilepsyWarning;
      state.spread.results = result.spread;
      const restoredPreferences = restoreSpreadDiffPreferences(result.spread || [],
        resolveSpreadDiffPreferences(result.offsetSources, savedPreferences));
      state.spread.diffOrder = restoredPreferences.diffOrder;
      state.spread.manualCategories = restoredPreferences.manualCategories;
      activeMapsetFolder = preferencesFolder;
      const receivedDiffOrder = getReceivedDiffOrder();
      if (isChartPopout && receivedDiffOrder) {
        state.spread.diffOrder = [...receivedDiffOrder.diffOrder];
        state.spread.manualCategories = { ...receivedDiffOrder.manualCategories };
      }
      // スプレッド表示(exe)用に難易度順（易→難）を公開。表示側で逆順=難→易に並べる
      synchronizeDiffOrder();
      if (savedPreferences) void persistDiffPreferences();
      state.offsetWaveformSources = result.offsetWaveformSources;
      state.contentPermission = result.contentPermission;

      if (timelineOutput) {
        timelineOutput.textContent = t("timelineNotRendered");
      }

      renderLoadedFileResults();

      // file モードのときは読み込んだファイルのメタデータを左パネルに表示
      lastLoadedFileForMeta = file;
      if (getSourceMode() === "file") {
        publishChartSourceFile(file);
        await renderFileMetaToPanel(file);
      }
    } catch (err) {
      if (pageLoadId !== beatmapPageLoadId) return;
      if (err.message === "invalidFile") {
        output.textContent = t("invalidFile");
      } else {
        output.textContent = `Error:\n${err.message}`;
        console.error(err);
      }
    }
  }

  // ファイルモードで左パネルと分離グラフへ公開する情報。
  let lastLoadedFileForMeta = null;  // file モードで左パネルに出すため最後に読んだ File を保持
  let chartSourcePublishId = 0;

  async function publishChartSourceFile(file) {
    const publishId = ++chartSourcePublishId;
    if (!window.electronAPI || typeof window.electronAPI.setChartSourceFile !== "function") return;
    if (!file) {
      window.electronAPI.setChartSourceFile(null);
      return;
    }

    try {
      // Electron 32以降はpreloadのwebUtils経由でパスを取得する。
      // ブラウザやメモリ上のFileではArrayBufferにフォールバックする。
      const filePath = getNativeFilePath(file);
      let source;
      if (filePath) {
        source = { name: file.name, type: file.type || "", path: filePath };
      } else {
        source = {
          name: file.name,
          type: file.type || "",
          buffer: await file.arrayBuffer()
        };
      }
      if (publishId === chartSourcePublishId) {
        window.electronAPI.setChartSourceFile(source);
      }
    } catch (_) {
      if (publishId === chartSourcePublishId) window.electronAPI.setChartSourceFile(null);
    }
  }

  async function renderFileMetaToPanel(file) {
    if (!window.__osuPanel || typeof window.__osuPanel.renderFileMeta !== "function") return;
    try {
      const fileMeta = await extractMapMetaFromFile(file);
      window.__osuPanel.renderFileMeta(fileMeta);
    } catch { /* メタ抽出失敗は無視（チェック結果には影響しない） */ }
  }

  function clearOsuCheckResults() {
    ++beatmapPageLoadId;
    beatmapPageUrl = null;
    if (openBeatmapPage) openBeatmapPage.disabled = true;
    // Preserve independent BN comparison inputs.
    for (const key of Object.keys(state)) {
      if (!["bnCompare", "spread"].includes(key)) state[key] = null;
    }
    state.spread = { results: null, diffOrder: [], manualCategories: {} };
    activeMapsetFolder = null;
    window.__loadedDiffs = null;
    synchronizeDiffOrder();
    if (window.__loadedAudioUrl) URL.revokeObjectURL(window.__loadedAudioUrl);
    window.__loadedAudioUrl = null;
    window.__loadedAudio = null;
    lastLoadedFileForMeta = null;
    onCleared();
  }

  return {
    handleFile, persistDiffPreferences, publishChartSourceFile, renderFileMetaToPanel,
    clearResults: clearOsuCheckResults,
    invalidateLoads() { ++beatmapPageLoadId; },
    get lastFile() { return lastLoadedFileForMeta; }
  };
}
