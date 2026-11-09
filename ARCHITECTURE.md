# Code organization

The browser and Electron renderers use classic scripts loaded explicitly by
`index.html`. Keep their order when adding dependencies. This project does not
require a bundler for the web app.

## Application startup

- `app/main.js`: DOM references, application state, and controller/event wiring.
- `app/ui/languageController.js`: translates labels/titles, updates language buttons,
  manual/history and empty-state text, and synchronizes the desktop language before
  requesting a result redraw. Queries labels on each application to include injected UI.
- `app/ui/resultRenderer.js`: redraws individual checks or all related results.
  It receives the application state, DOM references, translator, and BN UI accessor.
  `renderLoadedFileResults()` preserves the initial render order without invoking
  BN comparison work.
- `app/electron/osuSourceController.js`: source-mode settings, osu! notifications,
  reload sequencing, and load-status text. File processing and state reset are
  callbacks supplied by startup.
- `app/files/mapMetadata.js`: metadata/background extraction from `.osu` and `.osz`.
- `app/files/fileSessionController.js`: file-load sequencing, applying check results,
  restoring/saving mapset Diff preferences, preview audio URL ownership, and file
  metadata/chart-source publication. Startup supplies source-mode and popout-order
  getters, order synchronization, rendering, and reset callbacks.

## Electron layout

`electron/inject/bundle.js` is the single entry point for loading desktop CSS and
initialization scripts. Production and the Electron smoke test use this loader.

- `ui.js`: wires layout, display modes, navigation, timing notifications, playheads,
  and the following components.
- `layout.js`: builds desktop columns/cards and relocates existing tabs, loading
  controls, and visibility settings. Returns shared element/component references.
- `displayModes.js`: applies compact/wide and top-tab visibility, relocates the
  existing map actions/drop area, and updates compact metadata. Reads current mode
  and metadata through getters and delegates preview/notepad/playhead activation.
- `titlebar.js`: titlebar DOM, window controls, and update progress display.
  Its `connect()` method attaches window events after the layout has been inserted.
- `navigation.js`: top-level tabs, language/manual links, and realtime-window state.
  View selection and language refreshes are delegated to startup callbacks.
- `playheadController.js`: graph playheads and current-Diff markers, including
  repositioning after chart redraws, tab changes, and resize. It receives visibility
  and current-difficulty getters rather than owning the application's display mode.
- `metadataCard.js`: creates the metadata card; owns tag marks and map-action buttons.
- `diffOrderCard.js`: creates the Diff order card and moves its existing controls
  between wide and compact layouts without replacing their event handlers.
- `previewController.js`: preview playback, drawing coordination, and live
  preview option state. It receives playback state and parent-owned display callbacks.
- `previewInput.js`: note selection and marquee state, canvas clicks/drags/wheel,
  progress-bar seeking, and preview keyboard shortcuts. Playback, zoom, sound resets,
  and timestamp copying use controller callbacks; drawing reads its selection getters.
- `previewLayout.js`: preview panel, toolbar, canvas, and playback-bar DOM;
  event handlers and state stay in the controller.
- `previewHitSounds.js`: lookahead scheduling of note sounds on the shared audio
  clock, including playback-speed corrections, roll/swell hits, and seek resets.
  It owns reservation state; the controller supplies playback and kit settings.
- `previewAudio.js`: music decoding, playback, and pitch-preserving speed changes.
  Its audio-like API uses the shared AudioContext clock for playback position.
- `previewHitTesting.js`: point and rectangle queries against rendered note geometry;
  selection state belongs to the input controller.
- `previewDiffData.js`: prepares parsed notes, timing, markers, and the preview time
  range. Cache invalidation and difficulty ordering remain in the controller.
- `previewSettings.js`: settings-card DOM and input handlers. It receives only
  preview options, display callbacks, audio callbacks, and visibility/order callbacks;
  the preview controller connects these callbacks to playback and difficulty caches.
- `spectrogramController.js`: audio decoding, color selection, and redraw monitoring
  for the spectrogram. Audio context and playhead changes use explicit callbacks.
- `notepadController.js`: raw beatmap sections, difficulty selection, and virtualized
  rows around the current time. `setActive()` starts/stops its rendering loop.

The CSS files are concatenated in their original cascade order. In particular,
`titlebarOverrides.css` deliberately follows the preview styles, and `ui.css`
contains the final result/settings overrides.

## Preview and chart rendering

- `taikoNotes.js`: note parsing, combo numbers, swell/roll calculations.
- `taikoTiming.js`: timing, scroll speed, barlines, and timeline markers.
- `taikoProgress.js`: progress-bar drawing.
- `taikoSpreadView.js`: note lanes and playfield drawing.
- `taikoAudio.js`: synthesized and sampled hit-sound kits.

These files live under `app/electron/` and share the existing global helper API.
Load them before creating the Electron preview controller.

The scroll chart files under `app/charts/` share `spreadScrollChartState`:

- `spreadScrollChart.js`: chart state, initialization, filtering, and input handling.
- `spreadScrollDrawing.js`: speed/delta chart rendering and drawing helpers.
- `spreadScrollTooltip.js`: tooltip content and coordinate helpers.

The volume chart files share `volumeCompareChartState` and use the same explicit
script order in `index.html`:

- `volumeCompareChart.js`: state, initialization, series toggles, and pointer/wheel input.
- `volumeCompareDrawing.js`: colors, stepped volume lines, background bands, visible
  difference sections, and playhead/marker geometry.
- `volumeCompareTooltip.js`: visible-series tooltip content, interval annotations,
  and positioning within the chart wrapper.

The density chart follows the same split and shares `spreadDensityChartState`:

- `spreadDensityChart.js`: state, Diff order/filtering, inversion-only visibility,
  initialization, and pointer/wheel input. Owns the shared measure-boundary tolerance.
- `spreadDensityDrawing.js`: stepped measure densities, inversion bands, axis scales,
  and playhead/marker geometry.
- `spreadDensityTooltip.js`: measure-group lookup, visible-Diff and inversion details,
  and tooltip positioning. Both drawing and tooltips use the existing density analysis.

The offset waveform files share `offsetWaveformChartState`:

- `offsetWaveformChart.js`: source selection, asynchronous audio decoding and stale
  decode rejection, initialization, and estimate/manual-result display.
- `offsetWaveformDrawing.js`: stereo waveform, grid/barlines, correction guides,
  and playhead geometry.
- `offsetWaveformInput.js`: pan/zoom, hover time, and manual peak selection with
  nearest-barline correction. It uses the shared chart navigation helpers.
- `offsetWaveformData.js`: audio sample analysis and waveform resampling.

## Verification

- `npm test`: parser/check/order/persistence regression tests.
- `npm run test:electron`: hidden Electron smoke test, including preview drawing,
  desktop cards, source modes, chart popouts, reload, and a browser-style window.
  Only realtime timing and graph popouts are supported; the retired metadata
  popout is rejected. Popouts are created hidden and shown after loading so the
  smoke test's show override also prevents constructor-time windows from appearing.
  The smoke test simulates maximize/unmaximize events to test the app's IPC path
  without OS maximization revealing hidden windows, and asserts that no window
  became visible. Native OS maximize behavior is outside this hidden test.
  Wait for observable DOM/style conditions rather than animation frames: hidden
  windows can stop producing frames, including after reload. The settings check
  explicitly disables frame callbacks to cover this failure mode.
- `tests/helpers/wait.cjs`: condition deadlines also bound unresolved probes.
  Renderer evaluations have a separate 5-second limit; failure logs include the
  window URL/loading state, executed code, and recent window loading events.
