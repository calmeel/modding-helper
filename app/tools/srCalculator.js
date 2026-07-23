const SR_BADGE_BACKGROUND_STOPS = [
  [0.1, "#4290FB"],
  [1.25, "#4FC0FF"],
  [2, "#4FFFD5"],
  [2.5, "#7CFF4F"],
  [3.3, "#F6F05C"],
  [4.2, "#FF8068"],
  [4.9, "#FF4E6F"],
  [5.8, "#C645B8"],
  [6.7, "#6563DE"],
  [7.7, "#18158E"],
  [9, "#000000"]
];

const SR_BADGE_TEXT_STOPS = [
  [9, "#F6F05C"],
  [9.9, "#FF8068"],
  [10.6, "#FF4E6F"],
  [11.5, "#C645B8"],
  [12.4, "#6563DE"]
];

function getSrBadgeBackground(rating) {
  if (rating < 0.1) return "#AAAAAA";
  if (rating >= 9) return "#000000";
  return interpolateSrBadgeColour(rating, SR_BADGE_BACKGROUND_STOPS);
}

function getSrBadgeTextColour(rating) {
  if (rating < 6.5) return "#000000";
  if (rating < 9) return "#F6F05C";
  return interpolateSrBadgeColour(rating, SR_BADGE_TEXT_STOPS);
}

function interpolateSrBadgeColour(rating, stops) {
  if (rating <= stops[0][0]) return stops[0][1];
  if (rating >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];

  for (let index = 1; index < stops.length; index++) {
    const [stopRating, stopColour] = stops[index];
    const [previousRating, previousColour] = stops[index - 1];

    if (rating <= stopRating) {
      const amount = (rating - previousRating) / (stopRating - previousRating);
      return rgbToSrBadgeHex(interpolateSrBadgeRgb(
        srBadgeHexToRgb(previousColour),
        srBadgeHexToRgb(stopColour),
        amount
      ));
    }
  }

  return stops[stops.length - 1][1];
}

function interpolateSrBadgeRgb(start, end, amount, gamma = 2.2) {
  return start.map((startValue, index) => {
    const startGamma = (startValue / 255) ** gamma;
    const endGamma = (end[index] / 255) ** gamma;
    const interpolated = startGamma + (endGamma - startGamma) * amount;
    return Math.round((interpolated ** (1 / gamma)) * 255);
  });
}

function srBadgeHexToRgb(value) {
  const hex = value.replace("#", "");
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
}

function rgbToSrBadgeHex(rgb) {
  return `#${rgb
    .map(value => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function createSrRatingBadge(rating) {
  const badge = document.createElement("span");
  badge.className = "sr-calculator-badge";
  badge.style.backgroundColor = getSrBadgeBackground(rating);
  badge.style.color = getSrBadgeTextColour(rating);
  const displayRating = (Math.floor(rating * 100) / 100).toFixed(2);
  badge.textContent = `★ ${displayRating}`;
  return badge;
}

function isSrCalculatorAvailable() {
  return Boolean(
    window.electronAPI &&
    typeof window.electronAPI.calculateSr === "function"
  );
}

function revealElectronOnlyFeatures() {
  if (!isSrCalculatorAvailable()) return;

  for (const element of document.querySelectorAll("[data-electron-only]")) {
    element.removeAttribute("data-electron-only");
  }
}

function createSrCalculatorState() {
  return {
    status: "idle",
    calculator: null,
    results: [],
    error: "",
    requestId: 0,
    rulesetId: "current"
  };
}

function renderSrCalculator(state, output, t, diffOrder = []) {
  if (!output) return;
  output.replaceChildren();

  if (state.status === "idle") {
    output.textContent = t("srCalculatorNoFile");
    return;
  }

  if (state.status === "ready") {
    output.textContent = t("srCalculatorReady");
    return;
  }

  const isCalculating = state.status === "calculating";

  if (state.status === "calculating") {
    const status = document.createElement("p");
    status.className = "sr-calculator-status";
    status.textContent = t("srCalculatorCalculating");
    output.appendChild(status);
    if (!state.results.length) return;
  }

  if (state.status === "error") {
    const error = document.createElement("p");
    error.className = "result-error";
    error.textContent = `${t("srCalculatorFailed")} ${state.error}`;
    output.appendChild(error);
    return;
  }

  if (state.calculator) {
    const meta = document.createElement("p");
    meta.className = "sr-calculator-meta";
    meta.textContent = t("srCalculatorVersion")
      .replace("{period}", String(state.calculator.period || ""))
      .replace("{version}", String(state.calculator.difficultyVersion))
      .replace("{commit}", String(state.calculator.sourceCommit || "").slice(0, 12))
      .replace("{mods}", state.calculator.mods || "NM");
    output.appendChild(meta);
  }

  const order = new Map(diffOrder.map((fileName, index) => [fileName, index]));
  const results = [...state.results].sort((a, b) => {
    const ai = order.has(a.fileName) ? order.get(a.fileName) : Number.MAX_SAFE_INTEGER;
    const bi = order.has(b.fileName) ? order.get(b.fileName) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return String(a.difficultyName).localeCompare(String(b.difficultyName));
  });

  const table = document.createElement("table");
  table.className = "sr-calculator-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  for (const label of [t("srCalculatorDiff"), t("srCalculatorStarRating")]) {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const result of results) {
    const row = document.createElement("tr");
    const diffCell = document.createElement("td");
    const diffName = document.createElement("span");
    diffName.className = "diff-name";
    diffName.textContent = `[${result.difficultyName || result.fileName || "Unknown"}]`;
    diffCell.appendChild(diffName);

    const srCell = document.createElement("td");
    if (isCalculating) {
      const loadingBadge = document.createElement("span");
      loadingBadge.className = "sr-calculator-badge sr-calculator-badge-loading";
      loadingBadge.textContent = "...";
      srCell.appendChild(loadingBadge);
    } else if (result.error) {
      srCell.className = "result-error";
      srCell.textContent = result.error;
    } else {
      const rating = Number(result.starRating);
      srCell.className = "sr-calculator-rating-cell";
      srCell.appendChild(createSrRatingBadge(rating));
    }
    row.append(diffCell, srCell);
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  output.appendChild(table);
}

function prepareSrCalculation(
  sources, state, output, t, diffOrder = [], preserveResults = false
) {
  state.requestId++;
  state.status = (sources || []).length ? "ready" : "idle";
  state.calculator = null;
  if (!preserveResults) state.results = [];
  state.error = "";

  if (window.electronAPI && typeof window.electronAPI.cancelSrCalculation === "function") {
    window.electronAPI.cancelSrCalculation();
  }

  renderSrCalculator(state, output, t, diffOrder);
}

async function startSrCalculation(
  sources, state, output, t, diffOrder = [], mods = [], rulesetId = "current"
) {
  if (!isSrCalculatorAvailable()) return;

  const requestId = ++state.requestId;
  const beatmaps = (sources || []).map(source => ({
    fileName: source.fileName,
    difficultyName: parseMetadataValue(source.text, "Version") || "",
    content: source.text
  }));

  state.status = beatmaps.length ? "calculating" : "error";
  state.rulesetId = rulesetId;
  state.error = beatmaps.length ? "" : t("noOsuFiles");
  state.calculator = null;
  renderSrCalculator(state, output, t, diffOrder);

  if (!beatmaps.length) return;

  try {
    const response = await window.electronAPI.calculateSr(beatmaps, mods, rulesetId);
    if (requestId !== state.requestId) return;

    if (!response || response.error) {
      state.status = "error";
      state.error = response && response.error || t("srCalculatorUnavailable");
    } else {
      state.status = "complete";
      state.calculator = response.calculator || null;
      state.results = Array.isArray(response.results) ? response.results : [];
    }
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.status = "error";
    state.error = error && error.message || t("srCalculatorUnavailable");
  }

  renderSrCalculator(state, output, t, diffOrder);
}
