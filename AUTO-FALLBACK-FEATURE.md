# Automatic External Player Fallback Feature

## Overview
Implemented automatic detection and fallback to external player (MPV/VLC) when HTML5 video player encounters codec issues. This solves the problem where some videos have no audio or no video due to unsupported codecs.

## Problem Statement
- **The Naked Gun (2025).mkv**: Has video but no audio (unsupported audio codec)
- **The Matrix (1999).mp4**: Has audio but no video (unsupported video codec)
- Chromium/Electron HTML5 video only supports limited codecs (H.264, VP8, VP9 for video; AAC, MP3, Opus for audio)
- Many MKV files use AC3, DTS, or H.265 codecs which aren't supported

## Solution Implemented

### 1. Codec Detection Logic
The player now automatically detects when a video file has codec issues by monitoring:

**Video Stream Detection:**
- Checks if `videoWidth` and `videoHeight` are > 0
- If dimensions are 0 after metadata loads, video codec is unsupported

**Audio Stream Detection:**
- Uses `webkitAudioDecodedByteCount` (Chromium) to detect if audio is being decoded
- Uses `mozHasAudio` (Firefox) as fallback
- If audio bytes decoded = 0 after 2 seconds, audio codec is unsupported

### 2. Automatic Fallback
When codec issues are detected:

1. **Detection Phase** (2 seconds after `canplay` event):
   - Analyzes video dimensions
   - Checks audio decoding status
   - Logs comprehensive diagnostic information

2. **Fallback Phase**:
   - Pauses and clears HTML5 video
   - Saves current playback position
   - Calls external player with `forceExternal: true` flag
   - Shows user-friendly notification

3. **User Notification**:
   - "Codec not supported. Launching external player..."
   - "Playing in external player" (on success)
   - "External player not available" (on failure)

### 3. Smart IPC Handling
Modified the IPC handler to support two modes:

**Normal Mode** (`forceExternal: false` or undefined):
1. Try external player first
2. If unavailable, fallback to HTML5
3. Return appropriate player type to renderer

**Force External Mode** (`forceExternal: true`):
1. Only try external player
2. Throw error if external player unavailable
3. Used for codec fallback scenarios

## Files Modified

### `src/renderer/pages/PlayerPage.tsx`
- Added codec detection refs and state
- Implemented `fallbackToExternalPlayer()` function
- Added codec check timer with 2-second delay
- Added `canplay` event listener for codec validation
- Added fallback notification UI overlay
- Enhanced logging for codec diagnostics

### `src/main/ipc/ipc-handler.ts`
- Added `forceExternal` parameter to `handlePlayerStart`
- Supports forcing external player usage for fallback scenarios
- Prevents recursive fallback attempts

## How It Works

### Detection Timeline
```
Video loads → loadedmetadata → loadeddata → canplay
                                              ↓
                                    Start 2-second timer
                                              ↓
                                    Check codec support
                                              ↓
                              ┌─────────────┴─────────────┐
                              ↓                           ↓
                         All codecs OK            Codec issue detected
                              ↓                           ↓
                        Continue playing        Fallback to external
```

### Codec Check Logic
```javascript
hasVideo = videoWidth > 0 && videoHeight > 0
hasAudio = webkitAudioDecodedByteCount > 0 || mozHasAudio === true

if (hasValidDuration && readyState >= 1) {
  if (!hasVideo) → "No video codec support"
  if (!hasAudio) → "No audio codec support"
}
```

## User Experience

### Before This Feature
- User clicks play on The Naked Gun
- Video plays but with no sound
- User confused, no indication of issue
- Must manually choose external player

### After This Feature
- User clicks play on The Naked Gun
- Video starts loading in HTML5 player
- After 2 seconds, system detects no audio decoding
- User sees: "Codec not supported. Launching external player..."
- External player (MPV) launches automatically
- User sees: "Playing in external player"
- Playback continues seamlessly in MPV

## Diagnostic Logging

The feature provides comprehensive console logging:

```
[PlayerPage] 🎬 Media Track Analysis
  Video Path: D:/Movies/TheNakedGun (2025)/TheNakedGun (2025).mkv
  🎥 Video Tracks Count: 0
  🔊 Audio Tracks Count: 0
  📊 Video Element Properties: {...}
  🖼️ Video Dimensions: {videoWidth: 1916, videoHeight: 800, hasVideo: true}
  🔊 Audio Decoded Bytes (WebKit): 0 ← NO AUDIO!
  
[PlayerPage] 🔍 Codec check: {
  hasVideo: true,
  hasAudio: false, ← PROBLEM DETECTED
  hasValidDuration: true,
  webkitAudioDecodedByteCount: 0
}

[PlayerPage] ⚠️ Codec issue detected: No audio stream detected
[PlayerPage] 🔄 Codec issue detected, falling back to external player
[PlayerPage] Launching external player with position: 0
[PlayerPage] ✅ Successfully switched to external player
```

## Prevention of Issues

### No Infinite Loops
- Uses `hasAttemptedFallbackRef` to prevent multiple fallback attempts
- Resets when video path changes
- Only one fallback attempt per video

### No False Positives
- 2-second delay allows video to fully initialize
- Checks `readyState >= 1` to ensure metadata is loaded
- Validates duration is not NaN or 0
- Only triggers on actual codec failures

### Graceful Degradation
- If external player not available, shows clear message
- User can still try to watch (even without audio/video)
- Progress saving continues to work
- UI remains functional

## Future Enhancements

### Potential Improvements:
1. **Pre-scan codec validation** - Check file codecs before attempting playback
2. **Codec database** - Build database of which files need external player
3. **User preferences** - Allow users to prefer external player for certain codecs
4. **Real-time codec info** - Show codec information in video details
5. **Transcoding option** - Offer to transcode files to compatible formats

## Testing Recommendations

### Test Cases:
1. ✅ Play file with unsupported audio codec (AC3, DTS)
2. ✅ Play file with unsupported video codec (H.265)
3. ✅ Play file with supported codecs (H.264 + AAC)
4. ✅ Test with external player available
5. ✅ Test with external player NOT available
6. ✅ Test position resume after fallback
7. ✅ Test progress saving after fallback

### Files to Test With:
- **The Naked Gun (2025).mkv** - Expected: Auto-fallback to external (no audio codec)
- **The Matrix (1999).mp4** - Expected: Auto-fallback to external (no video codec)
- **Inception (2010).mp4** - Expected: Play in HTML5 (supported codecs)
- **Interstellar (2014).mp4** - Expected: Play in HTML5 (supported codecs)

## Configuration

No configuration needed - feature works automatically. However, users should ensure:

1. **External player installed**: MPV is recommended
2. **Vendor manifest**: Check `vendor/manifest.json` for MPV path
3. **System PATH**: Or install MPV to system PATH

## Known Limitations

1. **Detection delay**: 2-second delay before fallback (intentional to avoid false positives)
2. **Browser API limitations**: `videoTracks` and `audioTracks` APIs not fully supported in Chromium
3. **Codec detection heuristics**: Uses browser-specific properties that may vary
4. **External player required**: Feature only works if external player is available

## Related Documentation

- See `AUDIO-VIDEO-DEBUGGING.md` for logging details
- See `src/shared/player.ts` for player interface
- See `src/main/player/player-factory.ts` for player backend creation
