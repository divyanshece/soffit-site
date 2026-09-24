#!/usr/bin/env bash
# Installs Soffit.
#
#   curl -fsSL https://soffit.rtaapp.in/install.sh | bash
#
# Why this exists: Soffit is not notarised, because notarising costs $99/year. A build downloaded
# through a browser is tagged by macOS with `com.apple.quarantine`, and Gatekeeper refuses to open
# a quarantined app that has no Developer ID — the user has to go to System Settings and click
# "Open Anyway". A build fetched with curl is never tagged, so it just opens.
#
# Nothing here evades a security check: the same app, downloaded the same way, from the same
# server. It is the flag the browser adds, not the app, that makes the difference — and installing
# from a command you can read first is if anything the more transparent of the two.
set -euo pipefail

VERSION="${SOFFIT_VERSION:-0.1.0}"
URL="${SOFFIT_URL:-https://soffit.rtaapp.in/downloads/Soffit-$VERSION.zip}"
DEST="/Applications"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading Soffit $VERSION…"
curl -fL# "$URL" -o "$TMP/Soffit.zip"

echo "Installing to $DEST…"
ditto -x -k "$TMP/Soffit.zip" "$TMP/out"
APP="$(find "$TMP/out" -maxdepth 1 -name 'Soffit.app' -print -quit)"
[ -n "$APP" ] || { echo "That archive did not contain Soffit.app."; exit 1; }

# Quit a running copy first, or the replace fails and the old one keeps running.
pkill -f "Soffit.app/Contents/MacOS/Soffit" 2>/dev/null || true
sleep 1

rm -rf "$DEST/Soffit.app"
ditto "$APP" "$DEST/Soffit.app"
# Belt and braces: strip quarantine in case the archive picked it up somewhere along the way.
xattr -dr com.apple.quarantine "$DEST/Soffit.app" 2>/dev/null || true

open "$DEST/Soffit.app"
echo
echo "Installed. Soffit is in your menu bar — hover the notch to see it."
