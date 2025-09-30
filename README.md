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

H Player can be run in multiple ways depending on your needs. Choose the method that works best for you:

### 📊 Distribution Methods Comparison

| Method | Platform | Installation? | Shortcuts? | Uninstaller? | Admin Rights? | Best For |
|--------|----------|---------------|------------|--------------|---------------|----------|
| **NSIS Installer** | Windows | ✅ Yes | ✅ Desktop + Start Menu | ✅ Yes | ✅ Required | Permanent installation |
| **Portable Windows** | Windows | ❌ No | ⚠️ Auto-created on first run | ❌ No | ❌ Not needed | USB drives, no admin |
| **DMG** | macOS | ✅ Yes (drag-drop) | ✅ Launchpad | ✅ Yes (trash) | ❌ Not needed | Standard Mac install |
| **Portable macOS** | macOS | ❌ No | ❌ Manual | ❌ No | ❌ Not needed | Testing, temporary use |
| **AppImage** | Linux | ❌ No | ❌ Manual | ❌ No | ❌ Not needed | Universal Linux |
| **DEB Package** | Linux | ✅ Yes | ✅ App menu | ✅ Yes (apt) | ✅ Required | Debian/Ubuntu |
| **Portable Linux** | Linux | ❌ No | ❌ Manual | ❌ No | ❌ Not needed | Portable use |

### Option 1: Full Installation (Recommended)

**Best for**: Permanent installation with shortcuts and uninstaller

#### Windows - NSIS Installer
1. **Download**: `H-Player-Setup-1.2.0.exe`
2. **Install**: 
   - Run the installer executable
   - Follow the installation wizard
   - Choose installation directory (default: `C:\Program Files\H Player`)
   - Installation creates Desktop and Start Menu shortcuts
   - Appears in Windows Settings > Apps & features
3. **Launch**: Double-click Desktop shortcut or find in Start Menu
4. **Uninstall**: Via Windows Settings or Start Menu uninstaller

#### macOS - DMG Package
1. **Download**: `H-Player-1.2.0.dmg` (choose x64 or arm64 for Apple Silicon)
2. **Install**:
   - Open the DMG file
   - Drag H Player to the Applications folder
   - Eject the DMG
3. **Launch**: Find H Player in Launchpad or Applications folder
4. **Uninstall**: Drag H Player to Trash from Applications folder

#### Linux - DEB Package (Debian/Ubuntu)
1. **Download**: `h-player-1.2.0-x64.deb`
2. **Install**: 
   ```bash
   sudo dpkg -i h-player-1.2.0-x64.deb
   # Or double-click in file manager
   ```
3. **Launch**: Find H Player in application menu
4. **Uninstall**: 
   ```bash
   sudo apt remove h-player
   ```

#### Linux - AppImage (Universal)
1. **Download**: `h-player-1.2.0-x64.AppImage`
2. **Run**:
   ```bash
   chmod +x h-player-1.2.0-x64.AppImage
   ./h-player-1.2.0-x64.AppImage
   ```
3. No installation needed - single executable file

### Option 2: Portable Bundle

**Best for**: USB drives, temporary use, or no admin rights

#### Windows Portable
1. **Download**: `H-Player-Portable-win32-x64.zip`
2. **Extract**: Unzip to any folder (USB drive, Desktop, Documents, etc.)
3. **Run**: Double-click `Run-H-Player.ps1`
   - First run automatically creates a desktop shortcut (optional)
   - No installation or admin rights required
4. **Remove**: Simply delete the extracted folder

#### macOS Portable
1. **Download**: `H-Player-Portable-darwin-x64.tar.gz` or `darwin-arm64.tar.gz`
2. **Extract**: Untar to any folder
3. **Run**: Double-click `Run-H-Player.command`
4. **Remove**: Delete the extracted folder

#### Linux Portable
1. **Download**: `H-Player-Portable-linux-x64.tar.gz`
2. **Extract**: 
   ```bash
   tar -xzf H-Player-Portable-linux-x64.tar.gz
   cd H-Player-Portable-linux-x64
   ```
3. **Run**: 
   ```bash
   ./run-h-player.sh
   ```
4. **Remove**: Delete the extracted folder

### Option 3: Development Mode

**Best for**: Developers contributing to the project

```bash
# Clone repository
git clone <repository-url>
cd VideoPlayer2

# Install dependencies
npm install

# Setup (downloads vendor binaries)
npm run setup

# Run in development mode
npm run dev
```

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

# Install dependencies
npm install

# Setup (downloads vendor binaries like MPV/ffmpeg)
npm run setup

# Run in development mode (hot-reload enabled)
npm run dev
```

### Building Distribution Packages

H Player supports multiple distribution formats. Choose based on your target platform:

#### Development Commands
```bash
# Run development server (Vite + Electron)
npm run dev

# Build renderer (React/Vite)
npm run build:renderer

# Build main process (TypeScript)
npm run build:main

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

#### Production Build Commands

**All Platforms (using electron-builder)**
```bash
# Build for current platform only
npm run build              # Windows: Creates NSIS installer
npm run dist               # Alternative: same as build

# Build for ALL platforms (Windows, macOS, Linux)
npm run dist:all           # Requires platform-specific dependencies
```

**Windows-Specific**
```bash
# NSIS Installer (recommended)
npm run build              # Creates H-Player-Setup-1.2.0.exe
                          # - Full installation wizard
                          # - Desktop & Start Menu shortcuts
                          # - Add/Remove Programs integration
                          # - Professional uninstaller

# Portable Bundle
npm run pack:portable      # Creates H-Player-Portable-win32-x64.zip
                          # - No installation needed
                          # - Run from any folder/USB drive
                          # - Auto-creates desktop shortcut

# Manual Packaging (fallback)
npm run pack:manual        # Creates H-Player-Manual-1.2.0.zip
                          # - Alternative to electron-builder
                          # - Useful if electron-builder fails
                          # - Includes FFmpeg DLLs directly
```

**macOS-Specific**
```bash
npm run dist               # Creates .dmg installer
npm run pack:portable      # Creates portable .tar.gz bundle
```

**Linux-Specific**
```bash
npm run dist               # Creates AppImage and DEB packages
npm run pack:portable      # Creates portable .tar.gz bundle
```

#### Output Locations

All distribution packages are created in:
- `dist-packages/` - electron-builder outputs (NSIS, DMG, AppImage, DEB)
- `dist-portable/` - Portable bundles (ZIP, tar.gz)
- `dist-manual/` - Manual packaging output
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

## � Releases & Versioning

H Player uses [semantic versioning](https://semver.org/) and automated releases.

### Automatic Version Bumping

Each merge to `main` automatically:
- Analyzes commit messages using [Conventional Commits](https://conventionalcommits.org/)
- Bumps version number (patch/minor/major)
- Generates changelog
- Creates GitHub release with distribution packages

### Easy Commit Helper

Use the built-in commit helper for properly formatted commits:

```bash
# Interactive commit helper
npm run commit feat "add new feature description"
npm run commit fix "resolve bug description"
npm run commit docs "update documentation"

# Or use the script directly
node scripts/commit.js feat "add dark mode toggle"
```

### Manual Release Commands

```bash
# Automatic release (based on commits)
npm run release

# Force specific version bump
npm run release:patch    # 1.0.0 → 1.0.1
npm run release:minor    # 1.0.0 → 1.1.0
npm run release:major    # 1.0.0 → 2.0.0
```

## �📋 System Requirements

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