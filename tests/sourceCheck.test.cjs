const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const scope = vm.createContext({ window: {} });
for (const file of ['data/sourceRules.js', 'checks/metadata/sourceCheck.js',
  'app/formatters/common.js', 'app/formatters/metadata/source.js', 'app/i18n.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope);
}
const check = source => scope.runSourceCheck(`[Metadata]\nSource:${source}`, 'test.osu');
const expected = '東方文花帖　～ Shoot the Bullet.';

test('Touhou spelling suggestions cover deletion, insertion, substitution and transposition', () => {
  for (const source of [
    '東方文花帖 ～ Shoot the Bulet.',
    '東方文花帖 ～ Shoot the Bullett.',
    '東方文花帖 ～ Shoot the Ballet.',
    '東方文花帖 ～ Shoot the Bulelt.',
    '東方文化帖 ～ Shoot the Bullet.',
    '東法文花帖 ～ Shoot the Bullet.'
  ]) {
    const result = check(source);
    assert.equal(result.type, 'typo', source);
    assert.equal(result.level, 'warn', source);
    assert.equal(result.expected, expected);
    assert.match(result.link, /th095/);
  }
});

test('exact titles and formatting-only differences keep their existing severity', () => {
  assert.equal(check(expected).level, 'ok');
  const result = check('東方文花帖 ~ SHOOT THE BULLET');
  assert.equal(result.type, 'partial');
  assert.equal(result.level, 'error');
  assert.equal(result.expected, expected);
});

test('spelling suggestions also recognize titles without the Touhou keyword', () => {
  const result = check('弾幕アマノジャク ～ Imposible Spell Card.');
  assert.equal(result.type, 'typo');
  assert.equal(result.expected, '弾幕アマノジャク　～ Impossible Spell Card.');
});

test('abbreviations, unrelated text and large differences do not get spelling suggestions', () => {
  for (const source of ['東方文花帖', 'Shoot the Bullet.', '東方文花帖 ～ Shoot the Basket.', '東方新作品']) {
    const result = check(source);
    assert.equal(result.type, 'unknown', source);
    assert.equal(result.expected, undefined);
  }
  assert.equal(check('An unrelated game').type, 'notTouhou');
  assert.equal(check('東方').type, 'generic');
  assert.equal(check('').level, 'none');
});

test('spelling edit limits and ambiguous candidates prevent weak suggestions', () => {
  const find = (value, names) => scope.findTouhouSourceTypo(value, names.map(name => ({ name })));
  assert.equal(find('abcdefgh', ['abcdefgi']), null); // floor(8 * 10%) = 0
  assert.equal(find('abcdefghij', ['abcdefghiX']).name, 'abcdefghiX');
  assert.equal(find('abcdefghij', ['abcdefghXY']), null);
  assert.equal(find('abcdefghij', ['abcdefghiX', 'abcdefghiY']), null);
  assert.equal(find('a'.repeat(40), ['a'.repeat(36) + 'bbbb']), null);
  assert.equal(find('a'.repeat(40), ['a'.repeat(37) + 'bbb']).name, 'a'.repeat(37) + 'bbb');
});

test('spelling suggestions display a yellow warning, expected title and reference in both languages', () => {
  const result = check('東方文花帖 ～ Shoot the Bulet.');
  for (const lang of ['ja', 'en']) {
    const translate = key => vm.runInContext(`i18n.${lang}[${JSON.stringify(key)}]`, scope);
    const html = scope.formatSourceGroupResult({ results: [result], fileNames: ['test.osu'] }, translate);
    assert.ok(html.includes('class="result-warn"'));
    assert.ok(!html.includes('class="result-error"'));
    assert.ok(html.includes(translate('sourcePossibleTypo')));
    assert.ok(html.includes(expected));
    assert.ok(html.includes(result.link));
  }
});
