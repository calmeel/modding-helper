<div align="center">
  <img src="images/icon.png" alt="Modding Helper icon" width="120">

  <h1>Modding Helper</h1>

  <p>A lightweight modding support tool for osu!taiko.</p>

  <p>
    <a href="https://github.com/calmeel/modding-helper/releases/latest"><img src="https://img.shields.io/github/v/release/calmeel/modding-helper?label=release" alt="Latest release"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/calmeel/modding-helper" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/platform-Web%20%7C%20Windows-1689c7" alt="Web and Windows">
  </p>
</div>

---

## Features

- Check notes, Kiai, SV, volume, metadata, and more
- Compare timing and settings across multiple difficulties
- Open `.osu` and `.osz` files
- Use the web app or the Windows desktop app

## Usage

- **Web app (no installation required):** Open [Modding Helper](https://calmeel.github.io/modding-helper/)
- **Browser extension:** [Tampermonkey userscript](userscripts/README.md)
- **Desktop app:** Download from the [latest release](https://github.com/calmeel/modding-helper/releases/latest).

After opening the app, load a `.osu` or `.osz` file and select the checks you want to run.

## Documentation

Detailed instructions are available in the [English documentation](https://calmeel.github.io/modding-helper/docs/docs-en.html) and the [Japanese documentation](https://calmeel.github.io/modding-helper/docs/docs.html).

## Development

This repository is public primarily for transparency of the check logic. Some osu! real-time monitoring files are private, so builds from this repository lack that feature. For regular use, download the [latest release](https://github.com/calmeel/modding-helper/releases/latest).

Use Node.js 24.22.2 or newer (see `.node-version`).<br>
The desktop app uses its own Node.js runtime bundled with Electron.

```sh
npm ci
npm test
npm run test:electron
npm run build
```

## Feedback

If you find a bug or have a feature request, please let me know through [GitHub Issues](https://github.com/calmeel/modding-helper/issues) or Discord (id: vanity8).

## License

[MIT License](LICENSE)
