# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.0.0](https://github.com/brettlewerke/VideoPlayer2/compare/v1.2.0...v3.0.0) (2025-09-29)


### ⚠️ BREAKING CHANGES

* **Windows Dependency Management**: Complete overhaul of Windows FFmpeg dependency handling with automatic repair system

### Features

* **Windows FFmpeg Repair System**: Automatic detection and repair of missing ffmpeg.dll dependencies on Windows
  - Three repair options: automatic download, switch to libVLC, or manual instructions
  - Runtime repair helper script for seamless FFmpeg DLL installation
  - Enhanced dependency checker service with MPV compatibility verification
* **Enhanced Packaging**: Improved electron-builder configuration with proper script inclusion
* **Production Build System**: Streamlined build process for creating distributable Windows executables
* **Type Safety**: Complete TypeScript integration with proper IPC type definitions

### Bug Fixes

* **Windows Compatibility**: Resolved "ffmpeg.dll was not found" errors on Windows systems
* **Build Process**: Fixed electron-builder cross-platform packaging issues
* **Type Definitions**: Corrected all TypeScript compilation errors for production builds

## [1.2.0](https://github.com/brettlewerke/VideoPlayer2/compare/v1.1.1...v1.2.0) (2025-09-29)


### Features

* add automatic versioning and release system ([edaf913](https://github.com/brettlewerke/VideoPlayer2/commit/edaf913117424f0b98dd9962deed3871ed69d53f))

### [1.1.1](https://github.com/brettlewerke/VideoPlayer2/compare/v1.1.0...v1.1.1) (2025-09-29)
