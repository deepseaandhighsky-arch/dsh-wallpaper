# Compatibility and test evidence

## Verified in source / fixtures

- v0.3.0-rc.7 passed 52/52 Node source and regression tests on Node v22.16.0 during pre-publication preparation.
- `npm pack --dry-run` succeeded for this exact package version.
- CSS hooks and regions were written against DeepSeek Harness v0.2.0-rc.2 source structure.
- Prior isolated Chromium geometry tests validated some CSS placement scenarios, but these are **not** DSH Electron tests.

## Unverified or incomplete

- DSH Desktop Electron end-to-end acceptance for v0.3.0-rc.7.
- macOS and Linux app builds, and Web-profile install behavior.
- Every DSH host build/version, non-Chromium engines, all hardware decoders and GPU devices.
- In this environment, `npm run visual:smoke` fails to start Chromium within the configured spawn timeout. A failed launcher is not evidence of a passed visual test or a confirmed product defect.

## What reporters should provide

DSH/Desktop exact version, OS version, plugin version, whether it was installed from a local path or registry/git, light/dark theme, media format/resolution, four region opacities, wallpaper blur, frost blur, and minimal screenshots with all private identifiers removed.

Never upload private conversations, workspace names, account identifiers, secrets, the original wallpaper file, or an entire DSH profile.

## Compatibility claims

Keep the README and releases limited to platforms **actually tested**. Support status should be updated when a maintainer records reproducible on-device verification.
