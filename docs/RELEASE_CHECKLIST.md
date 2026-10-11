# Publication checklist (maintainer)

**MIT licensing does not by itself make this repository publicly visible.** Keep the new repository **Private** until the maintainer explicitly approves public release. This candidate is not a stable release.

## Repository and privacy

- [x] Maintain a **separate** clean public-project history; do not copy the older private Git history, issue comments, PR discussions, attachments, or experimental branch refs.
- [x] Select MIT and use an account-name copyright attribution, without a personal contact email.
- [x] Create `deepseaandhighsky-arch/dsh-wallpaper` with **Private** visibility and upload the clean initial commit only.
- [x] Confirm the new repository started with **one root commit** and GitHub `users.noreply.github.com` email; subsequent PR commits require separate review.
- [ ] Inspect both the tracked tree and the **new** Git history for credentials, user media, personal paths and conversation material.

## Copyright and usage rights

- [x] Include the text of the MIT LICENSE and matching `package.json` SPDX field.
- [ ] Maintainer confirms they own the source and icon or otherwise have rights to release them under MIT.
- [ ] Identify any source copied from DeepSeek Harness/community code and preserve licenses/notices where necessary.
- [ ] Any demos/screenshots use anonymized content and rights-cleared wallpaper imagery, or simply omit screenshots.

## Source and CI

- [x] GitHub Actions passed `npm run check`, repository-license audit, and ZIP checks on initial commit `bf265c7` (not a DSH Desktop acceptance test).
- [ ] After merging the distribution PR, confirm Actions passes **on the final release SHA** and uploads validated `.tgz`, `.tgz.sha256`, and ZIP artifacts.
- [ ] Verify version consistency: `package.json`, `client.js`, changelog, final release tag, `.tgz` and ZIP. The tag must target the approved final source commit.
- [ ] Confirm local install through `plugin_manager install_bundle` from an absolute directory, including complete exit/restart and rollback.
- [ ] Verify reduced motion, light/dark, media storage migration, image/video behavior and uninstall/disable restoration.
- [ ] Test 0/6/12px frosted panel blur with the native Windows sidebar toggle expanded/collapsed, maximized/fullscreen.
- [ ] Test wallpaper blur 0/1/4/20px (cover/contain), three presets, custom presets, A/B restoration and the Plugins page.
- [ ] Clearly label untested macOS/Web configurations as unverified.

## Distributable packages / installation

- [ ] Confirm the DSH **Plugins → Add plugin** Git spec works **after** the tag exists and the installer can access the repository.
- [ ] Confirm local `.tgz` installation/activation in the actual Windows DSH Desktop application; source tests alone cannot establish compatibility.
- [ ] Check `.tgz.sha256` and the package contents. Actions test artifacts are not Github Release assets and expire after seven days.
- [ ] Ensure README/installation notes do not claim the future tag or public Release already exists.

## Publishing (requires explicit new approval)

- [ ] Set repository description, topics and security contact; enable appropriate GitHub vulnerability reporting.
- [ ] Approve switching the **new** repository from Private to Public.
- [ ] Create a version-matched GitHub **pre-release** (not stable) with verified, reproducible ZIP and release notes.
- [ ] Leave `package.json` `private: true`; do **not** publish to npm without a separate decision.
