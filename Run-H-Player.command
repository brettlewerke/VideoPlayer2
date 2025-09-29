#!/bin/bash
# Launch H Player Mac portable bundle
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$DIR/H Player.app"
if [ ! -d "$APP_PATH" ]; then
  # Fallback alternative bundle naming
  APP_PATH="$DIR/H-Player.app"
fi
if [ ! -d "$APP_PATH" ]; then
  echo "H Player app bundle not found beside script." >&2
  exit 1
fi
open "$APP_PATH"
