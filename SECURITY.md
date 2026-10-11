# Security policy

## Status and supported versions

DSH Wallpaper is an experimental pre-release. Until its first public release, there is **no guaranteed security-support window**. Do not treat successful source tests as a security audit or proof of compatibility with every host version.

## Vulnerability reporting

Please **do not disclose exploit details or secrets in public GitHub issues**. After publication, use the repository's Security tab and its private vulnerability-reporting option if enabled. If the option is not available, contact the maintainer privately through their GitHub profile before sharing technical reproduction details. Do not send credentials or full local profiles.

## Trust boundary

DSH loads this plugin's JavaScript in the client UI with access to the same client context as other installed UI plugins. Installation of any third-party plugin requires trusting its source and dependencies. The current plugin has no declared external npm runtime dependencies or network upload code. It stores selected media locally in the browser profile.

Disabling the plugin does not necessarily delete browser-stored media. Never recommend deleting a full DSH profile for routine troubleshooting.
