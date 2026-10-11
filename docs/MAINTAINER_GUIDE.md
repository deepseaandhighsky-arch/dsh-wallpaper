# Maintainer guide: clean first public preview

## Repo separation

Use the new repository `deepseaandhighsky-arch/dsh-wallpaper` for any eventual public release; do not include any unrelated or confidential Git history. Do not import its Git history, branches or issues. The prepared clean source has only this project's file tree and an MIT license.

The first Git commit should use a GitHub `users.noreply.github.com` email and a public username rather than a personal email address. Keep the new repository **Private** until a separate publication approval.

## Checks

From the source root on Node.js 22+ and Python 3:

```sh
npm run check
npm run audit:repo -- --public
npm pack --dry-run
npm run pack:tgz # validates exact allowlisted files and writes .tgz.sha256
python3 scripts/build-release.py --require-license
```

`npm run visual:smoke` is an optional standalone Chromium/mock-DOM check; it is **not** an Electron app acceptance test.

## Package metadata

- `license: MIT`, with the full LICENSE text, is intentional.
- `private: true` deliberately prevents **npm** publishing while permitting future publication of the **GitHub** source.
- The npm name `@local/dsh-video-wallpaper` is a local DSH plugin package; do not promise an npm registry install.
- Keep `package.json`, `PLUGIN_VERSION`, README, CHANGELOG and ZIP version in sync.

## Release process

1. Keep the existing clean repository **Private** until explicit approval; verify the root commit uses GitHub noreply and that CI passes on the current head.
2. Test upgrade/rollback on a real DSH Desktop and record version, video play, wallpaper blur/opacity/preset behavior, sidebar toggle geometry and light/dark interaction.
3. Securely inspect tracked files, output ZIP and any prospective screenshots. Confirm source/icon rights under MIT.
4. After **explicit** maintainer approval, change only the new repository visibility to Public.
5. After a reviewed release commit and real Desktop acceptance, create tag `v0.3.0-rc.7` **on the exact approved commit**. The CI tag gate checks `refs/tags/v<package.json.version>` and produces a `.tgz` plus SHA-256 alongside the local ZIP. This does **not** publish a GitHub Release.
6. Only after separate approval, make a GitHub **pre-release**, attach the validated `.tgz` and optional ZIP with test notes; do not publish to npm.
7. Review `docs/INSTALLATION.md` and README status warnings when the repository is actually Public. GitHub Actions artifacts expire after seven days and are not a substitute for Release assets.

## Rollback

Retain the previously installed plugin directory and never delete the DSH profile, IndexedDB or localStorage simply to downgrade a plugin version. Fully exit the Windows system tray before reopening DSH after a client script change.
