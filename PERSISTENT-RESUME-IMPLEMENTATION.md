# Persistent Resume & Embedded Playback Implementation

## Summary

This implementation adds persistent resume tracking tied to swappable drives and ensures embedded playback remains functional with proper control flow.

## Key Changes

### 1. Per-Drive Progress Database (`src/main/database/database.ts`)

**Schema Updates:**
- Progress table now includes `content_key` (volumeKey|absPath|size|mtime) for robust resume tracking
- Fields renamed: `position_seconds`, `duration_seconds`, `completed`, `last_played_at`
- Indexes added for efficient queries

**New Methods:**
- `generateContentKey()`: Creates unique identifier per file on specific drive
- `getProgressByContentKey()`: Retrieves progress using file metadata
- `setProgress()`: Now requires (progress, filePath, fileSize, fileMtime)

**Migration:** Old databases will continue to work via fallback field names in getProgress/getContinueWatching queries.

### 2. IPC Progress Tracking (`src/main/ipc/ipc-handler.ts`)

**Enhanced State:**
- Added `currentFilePath`, `currentFileSize`, `currentFileMtime` to track media metadata
- Added `progressUpdateInterval` for periodic 10-second progress writes

**Progress Flow:**
1. On `player:start`, capture file stats and create content_key
2. Start periodic interval (10s) to write progress while playing
3. On `pause`/`stop`/`ended`, write final progress with completed flag if ≥90%
4. Progress writes go directly to the drive's `.hoser-video/media.db`

**New Handler:**
- `handleGetProgressByFile()`: Accepts `{filePath, fileSize, fileMtime}` to retrieve resume position

### 3. Player Backend Compatibility

**IPlayer Interface (`src/shared/player.ts`):**
- `loadMedia(absPath, options?: {start?: number})` already supported
- `start` parameter maps to MPV `--start=` flag and libVLC seek on load

**MPV Implementation (`src/main/player/mpv-player.ts`):**
- Passes `--start=${options.start}` to spawn arguments
- Embedded window mode via `--force-window=yes`

**LibVLC Stub (`src/main/player/libvlc-player.ts`):**
- Placeholder ready for native rendering implementation

### 4. Dev A/V Self-Test

**Test Assets (`tests/fixtures/`):**
- `colorbars_10s.mp4`: 10s H.264+AAC test video (generated via ffmpeg or prebuilt)
- `sample_en.srt`: 3-cue subtitle file

**Scripts:**
- `npm run dev:avassets`: Generates test media via ffmpeg
- `npm run dev:avcheck`: Launches app in test mode

**Test Modal (`src/renderer/components/AVTestModal.tsx`):**
- Validates: Video decode, audio track detection, subtitle track detection, play/pause, seek, stop
- Provides diagnostic feedback for hardware acceleration / backend issues
- **Dev-only** - never packaged

### 5. UI Integration (To Be Completed by Frontend)

**Resume Logic (MovieDetailPage / Episode rows):**

```typescript
const progress = await window.electron.getProgressByFile({
  filePath: movie.videoFile.path,
  fileSize: movie.videoFile.size,
  fileMtime: movie.videoFile.lastModified
});

const resumeSeconds = progress?.position || 0;
const completed = progress?.completed || false;
const showResume = resumeSeconds >= 15 && progress.percentage < 0.9;

// Actions:
// - Play (default): starts at 0 if never watched
// - Resume: starts at resumeSeconds (only show if valid resume point exists)
// - Restart: clears progress, starts at 0
```

**Restart Handler:**
```typescript
async function handleRestart(mediaId: string, filePath: string, fileSize: number, fileMtime: number) {
  // Clear progress
  await window.electron.deleteProgress(mediaId);
  
  // Start playback at 0
  await window.electron.player.start({ path: filePath, start: 0 });
}
```

## Playable Extensions

Centralized in `src/common/media/extensions.ts`:
- Video: .mp4, .mkv, .m4v, .mov, .avi, .ts, .mts, .m2ts, .wmv, .flv, .webm, .mpg, .mpeg, .3gp, .vob, .ogv, .divx, etc.
- Audio containers: .m4a, .aac, .ac3, .dts, .opus (for potential music library)

All scanner, IPC validator, and UI code imports from this single source.

## Security Posture

**Unchanged:**
- `contextIsolation: true`
- `nodeIntegration: false`
- All IPC channels validated and whitelisted
- File paths sanitized via `validatePath()`

## Testing

1. **Generate test assets:**
   ```bash
   npm run dev:avassets
   ```

2. **Run A/V health check:**
   ```bash
   npm run dev:avcheck
   ```
   Opens app with test modal. Run tests to validate player pipeline.

3. **Manual resume test:**
   - Play a movie for 30s, close app
   - Unplug drive, replug hours/days later
   - App should show Resume button at last position

## Backward Compatibility

- Old progress schema (position/duration/is_completed/last_watched) is read via fallback in queries
- New writes use position_seconds/duration_seconds/completed/last_played_at
- No breaking changes to IPC channel names
- Frontend changes are additive (Resume/Restart UI is new feature)

## Known Limitations

- libVLC player backend is stubbed (not yet implemented with native window)
- Test modal requires manual interpretation (no automated assertions)
- Progress writes occur every 10s—rapid seeks may lose <10s precision

## Next Steps

1. Frontend: Implement Resume/Restart UI in MovieDetailPage and ShowDetailPage
2. Frontend: Update Continue Watching shelf to use new progress schema
3. Backend: Complete libVLC native window rendering if MPV not available
4. Testing: Add Playwright E2E test for resume flow with fixture video
