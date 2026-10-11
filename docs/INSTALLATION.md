# Installation / 安装

> Experimental v0.3.0-rc.7: verify compatibility with your DSH Desktop version first. Publication is pending. No public release has been approved.

## Recommended install methods / 推荐安装方式

The official DSH plugin manager installs a **bundle** declared in `package.json` under `dsh.bundle.patch`. This plugin provides `cordis.patch.yml` and prebuilt JavaScript. The npm package name is `@local/dsh-video-wallpaper`, but it is **not** published to the npm registry.

DSH 官方插件管理器按 `package.json` 中的 `dsh.bundle.patch` 安装组合包。本插件包含 `cordis.patch.yml` 及预构建 JavaScript，**无需安装时编译**；包名尚未发布到 npm。

### A — Pinned Git repository / 指定 Git 版本

**Not available to the public yet:** `v0.3.0-rc.7` must first be created as a Git tag on the exact approved commit, and the repository must be made accessible to the installer. Until then, use the private test `.tgz` or source method below.

在 DSH **插件 → 添加插件** 粘贴以下 Git 来源（只在对应 tag 已创建且安装者有权访问仓库后使用）：

```text
github:deepseaandhighsky-arch/DSH-Wallpaper#v0.3.0-rc.7
```

Alternatively, from a DSH CLI environment with the `desktop` profile available:

```sh
dsh plugin --profile desktop add 'github:deepseaandhighsky-arch/DSH-Wallpaper#v0.3.0-rc.7'
```

DSH officially recommends **pinning a full Git commit SHA** (`#<sha>`) for stronger repeatability: Git tags are convenient names, but their targets can be changed by a maintainer. Git authentication for a Private repository may not be available to DSH even when you are signed in to GitHub in a web browser. The plugin ships prebuilt JS with **no `prepare` lifecycle script** to approve, but any warnings from DSH's installer still need to be reviewed.

官方更建议用完整提交 SHA 固定 Git 安装来源。GitHub 浏览器已登录**不等于** DSH 安装器拥有私有仓库读取权限；首次测试优先用本地 `.tgz`。

### B — Prebuilt tarball / 直接安装 `.tgz`（推荐普通用户）

After the maintainer approves a GitHub Pre-release, download this asset:

```text
local-dsh-video-wallpaper-0.3.0-rc.7.tgz
```

In DSH **Plugins → Add plugin**, choose a local package/archive or enter the **absolute path** to the `.tgz`. The CLI equivalent, when executed from the archive's directory, is:

```sh
dsh plugin --profile desktop add ./local-dsh-video-wallpaper-0.3.0-rc.7.tgz
```

**Do not unzip the `.tgz`.** This is a standard npm-compatible package tarball; it is not the older ZIP that must be extracted first. CI uploads a `wallpaper-candidate-tgz` **Actions artifact** for private maintainer testing, with a `.tgz.sha256` checksum (retained for 7 days). It is **not** a publicly downloadable GitHub Release asset. A real DSH Desktop installation has **not** yet been certified.

**不要解压 `.tgz`。** 私有验收时从 Actions 工件下载；正式发布后则从 Release 附件下载。先确认正确的 DSH Profile 与安装结果。

### C — Source checkout / 源码目录（开发者）

1. Obtain the **complete source directory**, not just `client.js`; `package.json`, `index.js`, `client.js` and `cordis.patch.yml` must be at its root.
2. Open DSH Desktop Creator Mode and run `plugin_manager` → `install_bundle` with `target` equal to the source directory's **absolute path**. Alternatively use **Plugins → Add plugin** with that directory if supported by your DSH build.
3. Inspect the installer output. A failed install or `restart-required` status is not proof of immediate activation.

### First-run verification / 首次运行验收

1. **Fully quit DSH Desktop through the Windows system tray** and relaunch after an install or upgrade; merely closing the window may leave the old Client script running.
2. Go to **Settings → Wallpaper background / 壁纸背景** and confirm version `0.3.0-rc.7`. Enable **Show test pattern** and verify the four opacity sliders independently.
3. Set **Wallpaper blur / 壁纸自身模糊 = 0px**, **Panel frosted blur / 面板磨砂强度 = 6px**; text, buttons and caret should remain crisp. On Windows, the sidebar toggle must stay in its original position and not cover the DeepSeek logo. Test expanded, collapsed, maximized, and fullscreen.
4. Try Reading, Balanced and Immersive. Add two named presets, use Before/Current A/B comparison and Restore Before. Verify wallpaper opacity 100% shows the full wallpaper and migrating an existing 40% value does not invert it.
5. Use a recognizable image to change wallpaper blur 0 → 1 → 4 → 20px without changing crop/size. Repeat cover/contain and video where available.
6. Test PNG/JPG/WebP and a browser-supported H.264 MP4. Disabling the wallpaper should restore the default UI. Do **not** delete browser storage or the DSH Profile as a troubleshooting step.

**Upgrade from v0.2.x:** media files and user wallpaper settings stay in the same local browser profile. Old `tint` becomes initial Chat/Header region opacity; the previously opaque sidebar/input receive 90%/94% defaults. Use **Reset recommended opacity** to restore all four region defaults, without touching media files.

**Upgrade from rc.3 to rc.4:** the stored `opacity` value is **not inverted**: the corrected “Wallpaper opacity / 壁纸不透明度” label matches the prior rendering. Built-in presets are not auto-applied. New custom presets use a **separate localStorage key**, and temporary comparison snapshots are not persisted.

**Existing blur migration from rc.3:** existing `blur` is still the wallpaper-media blur (unchanged value), and new `panelBlur` defaults to **0px**. No media storage migration is needed. For video wallpapers start with panelBlur ≤6px and assess actual GPU/scroll performance.

The plugin changes the DSH application window, not the OS desktop wallpaper. Back up the existing profile before experimenting with complex configuration changes. Do not delete the profile to fix visual problems.

## Verification

```sh
npm run check
# optional, needs working local Chromium:
npm run visual:smoke
```

The Node suite and optional standalone Chromium fixture are not an Electron acceptance test. For a diagnosis use [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

For global contributors see [English README](../README.en.md), [compatibility](COMPATIBILITY.md), [privacy](PRIVACY.md), and [maintainer release checklist](RELEASE_CHECKLIST.md). The internal package name is not available in the npm registry.
