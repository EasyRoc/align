#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"

echo "Generating icons..."
echo "SVG icon created at $ASSETS_DIR/icon.svg"
echo ""
echo "To create platform icons, run the following:"
echo "  macOS .icns: create an iconset folder and use iconutil"
echo "  Windows .ico: convert icon-256.png to icon.ico using ImageMagick"
echo "  Linux .png: assets/icon.png (1024x1024)"
echo ""
echo "For now, electron-builder will use the default Electron icon."
echo "Replace assets/icon.icns and assets/icon.ico before release."
