// 各チェックの再描画と、派生するチェック結果の更新を取りまとめる。
function createResultRenderer({ state, dom, t, getBnCompareUi }) {
  function renderAllDiffResults() {
    renderResult();
    renderShiftResult();
    renderKiaiResult();
    renderKiaiSnapResult();
    renderDoubleSvResult();
    renderBarlineResult();
    renderUnappliedSvResult();
    renderSvVolumeResult();
    renderVolumeCompareResult();
    renderRedGreenMatchResult();
    renderSampleSetResult();
    renderSliderSettingsResult();
    renderEarlyNoteResult();
    renderArtistResult();
    renderTitleResult();
    renderSourceResult();
    renderTagResult();
    renderPreviewPointResult();
    renderBgOffsetResult();
    renderFileCheckResult();
    renderEpilepsyWarningResult();
    renderSpreadResult();
    renderSrCalculator(state.srCalculator, dom.srCalculatorOutput, t, state.spread.diffOrder);
    renderOffsetWaveformResult();
    renderContentPermissionResult();

    if (state.timeline) {
      renderTimelineResult();
    }

    updateTabIssueStates(state);
    getBnCompareUi().renderBnSelectedResult();
    getBnCompareUi().renderBnDiffMatching(true);
  }

  function renderResult() {
    renderClapWhistleResult(state.clapWhistle, dom, t);
    renderCoordinateResult(state.coordinates, dom, t);
  }

  function renderShiftResult() {
    state.offset = renderOffsetResultFromSources(
      state.offsetSources,
      dom,
      t
    );
  }

  function renderDoubleSvResult() {
    state.doubleSvResults = renderDoubleSvResultFromSources(
      state.doubleSvSources,
      dom,
      t
    );
  }

  function renderBarlineResult() {
    state.barlineResults = renderBarlineResultFromSources(
      state.barlineSources,
      dom,
      t
    );
  }

  function renderUnappliedSvResult() {
    renderUnappliedSvResultFromResults(
      state.unappliedSv,
      dom,
      t
    );
  }

  function renderKiaiResult() {
    renderKiaiCompareResult(state.kiaiCompare, dom, t);
  }

  function renderKiaiSnapResult() {
    renderKiaiSnapResultFromResults(state.kiaiSnap, dom, t);
  }

  function renderSvVolumeResult() {
    state.svVolumeResults = renderSvVolumeResultFromSources(
      state.svVolumeSources,
      dom,
      t
    );
  }

  function renderVolumeCompareResult() {
    state.volumeCompareResult = renderVolumeCompareResultFromSources(
      state.volumeCompareSources,
      dom,
      t
    );
  }

  function renderRedGreenMatchResult() {
    renderRedGreenMatchResultFromResults(
      state.redGreenMatch,
      dom,
      t
    );
  }

  function renderSampleSetResult() {
    renderSampleSetResultFromResults(
      state.sampleSet,
      dom,
      t
    );
  }

  function renderSliderSettingsResult() {
    renderSliderSettingsResultFromResults(
      state.sliderSettings,
      dom,
      t
    );
  }

  function renderArtistResult() {
    renderArtistResultFromResults(
      state.artist,
      dom,
      t
    );
  }

  function renderTitleResult() {
    renderTitleResultFromResults(
      state.title,
      dom,
      t
    );
  }

  function renderSourceResult() {
    renderSourceResultFromResults(
      state.source,
      dom,
      t
    );
  }

  function renderTagResult() {
    renderTagResultFromResults(
      state.tag,
      dom,
      t
    );
  }

  function renderPreviewPointResult() {
    renderPreviewPointResultFromResults(
      state.previewPoint,
      dom,
      t
    );
  }

  function renderBgOffsetResult() {
    renderBgOffsetResultFromResults(
      state.bgOffset,
      dom,
      t
    );
  }

  function renderFileCheckResult() {
    renderFileCheckResultFromResults(
      state.fileCheck,
      state.songFolderCheck,
      dom,
      t
    );
  }

  function renderEpilepsyWarningResult() {
    renderEpilepsyWarningResultFromResults(
      state.epilepsyWarning,
      dom,
      t
    );
  }

  function renderSpreadResult() {
    renderSpreadResultFromResults(state.spread, dom, t);
  }

  function renderOffsetWaveformResult() {
    renderOffsetWaveformResultFromSources(
      state.offsetWaveformSources,
      dom,
      t
    );
  }

  function renderContentPermissionResult() {
    renderContentPermissionResultFromResults(
      state.contentPermission,
      dom,
      t
    );
  }

  function renderTimelineResult() {
    state.timeline = renderTimelineResultFromSources(
      state.timelineSources,
      dom,
      t,
      {
        diffOrder: state.spread?.diffOrder ?? []
      }
    );
  }

  /** 警告tabのレンダー */
  function renderResultAndUpdateTabs() {
    renderResult();
    updateTabIssueStates(state);
  }

  function renderShiftResultAndUpdateTabs() {
    renderShiftResult();
    updateTabIssueStates(state);
  }

  function renderDoubleSvResultAndUpdateTabs() {
    renderDoubleSvResult();
    updateTabIssueStates(state);
  }

  function renderSvVolumeResultAndUpdateTabs() {
    renderSvVolumeResult();
    updateTabIssueStates(state);
  }

  function renderVolumeCompareResultAndUpdateTabs() {
    renderVolumeCompareResult();
    updateTabIssueStates(state);
  }

  function renderSpreadResultAndUpdateTabs() {
    renderSpreadResult();
    updateTabIssueStates(state);
  }

  function renderEarlyNoteResult() {
    renderEarlyNoteResultFromResults(state.earlyNote, dom, t);
  }

  return { renderAllDiffResults, renderResult, renderShiftResult, renderDoubleSvResult, renderBarlineResult, renderUnappliedSvResult, renderKiaiResult, renderKiaiSnapResult, renderSvVolumeResult, renderVolumeCompareResult, renderRedGreenMatchResult, renderSampleSetResult, renderSliderSettingsResult, renderArtistResult, renderTitleResult, renderSourceResult, renderTagResult, renderPreviewPointResult, renderBgOffsetResult, renderFileCheckResult, renderEpilepsyWarningResult, renderSpreadResult, renderOffsetWaveformResult, renderContentPermissionResult, renderTimelineResult, renderResultAndUpdateTabs, renderShiftResultAndUpdateTabs, renderDoubleSvResultAndUpdateTabs, renderSvVolumeResultAndUpdateTabs, renderVolumeCompareResultAndUpdateTabs, renderSpreadResultAndUpdateTabs, renderEarlyNoteResult };
}
