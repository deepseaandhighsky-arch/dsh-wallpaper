# DSH Wallpaper

**Unofficial third-party plugin for DeepSeek Harness. Not affiliated with or endorsed by DeepSeek.**

[Chinese documentation](README.md) | [Installation](docs/INSTALLATION.md) | [Troubleshooting](docs/TROUBLESHOOTING.md) | [Public release checklist](docs/RELEASE_CHECKLIST.md)

> **Status:** v0.3.0-rc.7 release candidate. The code is still being prepared for public release; the source is MIT licensed, but is not yet approved for public launch. Real Windows Desktop acceptance remains incomplete. This repository should not be described as a stable public release.

## What it does

DSH Wallpaper allows local static pictures (PNG/JPEG/WebP) and looping muted videos supported by Chromium to appear behind the DeepSeek Harness application interface. It changes the application window, **not** the operating-system desktop wallpaper.

- An independent Wallpaper settings section with Chinese and English labels.
- Four independently adjustable **background opacities**: conversation body, sidebar, conversation header, and composer card.
- Separate wallpaper blur and frosted-panel background blur. UI text is not blurred.
- Three distinct visual presets: Reading, Balanced, and Immersive. Save up to 12 named custom presets.
- Live parameter updates, before/current comparison and one-click rollback of visual settings.
- Locally stored pictures/videos, persisted display preferences, pause/reduced-motion support and diagnostics.

**Opacity wording matters:** 0% opacity means completely transparent; 100% opacity means completely opaque. Wallpaper opacity controls the media layer, whereas panel background opacity controls the translucent UI surface behind text. Neither is a text-opacity control.

## Install from source (Desktop)

1. Download or clone **all** repository files to a stable local folder. The folder must contain `package.json`, `client.js`, `index.js`, and `cordis.patch.yml` directly.
2. In DSH Desktop, open Creator Mode. Ask its `plugin_manager` tool to run `install_bundle` with `target` equal to that folder's **absolute local path**. Alternatively use the official Plugins page's Add plugin flow with an absolute local path when supported by your DSH build.
3. Inspect the installation outcome; an installation recorded as `restart-required` still requires a restart. Quit the entire DSH Desktop process from the system tray and restart it.
4. In **Settings > Wallpaper background**, confirm version `0.3.0-rc.7`. Start with the built-in gradient test pattern before choosing personal media.

**Not an npm registry package:** the internal package name currently is `@local/dsh-video-wallpaper`, and `package.json` intentionally has `private: true`. Public visibility on GitHub does not automatically publish it to npm. Do not assume `npm install @local/dsh-video-wallpaper` works.

## Compatibility / limitations

The implementation relies on an existing DSH `shell.overlay` slot and CSS hooks whose continued availability is **not guaranteed**. Source tests cover these assumptions but are not a live Electron compatibility guarantee. Video formats and GPU performance vary by platform. Windows-specific sidebar toggle and backdrop-filter interaction requires special acceptance testing.

See [compatibility notes](docs/COMPATIBILITY.md) for tested and untested configurations.

## Local data and privacy

Selected image/video blobs are stored in the current DSH client IndexedDB, while preferences and custom presets are stored in localStorage. There is no network upload path in this plugin's current source. Other DSH components are separate from the plugin; this is not a statement about the host application's telemetry. Disabling or uninstalling the plugin does not necessarily delete media already stored in the profile.

Never attach personal wallpaper artwork, full profile directories, conversation screenshots, or API keys to a public issue. See [privacy](docs/PRIVACY.md) and [security](SECURITY.md).

## Development

Requires Node.js >= 22 for source checks:

```sh
npm run check
npm run audit:repo
npm pack --dry-run
```

An optional `npm run visual:smoke` uses a standalone mock DOM, not an installed DSH Desktop. It may time out in restricted Chromium environments.

Source code and test files are included in the repository. No external npm runtime dependencies are declared.

## License and attribution

This plugin is licensed under the [MIT License](LICENSE), Copyright (c) 2026 deepseaandhighsky-arch. Please also review [third-party notices](THIRD_PARTY_NOTICES.md) and the [release checklist](docs/RELEASE_CHECKLIST.md). Public publication is a separate decision from licensing.

DeepSeek and DeepSeek Harness names belong to their respective rights holders. This project is not an official DeepSeek release.
