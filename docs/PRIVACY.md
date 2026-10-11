# Privacy and local data

This plugin uses the user's own files as local DSH window backgrounds. It is not a wallpaper download service and does not add an analytics endpoint.

## What is stored

- Imported images/videos: IndexedDB in the currently active DSH Chromium/browser profile, using the plugin's media store.
- Display options, media mode and custom visual presets: localStorage in the same client environment.
- Temporary before/current visual comparison snapshots: in-memory state, not remote account storage.

The plugin source does not initiate file uploads or network requests. This statement covers **this plugin only**; it does not describe DeepSeek Harness, other plugins, the operating system, or the browser's independent features and telemetry.

## Removal / retention

Disabling or uninstalling the plugin does not necessarily delete existing IndexedDB media blobs or localStorage preferences. No automated profile deletion should be performed during ordinary upgrades or troubleshooting. Stored media can consume disk quota. Users should delete imported wallpaper files through the plugin UI before uninstalling when they want to reduce retained data; browser-profile cleanup has wider effects.

## Reporting problems

Use synthesized test patterns or personally owned media. Hide private conversation content, workspace titles, user handles, filesystem paths and authentication details in screenshots. Share only targeted computed-style results or sanitized error messages rather than complete console dumps or profile exports.
