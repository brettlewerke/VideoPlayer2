# Audio/Video Debugging Logging

## Overview
Added comprehensive logging to track audio and video streams in the HTML5 video player to help diagnose issues where some videos have no sound (The Naked Gun) or no video (The Matrix).

## Changes Made

### File: `src/renderer/pages/PlayerPage.tsx`

#### 1. Video Path Logging
Added a useEffect hook that logs when the video path changes:
- Logs the actual video path
- Logs the expected `file://` protocol URL that will be used

#### 2. Media Track Analysis Function (`logMediaTracks`)
Created a comprehensive logging function that checks and reports:

**Video Track Information:**
- Number of video tracks detected
- For each video track:
  - Track ID
  - Track kind
  - Track label
  - Track language
  - Whether track is selected
- Warning if no video tracks detected

**Audio Track Information:**
- Number of audio tracks detected
- For each audio track:
  - Track ID
  - Track kind
  - Track label
  - Track language
  - Whether track is enabled
- Warning if no audio tracks detected

**Video Element Properties:**
- Duration
- Video dimensions (width/height)
- Ready state
- Network state
- Current source URL
- Mute status
- Volume level
- Paused state

**Video/Audio Detection:**
- Checks if video has non-zero dimensions (indicates video stream present)
- Checks browser-specific audio detection properties:
  - `mozHasAudio` (Firefox)
  - `webkitAudioDecodedByteCount` (Chrome/Edge)

#### 3. Event Listeners Added
The logging function is called at three critical points in video loading:
- **loadedmetadata**: When video metadata (duration, dimensions, tracks) is loaded
- **loadeddata**: When video data is loaded and first frame can be rendered
- **canplay**: When video is ready to start playing

## How to Use

1. **Open Developer Tools** in the app (View > Toggle Developer Tools)
2. **Play a video** that has issues
3. **Check the Console** for the detailed media track analysis

### What to Look For

The console will show grouped logs like:
```
[PlayerPage] 🎬 Media Track Analysis
  Video Path: D:\Movies\The Matrix (1999)\The Matrix (1999).mp4
  🎥 Video Tracks Count: 0 or more
  ⚠️ NO VIDEO TRACKS DETECTED (or API not supported)
  🔊 Audio Tracks Count: 0 or more
  ⚠️ NO AUDIO TRACKS DETECTED (or API not supported)
  📊 Video Element Properties: { ... }
  🖼️ Video Dimensions: { videoWidth: 0, videoHeight: 0, hasVideo: false }
  📁 Media Source: file://...
```

### Diagnosing Issues

**No Video (like The Matrix):**
- Check if `videoWidth` and `videoHeight` are 0
- Check if video tracks count is 0
- Check if `hasVideo` is false

**No Audio (like The Naked Gun):**
- Check if audio tracks count is 0
- Check if `mozHasAudio` is false (Firefox)
- Check if `webkitAudioDecodedByteCount` is 0 (Chrome/Edge)

## Possible Issues and Solutions

### If No Tracks Are Detected at All
- The video file might be using a codec not supported by Chromium/Electron
- The file might be corrupted
- The file path might be incorrect

### Common Codec Issues
- **MKV files**: May contain codecs not natively supported by HTML5 video
- **H.265/HEVC**: Not supported in standard Chromium builds
- **Proprietary audio codecs**: Some audio formats require additional codecs

### Recommended Actions Based on Logs

1. **If videoWidth/videoHeight are 0**: The video codec is likely not supported
2. **If no audio tracks detected**: The audio codec is likely not supported
3. **If file can't be loaded**: Check file permissions and path encoding

## Next Steps

After gathering this diagnostic information, you can:
1. Identify which videos have codec issues
2. Re-encode problematic videos with compatible codecs (H.264 video, AAC audio)
3. Consider implementing external player support for incompatible formats
4. Add codec validation during library scanning

## Supported Formats

HTML5 video in Electron/Chromium typically supports:
- **Video**: H.264, VP8, VP9
- **Audio**: AAC, MP3, Opus, Vorbis
- **Containers**: MP4, WebM

Unsupported formats may need:
- External player (VLC, MPV)
- Transcoding/re-encoding
- Additional codec libraries
