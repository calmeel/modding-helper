const { shell } = require('electron');

function openExternalLink(url) {
  try {
    const parsed = new URL(url);
    const isWebLink = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    // Timestamp links are how results and charts seek in the osu! editor.
    const isOsuTimestamp = parsed.protocol === 'osu:' && parsed.host === 'edit' &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash &&
      /^\/\d{2,}:[0-5]\d:\d{1,3}(?:\.\d+)?$/.test(parsed.pathname);
    if (!isWebLink && !isOsuTimestamp) return;
    shell.openExternal(parsed.href).catch(error => console.error('Failed to open link:', error));
  } catch (_) {}
}

function configureWindowLinks(win, localUrl) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalLink(url);
    return { action: 'deny' };
  });
  function preventExternalNavigation(event, url) {
    if (url.split('#')[0] === localUrl.split('#')[0]) return;
    event.preventDefault();
    openExternalLink(url);
  }
  win.webContents.on('will-navigate', preventExternalNavigation);
  win.webContents.on('will-redirect', preventExternalNavigation);
}

module.exports = { configureWindowLinks };
