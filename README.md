# Hoser Video

A beautiful, local desktop media player for Movies & TV Shows on plugged-in drives. No internet connection required - just plug in your drive and start watching.

![Hoser Video Logo](assets/brand/dragon-logo.svg)

## ✨ Features

- **📱 Netflix-like Interface**: Modern, green-and-black themed UI optimized for TV viewing
- **## 📦 Releases & Versioning

Hoser Video uses [semantic versioning](https://semver.org/) and automated releases.ocal Media Library**: Automatic scanning of Movies and TV Shows folders
- **🎬 Hardware-Accelerated Playback**: MPV backend with optional libVLC support
- **🔌 Drive Detection**: Automatic detection of Windows drives, macOS volumes, and Linux mounts
- **📺 Ten-Foot Experience**: Keyboard navigation, remote control ready
- **🏠 Offline First**: No internet required, no data collection
- **🔒 Secure**: Context isolation, no node integration, secure IPC
- **📦 Portable**: Run from any folder without installation

## 🚀 Quick Start

Hoser Video can be run in multiple ways depending on your needs. Choose the method that works best for you:

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
1. **Download**: `Hoser-Video-Setup-x.x.x.exe`
2. **Install**: 
   - Run the installer executable
   - Follow the installation wizard
   - Choose installation directory (default: `C:\Program Files\Hoser Video`)
   - Installation creates Desktop and Start Menu shortcuts
   - Appears in Windows Settings > Apps & features
3. **Launch**: Double-click Desktop shortcut or find in Start Menu
4. **Uninstall**: Via Windows Settings or Start Menu uninstaller

#### macOS - DMG Package
1. **Download**: `Hoser-Video-x.x.x.dmg` (choose x64 or arm64 for Apple Silicon)
2. **Install**:
   - Open the DMG file
   - Drag Hoser Video to the Applications folder
   - Eject the DMG
3. **Launch**: Find Hoser Video in Launchpad or Applications folder
4. **Uninstall**: Drag Hoser Video to Trash from Applications folder

#### Linux - DEB Package (Debian/Ubuntu)
1. **Download**: `hoser-video-x.x.x-x64.deb`
2. **Install**: 
   ```bash
   sudo dpkg -i hoser-video-x.x.x-x64.deb
   # Or double-click in file manager
   ```
3. **Launch**: Find Hoser Video in application menu
4. **Uninstall**: 
   ```bash
   sudo apt remove hoser-video
   ```

#### Linux - AppImage (Universal)
1. **Download**: `hoser-video-x.x.x-x64.AppImage`
2. **Run**:
   ```bash
   chmod +x hoser-video-x.x.x-x64.AppImage
   ./hoser-video-x.x.x-x64.AppImage
   ```
3. No installation needed - single executable file

### Option 2: Portable Bundle

**Best for**: USB drives, temporary use, or no admin rights

#### Windows Portable
1. **Download**: `Hoser-Video-Portable-win32-x64.zip`
2. **Extract**: Unzip to any folder (USB drive, Desktop, Documents, etc.)
3. **Run**: Double-click `Run-Hoser-Video.ps1`
   - First run automatically creates a desktop shortcut (optional)
   - No installation or admin rights required
4. **Remove**: Simply delete the extracted folder

#### macOS Portable
1. **Download**: `Hoser-Video-Portable-darwin-x64.tar.gz` or `darwin-arm64.tar.gz`
2. **Extract**: Untar to any folder
3. **Run**: Double-click `Run-Hoser-Video.command`
4. **Remove**: Delete the extracted folder

#### Linux Portable
1. **Download**: `Hoser-Video-Portable-linux-x64.tar.gz`
2. **Extract**: 
   ```bash
   tar -xzf Hoser-Video-Portable-linux-x64.tar.gz
   cd Hoser-Video-Portable-linux-x64
   ```
3. **Run**: 
   ```bash
   ./run-hoser-video.sh
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

Hoser Video automatically scans for media in `Movies/` and `TV Shows/` folders on attached drives.

### Expected Structure

```
Any Drive/
├── .hoser-video/                      # Auto-created database & cache folder
│   ├── media.db                       # Media library database
│   └── posters/                       # Downloaded movie/show posters
│       ├── Movie_Title_2023/
│       │   └── poster.jpg
│       └── Show_Name/
│           └── poster.jpg
├── Movies/
│   ├── Movie Title (2023)/
│   │   ├── Movie Title (2023).mkv
│   │   ├── poster.jpg                 # Optional local artwork
│   │   └── backdrop.jpg               # Optional local backdrop
│   └── Another Movie (2022)/
│       └── Another Movie (2022).mp4
└── TV Shows/
    ├── Show Name/
    │   ├── Season 1/
    │   │   ├── S01E01 - Episode Title.mkv
    │   │   └── S01E02 - Episode Title.mkv
    │   ├── poster.jpg                 # Optional local artwork
    │   └── backdrop.jpg               # Optional local backdrop
    └── Another Show/
        ├── S01E01.mkv
        └── S01E02.mkv
```

**Note:** 
- The `.hoser-video` folder is automatically created on each drive
- Posters are automatically downloaded from OMDb API and stored in `.hoser-video/posters/`
- Each movie/show gets its own folder inside `posters/` for organization
- Local artwork (poster.jpg, backdrop.jpg) in movie/show folders is still supported as a fallback
- The `.hoser-video` folder also contains the SQLite database for that drive's media

### The `.hoser-video` Folder

Hoser Video creates a hidden `.hoser-video` folder on each drive to store:

- **`media.db`** - SQLite database containing metadata for movies and shows on this drive
- **`posters/`** - Automatically downloaded movie and TV show posters from OMDb API
  - Each movie/show gets its own subfolder (e.g., `Inception_2010/poster.jpg`)
  - Posters are cached locally to avoid re-downloading
  - Only fetches posters when missing (respects OMDb's 1,000 requests/day limit)

This folder is automatically managed and can be safely deleted if you want to reset the database or clear cached posters. The app will recreate it and rescan your media on the next launch.

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
- **Linux**: Ensure execute permissions on launcher script: `chmod +x run-hoser-video.sh`

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

Hoser Video supports multiple distribution formats. Choose based on your target platform:

## 🛠️ Development & Build Commands

### NPM Commands Reference

#### Setup & Installation

```bash
# First-time setup - installs dependencies and downloads binaries
npm install                # Runs postinstall automatically (downloads MPV, FFmpeg, FFprobe)

# Manual setup (if needed)
npm run setup              # Interactive setup wizard

# Rebuild native modules for Electron
npm run rebuild            # Rebuilds better-sqlite3 for Electron
```

#### Development Commands

```bash
# Start development mode (hot reload)
npm run dev                # Starts ONLY Vite dev server (safer, less resource-intensive)
npm run dev:full           # Starts both renderer (Vite) AND Electron (resource-intensive)
npm run dev:renderer       # Start only Vite dev server (port 3000)
npm run dev:main           # Compile TypeScript + start Electron main process
npm run dev:electron       # Start Electron only (requires TypeScript already compiled)

# Test playback with a video file
npm run dev:play           # Interactive playback test
npm run dev:play <path>    # Test specific video file
```

#### Building & Packaging

```bash
# Clean old builds (automatically runs before build)
npm run clean              # Remove all build artifacts and old packages

# Build everything (renderer + main + package)
npm run build              # Full production build with installer (auto-cleans first)

# Build individual components
npm run build:renderer     # Build React frontend only (Vite)
npm run build:main         # Build Electron main process only (TypeScript)
npm run package            # Package into executable (requires build first)

# Build with version update (combined command)
npm run build:version 1.5.0  # Updates version AND builds (auto-cleans first)
npm run set-version 1.5.0    # Updates version numbers only (no build)

# Distribution builds
npm run dist               # Build for current platform (same as build)
npm run dist:all           # Build for Windows + macOS + Linux
```

#### Platform-Specific Packaging

```bash
# Windows
npm run build              # Creates NSIS installer (Hoser-Video-Setup-X.X.X.exe)
npm run pack:manual        # Creates manual package (fallback method)

# Cross-platform portable bundles
npm run pack:portable      # Creates portable ZIP/tar.gz for current platform
```

#### Testing & Quality

```bash
# Unit tests
npm run test               # Run Jest tests once
npm run test:watch         # Run tests in watch mode

# End-to-end tests
npm run test:e2e           # Run Playwright E2E tests

# Code quality
npm run lint               # Check code for errors
npm run lint:fix           # Auto-fix linting issues
npm run type-check         # TypeScript type checking (no output)

# Smoke test
npm run smoke-test         # Quick functionality test
```

#### Versioning & Releases

```bash
# Automatic version bumping (analyzes git commits)
npm run release            # Auto-bump based on commit messages
npm run release:patch      # Bump patch version (1.0.0 → 1.0.1)
npm run release:minor      # Bump minor version (1.0.0 → 1.1.0)
npm run release:major      # Bump major version (1.0.0 → 2.0.0)

# Manual version update
npm run set-version 1.5.0  # Update version in all files
npm run build:version 1.5.0  # Update version AND build

# Commit helper (Conventional Commits format)
npm run commit feat "new feature"     # feat: new feature
npm run commit fix "bug fix"          # fix: bug fix
npm run commit docs "documentation"   # docs: documentation
```

#### Utilities

```bash
# Icon generation
npm run generate-icons     # Generate app icons from source
```

### Quick Reference Table

| Task | Command | Output |
|------|---------|--------|
| **Start dev mode** | `npm run dev` | Opens Electron with hot reload |
| **Clean old builds** | `npm run clean` | Removes all build artifacts |
| **Build installer** | `npm run build` | `dist-packages/Hoser-Video-Setup-X.X.X.exe` |
| **Update version & build** | `npm run build:version 1.5.0` | Updates all version numbers + builds |
| **Just update version** | `npm run set-version 1.5.0` | Updates version numbers only |
| **Run tests** | `npm run test` | Test results in console |
| **Check code quality** | `npm run lint` | Shows lint errors |
| **Fix code style** | `npm run lint:fix` | Auto-fixes formatting |
| **Type check** | `npm run type-check` | TypeScript validation |
| **Test a video** | `npm run dev:play path/to/video.mp4` | Opens video in player |

### Common Workflows

#### Building a New Version

```bash
# Method 1: All-in-one (recommended)
npm run build:version 1.5.0

# Method 2: Step-by-step
npm run set-version 1.5.0
npm run build
```

#### Development Workflow

```bash
# Start development
npm run dev

# In another terminal, run tests
npm run test:watch

# Fix linting issues
npm run lint:fix

# Commit changes
npm run commit feat "add new feature"
```

#### Release Workflow

```bash
# Make your changes and commit
npm run commit feat "add amazing feature"

# Bump version and generate changelog
npm run release

# Build the release
npm run build

# Push to GitHub
git push --follow-tags origin main
```

### Output Locations

After building, find your packages in:

```
dist-packages/
├── Hoser-Video-Setup-X.X.X.exe        # Windows NSIS installer
├── Hoser-Video-Setup-X.X.X.exe.blockmap
├── latest.yml                          # Auto-update metadata
├── win-unpacked/                       # Unpacked Windows build
│   └── Hoser Video.exe                # Run directly without install
└── win-ia32-unpacked/                 # 32-bit build (if built)

dist-portable/
└── Hoser-Video-Portable-win32-x64.zip # Portable bundle

dist-manual/
└── Hoser-Video-Manual-X.X.X.zip       # Manual packaging output
```

### Build Requirements

- **Node.js** 18+ and npm 9+
- **TypeScript** 5.2+
- **Electron** 27+
- **Windows Build Tools** (Windows only)
  - Visual Studio Build Tools or Visual Studio 2019+
- **macOS Xcode Command Line Tools** (macOS only)
- **build-essential** (Linux only)

### Environment Variables

```bash
# Vite dev server port (default: 3000)
VITE_DEV_PORT=3001

# Node environment
NODE_ENV=development  # or production

# Electron debugging
ELECTRON_ENABLE_LOGGING=1
```
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