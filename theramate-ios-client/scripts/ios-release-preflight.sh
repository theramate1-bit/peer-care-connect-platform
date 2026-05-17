#!/usr/bin/env bash
# Validates local iOS toolchain: pods, simulator build (fastlane), signing readiness.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$CLIENT_DIR/ios"
APP_PATH="$IOS_DIR/build/DerivedData/Build/Products/Debug-iphonesimulator/Theramate.app"

echo "== Theramate iOS release preflight =="

command -v xcodebuild >/dev/null || { echo "Xcode (xcodebuild) not found."; exit 1; }
command -v fastlane >/dev/null || { echo "fastlane not found. brew install fastlane"; exit 1; }

echo "→ pod install"
cd "$IOS_DIR"
pod install

echo "→ fastlane check_signing"
fastlane check_signing

echo "→ fastlane sim (Debug / Simulator, clean build)"
FASTLANE_SIM_CLEAN=1 fastlane sim

if [[ ! -d "$APP_PATH" ]]; then
  echo "Expected app missing: $APP_PATH"
  exit 1
fi

echo ""
echo "✓ Simulator build OK: $APP_PATH"
if [[ -z "${APPLE_TEAM_ID:-}" ]]; then
  echo ""
  echo "Device archive / TestFlight still needs signing on this Mac:"
  echo "  export APPLE_TEAM_ID=<Team ID>   # then: cd ios && fastlane archive"
  echo "  Or: eas build --platform ios --profile production"
else
  echo "→ APPLE_TEAM_ID is set; you can run: cd ios && fastlane archive"
fi
