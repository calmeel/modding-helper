
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
    doubleSvGap,
    includeExactSameSv,
    renderResult,
    renderDoubleSvResult,
    svVolumeThreshold,
    renderSvVolumeResult
  } = options;

  if (showClap) {
    showClap.addEventListener("change", renderResult);
  }

  if (showWhistle) {
    showWhistle.addEventListener("change", renderResult);
  }

  if (doubleSvGap) {
    doubleSvGap.addEventListener("change", renderDoubleSvResult);
  }

  if (includeExactSameSv) {
    includeExactSameSv.addEventListener("change", renderDoubleSvResult);
  }

  if (svVolumeThreshold) {
    svVolumeThreshold.addEventListener("change", renderSvVolumeResult);
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
