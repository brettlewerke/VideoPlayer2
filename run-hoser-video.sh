#!/usr/bin/env bash
# Portable launcher for Linux
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
BIN_CANDIDATES=("Hoser Video" "Hoser-Video" "hoser-video" "Hoser-Video.AppImage" "Hoser-Video-${VERSION:-}.AppImage")
for c in "${BIN_CANDIDATES[@]}"; do
  if [ -f "$DIR/$c" ]; then
    chmod +x "$DIR/$c" || true
    exec "$DIR/$c" "$@"
  fi
done
echo "Hoser Video binary/AppImage not found beside script." >&2
exit 1
