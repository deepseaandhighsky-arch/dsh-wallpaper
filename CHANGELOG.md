# Changelog

This changelog describes the local development milestones leading to v0.3.0-rc.7. The first clean public-project Git snapshot begins at the v0.3.0-rc.7 candidate; older prototypes are not part of its Git history.

## v0.3.0-rc.7 (2026-10-11) — strongly differentiated presets, Plugins-page reading surface

- Redesign built-in **Reading / Balanced / Immersive** as distinct experiences rather than subtly varied glass settings: background-first readability, intermediate frosted glass, and crisp wallpaper-forward respectively. Built-in looks have sharply different effective wallpaper visibility in the conversation reading plane.
- In Settings, display each built-in look as a labeled descriptive card rather than three unlabeled-feeling flat buttons. No migration or silent changes to the user's current appearance, custom presets, wallpaper media or video playback.
- Add background opacity to the official **Plugins** page (`[data-plugin-panel]`), a route not covered by the conversation-specific CSS. It uses the same content reading alpha as the conversation. The Plugins root does **not** receive backdrop blur, transform or positioning, protecting Windows titlebar and modal layout.
- Preserve the verified sidebar fixed-toggle fix and no-zoom blur from rc.5/rc.6. Add distinctness and UI integration tests; Desktop verification still required, particularly text legibility for complex wallpapers in Immersive mode.

## v0.3.0-rc.6 (2026-10-11) — blur without zooming, Desktop visual acceptance pending

- Fix wallpaper zoom when **Wallpaper blur** transitions from 0px to any nonzero value: previously the image/video used conditional `transform: scale(1.04)` and comparison thumbnails used `scale(1.05)`.
- Keep image/video geometry and `object-fit` fixed. Render the blur as a separate noninteractive `backdrop-filter` layer over the wallpaper **before the dimmer and under all UI**, with no zoom or duplicated video decoder. The browser samples the image to its edge, so no pale blur halo appears on strong blur.
- Use the same overlay strategy in Before/Current miniature previews; do not touch stored opacity/blur values or imported files.
- Add Node regressions plus a standalone Chromium pixel/geometry verification for 0/1/4/20px; real DSH Desktop visual/performance sign-off still required.

## v0.3.0-rc.5 (2026-10-11) — Windows sidebar fixed-toggle compatibility, Desktop verification pending

- Fix **Windows sidebar collapse icon overlapping the DeepSeek logo** when nonzero panel frosted-glass blur was selected. Reproduced by user: returning panel blur to 0px restores positioning.
- Never apply `backdrop-filter` to the AppFrame sidebar column itself: that creates a new fixed-position containing block for the titlebar toggle. Apply it only to the sidebar column's noninteractive `::before` background layer, above the column's tinted fill but behind its content.
- Preserve media, opacity, blur, preset and custom preset persistence; keep region sliders and the existing 24px fade override unchanged. No negative positioning offsets on the actual toggle.
- Add Node regression and headless Chromium tests for windowed, fullscreen and collapsed simulated states (plus native maximized verification pending): `panelBlur 0 → 6px` must never change the toggle's viewport bounding box. Still requires acceptance in the actual DSH Desktop.

## v0.3.0-rc.4 (2026-10-11) — presets & live comparison, Desktop acceptance pending

- Add built-in **Reading / Balanced / Immersive** looks, applied on demand only; preserve existing wallpaper media, playback mode and pause/reduced-motion state.
- Persist up to 12 **named custom visual presets** in a separate localStorage key; support save, explicit update, and two-step delete. Guard against duplicate names and invalid stored entries.
- Add **before/after comparison**: auto-capture the original visual settings before the first edit; show dual miniature previews and temporarily switch the LIVE DSH wallpaper between Before and Current without overwriting the saved values. One-click restore writes back the original appearance, or finish without reverting.
- Correct Chinese label **“壁纸透明度” → “壁纸不透明度”** while keeping the existing `opacity` storage key and numeric values exactly unchanged (100% means fully opaque/visible wallpaper). Rename region UI labels to emphasize **background opacity**, not text opacity.
- Keep IndexedDB media and v0.2.x tint migration unchanged. Add behavioral tests for preset persistence, duplicate/limit handling, A/B non-mutating toggles, lossless restoration, and label semantics.

## v0.3.0-rc.3 (2026-10-11) — frosted panel preview, Desktop acceptance pending

- Rename the existing media-only blur label to **Wallpaper blur** without changing its storage key or previous value.
- Add independent **Panel frosted-glass blur** (`panelBlur`, 0–12px; default off), implemented with conditional `backdrop-filter` on the sidebar, chat reading surface, conversation navigation, and composer card; children retain sharp text.
- Skip all backdrop filters at 0px to avoid extra compositing/stacking contexts by default; feature CSS unmounts along with the wallpaper scene.
- Preserve local wallpapers, four regional opacity settings and v0.2.x compatibility.
- Add source-level, persistence, settings and CSS-selector regressions; standalone Chromium and actual Electron compositor still require validation.

## v0.3.0-rc.2 (2026-10-11) — pending Desktop visual acceptance

- Suppress ui-workspace's opaque 24px bottom fade only while wallpaper CSS is mounted: avoids a bright white strip and a hard seam on translucent sidebars.
- Retain scroll behavior and soften the workspace scrollbar thumb via the theme's scrollbar variables.
- Do not change stored media/preferences, sidebar region opacity, layout geometry, or native titlebar behavior.
- Add targeted source regressions for the sidebar fade and scrollbar.

## v0.3.0-rc.1 (2026-10-11) — pending Desktop visual acceptance

- Add **four independently persisted region opacity sliders**: chat reading area, left sidebar, top navigation and input card.
- Keep wallpaper media opacity/dim/blur independent of UI region opacities.
- Avoid double alpha coating by leaving the conversation outer root transparent and painting the header/chat surfaces as separate siblings.
- Target official DOM markers `data-conversation-content`, `data-composer-card` and `conversation.header` rather than guessing input-card CSS module names.
- Preserve v0.2.x `tint` as initial chat/header opacity; leave sidebar/input at readable 90%/94% and keep tint for downgrade compatibility.
- Add **Reset recommended opacity** without deleting media or other wallpaper preferences.
- Update troubleshooting diagnostics, architecture documentation, Node regressions and an optional Chromium fixture.

## v0.2.4 (2026-10-11)

- Local image and looping-video wallpaper support, separate IndexedDB records.
- Independent Wallpaper settings section alongside General; bilingual metadata.
- Main conversation opaque-background fallback discovered through Desktop DevTools.
- Video pause/reduced-motion handling, diagnostic test pattern and media preview.
- Script/Node tests only; Desktop compositing was not automatically tested.
