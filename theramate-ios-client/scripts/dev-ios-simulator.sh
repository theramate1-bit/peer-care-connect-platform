#!/usr/bin/env bash
# Expo + iOS Simulator: starts Metro if needed, builds native app if missing, installs & launches Theramate.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MONOREPO_ROOT="$(cd "$CLIENT_DIR/.." && pwd)"

SIM_ID="${SIMULATOR_UDID:-0457A4DC-F533-4ED4-8C3D-4962F0B86F7B}"
PORT="${METRO_PORT:-8081}"
BUNDLE_ID="com.theramate.client"
APP_PATH="$CLIENT_DIR/ios/build/DerivedData/Build/Products/Debug-iphonesimulator/Theramate.app"

export CI="${CI:-false}"

cleanup_metro() {
  if [[ -n "${METRO_PID:-}" ]] && kill -0 "$METRO_PID" 2>/dev/null; then
    echo "Stopping Metro (pid $METRO_PID)..."
    kill "$METRO_PID" 2>/dev/null || true
    wait "$METRO_PID" 2>/dev/null || true
  fi
}

trap cleanup_metro INT TERM

echo "== Theramate iOS (Expo) =="

xcrun simctl boot "$SIM_ID" 2>/dev/null || true
open -a Simulator 2>/dev/null || true
sleep 2

METRO_PID=""
if curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
  echo "Using existing Metro on :${PORT}"
else
  echo "Starting Expo Metro on :${PORT}..."
  cd "$MONOREPO_ROOT"
  npx expo start "$CLIENT_DIR" --port "$PORT" &
  METRO_PID=$!
  for _ in $(seq 1 120); do
    if curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
      echo "Metro ready."
      break
    fi
    sleep 1
  done
  if ! curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
    echo "Metro did not become ready on :${PORT}"
    cleanup_metro
    exit 1
  fi
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "Building Debug simulator binary (first run; several minutes)..."
  cd "$CLIENT_DIR/ios"
  xcodebuild \
    -workspace Theramate.xcworkspace \
    -scheme Theramate \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination "id=$SIM_ID" \
    -derivedDataPath ./build/DerivedData \
    build
fi

xcrun simctl uninstall booted "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl install booted "$APP_PATH"
xcrun simctl launch booted "$BUNDLE_ID"

echo ""
echo "Theramate is running on the simulator ($BUNDLE_ID)."
echo "Metro: http://localhost:${PORT}"

if [[ -n "$METRO_PID" ]]; then
  echo "Metro running as pid $METRO_PID — press Ctrl+C to stop Metro and exit."
  wait "$METRO_PID" || true
else
  echo "Leave your existing Metro process running."
  trap - INT TERM
fi
