## fastlane documentation

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios pods

```sh
[bundle exec] fastlane ios pods
```

Install CocoaPods

### ios check_signing

```sh
[bundle exec] fastlane ios check_signing
```

Verify Xcode + workspace; warn if signing is missing for device builds

### ios sim

```sh
[bundle exec] fastlane ios sim
```

Build Debug for iOS Simulator (no signing certificates required). Set FASTLANE_SIM_CLEAN=1 for clean build.

### ios open_xcode

```sh
[bundle exec] fastlane ios open_xcode
```

Open Theramate.xcworkspace in Xcode

### ios archive

```sh
[bundle exec] fastlane ios archive
```

Archive Release .ipa (requires APPLE_TEAM_ID + Xcode signing)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Archive and upload to TestFlight (requires APPLE_ID + app-specific password or API key)

---

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
