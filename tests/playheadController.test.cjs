const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture() {
  const frames = [];
  let visible = true;
  let spectrogramEnabled = false;
  let markedFile;
  function canvas() {
    return {
      clientWidth: 500, offsetLeft: 8, offsetTop: 3, offsetParent: {},
      parentElement: { children: [], style: {}, appendChild(child) { this.children.push(child); } },
      __playheadGeom: { __cw: 500, plot: { left: 10, width: 200, top: 5, height: 100 }, viewStart: 0, viewEnd: 1000 }
    };
  }
  const chart = canvas();
  chart.__markerAt = (time, file) => {
    markedFile = file;
    return { y: 50, color: '#ff0000', label: 'Oni' };
  };
  const spectrogram = canvas();
  const context = vm.createContext({ Object, Event,
    document: {
      getElementById: id => ({ kiaiCompareChart: chart, spectrogramCanvas: spectrogram })[id],
      createElement: () => ({ style: {}, firstChild: { style: {} }, lastChild: {} }),
      addEventListener() {}
    },
    window: { getComputedStyle: () => ({ position: 'static' }), addEventListener() {} },
    requestAnimationFrame: fn => frames.push(fn), setTimeout() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../electron/inject/playheadController.js'), 'utf8'), context);
  const controller = context.createElectronPlayheads({ canShow: () => visible,
    getCurrentDiffFile: () => 'current.osu', isSpectrogramSeekEnabled: () => spectrogramEnabled });
  return { controller, chart, spectrogram, markedFile: () => markedFile,
    setVisible: value => { visible = value; }, setSpectrogram: value => { spectrogramEnabled = value; },
    renderFrames: () => { while (frames.length) frames.shift()(); } };
}

test('playheads and current-Diff markers restore after hiding and reject stale geometry', () => {
  const f = fixture();
  f.controller.update(500);
  const [head, marker] = f.chart.parentElement.children;
  assert.equal(head.style.left, '118px');
  assert.equal(head.style.top, '8px');
  assert.equal(marker.style.top, '53px');
  assert.equal(marker.lastChild.textContent, 'Oni');
  assert.equal(f.markedFile(), 'current.osu');
  f.controller.hide();
  f.setVisible(false);
  f.controller.refresh();
  assert.equal(head.style.display, 'none');
  f.setVisible(true);
  f.controller.refresh();
  assert.equal(head.style.display, '');
  f.chart.clientWidth = 600;
  f.controller.refresh();
  assert.equal(head.style.display, 'none');
  f.chart.__playheadGeom = { ...f.chart.__playheadGeom, __cw: 600 };
  f.renderFrames();
  assert.equal(head.style.display, '');
  f.controller.update(2000);
  assert.equal(head.style.display, 'none');
  assert.equal(marker.style.display, 'none');
});

test('spectrogram playhead follows its explicit visibility setting', () => {
  const f = fixture();
  f.controller.update(500);
  const head = f.spectrogram.parentElement.children[0];
  assert.equal(head.style.display, 'none');
  f.setSpectrogram(true);
  f.controller.refresh();
  assert.equal(head.style.display, '');
  f.setSpectrogram(false);
  f.controller.refresh();
  assert.equal(head.style.display, 'none');
});
