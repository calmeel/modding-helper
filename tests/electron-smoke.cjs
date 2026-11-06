// Run with: node_modules/.bin/electron tests/electron-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, clipboard, shell } = require('electron');
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
require.cache[watcherPath] = { id: watcherPath, filename: watcherPath, loaded: true, exports: {
  setDeliver() {}, start() {}, stop() {}, resendMapInfo() {}, getCurrentOsuPath() { return null; },
} };
let copiedText;
clipboard.writeText = async text => { copiedText = text; };
const openedLinks = [];
shell.openExternal = async url => { openedLinks.push(url); };
const openedFolders = [];
shell.openPath = async folder => { openedFolders.push(folder); return ''; };
const runtimeErrors = [];
app.on('browser-window-created', (_, win) => {
  win.show = () => { win.__smokeRevealed = true; }; // Run without interrupting the user's desktop.
  win.webContents.setBackgroundThrottling(false);
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
const deadline = setTimeout(() => { console.error('Electron smoke test timed out'); app.exit(1); }, 90000);
async function until(predicate, description) {
  for (let i = 0; i < 200; i++) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${description}`);
}
function evaluate(win, code) { return win.webContents.executeJavaScript(code); }
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
  for (const ruleset of ['livePP2510', 'livePP2503', 'livePP2410After', 'livePP2410Before', 'livePP2208', 'livePP2021', 'livePP2020']) {
    const historical = await evaluate(main, `window.electronAPI.calculateSr([{fileName:'test.osu', content:${JSON.stringify(beatmap)}}], [], ${JSON.stringify(ruleset)})`);
    assert.ok(!historical.error, `${ruleset}: ${JSON.stringify(historical)}`);
  }
  await evaluate(main, `window.__maximizeEvents = 0; window.electronAPI.onMaximize(() => window.__maximizeEvents++);`);
  main.unmaximize();
  main.maximize();
  await until(async () => (await evaluate(main, 'window.__maximizeEvents')) > 0, 'maximize IPC callback');

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
  popouts.openPopout('metadata', 'ja');
  popouts.openPopout('timing', 'en');
  popouts.openChartPopout('kiaiCompareChart', 'ja');
  await until(() => BrowserWindow.getAllWindows().length === 4, 'popout creation');
  for (const win of BrowserWindow.getAllWindows().filter(win => win !== main)) {
    await until(async () => !win.webContents.isLoading() && await evaluate(win, '!!window.electronAPI'), 'popout preload');
    assert.equal(win.webContents.getLastWebPreferences().sandbox, true);
  }
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
  const metadata = BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('panel=metadata'));
  await until(async () => (await evaluate(metadata, `document.getElementById('osu-map-meta').textContent.includes('A & B <test>')`)), 'metadata popout synchronization');
  for (const win of [main, metadata]) {
    assert.equal(await evaluate(win, `document.querySelectorAll('#osu-map-meta img, #osu-map-meta svg').length`), 0);
    assert.equal(await evaluate(win, '!!window.__unsafeMetadata'), false);
  }

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
  assert.deepEqual(runtimeErrors, []);
  console.log(JSON.stringify({ status: 'passed', versions: process.versions,
    checks: ['startup', 'sandbox/preload', '.osu native paths and folder actions', 'clipboard IPC', 'SR calculator',
      'external links', 'osu timestamp clicks and chart navigation', 'metadata/timing/chart popouts', 'chart synchronization', '.osz loading', 'language switching'] }));
  clearTimeout(deadline);
  app.exit(0);
}).catch(error => {
  console.error(error);
  console.error(runtimeErrors);
  clearTimeout(deadline);
  app.exit(1);
});
