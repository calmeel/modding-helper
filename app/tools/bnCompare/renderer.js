function renderBnCompareResult(result, dom, t, options = {}) {
  if (!result) {
    if (dom.bnNotesOutput) dom.bnNotesOutput.innerHTML = t("bnNoResult");
    if (dom.bnTimelineOutput) dom.bnTimelineOutput.innerHTML = t("bnNoResult");
    if (dom.bnTimingOutput) dom.bnTimingOutput.innerHTML = t("bnNoResult");
    if (dom.bnMetadataOutput) dom.bnMetadataOutput.innerHTML = t("bnNoResult");
    if (dom.bnDifficultyOutput) {dom.bnDifficultyOutput.innerHTML = formatBnDifficultyTable(options.resultsByPair ?? [], t);
  }
    return;
  }

  if (dom.bnNotesOutput) {
    dom.bnNotesOutput.innerHTML = formatBnNotesResult(result.notes, t);
  }

  if (dom.bnTimelineOutput) {
    dom.bnTimelineOutput.innerHTML = formatBnTimelineResult(result.timeline, t);
  }

  if (dom.bnTimingOutput) {
    dom.bnTimingOutput.innerHTML = formatBnTimingResult(result.timing, t, options);
  }

  if (dom.bnMetadataOutput) {
    dom.bnMetadataOutput.innerHTML = formatBnMetadataResult(result.metadata, t);
  }

  if (dom.bnDifficultyOutput) {
    dom.bnDifficultyOutput.innerHTML =
      formatBnDifficultyTable(
        options.resultsByPair ?? [],
        t
      );
  }
}
