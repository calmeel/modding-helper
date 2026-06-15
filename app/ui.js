
/** UI初期化・イベント登録系 */
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

  for (const button of tabButtons) {
    button.addEventListener("click", () => {
      const tabName = button.dataset.tab;

      for (const b of tabButtons) {
        b.classList.remove("active");
      }

      for (const panel of tabPanels) {
        panel.classList.remove("active");
      }

      button.classList.add("active");

      const targetPanel = document.getElementById(`tab-${tabName}`);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  }
}

/** ドラッグ＆ドロップ処理 */
function setupDropArea(dropArea, onFileSelected) {
  if (!dropArea) return;

  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("drag-over");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("drag-over");
  });

  dropArea.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropArea.classList.remove("drag-over");

    const file = e.dataTransfer.files[0];
    await onFileSelected(file);
  });
}

/** 言語切替処理 */
function setupLanguageButtons(langEn, langJa, getCurrentLang, setCurrentLang, applyLanguage) {
  if (langEn) {
    langEn.addEventListener("click", () => {
      setCurrentLang("en");
      localStorage.setItem("moddingHelperLang", "en");
      applyLanguage();
    });
  }

  if (langJa) {
    langJa.addEventListener("click", () => {
      setCurrentLang("ja");
      localStorage.setItem("moddingHelperLang", "ja");
      applyLanguage();
    });
  }
}

/** ファイル選択ボタンのイベント登録 */
function setupFileInput(fileInput, onFileSelected) {
  if (!fileInput) return;

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    await onFileSelected(file);
  });
}

/** チェックボックス・select変更イベント */
function setupOptionEvents(options) {
  const {
    showClap,
    showWhistle,
    includeAdvancedOffsetSnaps,
    renderShiftResult,
    doubleSvGap,
    renderResult,
    renderDoubleSvResult,
    svVolumeThreshold,
    renderSvVolumeResult,
    svVolumeLargeChangeOnly,
    volumeCompareThresholdOnly,
    volumeCompareMinDurationOnly,
    renderVolumeCompareResult,
    spreadDensityMinDiff,
    renderSpreadResult
  } = options;

  if (showClap) {
    showClap.addEventListener("change", renderResult);
  }

  if (showWhistle) {
    showWhistle.addEventListener("change", renderResult);
  }

  if (includeAdvancedOffsetSnaps && renderShiftResult) {
    includeAdvancedOffsetSnaps.addEventListener("change", renderShiftResult);
  }

  if (doubleSvGap) {
    doubleSvGap.addEventListener("change", renderDoubleSvResult);
  }

  if (svVolumeThreshold) {
    svVolumeThreshold.addEventListener("change", renderSvVolumeResult);
  }

  if (svVolumeLargeChangeOnly) {
    svVolumeLargeChangeOnly.addEventListener("change", renderSvVolumeResult);
  }

  if (volumeCompareThresholdOnly) {
    volumeCompareThresholdOnly.addEventListener("change", renderVolumeCompareResult);
  }

  if (volumeCompareMinDurationOnly) {
    volumeCompareMinDurationOnly.addEventListener("change", renderVolumeCompareResult);
  }

  if (spreadDensityMinDiff) {
    spreadDensityMinDiff.addEventListener("change", renderSpreadResult);
  }
}

/** スプレッド内サブタブ用 */
function setupSpreadSubtabs() {
  const buttons = document.querySelectorAll(".spread-subtab-button");
  const panels = document.querySelectorAll(".spread-subtab-panel");

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tabName = button.dataset.spreadSubtab;

      for (const b of buttons) {
        b.classList.remove("active");
      }

      for (const panel of panels) {
        panel.classList.remove("active");
      }

      button.classList.add("active");

      const targetPanel = document.getElementById(`spread-subtab-${tabName}`);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  }
}

/** 設定保存 */
function setupPersistentOptions(options) {
  const items = [
    {
      element: options.showClap,
      key: "moddingHelperShowClap",
      type: "checkbox",
      defaultValue: false
    },
    {
      element: options.showWhistle,
      key: "moddingHelperShowWhistle",
      type: "checkbox",
      defaultValue: true
    },
    {
      element: options.includeAdvancedOffsetSnaps,
      key: "moddingHelperIncludeAdvancedOffsetSnaps",
      type: "checkbox",
      defaultValue: false
    },
    {
      element: options.doubleSvGap,
      key: "moddingHelperDoubleSvGap",
      type: "select",
      defaultValue: "2"
    },
    {
      element: options.svVolumeThreshold,
      key: "moddingHelperSvVolumeThreshold",
      type: "select",
      defaultValue: "16snap"
    },
    {
      element: options.svVolumeLargeChangeOnly,
      key: "moddingHelperSvVolumeLargeChangeOnly",
      type: "checkbox",
      defaultValue: false
    },
    {
      element: options.volumeCompareThresholdOnly,
      key: "moddingHelperVolumeCompareThresholdOnly",
      type: "checkbox",
      defaultValue: false
    }
  ];

  for (const item of items) {
    if (!item.element) continue;

    const saved = localStorage.getItem(item.key);

    if (saved !== null) {
      if (item.type === "checkbox") {
        item.element.checked = saved === "true";
      } else if (item.type === "select") {
        item.element.value = saved;
      }
    } else {
      if (item.type === "checkbox") {
        item.element.checked = item.defaultValue;
      } else if (item.type === "select") {
        item.element.value = item.defaultValue;
      }
    }

    item.element.addEventListener("change", () => {
      if (item.type === "checkbox") {
        localStorage.setItem(item.key, String(item.element.checked));
      } else if (item.type === "select") {
        localStorage.setItem(item.key, item.element.value);
      }
    });
  }
}

/** タブの表示切り替え */
function setupTabVisibilitySettings() {
  const toggleButton = document.getElementById("toggleTabSettings");
  const panel = document.getElementById("tabSettingsPanel");
  const checkboxes = document.querySelectorAll(".tab-visibility-toggle");

  if (!toggleButton || !panel || !checkboxes.length) return;

  toggleButton.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });

  const saved = loadTabVisibilitySettings();

  for (const checkbox of checkboxes) {
    const tabName = checkbox.dataset.targetTab;

    if (saved && Object.prototype.hasOwnProperty.call(saved, tabName)) {
      checkbox.checked = saved[tabName];
    }

    checkbox.addEventListener("change", () => {
      saveTabVisibilitySettings(checkboxes);
      applyTabVisibilitySettings();
    });
  }

  applyTabVisibilitySettings();
}

function loadTabVisibilitySettings() {
  try {
    const raw = localStorage.getItem("moddingHelperVisibleTabs");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTabVisibilitySettings(checkboxes) {
  const data = {};

  for (const checkbox of checkboxes) {
    data[checkbox.dataset.targetTab] = checkbox.checked;
  }

  localStorage.setItem("moddingHelperVisibleTabs", JSON.stringify(data));
}

function applyTabVisibilitySettings() {
  const checkboxes = document.querySelectorAll(".tab-visibility-toggle");

  for (const checkbox of checkboxes) {
    const tabName = checkbox.dataset.targetTab;
    const visible = checkbox.checked;

    const button = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    const panel = document.getElementById(`tab-${tabName}`);

    if (button) button.classList.toggle("hidden-tab", !visible);
    if (panel) panel.classList.toggle("hidden-tab", !visible);
  }

  ensureVisibleActiveTab();
}

function ensureVisibleActiveTab() {
  const activeButton = document.querySelector(".tab-button.active");

  if (activeButton && !activeButton.classList.contains("hidden-tab")) {
    return;
  }

  const firstVisibleButton = document.querySelector(".tab-button:not(.hidden-tab)");

  if (firstVisibleButton) {
    firstVisibleButton.click();
  }
}

const updateBtn = document.getElementById("updateBtn");
const updateModal = document.getElementById("updateModal");
const closeUpdate = document.getElementById("closeUpdate");

if (updateBtn && updateModal && closeUpdate) {
  updateBtn.addEventListener("click", () => {
    updateModal.classList.remove("hidden");
  });

  closeUpdate.addEventListener("click", () => {
    updateModal.classList.add("hidden");
  });

  updateModal.addEventListener("click", (e) => {
    if (e.target === updateModal) {
      updateModal.classList.add("hidden");
    }
  });
}

/** スプレッドタブの難易度マッチング用 */
function setupSpreadOrderControls(params) {
  const {
    state,
    dom,
    renderSpreadResult
  } = params;

  if (dom.spreadResetOrderButton) {
    dom.spreadResetOrderButton.addEventListener("click", () => {
      const results = state.spread?.results;
      if (!results) return;

      state.spread.diffOrder = createSpreadDiffOrder(results);
        renderSpreadResult();
        updateTabIssueStates(state);
    });
  }

  if (dom.spreadOrderOutput) {
    dom.spreadOrderOutput.addEventListener("click", (e) => {
      const button = e.target.closest("[data-spread-order-action]");
      if (!button) return;

      const action = button.dataset.spreadOrderAction;
      const fileName = button.dataset.fileName;

      if (!fileName || !state.spread?.diffOrder) return;

      const index = state.spread.diffOrder.indexOf(fileName);
      if (index === -1) return;

      if (action === "up" && index > 0) {
        swapSpreadOrder(state.spread.diffOrder, index, index - 1);
      }

      if (action === "down" && index < state.spread.diffOrder.length - 1) {
        swapSpreadOrder(state.spread.diffOrder, index, index + 1);
      }

      renderSpreadResult();
      updateTabIssueStates(state);
    });
  }

  if (dom.spreadOrderOutput) {
    dom.spreadOrderOutput.addEventListener("change", (e) => {
      const select = e.target.closest(".spread-category-select");
      if (!select) return;

      const fileName = select.dataset.fileName;
      const category = select.value;

      const results = state.spread?.results;
      if (!fileName || !category || !results) return;

      state.spread.manualCategories[fileName] = category;

      state.spread.diffOrder = moveSpreadDiffToCategory(
        state.spread.diffOrder,
        results,
        fileName,
        category,
        state.spread.manualCategories
      );

      renderSpreadResult();
      updateTabIssueStates(state);
    });
  }
}

function swapSpreadOrder(items, a, b) {
  const temp = items[a];
  items[a] = items[b];
  items[b] = temp;
}
