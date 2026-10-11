# Roadmap

## Completed preparation

- [x] MIT `LICENSE` and package SPDX metadata.
- [x] Clean publication snapshot with a new root Git commit.
- [x] Public-facing bilingual documentation, contribution/security guidance and CI build checks.

## Before changing the new repository to Public

- [ ] Create the **new** `deepseaandhighsky-arch/dsh-wallpaper` GitHub repository as **Private**, then push the clean initial commit.
- [ ] Verify GitHub Actions on that **exact commit** and confirm the commit uses a GitHub `users.noreply.github.com` email.
- [ ] Confirm the source, vector icon, any adapted code and future demonstration media can legally be distributed under MIT.
- [ ] Test the exact source release candidate on real Windows DSH Desktop (video, presets, sidebar toggle and rollback).
- [ ] Decide what platforms to advertise, set repository description/topics, and explicitly approve Public visibility.

## After the first preview

- Prefer stable DSH theme/slot APIs over fragile UI internals where upstream supports them.
- Verify macOS/Web separately before claiming support.
- Improve contrast/accessibility and GPU performance for video with frosted UI.
- Add repeatable real Electron end-to-end testing and review third-party plugin coexistence.
