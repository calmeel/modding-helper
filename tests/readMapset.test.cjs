const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const JSZip = require('jszip');
const { readMapset } = require('../electron/osu/readMapset');

async function fixture(t, files) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'modding-mapset-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(folder, name), text);
  return folder;
}
const beatmap = audio => `osu file format v14\r\n[General]\r\nAudioFilename: ${audio}\r\nMode:1\r\n[Metadata]\r\nTitle:Test\r\n`;

test('multiple song references skip before reading audio or building a zip', async t => {
  const folder = await fixture(t, { 'a.osu': beatmap('one.mp3'), 'b.osu': beatmap('two.ogg'), 'one.mp3': 'audio' });
  const originalRead = fs.readFile;
  const reads = [];
  t.mock.method(fs, 'readFile', async (...args) => {
    reads.push(args[0]);
    return originalRead(...args);
  });
  const result = await readMapset(folder);
  assert.deepEqual(result, { skipped: 'multiple-audio', folder });
  assert.ok(reads.every(name => name.endsWith('.osu')));
  assert.equal(result.buffer, undefined);
});

test('shared song, Windows path variants, hitsounds and empty references do not block loading', async t => {
  const folder = await fixture(t, {
    'a.osu': '\uFEFF' + beatmap('".\\AUDIO.mp3"'), 'b.osu': beatmap('audio.mp3'),
    'c.osu': beatmap(''), 'audio.mp3': 'audio', 'hit.wav': 'hit', 'bg.png': 'image', 'video.mp4': 'video'
  });
  const result = await readMapset(folder);
  const zip = await JSZip.loadAsync(result.buffer);
  assert.deepEqual(Object.keys(zip.files).sort(), ['a.osu', 'audio.mp3', 'b.osu', 'bg.png', 'c.osu', 'hit.wav']);
});

test('disabling the option loads multiple songs and unchanged folder avoids all reads', async t => {
  const folder = await fixture(t, { 'a.osu': beatmap('one.mp3'), 'b.osu': beatmap('two.ogg'), 'two.ogg': 'audio' });
  const result = await readMapset(folder, { skipMultipleAudio: false });
  assert.ok((await JSZip.loadAsync(result.buffer)).file('two.ogg'));
  t.mock.method(fs, 'readdir', () => { throw new Error('should not re-read known folder'); });
  assert.deepEqual(await readMapset(folder, { knownFolder: folder }), { unchanged: true, folder });
});
