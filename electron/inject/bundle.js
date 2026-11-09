// 本番起動とスモークテストで、同じ順番のCSS・初期化モジュールを使用する。
const fs = require('fs');
const path = require('path');

const CSS_FILES = ['base.css', 'titlebar.css', 'layout.css', 'metadata.css',
  'checklist.css', 'preview.css', 'titlebarOverrides.css', 'ui.css'];
const JS_FILES = ['metadataCard.js', 'diffOrderCard.js', 'previewSettings.js',
  'previewAudio.js', 'previewHitTesting.js', 'previewDiffData.js',
  'previewLayout.js', 'previewHitSounds.js', 'previewInput.js', 'previewController.js',
  'spectrogramController.js', 'notepadController.js',
  'playheadController.js', 'navigation.js', 'titlebar.js', 'layout.js', 'displayModes.js', 'ui.js'];
let css;
let script;

function loadInjectCss() {
  if (css === undefined) css = CSS_FILES.map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');
  return css;
}

function buildInjectScript(iconUrl, version) {
  if (script === undefined) script = JS_FILES.map(file => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');
  return '(function(__etbIconUrl, __etbVersion){\n' + script + '\n})(' +
    JSON.stringify(iconUrl) + ',' + JSON.stringify(version) + ');';
}

module.exports = { loadInjectCss, buildInjectScript };
