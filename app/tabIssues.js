function setTabIssue(tabName, hasIssue) {
  const button = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  if (!button) return;

  button.classList.toggle("has-issues", !!hasIssue);
}

function updateTabIssueStates(state) {
  setTabIssue("clapWhistle", hasClapWhistleIssues(state.clapWhistle));
  setTabIssue("shift1ms", hasOffsetIssues(state.offset));
  setTabIssue("kiaiCompare", hasKiaiCompareIssues(state.kiaiCompare));
  setTabIssue("kiaiSnap", hasKiaiSnapIssues(state.kiaiSnap));
  setTabIssue("doubleBarline", hasDoubleSvIssues(state.doubleSvResults));
  setTabIssue("svVolume", hasSvVolumeIssues(state.svVolumeResults));
  setTabIssue("volumeCompare", hasVolumeCompareIssues(state.volumeCompareResult));
  setTabIssue("redGreenMatch", hasRedGreenMatchIssues(state.redGreenMatch));
  setTabIssue("sampleSet", hasSampleSetIssues(state.sampleSet));
  setTabIssue("tag", hasTagIssues(state.tag));
  setTabIssue("sliderSettings", hasSliderSettingsIssues(state.sliderSettings));
}

function hasClapWhistleIssues(results) {
  return results?.some(result => {
    const clap = result.counts?.clap ?? 0;
    const whistle = result.counts?.whistle ?? 0;
    const both = result.counts?.both ?? 0;

    return (clap > 0 && whistle > 0) || both > 0;
  }) ?? false;
}

function hasOffsetIssues(results) {
  return results?.some(result => result.results?.length > 0) ?? false;
}

function hasKiaiCompareIssues(results) {
  if (!results || results.length < 2) return false;

  return compareKiaiResults(results).mismatchSections.length > 0;
}

function hasKiaiSnapIssues(results) {
  return results?.some(result => result.results?.length > 0) ?? false;
}

function hasDoubleSvIssues(results) {
  return results?.some(result => result.groups?.length > 0) ?? false;
}

function hasSvVolumeIssues(results) {
  return results?.some(result => result.results?.length > 0) ?? false;
}

function hasVolumeCompareIssues(result) {
  return result?.results?.length > 0;
}

function hasRedGreenMatchIssues(results) {
  return results?.some(result => result.results?.length > 0) ?? false;
}

function hasSampleSetIssues(results) {
  return results?.some(result =>
    result.timingIssues?.length > 0 ||
    result.objectIssues?.length > 0
  ) ?? false;
}

function hasTagIssues(results) {
  if (!results) return false;

  const hasSpacingIssues =
    results.some(result => result.results?.length > 0);

  const hasTagMismatch =
    compareTagsAcrossDiffs(results).hasMismatch;

  return hasSpacingIssues || hasTagMismatch;
}

function hasSliderSettingsIssues(results) {
  return results?.some(result => result.issues?.length > 0) ?? false;
}