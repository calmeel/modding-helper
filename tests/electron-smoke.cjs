// Run with: node_modules/.bin/electron tests/electron-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, clipboard, shell } = require('electron');
const { withTimeout, waitFor } = require('./helpers/wait.cjs');
const sourceRoot = path.resolve(__dirname, '..');
const root = process.env.MODDING_HELPER_SMOKE_APP || sourceRoot;
const output = path.join(sourceRoot, 'electron', 'dist-verify', 'smoke');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(output, 'profile-')));
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (root !== sourceRoot) {
  app.setAppPath(root);
  Object.defineProperty(app, 'isPackaged', { value: true });
  Object.defineProperty(process, 'resourcesPath', { value: path.dirname(root) });
  require(path.join(root, 'electron', 'services', 'updater')).setupAutoUpdate = () => {};
}

// Never start the real game memory watcher or alter the user's clipboard/settings.
const watcherPath = path.join(root, 'electron', 'osu', 'osuWatcher.js');
let currentOsuPath = null;
require.cache[watcherPath] = { id: watcherPath, filename: watcherPath, loaded: true, exports: {
  setDeliver() {}, start() {}, stop() {}, resendMapInfo() {}, getCurrentOsuPath() { return currentOsuPath; },
} };
let copiedText;
clipboard.writeText = async text => { copiedText = text; };
const openedLinks = [];
shell.openExternal = async url => { openedLinks.push(url); };
const openedFolders = [];
shell.openPath = async folder => { openedFolders.push(folder); return ''; };
const runtimeErrors = [];
const windowEvents = [];
app.on('browser-window-created', (_, win) => {
  win.show = () => { win.__smokeRevealed = true; }; // Run without interrupting the user's desktop.
  win.showInactive = () => {};
  // Native maximize() can reveal a hidden window on Windows. Exercise the app's
  // maximize-event/IPC path without performing the OS window operation.
  let maximized = false;
  win.isMaximized = () => maximized;
  win.maximize = () => { maximized = true; win.emit('maximize'); };
  win.unmaximize = () => { maximized = false; win.emit('unmaximize'); };
  win.on('show', () => runtimeErrors.push(`Unexpected visible test window: ${win.id}`));
  win.webContents.setBackgroundThrottling(false);
  for (const name of ['did-start-loading', 'did-stop-loading', 'did-finish-load', 'did-fail-load', 'will-navigate']) {
    win.webContents.on(name, () => {
      windowEvents.push({ time: Date.now(), window: win.id, event: name, url: win.webContents.getURL() });
      if (windowEvents.length > 40) windowEvents.shift();
    });
  }
  win.webContents.on('preload-error', (_, file, error) => runtimeErrors.push(`${file}: ${error}`));
  win.webContents.on('render-process-gone', (_, details) => runtimeErrors.push(JSON.stringify(details)));
  win.webContents.debugger.attach('1.3');
  win.webContents.debugger.on('message', (_, method, data) => {
    if (method === 'Runtime.exceptionThrown') runtimeErrors.push(JSON.stringify(data.exceptionDetails));
  });
  win.webContents.debugger.sendCommand('Runtime.enable');
});

const beatmap = `osu file format v14
[General]
AudioFilename: audio.wav
PreviewTime:1000
Mode:1
[Metadata]
Title:Security update smoke test
Artist:Test
Creator:Test
Version:Oni
BeatmapID:123
BeatmapSetID:456
[Difficulty]
HPDrainRate:5
CircleSize:5
OverallDifficulty:5
ApproachRate:5
SliderMultiplier:1.4
SliderTickRate:1
[TimingPoints]
0,500,4,1,0,100,1,0
[HitObjects]
256,192,1000,1,0,0:0:0:0:
256,192,1500,1,0,0:0:0:0:
256,192,2000,1,0,0:0:0:0:
`;
function describeWindow(win) {
  if (win.isDestroyed() || win.webContents.isDestroyed()) return `window=${win.id}, destroyed=true`;
  return `window=${win.id}, url=${win.webContents.getURL()}, loading=${win.webContents.isLoading()}`;
}
const deadline = setTimeout(() => {
  console.error('Electron smoke test timed out');
  console.error(BrowserWindow.getAllWindows().map(describeWindow));
  console.error(JSON.stringify(windowEvents));
  app.exit(1);
}, 90000);
const until = waitFor;
function evaluate(win, code) {
  return withTimeout(() => win.webContents.executeJavaScript(code), 5000,
    () => `renderer evaluation: ${describeWindow(win)}, code=${code.slice(0, 180)}`);
}
async function selectFile(win, filePath, expectedName = path.basename(filePath)) {
  const { root: document } = await win.webContents.debugger.sendCommand('DOM.getDocument');
  const { nodeId } = await win.webContents.debugger.sendCommand('DOM.querySelector', {
    nodeId: document.nodeId, selector: '#fileInput',
  });
  await win.webContents.debugger.sendCommand('DOM.setFileInputFiles', { nodeId, files: [filePath] });
  await evaluate(win, `document.getElementById('fileInput').dispatchEvent(new Event('change'))`);
  await until(async () => (await evaluate(win, 'window.__loadedDiffs?.[0]?.fileName')) === expectedName, 'beatmap loading');
}

require(path.join(root, 'electron', 'main.js'));
app.whenReady().then(async () => {
  await until(() => BrowserWindow.getAllWindows().length, 'main window');
  const main = BrowserWindow.getAllWindows()[0];
  await until(async () => !main.webContents.isLoading() && await evaluate(main,
    `!!document.getElementById('electron-layout') && getComputedStyle(document.documentElement).visibility === 'visible'`), 'startup UI');
  await until(() => main.__smokeRevealed, 'startup injection completion');
  assert.equal(await evaluate(main, 'typeof window.electronAPI.getPathForFile'), 'function');
  assert.equal(await evaluate(main, 'typeof JSZip'), 'function');
  assert.equal(await evaluate(main, 'typeof require'), 'undefined');
  assert.equal(main.webContents.getLastWebPreferences().sandbox, true);
  console.log('PASS startup and sandbox');

  const osuFile = path.join(output, 'Test - Security update (Test) [Oni].osu');
  fs.writeFileSync(osuFile, beatmap);
  await selectFile(main, osuFile);
  assert.equal(await evaluate(main, `getNativeFilePath(document.getElementById('fileInput').files[0])`), osuFile);
  await until(async () => (await evaluate(main, 'window.electronAPI.getCurrentMapActions()')).canOpenFolder, 'native file actions');
  await until(async () => (await evaluate(main, 'window.electronAPI.getCurrentMapActions()')).canOpenBeatmapPage, 'beatmap metadata actions');
  assert.equal(await evaluate(main, `window.electronAPI.copyText('smoke test 日本語')`), true);
  assert.equal(copiedText, 'smoke test 日本語');
  const result = await evaluate(main, `window.electronAPI.calculateSr([{fileName:'test.osu', content:${JSON.stringify(beatmap)}}], [], 'current')`);
  assert.ok(!result.error, JSON.stringify(result));
  console.log('PASS file loading, clipboard IPC, current SR');
  await evaluate(main, `document.getElementById('etb-tab-preview').click(); true`);
  await until(async () => await evaluate(main, `document.getElementById('etb-spread-canvas').__spreadGeom?.n === 1`), 'preview canvas drawing');
  await evaluate(main, `document.getElementById('etb-tab-main').click(); true`);
  console.log('PASS preview controller and note drawing');
  await evaluate(main, `document.getElementById('etb-tab-notepad').click(); true`);
  await until(async () => await evaluate(main, `document.querySelectorAll('#etb-notepad pre span').length >= 4`), 'notepad virtualized rows');
  assert.equal(await evaluate(main, `document.querySelector('#etb-notepad select').value`), path.basename(osuFile));
  await evaluate(main, `(() => {
    document.getElementById('toggleTabSettings').click();
    document.getElementById('etb-preview-transparent-sliders-cb').click();
    document.getElementById('etb-preview-kiai-cb').click();
    document.getElementById('etb-preview-timing-info-cb').click();
    const volume = document.getElementById('etb-sfx-vol-input');
    volume.value = '73'; volume.dispatchEvent(new Event('input'));
    const originalDraw = window.drawTaikoSpread;
    window.drawTaikoSpread = function(canvas, diffs, time, options) {
      window.__smokePreviewOptions = options;
      return originalDraw(canvas, diffs, time, options);
    };
    window.__smokeRestorePreviewDraw = () => { window.drawTaikoSpread = originalDraw; };
    document.getElementById('etb-tab-preview').click();
  })()`);
  await until(async () => await evaluate(main, `window.__smokePreviewOptions?.transparentSliders === true && window.__smokePreviewOptions.highlightKiai === false && window.__smokePreviewOptions.showTimingInfo === true`), 'settings update preview drawing');
  assert.equal(await evaluate(main, `document.getElementById('etb-sfx-vol-input').parentElement.querySelector('input[type=range]').value`), '73');
  await evaluate(main, `document.getElementById('etb-tab-main').click(); window.__smokeRestorePreviewDraw(); true`);
  console.log('PASS preview settings and notepad controller');
  for (const ruleset of ['livePP2510', 'livePP2503', 'livePP2410After', 'livePP2410Before', 'livePP2208', 'livePP2021', 'livePP2020']) {
    const historical = await evaluate(main, `window.electronAPI.calculateSr([{fileName:'test.osu', content:${JSON.stringify(beatmap)}}], [], ${JSON.stringify(ruleset)})`);
    assert.ok(!historical.error, `${ruleset}: ${JSON.stringify(historical)}`);
  }
  await evaluate(main, `window.__maximizeEvents = 0; window.electronAPI.onMaximize(() => window.__maximizeEvents++);`);
  main.unmaximize();
  main.maximize();
  await until(async () => (await evaluate(main, 'window.__maximizeEvents')) > 0, 'maximize IPC callback');
  assert.equal(await evaluate(main, `!!document.querySelector('#etb-max svg path')`), true);

  await evaluate(main, `window.open('https://osu.ppy.sh/beatmapsets/456', '_blank') === null`);
  await until(() => openedLinks.length, 'external link');
  assert.equal(openedLinks[0], 'https://osu.ppy.sh/beatmapsets/456');
  await evaluate(main, `window.open('file:///C:/untrusted.exe', '_blank') === null`);
  assert.equal(openedLinks.length, 1);
  assert.equal(BrowserWindow.getAllWindows().length, 1);

  async function clickTimestamp(win, time) {
    const url = `osu://edit/${time}`;
    const previousCount = openedLinks.length;
    const pageUrl = win.webContents.getURL();
    await evaluate(win, `(() => {
      const link = document.createElement('a');
      link.href = ${JSON.stringify(url)};
      link.className = 'timestamp-link';
      link.textContent = ${JSON.stringify(time)};
      document.body.appendChild(link);
      link.click();
      link.remove();
    })()`);
    await until(() => openedLinks.length > previousCount, 'osu editor timestamp handoff');
    assert.equal(openedLinks.at(-1), url);
    assert.equal(win.webContents.getURL(), pageUrl);
  }
  await clickTimestamp(main, '00:01:000');
  console.log('PASS main timestamp click');
  assert.equal(await evaluate(main, 'window.electronAPI.openCurrentMapFolder()'), true);
  assert.equal(openedFolders.at(-1), path.dirname(osuFile));
  assert.equal(await evaluate(main, 'window.electronAPI.openCurrentBeatmapPage()'), true);
  assert.equal(openedLinks.at(-1), 'https://osu.ppy.sh/beatmapsets/456#taiko/123');

  const popouts = require(path.join(root, 'electron', 'windows', 'popouts'));
  await evaluate(main, `document.getElementById('etb-tab-realtime').click(); true`);
  popouts.openChartPopout('kiaiCompareChart', 'ja');
  await until(() => BrowserWindow.getAllWindows().length === 3, 'timing and chart popout creation');
  for (const win of BrowserWindow.getAllWindows().filter(win => win !== main)) {
    await until(async () => !win.webContents.isLoading() && await evaluate(win, '!!window.electronAPI'), 'popout preload');
    assert.equal(win.webContents.getLastWebPreferences().sandbox, true);
  }
  const timing = BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('panel=timing'));
  popouts.broadcastOsuData('osu-timing-info', { time: 1234, bpm: 180, sv: 1, vbpm: 180, volume: 80 });
  await until(async () => await evaluate(timing, `document.getElementById('osu-t-timing').textContent === '00:01:234'`), 'realtime timing update');
  assert.equal(await evaluate(main, `document.getElementById('etb-tab-realtime').getAttribute('aria-expanded')`), 'true');
  console.log('PASS realtime popout and timing updates');
  const chart = BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('popoutChart'));
  await until(async () => (await evaluate(chart, 'window.__loadedDiffs?.length')) === 1, 'chart source synchronization');
  await clickTimestamp(chart, '01:23:456');
  const previousCount = openedLinks.length;
  await evaluate(chart, `location.href = 'osu://edit/02:34:567'; true`);
  await until(() => openedLinks.length > previousCount, 'chart timestamp navigation');
  assert.equal(openedLinks.at(-1), 'osu://edit/02:34:567');
  console.log('PASS chart timestamp click and navigation');

  const unsafeMeta = { artist: '<img src=x onerror="window.__unsafeMetadata=true">', tags: '<svg/onload=window.__unsafeMetadata=true>', title: 'A & B <test>', creator: 'Test' };
  await evaluate(main, `window.__osuPanel.renderFileMeta(${JSON.stringify(unsafeMeta)}); true`);
  assert.equal(await evaluate(main, `document.getElementById('osu-map-meta').textContent.includes('A & B <test>')`), true);
  assert.equal(await evaluate(main, `document.querySelectorAll('#osu-map-meta img, #osu-map-meta svg').length`), 0);
  assert.equal(await evaluate(main, '!!window.__unsafeMetadata'), false);
  assert.equal(await evaluate(main, 'typeof window.electronAPI.sendMapMetaToPopout'), 'undefined');
  console.log('PASS metadata card escaped text');

  const JSZip = require('jszip');
  const zip = new JSZip();
  zip.file('Archive [Oni].osu', beatmap);
  const oszFile = path.join(output, 'Smoke.osz');
  fs.writeFileSync(oszFile, await zip.generateAsync({ type: 'nodebuffer' }));
  await selectFile(main, oszFile, 'Archive [Oni].osu');
  for (const language of ['Ja', 'Ja', 'En', 'En']) {
    await evaluate(main, `document.getElementById('lang${language}').click(); true`);
    const expectedDocs = 'https://calmeel.github.io/modding-helper/docs/' + (language === 'Ja' ? 'docs.html' : 'docs-en.html');
    assert.equal(await evaluate(main, `document.getElementById('manualLink').href`), expectedDocs);
    const previous = openedLinks.length;
    await evaluate(main, `document.getElementById('manualLink').click(); true`);
    await until(() => openedLinks.length > previous, 'manual link after language selection');
    assert.equal(openedLinks.at(-1), expectedDocs);
  }
  // Loading policy applies only to osu! mode; file mode keeps its saved preference.
  const multiFolder = fs.mkdtempSync(path.join(output, 'multi-audio-'));
  currentOsuPath = path.join(multiFolder, 'one.osu');
  fs.writeFileSync(currentOsuPath, beatmap);
  fs.writeFileSync(path.join(multiFolder, 'two.osu'), beatmap.replace('audio.wav', 'other.wav'));
  const optionState = () => evaluate(main, `(() => {
    const el = document.getElementById('skipMultipleAudioMapsets');
    return { checked: el.checked, disabled: el.disabled };
  })()`);
  const sourceMode = mode => evaluate(main, `(() => {
    const radio = document.querySelector('input[name="osuSource"][value="${mode}"]');
    radio.checked = true; radio.dispatchEvent(new Event('change'));
  })()`);
  const togglePolicy = () => evaluate(main, `document.getElementById('skipMultipleAudioMapsets').click()`);
  const skipped = () => evaluate(main, `document.getElementById('osuSourceStatus').textContent === i18n[document.documentElement.lang].osuSourceMultipleAudioSkipped`);
  assert.deepEqual(await optionState(), { checked: false, disabled: true });
  await sourceMode('osu');
  await until(skipped, 'multiple-audio mapset skipped');
  assert.deepEqual(await optionState(), { checked: true, disabled: false });
  assert.equal(await evaluate(main, 'window.__loadedDiffs'), null);
  assert.equal(await evaluate(main, 'window.__loadedAudio'), null);
  assert.equal(await evaluate(main, `document.getElementById('output').textContent === i18n[document.documentElement.lang].noFileLoaded`), true);
  await evaluate(main, `document.querySelector('.tab-button[data-tab="spectrogram"]').click()`);
  await until(async () => await evaluate(main, `document.getElementById('spectrogramEmpty').textContent === i18n[document.documentElement.lang].noFileLoaded`), 'skipped spectrogram shows no file loaded');
  // Switch to a different mapset whose beatmap loads but whose audio is absent.
  // Spectrogram availability follows the audio, not the presence of .osu data.
  const noAudioFolder = fs.mkdtempSync(path.join(output, 'no-audio-'));
  currentOsuPath = path.join(noAudioFolder, 'no-audio.osu');
  fs.writeFileSync(currentOsuPath, beatmap);
  main.webContents.send('osu-map-info', null);
  await until(async () => await evaluate(main, `window.__loadedDiffs?.[0]?.fileName === 'no-audio.osu'`), 'next mapset loaded without audio');
  assert.equal(await evaluate(main, 'window.__loadedAudio'), null);
  for (const language of ['Ja', 'En']) {
    await evaluate(main, `new Promise(resolve => {
      document.getElementById('lang${language}').click();
      document.querySelector('.tab-button[data-tab="spectrogram"]').click();
      setTimeout(resolve, 0);
    })`);
    assert.equal(await evaluate(main, `document.getElementById('spectrogramEmpty').textContent === i18n[document.documentElement.lang].noFileLoaded`), true);
    assert.equal(await evaluate(main, `document.getElementById('spectrogramChartWrap').hidden`), true);
  }
  currentOsuPath = path.join(multiFolder, 'one.osu');
  main.webContents.send('osu-map-info', null);
  await until(skipped, 'returning to multi-audio mapset is skipped');
  const unchanged = await evaluate(main, `window.electronAPI.getCurrentMapset(${JSON.stringify(multiFolder)})`);
  assert.equal(unchanged.unchanged, true);
  await togglePolicy();
  await until(async () => await evaluate(main, 'window.__loadedDiffs?.length === 2'), 'policy off loads current mapset');
  await sourceMode('file');
  assert.deepEqual(await optionState(), { checked: false, disabled: true });
  await sourceMode('osu');
  assert.deepEqual(await optionState(), { checked: false, disabled: false });
  await togglePolicy();
  await until(skipped, 'policy on clears current mapset');
  await sourceMode('file');
  await sourceMode('osu');
  await until(skipped, 'saved on preference restored');
  assert.deepEqual(await optionState(), { checked: true, disabled: false });
  // Saving a changed audio reference invalidates the same-folder skip.
  fs.writeFileSync(path.join(multiFolder, 'two.osu'), beatmap);
  await until(async () => await evaluate(main, 'window.__loadedDiffs?.length === 2'), 'saved mapset is re-evaluated');
  fs.writeFileSync(path.join(multiFolder, 'two.osu'), beatmap.replace('audio.wav', 'other.wav'));
  await until(skipped, 'saved multi-audio mapset is skipped again');
  // The blocked mapset still loads when explicitly selected as a file.
  const multiZip = new JSZip();
  multiZip.file('one.osu', beatmap);
  multiZip.file('two.osu', beatmap.replace('audio.wav', 'other.wav'));
  const multiOsz = path.join(output, 'Multi.osz');
  fs.writeFileSync(multiOsz, await multiZip.generateAsync({ type: 'nodebuffer' }));
  await selectFile(main, multiOsz, 'one.osu');
  assert.deepEqual(await optionState(), { checked: false, disabled: true });
  assert.equal(await evaluate(main, 'window.__loadedDiffs.length'), 2);
  // Production injects the desktop layout once per window. Recreate that layout
  // explicitly after reload so we can verify renderer startup with saved values.
  const loadedAgain = withTimeout(() => new Promise(resolve => main.webContents.once('did-finish-load', resolve)),
    20000, 'main window reload');
  main.webContents.reload();
  await loadedAgain;
  const injection = require(path.join(root, 'electron/inject/bundle'));
  await main.webContents.insertCSS(injection.loadInjectCss());
  await evaluate(main, injection.buildInjectScript(
    require('node:url').pathToFileURL(path.join(root, 'images/icon.png')).href,
    require(path.join(root, 'package.json')).version));
  await evaluate(main, 'window.electronAPI.revealStartupUI()');
  assert.deepEqual(await optionState(), { checked: false, disabled: true });
  await sourceMode('osu');
  await until(skipped, 'preference persists after reload');
  // Hidden windows may stop producing animation frames, even with background
  // throttling disabled. Prove settings work without them, and wait on the actual
  // DOM/style condition rather than an unrelated pair of rendering callbacks.
  await evaluate(main, `window.__smokeSavedRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    document.getElementById('langJa').click(); document.getElementById('toggleTabSettings').click()`);
  try {
    await until(async () => await evaluate(main, `
      document.getElementById('electron-layout').classList.contains('etb-settings') &&
      getComputedStyle(document.getElementById('etb-card-loadsettings')).display !== 'none'
    `), 'reloaded settings visible without animation frames');
  } finally {
    await evaluate(main, 'window.requestAnimationFrame = window.__smokeSavedRaf; delete window.__smokeSavedRaf; true');
  }
  console.log('PASS reload and settings without animation frames');
  fs.writeFileSync(path.join(output, 'mapset-loading-settings.png'), (await main.webContents.capturePage()).toPNG());
  console.log('PASS multiple-audio loading policy and saved settings');
  // ブラウザ版と同じ、preload・Electronレイアウトなしの画面でも読み込めること。
  const browser = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  await browser.loadFile(path.join(root, 'index.html'));
  assert.equal(await evaluate(browser, 'typeof window.electronAPI'), 'undefined');
  await evaluate(browser, `window.__loadModdingHelperFile(new File([${JSON.stringify(beatmap)}], 'Browser [Oni].osu'))`);
  assert.deepEqual(await evaluate(browser, 'window.__loadedDiffOrder'), ['Browser [Oni].osu']);
  assert.equal(await evaluate(browser, `document.querySelectorAll('#spreadOrderOutput pre').length`), 1);
  assert.equal(await evaluate(browser, `document.getElementById('electron-layout')`), null);
  assert.ok(BrowserWindow.getAllWindows().every(win => !win.isVisible()), 'all smoke windows stay hidden');
  browser.destroy();
  console.log('PASS browser layout and file loading');
  assert.deepEqual(runtimeErrors, []);
  console.log(JSON.stringify({ status: 'passed', versions: process.versions,
    checks: ['startup', 'sandbox/preload', '.osu native paths and folder actions', 'clipboard IPC', 'SR calculator', 'preview drawing', 'preview settings', 'notepad', 'browser file loading',
      'external links', 'osu timestamp clicks and chart navigation', 'timing/chart popouts', 'metadata card escaping', 'hidden test windows', 'chart synchronization', '.osz loading', 'language switching', 'multiple-audio mapset policy and persistence'] }));
  clearTimeout(deadline);
  app.exit(0);
}).catch(error => {
  console.error(error);
  console.error(runtimeErrors);
  console.error(JSON.stringify(windowEvents));
  clearTimeout(deadline);
  app.exit(1);
});
