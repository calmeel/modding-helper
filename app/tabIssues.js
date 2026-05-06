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
  setTabIssueLevel("tag", getTagIssueLevel(state.tag));
  setTabIssueLevel("misc", getMiscIssueLevel(state));
  setTabIssueLevel("spread", getSpreadIssueLevel(state.spread));
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
  if (!results || results.length < 2) return TAB_LEVEL_NONE;

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
      thresholdMode: "16snap",
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
    thresholdPercent: 5
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

  const hasRelatedSuggestions =
    results.some(result => result.relatedSuggestions?.length > 0);

  if (hasRelatedSuggestions) {
    return TAB_LEVEL_WARN;
  }

  return TAB_LEVEL_NONE;
}

function getSourceIssueLevel(results) {
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

function getMiscIssueLevel(state) {
  const sourceLevel = getSourceIssueLevel(state.source);
  const previewPointLevel = getPreviewPointIssueLevel(state.previewPoint);

  if (
    sourceLevel === TAB_LEVEL_ERROR ||
    previewPointLevel === TAB_LEVEL_ERROR
  ) {
    return TAB_LEVEL_ERROR;
  }

  if (
    sourceLevel === TAB_LEVEL_WARN ||
    previewPointLevel === TAB_LEVEL_WARN
  ) {
    return TAB_LEVEL_WARN;
  }

  return TAB_LEVEL_NONE;
}

function getPreviewPointIssueLevel(results) {
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

function getSpreadIssueLevel(spreadState) {
  const results = spreadState?.results;
  const diffOrder = spreadState?.diffOrder;
  const manualCategories = spreadState?.manualCategories ?? {};

  if (!results || !results.length) return TAB_LEVEL_NONE;

  const sortedResults = diffOrder
    ? applySpreadDiffOrder(results, diffOrder)
    : sortSpreadResults(results);

  let hasWarn = false;

  for (const result of sortedResults) {
    const odHpLevel = getSpreadOdHpLevel(result, manualCategories);

    if (odHpLevel === "error") return TAB_LEVEL_ERROR;
    if (odHpLevel === "warn") hasWarn = true;
  }

  for (let i = 1; i < sortedResults.length; i++) {
    const prev = sortedResults[i - 1];
    const cur = sortedResults[i];

    const prevNotes = prev.noteCount ?? 0;
    const curNotes = cur.noteCount ?? 0;

    if (prevNotes <= 0) continue;

    const ratio = curNotes / prevNotes;
    const level = getSpreadNoteRatioLevel(ratio);

    if (level === "error") return TAB_LEVEL_ERROR;
    if (level === "warn") hasWarn = true;
  }

  return hasWarn ? TAB_LEVEL_WARN : TAB_LEVEL_NONE;
}