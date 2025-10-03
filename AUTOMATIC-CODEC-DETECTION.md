# Automatic Codec Detection & Seamless Player Switching

## Overview

Hoser Video now automatically detects audio codecs in video files and seamlessly switches between HTML5 and external player based on codec support.

## How It Works

### 1. Codec Detection
When you play a video, the app automatically:
- Uses `ffprobe` to detect the audio codec
- Checks if Chromium/Electron supports the codec
- Decides which player to use

### 2. Player Selection Logic

**Chromium-Supported Codecs** (HTML5 Player):
- ✅ AAC
- ✅ MP3
- ✅ Opus
- ✅ Vorbis

**Unsupported Codecs** (External Player - MPV/VLC):
- ❌ AC3 (Dolby Digital)
- ❌ E-AC3 (Dolby Digital Plus)
- ❌ DTS
- ❌ TrueHD
- ❌ FLAC
- ❌ PCM (uncompressed)

### 3. Seamless Integration

**The user experience is identical regardless of which player is used:**

✅ **Progress Tracking**: Both players save/load progress to the same database  
✅ **Restart Function**: Works for both HTML5 and external player  
✅ **Database Operations**: Deleting from UI removes all associated data  
✅ **Resume Playback**: Starts where you left off, regardless of player  
✅ **UI Consistency**: Same controls and interface

### 4. External Player Requirements

For unsupported codecs, you need an external player installed:

**Recommended**: MPV (https://mpv.io/)
- Download and install MPV
- Add MPV to your system PATH, or
- Place `mpv.exe` in the app directory

**Alternative**: VLC Player
- Install VLC Media Player
- Ensure it's in your system PATH

## Technical Implementation

### Codec Detection Service
File: `src/main/services/CodecDetector.ts`

- Uses `ffprobe` to inspect video file metadata
- Returns codec information and compatibility status
- Caches results for performance

### IPC Handler Integration
File: `src/main/ipc/ipc-handler.ts`

When `player.start` is called:
1. Detect codecs automatically
2. If unsupported → launch external player
3. If supported → use HTML5 video element
4. Return player type to renderer

### Renderer Integration
File: `src/renderer/pages/PlayerPage.tsx`

- Receives player type from main process
- Renders appropriate player component
- Manages progress tracking for both player types
- Handles cleanup on component unmount

## Example Flow

### Supported Codec (AAC)
```
1. User clicks "Interstellar (2014).mp4"
2. App detects: audio=aac
3. Decision: ✅ Supported → HTML5
4. Video plays in app window
5. Progress saved to DB every 2 seconds
```

### Unsupported Codec (AC3)
```
1. User clicks "The Naked Gun (2025).mkv"
2. App detects: audio=ac3
3. Decision: ❌ Unsupported → External
4. MPV launches automatically
5. Progress tracked via MPV events
6. Same DB, same resume capability
```

## Benefits

1. **No User Configuration**: Automatic detection and switching
2. **Universal Codec Support**: Play ANY video format
3. **Consistent Experience**: Same UI and features regardless of player
4. **Database Integrity**: Single source of truth for all playback data
5. **Future-Proof**: Easy to add new codecs to supported list

## Troubleshooting

### "No external player found" error
- Install MPV or VLC
- Add to system PATH
- Restart the app

### ffprobe not found
- App will fallback to HTML5 (may have no audio for unsupported codecs)
- Install ffmpeg/ffprobe for full codec detection

### Progress not syncing
- Both players use the same database
- Check console logs for IPC progress save events
- Verify media ID matches in database

## Future Enhancements

- [ ] Automatic ffprobe bundling
- [ ] In-app codec transcoding option
- [ ] Codec information in media details
- [ ] User preference: always use external player
- [ ] Automatic MPV download/installation
