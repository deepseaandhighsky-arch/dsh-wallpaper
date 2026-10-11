# Appearance presets & before/after comparison / 外观预设与实时对比

## Scope and semantics

All user-facing percent controls in this feature represent **opacity** (不透明度). Transparency is the complement: `transparency = 1 - opacity`. The existing localStorage `opacity` numeric value was *already* used as CSS `opacity`, so rc.4 only fixes the label from “壁纸透明度” to “壁纸不透明度”. An existing value of 0.40 remains 0.40, **not** 0.60. Region values similarly control *background paint*, not text or whole-element transparency.

Preset visual fields (`VISUAL_KEYS`): `dim`, `blur`, `panelBlur`, `opacity`, `regionChat`, `regionSidebar`, `regionHeader`, `regionComposer`, `fit`. **Excluded:** `mode`, `paused`, `allowReducedMotion`, `media` and all private runtime metadata. Wallpapers remain in existing IndexedDB store `dsh-local-video-wallpaper-v1`.

| Built-in preset | Wallpaper opacity | Media blur | Panel frost | Chat bg opacity | Sidebar | Header | Composer |
|---|---:|---:|---:|---:|---:|---:|---:|
| 阅读 / Reading | 48% | 8px | 0px | 92% | 98% | 94% | 99% |
| 均衡 / Balanced | 80% | 2px | 5px | 56% | 78% | 62% | 94% |
| 沉浸 / Immersive | 100% | 0px | 0px | 22% | 34% | 20% | 80% |

Since rc.7 the three designs deliberately diverge, rather than forming small opacity increments; see [preset-design metrics](PRESET-DESIGN.md). The official Plugins page now shares conversation body surface alpha, so choosing a look has a visible effect on that page too. Immersive is intended to be wallpaper-first and may require manual adjustment to keep text readable.

Preset application is **opt-in**: no preset is automatically chosen when upgrading. Original user preferences are kept unchanged. Custom named presets are capped at 12, with duplicate names refused rather than overwritten silently. Update replaces the selected saved preset's *visual* values only. Delete is a two-click confirmation.

Custom presets have a separate persistence key `dsh-local-video-wallpaper-custom-presets-v1` in browser localStorage. They are device/profile-local; no server sync, no user media or chat data. An inability to save emits a warning while preserving the in-memory session copy. Custom presets have safe bounded names (1–32 chars), validated identifiers, and clamped visual values.

## Live preview and comparison

- Changing any visual slider (or applying a preset) immediately persists the new Current values and **captures the old visual values once** as Before (unless a baseline already exists).
- Two in-settings miniatures use the same local wallpaper source when possible, with generic bars/icons; **they never display user conversations or private workspace titles.** On video, miniature video is paused (metadata frame only), avoiding two continuously decoding live videos. If unavailable, a representative gradient remains.
- `Show Before in main window` repaints the live background and its four region materials using the in-memory baseline; sliders continue to show the **persisted Current** values. It does not write preferences to storage.
- `Show Current` repaints live with the persisted values. `Restore Before` replaces all nine visual values in persisted preferences and clears comparison; unrelated media/mode/pause stay untouched. `Finish comparison` discards the snapshot and leaves Current saved. `Set current as new baseline` captures a fresh starting point.
- Baseline and visual-toggling state intentionally **do not survive restart**. Users who need durable before/after looks should save named custom presets.

## Accessibility and compatibility

The region paint selectors are tied to DSH v0.2.0-rc.2 DOM data hooks and are still pending real Desktop confirmation for rc.4. Preview is illustrative rather than a full-size window mirror. High-opacity panels protect readability; the Immersive preset may sacrifice contrast on busy wallpaper scenes. `backdrop-filter` can cost GPU time on video; users may set it to 0px. Native desktop titlebar and arbitrary third-party panel surfaces are outside the scope. No browser code reads or mirrors private chat content to construct the previews.

## Manual tests before merging

1. Upgrade from rc.3 with known settings (e.g., opacity 40%, dim 11%, media blur 4px). Confirm all numbers preserved and appearance unchanged before clicking a preset.
2. Save two named presets; reject a duplicate; update one after modifying a slider; delete the other after explicit confirmation. Restart and verify stored list and media files persist.
3. Apply built-in presets; ensure mode, paused and reduced-motion flags, and imported media Blob identities remain unchanged.
4. Adjust sliders and compare A/B snapshots; Show Before should repaint the main scene without saving, and Show Current should restore the current visual. Restore Before should persist original visual values, including fit.
5. Repeat with image, looping video, test pattern and mode Off; verify no unexpected playback or dual video autoplay. Try light/dark themes and small window widths.
6. Verify normal scroll, navigation, input caret, modals and menu hit targets at 0px and 6px panel frost. Do not mark the preview as fully verified until Desktop acceptance is recorded.
