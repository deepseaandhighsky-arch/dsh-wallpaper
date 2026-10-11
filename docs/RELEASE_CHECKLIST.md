# Publication checklist (maintainer)

**MIT licensing does not by itself make this repository publicly visible.** Keep the new repository **Private** until the maintainer explicitly approves public release. This candidate is not a stable release.

## Repository and privacy

- [x] Maintain a **separate** clean public-project history; do not copy the older private Git history, issue comments, PR discussions, attachments, or experimental branch refs.
- [x] Select MIT and use an account-name copyright attribution, without a personal contact email.
- [ ] Create `deepseaandhighsky-arch/dsh-wallpaper` with **Private** visibility and upload the clean initial commit only.
- [ ] Confirm the new repository has **one root commit** and no real-name/personal-email commit identity; use GitHub's `users.noreply.github.com` email.
- [ ] Inspect both the tracked tree and the **new** Git history for credentials, user media, personal paths and conversation material.

## Copyright and usage rights

- [x] Include the text of the MIT LICENSE and matching `package.json` SPDX field.
- [ ] Maintainer confirms they own the source and icon or otherwise have rights to release them under MIT.
- [ ] Identify any source copied from DeepSeek Harness/community code and preserve licenses/notices where necessary.
- [ ] Any demos/screenshots use anonymized content and rights-cleared wallpaper imagery, or simply omit screenshots.

## Source and CI

- [ ] GitHub Actions passes `npm run check` plus repository-license audit and ZIP checks **on the exact clean commit**.
- [ ] Verify version consistency: `package.json`, `client.js`, changelog, release tag and ZIP.
- [ ] Confirm local install through `plugin_manager install_bundle` from an absolute directory, including complete exit/restart and rollback.
- [ ] Verify reduced motion, light/dark, media storage migration, image/video behavior and uninstall/disable restoration.
- [ ] Test 0/6/12px frosted panel blur with the native Windows sidebar toggle expanded/collapsed, maximized/fullscreen.
- [ ] Test wallpaper blur 0/1/4/20px (cover/contain), three presets, custom presets, A/B restoration and the Plugins page.
- [ ] Clearly label untested macOS/Web configurations as unverified.

## Publishing (requires explicit new approval)

- [ ] Set repository description, topics and security contact; enable appropriate GitHub vulnerability reporting.
- [ ] Approve switching the **new** repository from Private to Public.
- [ ] Create a version-matched GitHub **pre-release** (not stable) with verified, reproducible ZIP and release notes.
- [ ] Leave `package.json` `private: true`; do **not** publish to npm without a separate decision.
