# Troubleshooting / 故障排查

## First checks

Confirm **Settings → Wallpaper background** reports version `0.3.0-rc.7`. Fully quit the DSH Desktop tray process after updating the bundle, then restart. Enable the built-in wallpaper gradient and close Settings to inspect it.

**IMPORTANT:** v0.3.x deliberately makes the outer conversation root **transparent**. A transparent `conversationRootBackground` is now a *success*, not an error; examine `chatBackground`, `headerBackground`, `sidebarBackground`, and `composerBackground` instead.

### Read-only DevTools script (Windows: F12 / Ctrl+Shift+I)

```js
(() => {
  const stage = document.querySelector('[data-dsh-vw-stage]');
  const root = document.querySelector('[data-slot="main.conversation"] > [data-phase]');
  const style = node => node ? getComputedStyle(node).backgroundColor : null;
  const frost = node => node ? getComputedStyle(node).backdropFilter : null;
  const frame = stage?.parentElement;
  const image = stage?.querySelector('img');
  const video = stage?.querySelector('video');
  const result = {
    stageMounted: !!stage,
    stageSize: stage ? `${stage.clientWidth}x${stage.clientHeight}` : null,
    stylesheetMounted: !!document.querySelector('[data-dsh-vw-styles]'),
    testPatternMounted: !!stage?.querySelector('.dsh-vw-pattern'),
    conversationRootBackground: style(root),
    chatBackground: style(root?.querySelector('[data-conversation-content]')),
    headerBackground: style(root?.querySelector('[data-slot="conversation.header"] > header')),
    sidebarBackground: style(frame?.querySelector('[class*="sidebarCol"]')),
    sidebarInnerBackground: style(document.querySelector('[data-slot="sidebar"] > div')),
    composerBackground: style(root?.querySelector('[data-composer-card]')),
    chatFrost: frost(root?.querySelector('[data-conversation-content]')),
    headerFrost: frost(root?.querySelector('[data-slot="conversation.header"] > header')),
    // rc.5+: the sidebar parent must NOT have backdrop-filter; only its ::before should.
    sidebarFrost: frost(frame?.querySelector('[class*="sidebarCol"]')),
    sidebarBackdropFrost: frame?.querySelector('[class*="sidebarCol"]')
      ? getComputedStyle(frame.querySelector('[class*="sidebarCol"]'), '::before').backdropFilter : null,
    sidebarToggleTop: document.querySelector('[data-slot="sidebar"] [class*="toggle"]')
      ?.getBoundingClientRect().top ?? null,
    composerFrost: frost(root?.querySelector('[data-composer-card]')),
    imageDecoded: image ? image.complete && image.naturalWidth > 0 : null,
    videoReadyState: video?.readyState ?? null,
    slotErrors: [...document.querySelectorAll('[data-slot-error]')]
      .map(n => n.getAttribute('data-slot-error'))
  };
  console.table(result);
  return result;
})()
```

Please share only these computed-style fields, not private chat text, storage dumps or profile paths.

### Reading the results

- If `stageMounted` is false, investigate plugin activation / media mode / test-pattern switch.
- If `stageMounted` is true but `stylesheetMounted` false, check the Client render/Portal lifecycle.
- If the conversation root is *opaque*, it may still be hiding the wallpaper; it should be transparent when a wallpaper is enabled.
- If one of the four paint surfaces doesn't follow its slider, compare that field's `rgba(...)` alpha with the slider value. DSH DOM or other plugin CSS may be overriding it.
- If images fail but the test pattern is visible, inspect image decoding and IndexedDB rather than UI transparency.

## Video playback fails

Try a small H.264 MP4. Browser/Electron codec support differs by OS and version. Check paused state, Reduce Motion preference and whether the DSH window is minimized.

## Safely disabling / rollback

Turn wallpaper mode **Off**, or disable the plugin bundle in Plugin Manager, then fully quit/restart DSH. Do not clear the whole user profile; the plugin stores media in browser IndexedDB and settings in localStorage. Disable the feature before troubleshooting appearance conflicts with other client themes.


## Sidebar list has a white strip / abrupt cutoff (v0.2.x regression)

In old builds, the workspace list-end `.fade` paints an **opaque** 24px gradient over a translucent sidebar. v0.3.0-rc.3 hides only this decorative fade while wallpaper is active, and leaves the list scrollable. The bright vertical sliver beside the list may be its scrollbar; this version applies subdued thumb colors without hiding the scrollbar.

If the artifact persists in Desktop, open DevTools and run this read-only check:

```js
(() => {
  const fade = document.querySelector('[data-slot="sidebar.workspaces"] [class*="treeBody"] > span[class*="fade"]');
  const list = document.querySelector('[data-slot="sidebar.workspaces"] [class*="treeBody"] > [class*="list"]');
  return {
    wallpaperStage: !!document.querySelector('[data-dsh-vw-stage]'),
    fadeFound: !!fade,
    fadeDisplay: fade ? getComputedStyle(fade).display : null,
    listFound: !!list,
    listOverflowY: list ? getComputedStyle(list).overflowY : null,
    scrollbarThumb: list ? getComputedStyle(list).getPropertyValue('--dsh-scrollbar-thumb').trim() : null,
  };
})()
```

Do not share private workspace titles, wallpaper files, or credential data.

## Panel frosted glass not visible / choppy

With wallpaper/media blur at **0px**, set panel frosted blur to **6px** and the chat body alpha below ~60%. Open DevTools: `chatFrost`, `headerFrost`, **`sidebarBackdropFrost`**, `composerFrost` should show `blur(6px)` if the corresponding element exists and Electron supports CSS backdrop filtering. **`sidebarFrost:none` at any value is expected in rc.6**, since the blur is on the independent `::before` layer. `none` for other frost values at panelBlur=0px is expected.

If these four frosted-surface values remain `none` even when panelBlur is nonzero, check that the installed version is rc.4, wallpaper scene CSS is mounted, and Chromium supports `backdrop-filter`. Text and caret should not be blurred; if they are, verify another appearance plugin is not applying `filter` to containers. Blurred backdrops may create stacking contexts, so test menus and overlays. For video stutters lower the panel blur (2–4px), make UI surfaces more opaque, or set it back to 0px.

## Windows sidebar toggle overlaps the DeepSeek logo when panel blur is enabled

In rc.3/rc.4, `backdrop-filter` on the sidebar **parent column** created a containing block for the native Windows viewport-fixed sidebar toggle, displacing its `top` by the native titlebar height. Setting Panel Blur to 0px was confirmed by the Desktop user to immediately restore the button position.

Since rc.5 the frost filter lives on the sidebar column's noninteractive `::before` background layer. **Do not compensate by moving the toggle with `top:-38px`**; that would fail in fullscreen or future DSH titlebar layouts. Verify `sidebarFrost === 'none'` and `sidebarBackdropFrost === 'blur(6px)'` at panelBlur 6px, and `sidebarToggleTop` remains unchanged between 0px and 6px. The `::before` layer must have `pointer-events:none`.

## Presets / A-B compare / opacity names (rc.4+, including v0.3.0-rc.7)

- **Opacity vs transparency:** DSH Wallpaper now labels media `opacity` as 壁纸**不透明度**. 100% means completely visible; 40% has exactly the same stored/painted result as the old 40% “透明度” control. UI panel alpha is also opacity, so 100% blocks the wallpaper, 0% is a transparent panel background. Do not invert your old values when upgrading.
- **Presets do not persist:** check whether `localStorage` is writable. Custom presets use `dsh-local-video-wallpaper-custom-presets-v1` and *not* the wallpaper media IndexedDB. A browser/Electron storage permission error shows an inline warning. Do not post raw localStorage or wallpaper data when reporting bugs.
- **Built-ins unexpectedly changed your wallpaper mode:** they should never modify `mode`, `paused`, `allowReducedMotion`, or media files. Only visual fields are changed. If this occurs, stop and report the plugin version and reproduction steps.
- **Before doesn't change the sliders:** by design. The sliders show the latest saved (Current) settings. Before temporarily repaints the live wallpaper; selecting the compare view never writes to localStorage. Click Restore Before to **save** the old visual values back, or Show Current to stop previewing.
- **Comparison unavailable after restart:** before/after baseline is an in-memory session snapshot by design; save an explicit named custom preset for durable versions of a look.
- **Video thumbnail looks black/static:** both tiny A/B thumbnails are paused for performance. The DSH wallpaper itself continues normal playback. Miniatures are not full Desktop screenshots and cannot reproduce arbitrary upstream modal overlays.

## 壁纸自身模糊导致构图放大（rc.6 已修复）

旧版在 0px → 1px 时按 `scale(1.04)` 放大整张壁纸；预设对比预览曾使用 `scale(1.05)`。新版让 `<img>` / `<video>` 始终保持原尺寸、`object-fit` 和位置；仅在模糊大于 0px 时，在壁纸层内增加 `.dsh-vw-media-blur` 非交互的 `backdrop-filter` 覆盖层。该层在 UI 后面、壁纸暗度层前面。没有复制视频帧或重新加载文件。

测试：选择有清晰主体的图片，交替调整 0px / 1px / 4px / 20px，人物轮廓可以变糊，但主体大小、画面边缘不应跳动或出现泛白线。再尝试「铺满（裁剪）」和「完整显示」、Before/Current 对比及视频模式。全屏 20px 高模糊可能更耗 GPU；若出现掉帧，降低模糊值。若视觉效果未改变，请核对页面版本 `0.3.0-rc.7` 并彻底重启 DSH Desktop。
