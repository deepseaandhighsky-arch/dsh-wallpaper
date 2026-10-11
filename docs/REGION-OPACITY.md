# Region opacity: design and DOM contract

## User intent

Allow four separate interface surface opacities while leaving wallpaper media opacity independent. **Do not** apply CSS `opacity` to DOM containers: it would fade text, controls, and descendants. Change only the painted `background` of each surface.

## DSH 0.2.0-rc.2 confirmed hooks

| Scope | Selector | Paint behavior |
|---|---|---|
| AppFrame / wallpaper | `[data-dsh-vw-stage]` | Behind the resident grid cells |
| Conversation root | `[data-slot="main.conversation"] > [data-phase]` | Set transparent to avoid stacking regional backgrounds |
| Chat body | `[data-slot="main.conversation"] > [data-phase] > [data-conversation-content]` | Solid-color RGBA with chat alpha |
| Conversation header | `[data-slot="conversation.header"] > header` under main conversation root | Independent RGBA with header alpha |
| Sidebar column | `AppFrame > [class*="sidebarCol"]` | Independent theme sidebar-fill alpha |
| Sidebar root | `[data-slot="sidebar"] > div` | Transparent, avoids double coating |
| Composer input | `[data-slot="main.conversation"] [data-composer-card]` | Independent RGBA; leaves box shadow/border and child controls intact |
| Composer footer scrim | `[data-composer-seat]` under main conversation | Matches chat reading alpha, not composer card alpha |

`data-composer-card` comes from the DSH `InputBar.tsx`, not a guessed CSS module class. `data-conversation-content` is emitted by `ConversationContent.tsx`. The header uses the direct DOM child of the official `conversation.header` slot. Some selectors still require shell ancestry / `[class*="sidebarCol"]`: the official app does not expose a background-slot API. If an upstream version changes the class, update the integration.

## Sidebar workspace-list fade (v0.3.0-rc.2)

The official `ui-workspace/WorkspaceBrowser.module.css` renders a `span.fade` inside `.treeBody` at the foot of the scrollable session list. It has `height:24px` and paints `linear-gradient(to bottom, transparent, var(--dsw-specific-sidebar-fill))`. When the sidebar base is translucent, the fully opaque endpoint creates a bright white bar and then disappears sharply at the list boundary (observed in a DSH Desktop screenshot).

Our scene-lifetime stylesheet hides **only** the `span.fade` inside `[data-slot="sidebar.workspaces"]`'s `treeBody`; it does not hide the scroll list, clipping, or scrollbars. Its scrollbar thumb inherits subtler theme-derived variables instead of disappearing. The override unmounts when the wallpaper scene does, so stock DSH is not changed when wallpaper is off. DOM/class naming remains version-coupled and requires real Desktop visual validation.

## Light/dark handling

Light surfaces use `rgba(255,255,255,alpha)`; dark surfaces use `rgba(19,21,26,alpha)` for the chat, header and input card. Sidebar alpha is mixed with the official `--dsw-specific-sidebar-fill` theme color. Text colors, icon colors, focus/hover states, Windows system titlebar and independent modal surfaces are not edited.

## Persisted schema and migration

Existing key: `dsh-local-video-wallpaper-prefs-v2`; existing IndexedDB `dsh-local-video-wallpaper-v1` with media keys `image`/`video`. Do **not** clear or replace these identifiers.

New JSON keys: `regionChat`, `regionSidebar`, `regionHeader`, `regionComposer`, each clamped to `[0,1]`. Existing v0.2.x `tint` migrates to chat/header only. Sidebar starts at `.90` and composer starts at `.94` because both were intentionally more opaque in the original layout. `tint` is retained internally; changing regionChat updates it for a safer downgrade. The one-click Reset sets the recommended region values without touching wallpaper media/opacity, fit, blur or dim.

## Lifecycle

- Region CSS is included only while the wallpaper or diagnostic test pattern is active and loaded.
- Disabled wallpaper without diagnostic pattern releases the Portal style and wallpaper scene.
- A media file is never re-imported during a region adjustment. The same video/image React element identity is maintained while CSS text updates.
- Test pattern deliberately uses a .10 alpha for chat/header to make attachment failures observable; stored values are untouched.

## Independent frosted-glass blur (v0.3.0-rc.3)

`blur` remains the wallpaper-media filter `filter:blur(Npx)` on `<img>` and `<video>` (and keeps all existing saved values). New `panelBlur` (0–12px, default **0**) is an independent persisted preference in `dsh-local-video-wallpaper-prefs-v2`.

For a nonzero value only, the scene stylesheet adds an `@supports`-guarded `backdrop-filter: blur(Npx)` (plus vendor prefix) **to painted panel backgrounds, not text**: an independent AppFrame sidebar `::before` visual layer, conversation content region, conversation header and the `data-composer-card` input box. The chat root still has transparent paint. This preserves background wallpaper pixels as a source image while only softening their appearance behind the UI panels. At 0px no backdrop-filter rule is emitted; the Chromium compositor has no additional frosted layer from this feature.

### Windows native titlebar fixed-toggle regression (v0.3.0-rc.5)

The `SidebarRoot.module.css` native Windows toggle is `position:fixed;top:calc((var(--dsh-windows-titlebar-height) - 28px)/2);left:12px`. AppFrame itself provides the 38px top padding for content. A `backdrop-filter` on `AppFrame > sidebarCol` changes the fixed button's containing block from the viewport to the sidebar column; with `panelBlur>0`, the icon shifts below the native titlebar and collides with the DeepSeek logo. The user confirmed this immediately reverses at `panelBlur=0px`.

The repair leaves `sidebarCol` **without a backdrop filter**. It is already a positioned stacking context (`position:relative;z-index:1`) when our stage is mounted; its `::before` paints `backdrop-filter` with `position:absolute;inset:0;z-index:-1;pointer-events:none` **only when panelBlur>0**. This pseudo-element paints above the column's own translucent background and below the sidebar content, but does **not** create a fixed-position containing block for controls because it is not an ancestor of the toggle. The toggle CSS is untouched. CSS regression and standalone Chromium both check no shift across the 38px titlebar gap. Actual DSH Desktop still requires hands-on confirmation in windowed, maximized and fullscreen modes.

Readability still depends on region alpha and image contrast: high alpha hides most of the blur; very low alpha may reduce text contrast. The composer card is nested in the conversation region, so frost can visually compound there. The blur effect can be GPU-expensive for looping videos and large desktops. Desktop acceptance MUST check overlays, popup menus, scroll performance and input caret selection. Native titlebar, modals and third-party panels are not modified.

## Verification

`npm run check` validates controller state, persisted migration/clamping, region slider availability and CSS template interpolation. Optional `npm run visual:smoke` starts standalone Chromium with a synthetic DSH DOM to inspect actual computed styles, including isolation when controls change. **Still required:** Desktop visual check on the user's specific DSH build (light/dark, image/video, input usability, sidebar resize, bundle disable, re-enable, restart and rollback).

Upstream sources: `packages/client/ui-conversation/src/client/skeleton/{ConversationMainPanel.tsx,ConversationContent.tsx,ConversationHeader.tsx,InputBar.tsx}`, `packages/client/ui-sidebar/src/client/SidebarRoot.tsx`, and `packages/client/ui-layout/src/client/AppFrame.tsx` in `deepseek-ai/deepseek-harness`.


### Plugins page alpha (rc.7)

The official DSH Plugins main view (`[data-plugin-panel]`) is not inside `main.conversation`, so earlier versions rendered its unprotected text directly on the wallpaper. While the wallpaper stylesheet is active, it now uses the same content surface **background opacity** value as `regionChat` (including dark-theme paint). No `backdrop-filter`, `transform` or positioning is added to the Plugins page root to protect native titlebar and modal layout. Thus the "chat body" slider also controls this official main view, but it is **not** a universal third-party page skin. Turning off the wallpaper removes this CSS entirely.
