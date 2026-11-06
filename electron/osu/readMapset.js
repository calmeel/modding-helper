const fs = require('fs/promises');
const path = require('path');
const JSZip = require('jszip');

// Count song references, not hitsounds or other unused audio files.
function audioFilename(text) {
  const general = text.replace(/^\uFEFF/, '').split(/^\s*\[General\]\s*$/m)[1];
  const section = general?.split(/^\s*\[[^\]\r\n]+\]\s*$/m)[0] || '';
  const value = section.match(/^[ \t]*AudioFilename[ \t]*:[ \t]*([^\r\n]*)/m)?.[1]?.trim();
  return value ? path.win32.normalize(value.replace(/^"(.*)"$/, '$1')).toLowerCase() : '';
}

async function readMapset(folder, { knownFolder, skipMultipleAudio = true } = {}) {
  if (knownFolder === folder) return { unchanged: true, folder };
  let entries;
  try { entries = await fs.readdir(folder, { withFileTypes: true }); }
  catch { return null; }

  const beatmaps = new Map();
  const audioNames = new Set();
  for (const entry of entries) {
    if (!entry.isFile() || !/\.osu$/i.test(entry.name)) continue;
    let buffer;
    try { buffer = await fs.readFile(path.join(folder, entry.name)); }
    catch { continue; }
    beatmaps.set(entry.name, buffer);
    if (skipMultipleAudio) {
      const audio = audioFilename(buffer.toString('utf8'));
      if (audio) audioNames.add(audio);
      // Stop before reading any audio/images or constructing an archive.
      if (audioNames.size > 1) return { skipped: 'multiple-audio', folder };
    }
  }
  if (!beatmaps.size) return null;

  const zip = new JSZip();
  for (const [name, buffer] of beatmaps) zip.file(name, buffer);
  for (const entry of entries) {
    if (!entry.isFile() || !/\.(mp3|ogg|wav|jpg|jpeg|png|bmp)$/i.test(entry.name)) continue;
    try { zip.file(entry.name, await fs.readFile(path.join(folder, entry.name))); }
    catch { /* Unreadable assets are skipped, as with the original loader. */ }
  }
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  return { name: path.basename(folder) + '.osz', folder, buffer };
}

module.exports = { readMapset };
