function setupBnCompareUi(params) {
  const {
    state,
    dom,
    t,
    bnBeforeFileInput,
    bnAfterFileInput,
    bnBeforeFileName,
    bnAfterFileName,
    bnDiffMatchingArea,
    bnCompareRunButton,
    bnPairSelect,
    bnApplyRedOffsetButton,
    bnOffsetStatus,
    bnSvChangeThreshold
  } = params;

  if (bnBeforeFileInput) {
    bnBeforeFileInput.addEventListener("change", async () => {
      const file = bnBeforeFileInput.files[0];
      await handleBnBeforeFile(file);
    });
  }

  if (bnAfterFileInput) {
    bnAfterFileInput.addEventListener("change", async () => {
      const file = bnAfterFileInput.files[0];
      await handleBnAfterFile(file);
    });
  }

  if (bnCompareRunButton) {
    bnCompareRunButton.addEventListener("click", runBnCompareFromSelections);
  }

  if (bnApplyRedOffsetButton) {
    bnApplyRedOffsetButton.addEventListener("click", applyBnRedOffsetCorrection);
  }

  if (bnPairSelect) {
    bnPairSelect.addEventListener("change", () => {
      state.bnCompare.selectedPairId = bnPairSelect.value;
      renderBnSelectedResult();
    });
  }

  if (bnSvChangeThreshold) {
    bnSvChangeThreshold.addEventListener("change", () => {
      state.bnCompare.svChangeThreshold = bnSvChangeThreshold.value;

      if (state.bnCompare.resultsByPair.length) {
        runBnCompareFromSelections();
      } else {
        renderBnSelectedResult();
      }
    });
  }

  document.querySelectorAll(".bn-subtab-button").forEach(button => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.bnSubtab;

      document.querySelectorAll(".bn-subtab-button").forEach(b => {
        b.classList.remove("active");
      });

      document.querySelectorAll(".bn-subtab-panel").forEach(panel => {
        panel.classList.remove("active");
      });

      button.classList.add("active");

      const panel = document.getElementById(`bn-subtab-${tabName}`);
      if (panel) {
        panel.classList.add("active");
      }
    });
  });

  async function handleBnBeforeFile(file) {
    if (!file) return;

    try {
      state.bnCompare.beforeFileName = file.name;
      state.bnCompare.beforeDiffs = await readBnOszFile(file);
      state.bnCompare.resultsByPair = [];
      state.bnCompare.selectedPairId = null;

      state.bnCompare.svChangeThreshold = "all";

      if (bnSvChangeThreshold) {
        bnSvChangeThreshold.value = "all";
      }

      state.bnCompare.offsetMs = 0;
      updateBnOffsetStatus();

      if (bnBeforeFileName) {
        bnBeforeFileName.textContent = file.name;
      }

      renderBnDiffMatching();
      renderBnPairSelect();
      renderBnSelectedResult();
    } catch (err) {
      console.error(err);
      if (bnBeforeFileName) {
        bnBeforeFileName.textContent = t("bnInvalidOsz");
      }
    }
  }

  async function handleBnAfterFile(file) {
    if (!file) return;

    try {
      state.bnCompare.afterFileName = file.name;
      state.bnCompare.afterDiffs = await readBnOszFile(file);
      state.bnCompare.resultsByPair = [];
      state.bnCompare.selectedPairId = null;

      state.bnCompare.svChangeThreshold = "all";

      if (bnSvChangeThreshold) {
        bnSvChangeThreshold.value = "all";
      }

      if (bnAfterFileName) {
        bnAfterFileName.textContent = file.name;
      }

      renderBnDiffMatching();
      renderBnPairSelect();
      renderBnSelectedResult();
    } catch (err) {
      console.error(err);
      if (bnAfterFileName) {
        bnAfterFileName.textContent = t("bnInvalidOsz");
      }
    }
  }

  function renderBnDiffMatching() {
    if (!bnDiffMatchingArea) return;

    const beforeDiffs = sortResultsForDisplay(state.bnCompare.beforeDiffs);
    const afterDiffs = sortResultsForDisplay(state.bnCompare.afterDiffs);

    if (!beforeDiffs.length || !afterDiffs.length) {
      bnDiffMatchingArea.innerHTML = t("bnNoResult");
      return;
    }

    const usedAfterIds = new Set();
    const rows = [];

    for (const beforeDiff of beforeDiffs) {
      const matched = findDefaultBnMatch(beforeDiff, afterDiffs, usedAfterIds);
      if (matched) usedAfterIds.add(matched.id);

      const options = [
        `<option value="">--</option>`,
        ...afterDiffs.map(afterDiff => {
          const selected = matched && matched.id === afterDiff.id ? " selected" : "";
          return `<option value="${escapeHtml(afterDiff.id)}"${selected}>${escapeHtml(afterDiff.diffName)}</option>`;
        })
      ].join("");

      rows.push(`
        <div class="bn-match-row" data-before-id="${escapeHtml(beforeDiff.id)}">
          <span class="bn-match-before">${escapeHtml(beforeDiff.diffName)}</span>
          <span class="bn-match-arrow">→</span>
          <select class="bn-match-after">
            ${options}
          </select>
        </div>
      `);
    }

    bnDiffMatchingArea.innerHTML = rows.join("");
  }

  function findDefaultBnMatch(beforeDiff, afterDiffs, usedAfterIds) {
    const beforeName = normalizeDifficultyName(beforeDiff.diffName);

    return afterDiffs.find(afterDiff =>
      !usedAfterIds.has(afterDiff.id) &&
      normalizeDifficultyName(afterDiff.diffName) === beforeName
    ) || null;
  }

  function applyBnRedOffsetCorrection() {
    const firstPair = getFirstBnSelectedPair();

    if (!firstPair) {
      showBnOffsetFailed();
      return;
    }

    const beforeRed = parseTimingPoints(firstPair.beforeDiff.text)[0];
    const afterRed = parseTimingPoints(firstPair.afterDiff.text)[0];

    if (!beforeRed || !afterRed) {
      showBnOffsetFailed();
      return;
    }

    const offset = afterRed.time - beforeRed.time;

    state.bnCompare.offsetMs = offset;
    updateBnOffsetStatus();

    // すでに比較結果がある場合は、補正後の条件で再比較
    if (state.bnCompare.resultsByPair.length) {
      runBnCompareFromSelections();
    }
  }

  function getFirstBnSelectedPair() {
    const beforeDiffs = state.bnCompare.beforeDiffs;
    const afterDiffs = state.bnCompare.afterDiffs;

    if (!beforeDiffs.length || !afterDiffs.length) return null;

    const row = document.querySelector(".bn-match-row");
    if (!row) return null;

    const beforeId = row.dataset.beforeId;
    const afterId = row.querySelector(".bn-match-after")?.value;

    if (!beforeId || !afterId) return null;

    const beforeDiff = beforeDiffs.find(diff => diff.id === beforeId);
    const afterDiff = afterDiffs.find(diff => diff.id === afterId);

    if (!beforeDiff || !afterDiff) return null;

    return {
      beforeDiff,
      afterDiff
    };
  }

  function updateBnOffsetStatus() {
    if (!bnOffsetStatus) return;

    const offset = state.bnCompare.offsetMs || 0;
    const sign = offset > 0 ? "+" : "";

    bnOffsetStatus.textContent = `${t("bnOffsetApplied")} ${sign}${offset} ms`;
  }

  function showBnOffsetFailed() {
    if (!bnOffsetStatus) return;

    bnOffsetStatus.textContent = t("bnOffsetFailed");
  }
  
  function runBnCompareFromSelections() {
    const beforeDiffs = state.bnCompare.beforeDiffs;
    const afterDiffs = state.bnCompare.afterDiffs;

    if (!beforeDiffs.length || !afterDiffs.length) {
      renderBnCompareResult(null, dom, t);
      return;
    }

    const rows = document.querySelectorAll(".bn-match-row");
    const results = [];

    for (const row of rows) {
      const beforeId = row.dataset.beforeId;
      const afterId = row.querySelector(".bn-match-after")?.value;

      if (!beforeId || !afterId) continue;

      const beforeDiff = beforeDiffs.find(diff => diff.id === beforeId);
      const afterDiff = afterDiffs.find(diff => diff.id === afterId);

      if (!beforeDiff || !afterDiff) continue;

      results.push(runBnCompare(beforeDiff, afterDiff, {
        offsetMs: state.bnCompare.offsetMs,
        svChangeThreshold: state.bnCompare.svChangeThreshold
      }))
    }

    state.bnCompare.resultsByPair = results;
    state.bnCompare.selectedPairId = results[0]?.pairId ?? null;

    renderBnPairSelect();
    renderBnSelectedResult();
  }

  function renderBnPairSelect() {
    if (!bnPairSelect) return;

    const results = state.bnCompare.resultsByPair;

    if (!results.length) {
      bnPairSelect.innerHTML = "";
      return;
    }

    bnPairSelect.innerHTML = results
      .map(result => {
        const selected = result.pairId === state.bnCompare.selectedPairId ? " selected" : "";
        return `<option value="${escapeHtml(result.pairId)}"${selected}>${escapeHtml(result.label)}</option>`;
      })
      .join("");
  }

  function renderBnSelectedResult() {
    const result = state.bnCompare.resultsByPair.find(item =>
      item.pairId === state.bnCompare.selectedPairId
    );

    console.log("render SV filter:", state.bnCompare.svChangeThreshold);

    renderBnCompareResult(
      result,
      dom,
      t,
      {
        svChangeThreshold: state.bnCompare.svChangeThreshold
      },
      state
    );
  }
  
  return {
    renderBnSelectedResult
  };
}