const TAB_LEVEL_NONE = "none";
const TAB_LEVEL_WARN = "warn";
const TAB_LEVEL_ERROR = "error";

function setTabIssueLevel(tabName, level) {
  const button = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  if (!button) return;

  button.classList.remove("has-issues");
  button.classList.remove("has-warnings");
  button.classList.remove("has-errors");

  if (level === TAB_LEVEL_WARN) {
    button.classList.add("has-warnings");
  }

  if (level === TAB_LEVEL_ERROR) {
    button.classList.add("has-errors");
  }
}

function setSubtabIssueLevel(subtabName, level) {
  const button = document.querySelector(
    `[data-bn-subtab="${subtabName}"], [data-spread-subtab="${subtabName}"]`
  );

  if (!button) return;

  button.classList.remove("has-issues");
  button.classList.remove("has-warnings");
  button.classList.remove("has-errors");

  if (level === TAB_LEVEL_WARN) {
    button.classList.add("has-warnings");
  }

  if (level === TAB_LEVEL_ERROR) {
    button.classList.add("has-errors");
  }
}

function updateTabIssueStates(state) {
  setTabIssueLevel("clapWhistle", getClapWhistleIssueLevel(state.clapWhistle));
  setTabIssueLevel("shift1ms", getOffsetIssueLevel(state.offset));
  setTabIssueLevel("kiaiCompare", getKiaiCompareIssueLevel(state.kiaiCompare));
  setTabIssueLevel("kiaiSnap", getKiaiSnapIssueLevel(state.kiaiSnap));
  setTabIssueLevel("doubleBarline", getDoubleSvIssueLevel(state.doubleSvResults));
  setTabIssueLevel("svVolume", getSvVolumeIssueLevel(state.svVolumeSources));
  setTabIssueLevel("volumeCompare", getVolumeCompareIssueLevel(state.volumeCompareSources));
  setTabIssueLevel("redGreenMatch", getRedGreenMatchIssueLevel(state.redGreenMatch));
  setTabIssueLevel("sampleSet", getSampleSetIssueLevel(state.sampleSet));
  setTabIssueLevel("sliderSettings", getSliderSettingsIssueLevel(state.sliderSettings));
  setTabIssueLevel("earlyNote", getEarlyNoteIssueLevel(state.earlyNote));
  setTabIssueLevel("metadata", getMetadataIssueLevel(state));
  setSubtabIssueLevel("metadata-artist",getArtistIssueLevel(state.artist));
  setSubtabIssueLevel("metadata-title",getTitleIssueLevel(state.title));
  setSubtabIssueLevel("metadata-source", getSourceIssueLevel(state.source));
  setSubtabIssueLevel("metadata-tag", getTagIssueLevel(state.tag));
  setTabIssueLevel("misc", getMiscIssueLevel(state));
  setTabIssueLevel("spread", getSpreadIssueLevel(state.spread));
  setTabIssueLevel("contentPermission", getContentPermissionIssueLevel(state.contentPermission));
}

function getClapWhistleIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  const hasBoth = results.some(result => (result.counts?.both ?? 0) > 0);

  if (hasBoth) {
    return TAB_LEVEL_WARN;
  }

  const hasClapAndWhistleMixed = results.some(result => {
    const clap = result.counts?.clap ?? 0;
    const whistle = result.counts?.whistle ?? 0;
    return clap > 0 && whistle > 0;
  });

  return hasClapAndWhistleMixed ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getOffsetIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const result of results) {
    for (const item of result.results ?? []) {
      const diff = Math.abs(item.diff);

      if (diff >= 2 && diff <= 3) {
        return TAB_LEVEL_ERROR;
      }

      if (diff === 1) {
        hasWarn = true;
      }
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getKiaiCompareIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  const hasImplicitKiaiEnd =
    results.some(result => result.hasImplicitKiaiEnd);

  if (hasImplicitKiaiEnd) {
    return TAB_LEVEL_WARN;
  }

  if (results.length < 2) {
    return TAB_LEVEL_NONE;
  }

  const compared = compareKiaiResults(results);

  return compared.mismatchSections.length > 0
    ? TAB_LEVEL_WARN
    : TAB_LEVEL_NONE;
}

function getKiaiSnapIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const result of results) {
    for (const item of result.results ?? []) {
      if (item.snap === "unknown" || item.diff !== 0) {
        return TAB_LEVEL_ERROR;
      }

      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getDoubleSvIssueLevel(results) {
  const hasDoubleSv =
    results?.some(result => result.groups?.length > 0) ?? false;

  return hasDoubleSv ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getSvVolumeIssueLevel(sources) {
  if (!sources) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const source of sources) {
    const result = runSvVolumeCheck(source.text, source.fileName, {
      thresholdMode: "5ms",
      largeChangeOnly: false,
      largeChangeThreshold: 15
    });

    for (const item of result.results ?? []) {
      if ((item.volumeDiff ?? 0) >= 15) {
        return TAB_LEVEL_ERROR;
      }

      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getVolumeCompareIssueLevel(sources) {
  if (!sources) return TAB_LEVEL_NONE;

  const result = runVolumeCompareCheck(sources, {
    thresholdOnly: false,
    minDurationOnly: false
  });

  return result?.results?.length > 0
    ? TAB_LEVEL_WARN
    : TAB_LEVEL_NONE;
}

function getRedGreenMatchIssueLevel(results) {
  const hasMismatch =
    results?.some(result => result.results?.length > 0) ?? false;

  return hasMismatch ? TAB_LEVEL_ERROR : TAB_LEVEL_NONE;
}

function getSampleSetIssueLevel(results) {
  const hasSampleSetIssues =
    results?.some(result =>
      result.timingIssues?.length > 0 ||
      result.objectIssues?.length > 0
    ) ?? false;

  return hasSampleSetIssues ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getSliderSettingsIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const result of results) {
    for (const issue of result.issues ?? []) {
      if (issue.type === "sliderMultiplier") {
        hasWarn = true;
      }

      if (issue.type === "sliderTickRate") {
        hasWarn = true;
      }
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getEarlyNoteIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const result of results) {
    if (result.level === "error") {
      return TAB_LEVEL_ERROR;
    }

    if (result.level === "warn") {
      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getTagIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  const hasTagMismatch =
    compareTagsAcrossDiffs(results).hasMismatch;

  if (hasTagMismatch) {
    return TAB_LEVEL_ERROR;
  }

  const hasSpacingIssues =
    results.some(result => result.results?.length > 0);

  if (hasSpacingIssues) {
    return TAB_LEVEL_ERROR;
  }

  const hasSpellingSuggestions =
    results.some(result => result.spellingSuggestions?.length > 0);

  if (hasSpellingSuggestions) {
    return TAB_LEVEL_ERROR;
  }

  const hasDuplicateTags =
    results.some(result => result.duplicateTags?.length > 0);

  if (hasDuplicateTags) {
    return TAB_LEVEL_WARN;
  }

  const hasMetadataDuplicateTags =
    results.some(result => result.metadataDuplicateTags?.length > 0);

  if (hasMetadataDuplicateTags) {
    return TAB_LEVEL_WARN;
  }

  const hasRelatedSuggestions =
    results.some(result =>
      (result.relatedSuggestions?.length ?? 0) > 0 ||
      (result.metadataSuggestions?.length ?? 0) > 0 ||
      (result.sourceSuggestions?.length ?? 0) > 0
    );

  if (hasRelatedSuggestions) {
    return TAB_LEVEL_WARN;
  }

  return TAB_LEVEL_NONE;
}

function getArtistIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  if (compareArtistsAcrossDiffs(results).hasMismatch) {
    return TAB_LEVEL_ERROR;
  }

  const hasSymbolIssues =
    results.some(result => result.symbolIssues?.length > 0);

  const hasSpacingIssues =
    results.some(result => result.spacingIssues?.length > 0);

  if (hasSpacingIssues) {
    return TAB_LEVEL_ERROR;
  }

  const hasFormattingIssues =
    results.some(result => result.formattingIssues?.length > 0);

  return hasSymbolIssues || hasFormattingIssues
    ? TAB_LEVEL_WARN
    : TAB_LEVEL_NONE;
}

function getTitleIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  if (compareTitlesAcrossDiffs(results).hasMismatch) {
    return TAB_LEVEL_ERROR;
  }

  const hasSymbolIssues =
    results.some(result => result.symbolIssues?.length > 0);

  const hasSpacingIssues =
    results.some(result => result.spacingIssues?.length > 0);

  if (hasSpacingIssues) {
    return TAB_LEVEL_ERROR;
  }

  const hasMarkerIssues =
    results.some(result => result.markerIssues?.length > 0);

  return hasSymbolIssues || hasMarkerIssues
    ? TAB_LEVEL_WARN
    : TAB_LEVEL_NONE;
}

function getMetadataIssueLevel(state) {
  const artistLevel = getArtistIssueLevel(state.artist);
  const titleLevel = getTitleIssueLevel(state.title);
  const sourceLevel = getSourceIssueLevel(state.source);
  const tagLevel = getTagIssueLevel(state.tag);

  if (
    artistLevel === TAB_LEVEL_ERROR ||
    titleLevel === TAB_LEVEL_ERROR ||
    sourceLevel === TAB_LEVEL_ERROR ||
    tagLevel === TAB_LEVEL_ERROR
  ) {
    return TAB_LEVEL_ERROR;
  }

  if (
    artistLevel === TAB_LEVEL_WARN ||
    titleLevel === TAB_LEVEL_WARN ||
    sourceLevel === TAB_LEVEL_WARN ||
    tagLevel === TAB_LEVEL_WARN
  ) {
    return TAB_LEVEL_WARN;
  }

  return TAB_LEVEL_NONE;
}

function getSourceIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  const hasSourceMismatch =
    compareSourcesAcrossDiffs(results).hasMismatch;

  if (hasSourceMismatch) {
    return TAB_LEVEL_ERROR;
  }

  let hasWarn = false;

  for (const result of results) {
    if (result.level === "error") {
      return TAB_LEVEL_ERROR;
    }

    if (result.level === "warn") {
      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getMiscIssueLevel(state) {
  const previewPointLevel = getPreviewPointIssueLevel(state.previewPoint);
  const bgOffsetLevel = getBgOffsetIssueLevel(state.bgOffset);
  const epilepsyWarningLevel = getEpilepsyWarningIssueLevel(state.epilepsyWarning);

  if (
    previewPointLevel === TAB_LEVEL_ERROR ||
    bgOffsetLevel === TAB_LEVEL_ERROR ||
    epilepsyWarningLevel === TAB_LEVEL_ERROR
  ) {
    return TAB_LEVEL_ERROR;
  }

  if (
    previewPointLevel === TAB_LEVEL_WARN ||
    bgOffsetLevel === TAB_LEVEL_WARN ||
    epilepsyWarningLevel === TAB_LEVEL_WARN
  ) {
    return TAB_LEVEL_WARN;
  }

  return TAB_LEVEL_NONE;
}

function getPreviewPointIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  const previewTimes = new Set(
    results
      .filter(result => result.previewTime !== null)
      .map(result => result.previewTime)
  );

  if (previewTimes.size > 1) {
    return TAB_LEVEL_ERROR;
  }

  let hasWarn = false;

  for (const result of results) {
    if (result.level === "error") {
      return TAB_LEVEL_ERROR;
    }

    if (result.level === "warn") {
      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getBgOffsetIssueLevel(results) {
  if (!results || !results.length) return TAB_LEVEL_NONE;

  const groups = new Map();

  for (const result of results) {
    for (const bg of result.backgrounds ?? []) {
      if (bg.imageType === "png") {
        return TAB_LEVEL_WARN;
      }

      const key = bg.normalizedFileName;
      if (!key) continue;

      if (!groups.has(key)) {
        groups.set(key, new Set());
      }

      groups.get(key).add(`${bg.xOffset},${bg.yOffset}`);
    }
  }

  for (const offsets of groups.values()) {
    if (offsets.size > 1) {
      return TAB_LEVEL_WARN;
    }
  }

  return TAB_LEVEL_NONE;
}

function getEpilepsyWarningIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const result of results) {
    const flashIssues = result.flashIssues ?? [];
    const bpmIssues = result.bpmIssues ?? [];

    if (flashIssues.some(issue => issue.level === "warn")) {
      hasWarn = true;
    }

    if (bpmIssues.some(issue => issue.level === "warn")) {
      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

function getSpreadIssueLevel(spreadState) {
  const results = spreadState?.results;
  const diffOrder = spreadState?.diffOrder;
  const manualCategories = spreadState?.manualCategories ?? {};
  const scrollGradientMode =
    spreadState?.scrollGradientMode ??
    (typeof getSpreadScrollGradientModeFromDom === "function"
      ? getSpreadScrollGradientModeFromDom(document)
      : "linear");
  const scrollIgnoreFinishers =
    spreadState?.scrollIgnoreFinishers ??
    (typeof getSpreadScrollIgnoreFinishersFromDom === "function"
      ? getSpreadScrollIgnoreFinishersFromDom(document)
      : false);

  if (!results || !results.length) return TAB_LEVEL_NONE;

  const restOptions = typeof getSpreadRestMomentOptionsFromDom === "function"
    ? getSpreadRestMomentOptionsFromDom(document)
    : {};
  const issueResults = typeof applySpreadRestMomentOptions === "function"
    ? applySpreadRestMomentOptions(results, restOptions)
    : results;

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(issueResults, diffOrder)
    : sortSpreadResults(issueResults);

  const hasUnknownCategory = sortedResults.some(result =>
    getSpreadEffectiveCategory(result, manualCategories) === "unknown"
  );

  if (hasUnknownCategory) {
    return TAB_LEVEL_ERROR;
  }

  let hasWarn = false;

  for (let i = 0; i < sortedResults.length; i++) {
    const result = sortedResults[i];
    const prev = sortedResults[i - 1];

    const odLevel = getSpreadOdLevel(result, manualCategories);
    const hpLevel = getSpreadHpLevel(result, manualCategories);
    const ruleLevel = getSpreadOdHpLevel(result, manualCategories);

    if (
      odLevel === "error" ||
      hpLevel === "error" ||
      ruleLevel === "error"
    ) {
      return TAB_LEVEL_ERROR;
    }

    if (
      odLevel === "warn" ||
      hpLevel === "warn" ||
      ruleLevel === "warn"
    ) {
      hasWarn = true;
    }

    if (prev) {
      if (
        prev.od !== null && prev.od !== undefined &&
        result.od !== null && result.od !== undefined &&
        result.od - prev.od < 0
      ) {
        hasWarn = true;
      }

      if (
        prev.hp !== null && prev.hp !== undefined &&
        result.hp !== null && result.hp !== undefined &&
        result.hp - prev.hp > 0
      ) {
        hasWarn = true;
      }
    }
  }

  for (let i = 1; i < sortedResults.length; i++) {
    const prev = sortedResults[i - 1];
    const cur = sortedResults[i];

    const prevNotes = prev.noteCount ?? 0;
    const curNotes = cur.noteCount ?? 0;

    if (prevNotes <= 0) continue;

    const ratio = curNotes / prevNotes;
    const level = getSpreadNoteRatioLevel(ratio, prev, cur, manualCategories);

    if (level === "error") return TAB_LEVEL_ERROR;
    if (level === "warn") hasWarn = true;
  }

  // 追加：メインタブは「表示する差分: +1」固定でノーツ密度を判定
  const densityAnalysisForMainTab = analyzeSpreadDensityInversions(
    sortedResults,
    manualCategories,
    1
  );

  if (densityAnalysisForMainTab.issueGroups.length) {
    hasWarn = true;
  }

  const restLevel = getSpreadRestMomentsIssueLevel(sortedResults, manualCategories);

  if (restLevel === "error") {
    return TAB_LEVEL_ERROR;
  }

  if (restLevel === "warn") {
    hasWarn = true;
  }

  const progression = analyzeSpreadScrollSpeedProgressionByEvent(sortedResults, manualCategories);

  if (progression.issueGroups.length) {
    hasWarn = true;
  }

  if (
    isSpreadLinearSvFeatureEnabled() &&
    sortedResults.some(result =>
      (typeof getSpreadScrollSpeedGradients === "function"
        ? getSpreadScrollSpeedGradients(
          result.scrollSpeed,
          scrollGradientMode,
          scrollIgnoreFinishers
        )
        : result.scrollSpeed?.linearGradients ?? []
      ).some(
        gradient => gradient.status === "warn"
      )
    )
  ) {
    hasWarn = true;
  }

  /** 追加：速すぎるスクロール速度 */
  for (const result of sortedResults) {
    const category = getSpreadEffectiveCategory(result, manualCategories);

    const level = getSpreadTooFastScrollLevel(
      result.scrollSpeed,
      category
    );

    if (level === "warn") {
      hasWarn = true;
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}

/** コンテンツ使用許可 */
function getContentPermissionIssueLevel(results) {
  if (!results) return TAB_LEVEL_NONE;

  let hasWarn = false;

  for (const result of results) {
    for (const item of result.results ?? []) {
      if (item.level === "error") {
        return TAB_LEVEL_ERROR;
      }

      if (item.level === "warn") {
        hasWarn = true;
      }
    }
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}
