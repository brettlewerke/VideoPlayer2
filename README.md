# VideoPlayer2

A comprehensive cross-platform desktop media player built with Electron, React, TypeScript, and TailwindCSS. Designed for a ten-foot TV experience with keyboard, remote, and gamepad navigation support.

## Features

### 🎬 Local Media Library
- Automatic scanning of Movies and TV Shows folder structures
- Support for common video formats (MP4, MKV, AVI, MOV, etc.)
- Metadata extraction and artwork detection
- Continue watching and recently watched tracking
- SQLite database for fast local storage

### 🎮 Player Backends
- **MPV Player**: High-performance video playback with hardware acceleration
- **Mock Player**: Development and testing backend
- Swappable player architecture for future backends (libVLC, etc.)

### 🖥️ Cross-Platform Support
- Windows, macOS, and Linux compatibility
- Platform-specific drive detection and monitoring
- Native file system integration

### 🎯 Ten-Foot Interface
- Optimized for TV viewing distances
- Keyboard navigation (arrow keys, space, etc.)
- Remote control support
- Gamepad navigation ready
- Full-screen experience

### 🔒 Security First
- Secure IPC communication between processes
- Context isolation enabled
- No node integration in renderer
- Input validation and sanitization

## Technology Stack

- **Electron 27.1.0** - Cross-platform desktop framework
- **React 18.2.0** - UI library
- **TypeScript 5.2.2** - Type safety and development experience
- **TailwindCSS 3.3.5** - Utility-first CSS framework
- **better-sqlite3** - Local database with WAL mode
- **Vite 4.5.0** - Fast build tool for renderer process
- **MPV** - Media player backend

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── database/         # SQLite database management
│   ├── ipc/             # Inter-process communication
│   ├── player/          # Media player backends
│   └── services/        # Core services (drive manager, scanner)
├── preload/             # Secure preload script
├── renderer/            # React frontend (to be created)
└── shared/              # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VideoPlayer2
```

2. Install dependencies:
```bash
npm install
```

3. Development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Available Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run type-check` - TypeScript compilation check
- `npm run lint` - ESLint code checking
- `npm run test` - Run tests (when implemented)

## Media Organization

### Expected Folder Structure

```
Media/
├── Movies/
│   ├── Movie Title (2023)/
│   │   ├── Movie Title (2023).mkv
│   │   ├── poster.jpg
│   │   └── backdrop.jpg
│   └── Another Movie (2022)/
│       └── Another Movie (2022).mp4
└── TV Shows/
    ├── Show Name/
    │   ├── Season 1/
    │   │   ├── S01E01 - Episode Title.mkv
    │   │   └── S01E02 - Episode Title.mkv
    │   ├── Season 2/
    │   │   └── S02E01 - Episode Title.mkv
    │   ├── poster.jpg
    │   └── backdrop.jpg
    └── Another Show/
        ├── S01E01.mkv
        └── S01E02.mkv
```

### Supported File Formats

**Video**: MP4, MKV, AVI, MOV, WMV, FLV, M4V, 3GP
**Subtitles**: SRT, ASS, SSA, VTT (auto-detected)
**Artwork**: JPG, PNG, WEBP (poster.jpg, backdrop.jpg, fanart.jpg)

## Development

### Architecture Principles

1. **Security First**: All IPC communication is validated and sanitized
2. **Type Safety**: Comprehensive TypeScript coverage
3. **Separation of Concerns**: Clear boundaries between main/renderer processes
4. **Extensibility**: Plugin architecture for player backends
5. **Performance**: SQLite with WAL mode, efficient file scanning

### Key Components

- **DatabaseManager**: SQLite operations with migrations
- **DriveManager**: Cross-platform drive detection and monitoring
- **MediaScanner**: Intelligent media discovery and indexing
- **PlayerFactory**: Swappable media player backends
- **IPCHandler**: Secure communication layer

### Adding New Player Backends

1. Implement the `IPlayer` interface
2. Register with `PlayerFactory`
3. Add configuration options
4. Test cross-platform compatibility

## Configuration

Settings are stored in the SQLite database and include:

- Player backend selection
- Playback preferences
- UI customization
- Keyboard shortcuts
- Scan locations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure TypeScript compilation passes
6. Submit a pull request

## Roadmap

### Phase 1: Core Functionality (Current)
- [x] Project setup and architecture
- [x] Database schema and management
- [x] Media scanning and indexing
- [x] Player backend infrastructure
- [x] IPC communication layer
- [ ] React UI components
- [ ] Basic playback functionality

### Phase 2: Enhanced Features
- [ ] Subtitle support
- [ ] Multiple audio tracks
- [ ] Playlist management
- [ ] Search and filtering
- [ ] Settings interface

### Phase 3: Advanced Features
- [ ] Remote control support
- [ ] Gamepad navigation
- [ ] Metadata fetching (TMDB/TVDB)
- [ ] Hardware acceleration
- [ ] Network streaming

### Phase 4: Polish & Distribution
- [ ] Automated setup scripts
- [ ] Binary downloads
- [ ] Auto-updater
- [ ] Packaging for distribution

## License

[Add your license here]

## Acknowledgments

- MPV for excellent video playback
- Electron team for the framework
- React and TypeScript communities
- SQLite for reliable data storage