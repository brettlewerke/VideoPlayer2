# H Player

A beautiful, local desktop media player for Movies & TV Shows on plugged-in drives. No internet connection required - just plug in your drive and start watching.

![H Player Logo](assets/brand/H-logo.svg)

## ✨ Features

- **📱 Netflix-like Interface**: Modern, green-and-black themed UI optimized for TV viewing
- **💾 Local Media Library**: Automatic scanning of Movies and TV Shows folders
- **🎬 Hardware-Accelerated Playback**: MPV backend with optional libVLC support
- **🔌 Drive Detection**: Automatic detection of Windows drives, macOS volumes, and Linux mounts
- **📺 Ten-Foot Experience**: Keyboard navigation, remote control ready
- **🏠 Offline First**: No internet required, no data collection
- **🔒 Secure**: Context isolation, no node integration, secure IPC
- **📦 Portable**: Run from any folder without installation

## 🚀 Quick Start

### Option 1: Installer (Recommended)

1. **Download** the installer for your platform:
   - **Windows**: `H-Player-Setup-X.X.X.exe` (NSIS installer)
   - **macOS**: `H-Player-X.X.X.dmg` (DMG with drag-to-Applications)
   - **Linux**: `h-player_X.X.X_amd64.AppImage` or `h-player_X.X.X_amd64.deb`

2. **Install** the application:
   - Windows: Run the installer, follow prompts, creates Start Menu and Desktop shortcuts
   - macOS: Open DMG, drag H Player to Applications folder
   - Linux: Run AppImage directly or install DEB package

3. **Launch**: Double-click the desktop shortcut or start menu entry

### Option 2: Portable Bundle

1. **Download** the portable archive for your platform:
   - **Windows**: `H-Player-Portable-win32-x64.zip`
   - **macOS**: `H-Player-Portable-darwin-x64.tar.gz` or `H-Player-Portable-darwin-arm64.tar.gz`
   - **Linux**: `H-Player-Portable-linux-x64.tar.gz`

2. **Extract** the archive to any folder (USB drive, Documents, Desktop, etc.)

3. **Run** the launcher script:
   - Windows: Double-click `Run-H-Player.ps1`
   - macOS: Double-click `Run-H-Player.command`
   - Linux: Run `./run-h-player.sh` or double-click in file manager

## 📁 Media Organization

H Player automatically scans for media in `Movies/` and `TV Shows/` folders on attached drives.

### Expected Structure

```
Any Drive/
├── Movies/
│   ├── Movie Title (2023)/
│   │   ├── Movie Title (2023).mkv
│   │   ├── poster.jpg          # Optional artwork
│   │   └── backdrop.jpg        # Optional backdrop
│   └── Another Movie (2022)/
│       └── Another Movie (2022).mp4
└── TV Shows/
    ├── Show Name/
    │   ├── Season 1/
    │   │   ├── S01E01 - Episode Title.mkv
    │   │   └── S01E02 - Episode Title.mkv
    │   ├── poster.jpg
    │   └── backdrop.jpg
    └── Another Show/
        ├── S01E01.mkv
        └── S01E02.mkv
```

### Supported Formats

- **Video**: MP4, MKV, AVI, MOV, WMV, FLV, M4V, 3GP, WebM
- **Audio**: MP3, AAC, AC3, DTS, FLAC (in video containers)
- **Subtitles**: SRT, ASS, SSA, VTT (auto-detected)
- **Artwork**: JPG, PNG, WEBP (poster.jpg, backdrop.jpg, fanart.jpg)

## 🎮 Usage

### Navigation
- **Arrow Keys**: Navigate interface
- **Enter/Space**: Select items, play/pause
- **Backspace/Escape**: Go back
- **F**: Toggle fullscreen
- **M**: Toggle mute
- **S**: Settings (when implemented)

### Interface
- **Home Screen**: Featured content, Continue Watching, Recently Added
- **Movies**: Browse movie library
- **TV Shows**: Browse TV series
- **Search**: Find content (when implemented)
- **Settings**: Configure player backend, UI preferences

### Drive Management
- Plug in any drive with Movies/TV Shows folders
- App automatically detects and scans new drives
- No configuration needed - just works

## 🔧 Troubleshooting

### "Drive not found" screen appears
- Ensure your drive is connected and mounted
- Check that it contains `Movies/` and/or `TV Shows/` folders at the root
- Try the **Rescan** button in the empty state
- On Linux: Check `/media/` or `/run/media/` mount points

### Playback issues
- Ensure MPV/ffmpeg binaries are available (included in portable bundles)
- Check Settings for player backend selection
- Try switching to libVLC backend if available
- Verify video file is not corrupted

### App won't start
- **Windows**: Try running as Administrator
- **macOS**: Check System Preferences > Security & Privacy for unsigned app warning
- **Linux**: Ensure execute permissions on launcher script: `chmod +x run-h-player.sh`

### Build Issues

#### "Cannot create symbolic link" during packaging
This occurs on Windows when electron-builder tries to extract macOS code signing tools.

**Solution**: Use manual packaging instead:
```bash
npm run pack:manual
```
This creates a working package without electron-builder's cross-platform code signing.

#### Missing dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Permission errors on Windows
- Run terminal as Administrator
- Or use manual packaging: `npm run pack:manual`

## 🛠️ For Developers

### Building from Source

```bash
# Clone repository
git clone <repository-url>
cd VideoPlayer2

# Setup (downloads dependencies and binaries)
npm run setup

# Development
npm run dev

# Build for distribution
npm run build

# Create portable bundles
npm run pack:portable

# Alternative: Manual packaging (if electron-builder fails)
npm run pack:manual
# This creates H-Player-Manual-X.X.X.zip with electron.exe placeholder
```
```

### Project Structure

```
src/
├── main/                 # Electron main process
│   ├── database/         # SQLite with migrations
│   ├── ipc/             # Secure IPC handlers
│   ├── player/          # MPV/libVLC backends
│   └── services/        # Drive scanner, media indexer
├── preload/             # Context bridge
├── renderer/            # React UI with Tailwind
└── shared/              # TypeScript types & constants

vendor/                  # Platform-specific binaries
build/                   # Icons and branding assets
scripts/                 # Build and setup scripts
```

### Technology Stack

- **Electron 27+** - Cross-platform desktop framework
- **React 18** - Component-based UI
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first styling
- **SQLite** - Local database
- **MPV** - High-performance playback
- **Vite** - Fast development builds

## 📋 System Requirements

- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+ or equivalent
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for app, plus space for media
- **Display**: 1080p minimum, 4K supported
- **Input**: Keyboard required, remote/gamepad optional

## 🔒 Privacy & Security

- **No internet connection required**
- **No data collection or telemetry**
- **All media playback is local**
- **Secure IPC with context isolation**
- **No node integration in renderer**
- **Input validation on all IPC calls**

## 📄 License

[Add your license information]

## 🙏 Acknowledgments

- **MPV** - Exceptional video playback engine
- **Electron** - Cross-platform desktop framework
- **SQLite** - Reliable embedded database
- **FFmpeg** - Multimedia processing foundation
- **React & TypeScript** - Modern development experience