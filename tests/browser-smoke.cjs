// Test the web app in a real browser, without Electron or a preload bridge.
// node tests/browser-smoke.cjs [absolute path to Chrome/Edge]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'electron', 'dist-verify', 'browser-smoke');
fs.mkdirSync(output, { recursive: true });
const profile = fs.mkdtempSync(path.join(output, 'profile-'));
const executable = process.argv[2] || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const beatmap = `osu file format v14
[General]
AudioFilename: audio.ogg
PreviewTime:1000
Mode:1
[Metadata]
Title:Browser regression test
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
[Events]
0,0,"bg.png",0,0
[TimingPoints]
0,500,4,1,0,100,1,0
1000,-100,4,1,0,100,0,1
[HitObjects]
256,192,1000,1,0,0:0:0:0:
256,192,1500,1,2,0:0:0:0:
256,192,2000,1,8,0:0:0:0:
`;
const osuFile = path.join(output, 'Browser [Oni].osu');
const oszFile = path.join(output, 'Browser.osz');
fs.writeFileSync(osuFile, beatmap);
const errors = [];
const failedAssets = [];
let browser;
let socket;
let id = 0;
const pending = new Map();
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  // Match the published static site: no access to node_modules or Electron files.
  if (!target.startsWith(root + path.sep) || !/^\/(index\.html|app\/|checks\/|parsers\/|images\/|docs\/)/.test(pathname === '/' ? '/index.html' : pathname)) {
    response.writeHead(404).end(); return;
  }
  fs.readFile(target, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };
    response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    response.end(data);
  });
});
async function until(predicate, description) {
  for (let i = 0; i < 300; i++) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${description}`);
}
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function selectFile(filePath, expectedName) {
  const { root: document } = await command('DOM.getDocument');
  const { nodeId } = await command('DOM.querySelector', { nodeId: document.nodeId, selector: '#fileInput' });
  await command('DOM.setFileInputFiles', { nodeId, files: [filePath] });
  await evaluate(`document.getElementById('fileInput').dispatchEvent(new Event('change')); true`);
  await until(async () => await evaluate('window.__loadedDiffs?.[0]?.fileName') === expectedName, expectedName);
}
async function run() {
  const zip = new JSZip();
  zip.file('日本語テスト [Oni].osu', beatmap);
  zip.file('audio.ogg', fs.readFileSync(path.join(__dirname, 'fixtures', 'silence.ogg')));
  zip.file('bg.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
  fs.writeFileSync(oszFile, await zip.generateAsync({ type: 'nodebuffer' }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = spawn(executable, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  browser.on('error', error => errors.push(error.message));
  await until(() => fs.existsSync(path.join(profile, 'DevToolsActivePort')), 'browser debugger');
  const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map(arg => arg.description || arg.value).join(' '));
    } else if (message.method === 'Network.responseReceived') {
      const response = message.params.response;
      if (response.status >= 400 && /127\.0\.0\.1|jszip/.test(response.url)) failedAssets.push(response);
    }
  };
  await command('Runtime.enable'); await command('Page.enable'); await command('Network.enable');
  const version = await command('Browser.getVersion');
  for (const pageUrl of [`http://127.0.0.1:${server.address().port}/`, pathToFileURL(path.join(root, 'index.html')).href]) {
    await command('Page.navigate', { url: pageUrl });
    await until(async () => await evaluate(`document.readyState === 'complete' && typeof JSZip === 'function' && typeof window.__loadModdingHelperFile === 'function'`), 'web initialization and CDN ZIP library');
    assert.equal(await evaluate('typeof window.electronAPI'), 'undefined');
    assert.equal(await evaluate('typeof require'), 'undefined');
    assert.equal(await evaluate('JSZip.version'), '3.10.2');
    assert.equal(await evaluate(`getNativeFilePath(new File(['test'], 'test.osu'))`), '');
    assert.equal(await evaluate(`document.querySelector('script[src*="jszip"]').src`), 'https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js');
    for (const language of ['Ja', 'Ja', 'En', 'En']) {
      await evaluate(`document.getElementById('lang${language}').click(); true`);
      const docsPath = language === 'Ja' ? 'docs/docs.html' : 'docs/docs-en.html';
      assert.equal(await evaluate(`document.getElementById('manualLink').href`), new URL(docsPath, pageUrl).href);
    }
    await selectFile(osuFile, path.basename(osuFile));
    await until(async () => await evaluate(`!document.getElementById('openBeatmapPage').disabled && document.getElementById('output').textContent.includes('Oni')`), 'osu results');
    const stamp = await evaluate(`document.querySelector('.timestamp-link')?.getAttribute('href')`);
    assert.match(stamp, /^osu:\/\/edit\//);
    await selectFile(oszFile, '日本語テスト [Oni].osu');
    await until(async () => await evaluate('!!window.__loadedAudio?.url'), 'archive audio blob');
    assert.ok(await evaluate('window.__loadedAudio.durationMs > 0'), 'archive audio duration');
    assert.equal(await evaluate('window.__loadedDiffs.length'), 1);
    for (const tab of ['doubleBarline', 'kiaiCompare', 'spread', 'offsetWaveform']) {
      await evaluate(`document.querySelector('.tab-button[data-tab="${tab}"]').click(); true`);
      assert.equal(await evaluate(`document.getElementById('tab-${tab}').classList.contains('active')`), true);
    }
    // Exercise browser drag-and-drop with an in-memory File (no native path).
    await evaluate(`(() => {
      const files = new DataTransfer();
      files.items.add(new File([${JSON.stringify(beatmap)}], 'Dropped [Oni].osu'));
      document.querySelector('.drop-area').dispatchEvent(new DragEvent('drop', {dataTransfer: files, bubbles: true, cancelable: true}));
    })()`);
    await until(async () => await evaluate('window.__loadedDiffs?.[0]?.fileName') === 'Dropped [Oni].osu', 'browser drag and drop');
    console.log(`PASS ${version.product} ${pageUrl.startsWith('http') ? 'HTTP site' : 'local HTML'}: CDN ZIP, .osu/.osz, Japanese filenames, audio, drop, tabs, docs/languages, timestamps`);
  }
  assert.deepEqual(failedAssets, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'passed', browser: version.product, errors, failedAssets }));
}
const deadline = setTimeout(() => { console.error('Browser smoke test timed out'); browser?.kill(); process.exit(1); }, 120000);
run().catch(error => { console.error(error); console.error(JSON.stringify({ errors, failedAssets })); process.exitCode = 1; })
  .finally(async () => {
    clearTimeout(deadline);
    try { if (socket?.readyState === WebSocket.OPEN) { await command('Browser.close'); socket.close(); } } catch (_) {}
    browser?.kill();
    server.closeAllConnections(); server.close();
  });
