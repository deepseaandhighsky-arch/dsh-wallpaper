# Contributing

Thank you for helping improve this independent, unofficial DSH Wallpaper plugin. The project is MIT-licensed. Contributions are welcome after the repository opens to the public. By contributing, you agree that your contribution may be distributed under the MIT License.

## Development

- Node.js >=22: run `npm run check` and `npm run audit:repo`.
- Make targeted changes and state your tested DSH/OS/plugin versions. Mark fixture-only tests honestly.
- Preserve existing media storage keys and migration behavior; avoid changing the user's wallpaper files or settings during an upgrade.
- Test the Windows sidebar-toggle geometry when using `filter`, `transform`, or `backdrop-filter` on ancestor elements.
- Distinguish panel-background **opacity** from wallpaper opacity and from content/text opacity.
- New background controls should have an intuitive impact and should not make text illegible by default.
- Never include real user wallpapers, API keys, auth tokens, DSH profile files, private conversation screenshots or local workspace data in commits.

## Pull requests

Describe the user-visible behavior, risk/rollback plan, OS and DSH versions, and exact checks performed. A standalone mock DOM or successful Node tests are not substitutes for real Desktop visual evidence.

Use sanitized/rights-cleared screenshots and generic test media only.
