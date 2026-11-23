// Run with: node_modules/.bin/electron tests/content-permission-navigation-smoke.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");
const { waitFor } = require("./helpers/wait.cjs");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "electron/dist-verify/permission-navigation");
fs.mkdirSync(output, { recursive: true });
app.setPath("userData", fs.mkdtempSync(path.join(output, "profile-")));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1600, height: 1000, show: false,
    webPreferences: { backgroundThrottling: false }
  });
  const errors = [];
  win.webContents.on("console-message", event => {
    if (event.level === "error") errors.push(event.message);
  });
  const run = code => win.webContents.executeJavaScript(code);
  try {
    for (const lang of ["ja", "en"]) {
      await win.loadFile(path.join(root, `docs/contentPermissionList${lang === "en" ? ".en" : ""}.html`));
      await waitFor(() => run('document.querySelectorAll(".permission-sidebar .permission-toc > li").length === 3'), "navigation setup");
      assert.equal(await run('document.querySelectorAll(".permission-sidebar .permission-toc a").length'), 13);
      for (const width of [1600, 1200, 900, 390]) {
        win.setContentSize(width, 900);
        const narrow = width <= 1100;
        await waitFor(() => run(`window.innerWidth === ${width}`), "viewport resize");
        for (const id of ["permission-section-1", "permission-section-2-1", "permission-section-2-4", "permission-section-3-1", "permission-section-3-6"]) {
          await run(`document.getElementById(${JSON.stringify(id)}).scrollIntoView()`);
          await waitFor(() => run(`document.querySelector('.permission-sidebar a[aria-current="location"]')?.getAttribute('href') === '#${id}'`), `active heading ${lang} ${width} ${id}`);
          assert.equal(await run('document.querySelectorAll(".permission-sidebar .permission-toc > .is-active").length'), 1);
          assert.equal(await run('document.documentElement.scrollWidth <= innerWidth'), true, `no horizontal page overflow: ${lang} ${width}`);
          if (narrow) {
            assert.equal(await run('getComputedStyle(document.querySelector(".permission-sidebar")).display'), "none");
            assert.equal(await run(`document.getElementById('${id}').getBoundingClientRect().top >= document.querySelector('.permission-mobile-nav summary').getBoundingClientRect().bottom - 1`), true, `heading stays below current-position bar: ${lang} ${width} ${id}`);
          } else {
            assert.equal(await run('document.querySelector(".permission-sidebar").getBoundingClientRect().top'), 24);
            assert.equal(await run('document.querySelector(".permission-sidebar").getBoundingClientRect().right < document.querySelector(".permission-content").getBoundingClientRect().left'), true);
          }
        }
        const shot = await win.webContents.capturePage();
        fs.writeFileSync(path.join(output, `${lang}-${width}.png`), shot.toPNG());
      }
      await run('document.querySelector(".permission-mobile-nav").open = true; document.querySelector(\'.permission-mobile-nav a[href="#permission-section-2"]\').click()');
      await waitFor(() => run('location.hash === "#permission-section-2" && !document.querySelector(".permission-mobile-nav").open'), "mobile navigation jump");
      assert.equal(await run('document.querySelectorAll(".permission-mobile-nav a[aria-current=location]").length'), 1);
      win.setContentSize(1600, 1000);
      console.log(`${lang}: scroll tracking, anchors, desktop/sidebar and mobile layouts passed.`);
    }
    assert.deepEqual(errors, []);
    console.log(`Screenshots: ${output}`);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
