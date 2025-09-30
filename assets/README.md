# Hoser Video Assets

This directory contains application assets including:

- Dragon logo SVG and PNG exports
- Application icons for all platforms (Windows ICO, macOS ICNS, Linux PNG)
- `poster-placeholder.svg` - Default movie/show poster placeholder
- `backdrop-placeholder.svg` - Default backdrop placeholder
- `video-placeholder.svg` - Video thumbnail placeholder
- Brand assets in `brand/` subdirectory

## Icon Requirements

For cross-platform compatibility:
- `build/icon.ico` (Windows) - Multi-size ICO file
- `build/icon.icns` (macOS) - Multi-size ICNS file
- `build/icons/` (Linux) - Various PNG sizes from 16x16 to 512x512

## Brand Assets

- `brand/dragon-logo.svg` - Main dragon mark logo
- `brand/H-logo.svg` - Legacy logo (deprecated)

## Development Notes

All placeholder assets use SVG format for scalability. Production builds include platform-specific icon formats generated from the dragon logo.