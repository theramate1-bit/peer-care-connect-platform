#!/usr/bin/env bash
# Expo + Android emulator: adb reverse, Metro on 8081, then install/launch debug (uses existing Metro with --no-bundler).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${METRO_PORT:-8081}"
BUNDLE_ID="com.theramate.client"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_HOME
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

export CI="${CI:-false}"

cleanup_metro() {
  if [[ -n "${METRO_PID:-}" ]] && kill -0 "$METRO_PID" 2>/dev/null; then
    echo "Stopping Metro (pid $METRO_PID)..."
    kill "$METRO_PID" 2>/dev/null || true
    wait "$METRO_PID" 2>/dev/null || true
  fi
}

trap cleanup_metro INT TERM

echo "== Theramate Android (Expo) =="

if ! adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+[[:space:]]+device'; then
  echo "No Android emulator in \"device\" state. Start one in Android Studio Device Manager, then retry."
  exit 1
fi

SERIAL="$(adb devices | awk '/emulator.*device$/{print $1; exit}')"
echo "Using device $SERIAL"
adb -s "$SERIAL" reverse "tcp:${PORT}" "tcp:${PORT}" || true

METRO_PID=""
if curl -sf "http://127.0.0.1:${PORT}/status" >/dev/null 2>&1; then
  echo "Using existing Metro on :${PORT}"
else
  echo "Starting Expo Metro on :${PORT} (from client app dir — required for correct RN/Metro resolution)..."
  cd "$CLIENT_DIR"
  npx expo start --port "$PORT" &
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

echo "Building/installing native app (Gradle uses Metro for codegen only; JS comes from Metro at runtime)..."
cd "$CLIENT_DIR"
npx expo run:android --no-bundler

echo ""
echo "Theramate should be on the emulator ($BUNDLE_ID)."
echo "Metro: http://localhost:${PORT}"

if [[ -n "$METRO_PID" ]]; then
  echo "Metro running as pid $METRO_PID — press Ctrl+C to stop Metro and exit."
  wait "$METRO_PID" || true
else
  echo "Leave your existing Metro process running."
  trap - INT TERM
fi
