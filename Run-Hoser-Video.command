#!/bin/bash
# Launch Hoser Video Mac portable bundle
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$DIR/Hoser Video.app"
if [ ! -d "$APP_PATH" ]; then
  # Fallback alternative bundle naming
  APP_PATH="$DIR/Hoser-Video.app"
fi
if [ ! -d "$APP_PATH" ]; then
  echo "Hoser Video app bundle not found beside script." >&2
  exit 1
fi
open "$APP_PATH"
