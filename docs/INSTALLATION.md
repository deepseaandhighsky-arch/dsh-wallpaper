# Installation / 安装

> Experimental v0.3.0-rc.7: verify compatibility with your DSH Desktop version first. Publication is pending. No public release has been approved.

## Desktop

1. Obtain a **complete source checkout**, not just a single script. The root must contain `package.json`, `client.js`, `index.js`, `cordis.patch.yml`.
2. In DSH Desktop Creator Mode run `plugin_manager` `install_bundle`, with `target` the **absolute path of this directory**.
3. Inspect the plugin-manager result. A pending build, failed activation or `restart-required` status still requires action.
4. **Quit DSH Desktop fully via the system tray**, then relaunch to ensure the new Client bundle is loaded.
5. Under **Settings → Wallpaper background / 壁纸背景**, confirm version `0.3.0-rc.7`.
6. Enable **Show test pattern** and adjust the four opacity sliders independently. Verify the chat, sidebar, top navigation and input card each respond without reducing the wallpaper media opacity.
7. Set **Wallpaper blur / 壁纸自身模糊 = 0px** and **Panel frosted blur / 面板磨砂强度 = 6px**. Confirm the panel backgrounds become softer but that the main text, buttons and input caret remain crisp. **On Windows, the top-left sidebar toggle must stay at its original position in the native titlebar, not overlap the DeepSeek logo. Test expanded, collapsed, maximized and fullscreen.** Set panel blur back to 0px to verify the effect and performance return to their original state.
8. Try Reading, Balanced and Immersive. Create two named custom presets, select and update one, and test A/B switching and Restore Before without losing imported media. Confirm the wallpaper-opacity label reads **壁纸不透明度** (100% fully visible) and an existing 40% setting remains at 40%.
9. With a recognizable wallpaper image, change **Wallpaper blur / 壁纸自身模糊** 0 → 1 → 4 → 20px. Verify the wallpaper subject does **not change size or crop**, the four image edges stay filled, and the Before/Current miniature previews show the same framing. Repeat for `cover`/`contain` and video if available.
10. Disable the test pattern and choose a local PNG/JPG/WebP or browser-supported video (H.264 MP4 suggested). Verify playback and interactions. Turning the wallpaper off should restore default DSH UI fills.

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
