# Visual preset design (v0.3.0-rc.7)

Three **deliberately different** appearance behaviors, not increments of the same tint.

| Appearance | Wallpaper opacity | Media blur | Panel frost | Chat bg opacity | Sidebar bg opacity | Header bg opacity | Composer bg opacity |
|---|---:|---:|---:|---:|---:|---:|---:|
| Reading | 48% | 8px | 0px | 92% | 98% | 94% | 99% |
| Balanced | 80% | 2px | 5px | 56% | 78% | 62% | 94% |
| Immersive | 100% | 0px | 0px | 22% | 34% | 20% | 80% |

The **opacity** naming is literal: 100% is fully opaque. 0% is fully transparent for region surfaces. The media opacity slider remains clamped to 15–100%; no stored preferences are inverted.

The approximate wallpaper contribution inside the chat is `wallpaper_opacity * (1 - chat_surface_opacity)`: Reading ~3.8%; Balanced ~35.2%; Immersive ~78%. This is a compositing heuristic (not a luminance, color contrast, or accessibility guarantee). Visual appearance still depends on each wallpaper and theme.

The official Plugins main panel has no `main.conversation` tree. While the wallpaper is enabled, it now paints a content backplate with the **chat surface opacity**, so the three looks also differ materially on the Plugins page. The main panel itself never gets `backdrop-filter`, preventing new fixed-position containing blocks for native UI controls. We avoid touching plugin package cards or their buttons.

Immersive trades away readability; users with busy, highly contrasted images may need to raise the content opacity slider. Users' manually tuned settings are unchanged until a preset is actively applied. A/B comparison retains the previous appearance for restoring; custom preset data and image/video files stay intact.

## Acceptance

- Windows DSH Desktop: verify all three looks in **conversation** and **Plugins** view.
- In a busy wallpaper, text remains legible enough for the user's intent; note that Immersive intentionally prioritizes background over long-form reading.
- Dark theme and reduced-motion wallpaper states.
- At `panelBlur=5px`, sidebar collapse icon stays fixed in Windows titlebar; validate fullscreen and maximized too.
- Clear all media / turn wallpaper off and verify native DSH background and component styles are restored.
