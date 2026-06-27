function updateSpreadSubtabIssueStates(spreadState) {
  const results = spreadState?.results;
  const diffOrder = spreadState?.diffOrder;
  const manualCategories = spreadState?.manualCategories ?? {};
  const scrollGradientMode =
    spreadState?.scrollGradientMode ?? getSpreadScrollGradientModeFromDom(document);
  const scrollIgnoreFinishers =
    spreadState?.scrollIgnoreFinishers ?? getSpreadScrollIgnoreFinishersFromDom(document);

  setSpreadSubtabIssueLevel("order", "none");
  setSpreadSubtabIssueLevel("odhp", "none");
  setSpreadSubtabIssueLevel("notes", "none");
  setSpreadSubtabIssueLevel("density", "none");
  setSpreadSubtabIssueLevel("rest", "none");
  setSpreadSubtabIssueLevel("scroll", "none");

  if (!results || !results.length) return;

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  const hasUnknownCategory = sortedResults.some(result =>
    getSpreadEffectiveCategory(result, manualCategories) === "unknown"
  );

  if (hasUnknownCategory) {
    setSpreadSubtabIssueLevel("order", "error");
  }

  const hasOdHpWarning = sortedResults.some((result, index) => {
    const prev = sortedResults[index - 1];

    const odLevel = getSpreadOdLevel(result, manualCategories);
    const hpLevel = getSpreadHpLevel(result, manualCategories);
    const ruleLevel = getSpreadOdHpLevel(result, manualCategories);

    let odDeltaWarn = false;
    let hpDeltaWarn = false;

    if (prev) {
      if (prev.od !== null && prev.od !== undefined && result.od !== null && result.od !== undefined) {
        odDeltaWarn = result.od - prev.od < 0;
      }

      if (prev.hp !== null && prev.hp !== undefined && result.hp !== null && result.hp !== undefined) {
        hpDeltaWarn = result.hp - prev.hp > 0;
      }
    }

    return (
      odLevel === "warn" ||
      hpLevel === "warn" ||
      ruleLevel === "warn" ||
      odDeltaWarn ||
      hpDeltaWarn
    );
  });

  if (hasOdHpWarning) {
    setSpreadSubtabIssueLevel("odhp", "warn");
  }

  let noteLevel = "none";

  for (let i = 1; i < sortedResults.length; i++) {
    const prev = sortedResults[i - 1];
    const cur = sortedResults[i];

    const prevNotes = prev.noteCount ?? 0;
    const curNotes = cur.noteCount ?? 0;

    if (prevNotes <= 0) continue;

    const ratio = curNotes / prevNotes;
    const level = getSpreadNoteRatioLevel(ratio, prev, cur, manualCategories);

    if (level === "error") {
      noteLevel = "error";
      break;
    }

    if (level === "warn") {
      noteLevel = "warn";
    }
  }

  let scrollLevel = "none";

  setSpreadSubtabIssueLevel("notes", noteLevel);

  for (const result of sortedResults) {
    const category = getSpreadEffectiveCategory(result, manualCategories);
    const rapidChanges = result.scrollSpeed?.rapidChanges ?? [];
    const hasBrokenSv =
      isSpreadLinearSvFeatureEnabled() &&
      getSpreadScrollSpeedGradients(
        result.scrollSpeed,
        scrollGradientMode,
        scrollIgnoreFinishers
      ).some(
        gradient => gradient.status === "warn"
      );

    const hasWarn = rapidChanges.some(change =>
      getSpreadRapidScrollLevel(change, category) === "warn"
    );

    if (hasWarn || hasBrokenSv) {
      scrollLevel = "warn";
      break;
    }
  }

  const densityMinDiff = document.getElementById("spreadDensityMinDiff")
    ? parseInt(document.getElementById("spreadDensityMinDiff").value, 10)
    : 1;

  const densityAnalysis = analyzeSpreadDensityInversions(
    sortedResults,
    manualCategories,
    1 /**  ノーツ密度 サブタブも常に 警告表示は +1 で固定（変えたいときはここを densityMinDiff にする）　*/
  );

  if (densityAnalysis.issueGroups.length) {
    setSpreadSubtabIssueLevel("density", "warn");
  }

  const restLevel = getSpreadRestMomentsIssueLevel(sortedResults, manualCategories);
  setSpreadSubtabIssueLevel("rest", restLevel);

  const progression = analyzeSpreadScrollSpeedProgressionByEvent(sortedResults, manualCategories);

  if (progression.issueGroups.length) {
    scrollLevel = "warn";
  }

  const consistency = analyzeSpreadScrollChangeConsistency(sortedResults, manualCategories);

  if (consistency.issueGroups.length) {
    scrollLevel = "warn";
  }

  for (const result of sortedResults) {
    const category = getSpreadEffectiveCategory(result, manualCategories);

    const level = getSpreadTooFastScrollLevel(
      result.scrollSpeed,
      category
    );

    if (level === "warn") {
      scrollLevel = "warn";
      break;
    }
  }

  setSpreadSubtabIssueLevel("scroll", scrollLevel);
}

function setSpreadSubtabIssueLevel(tabName, level) {
  const button = document.querySelector(`.spread-subtab-button[data-spread-subtab="${tabName}"]`);
  if (!button) return;

  button.classList.remove("has-warnings", "has-errors");

  if (level === "error") {
    button.classList.add("has-errors");
  } else if (level === "warn") {
    button.classList.add("has-warnings");
  }
}
