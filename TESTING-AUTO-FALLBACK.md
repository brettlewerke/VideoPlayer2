# Testing the Automatic Fallback Feature

## Quick Start

1. **Run the built application**:
   - Navigate to `dist-packages\win-unpacked\`
   - Run `Hoser Video.exe`
   - Or install via `dist-packages\Hoser-Video-Setup-1.2.0.exe`

2. **Open Developer Tools**:
   - In the app, press `F12` or `Ctrl+Shift+I`
   - Or use menu: View > Toggle Developer Tools
   - Switch to the Console tab

3. **Test with problematic videos**:
   - Navigate to Movies
   - Click on "TheNakedGun (2025)"
   - Click Resume or Play

## What to Expect

### TheNakedGun (2025) - No Audio Codec

**Expected Console Output:**
```
[PlayerPage] 🎬 Video path set: D:/Movies/TheNakedGun (2025)/TheNakedGun (2025).mkv
[PlayerPage] Setting up HTML5 video
[PlayerPage] 📺 Video metadata loaded
[PlayerPage] 🎬 Media Track Analysis
  🎥 Video Tracks Count: 0
  🔊 Audio Tracks Count: 0
  🖼️ Video Dimensions: {videoWidth: 1916, videoHeight: 800, hasVideo: true}
  🔊 Audio Decoded Bytes (WebKit): 0 ← NO AUDIO!

[PlayerPage] 🎬 Can play event - scheduling codec check
[PlayerPage] 🔍 Codec check: {
  hasVideo: true,
  hasAudio: false, ← DETECTED!
  ...
}
[PlayerPage] ⚠️ Codec issue detected: No audio stream detected
[PlayerPage] 🔄 Codec issue detected, falling back to external player
[PlayerPage] Launching external player with position: 0
```

**Expected UI Behavior:**
1. Video starts loading
2. After ~2 seconds, blue notification appears: "Codec not supported. Launching external player..."
3. One of two outcomes:
   - **If MPV installed**: External MPV window opens, notification changes to "Playing in external player"
   - **If MPV not installed**: Notification shows "External player not available. Video may not play correctly."

### The Matrix (1999) - No Video Codec

**Expected Console Output:**
```
[PlayerPage] 🎬 Media Track Analysis
  🖼️ Video Dimensions: {videoWidth: 0, videoHeight: 0, hasVideo: false}
  
[PlayerPage] 🔍 Codec check: {
  hasVideo: false, ← DETECTED!
  hasAudio: true,
  ...
}
[PlayerPage] ⚠️ Codec issue detected: No video stream detected
[PlayerPage] 🔄 Codec issue detected, falling back to external player
```

**Expected UI Behavior:**
Same as above - automatic fallback to external player

### Inception/Interstellar - Supported Codecs

**Expected Console Output:**
```
[PlayerPage] 🎬 Media Track Analysis
  🖼️ Video Dimensions: {videoWidth: 1920, videoHeight: 1080, hasVideo: true}
  🔊 Audio Decoded Bytes (WebKit): [some number > 0]
  
[PlayerPage] 🔍 Codec check: {
  hasVideo: true,
  hasAudio: true, ← ALL GOOD!
  ...
}
```

**Expected UI Behavior:**
- Video plays normally in HTML5 player
- No fallback notification
- Smooth playback with controls

## Troubleshooting

### "External player not available" Message

**Problem**: External player (MPV) is not installed or not found

**Solutions**:
1. **Install MPV manually**:
   - Download from https://mpv.io/
   - Install to `C:\Program Files\mpv\`
   - Or add mpv.exe to system PATH

2. **Check vendor folder**:
   ```powershell
   ls vendor/win32/
   ```
   - Should contain `mpv.exe`
   - Check `vendor/manifest.json` for path

3. **Verify in app settings**:
   - Go to Settings page
   - Check "Player Backend" setting
   - Should show MPV as available

### Video plays but with issues

**If you still have no audio/video**:
1. Check that fallback actually triggered:
   - Look for "🔄 Codec issue detected" in console
   - Look for blue notification on screen

2. Check timing:
   - Fallback triggers after 2-second delay
   - Be patient and wait for notification

3. Check if fallback was blocked:
   - Look for "hasAttemptedFallbackRef.current" in logs
   - May need to reload video

### False positives (good videos fallback)

**Unlikely but possible**:
1. Check codec check logs in console
2. Verify `webkitAudioDecodedByteCount` value
3. May need to increase delay from 2 seconds to 3-4 seconds

## Manual Testing Checklist

- [ ] TheNakedGun plays in external player (auto-fallback)
- [ ] The Matrix plays in external player (auto-fallback)
- [ ] Inception plays in HTML5 (no fallback)
- [ ] Interstellar plays in HTML5 (no fallback)
- [ ] Notification appears when falling back
- [ ] Notification disappears after 3 seconds
- [ ] Progress position transfers to external player
- [ ] No infinite fallback loops
- [ ] Dev console shows diagnostic logs
- [ ] Can still use controls in HTML5 mode
- [ ] Back button works from player

## Advanced Testing

### Test without external player:
1. Rename `vendor/win32/mpv.exe` to `mpv.exe.bak`
2. Restart app
3. Try playing TheNakedGun
4. Should see: "External player not available"
5. Video will play but without audio

### Test fallback timing:
1. Watch console during playback start
2. Note timestamps of:
   - "loadedmetadata" 
   - "canplay"
   - "Codec check"
   - Should be ~2 seconds between canplay and check

### Test progress resume:
1. Start TheNakedGun, let it play for 30 seconds
2. Go back to home
3. Click "Continue Watching"
4. Click TheNakedGun again
5. Should resume at 30 seconds in external player

## Performance Notes

- **Detection overhead**: Minimal - single timer, one-time check
- **Memory impact**: Negligible - few refs and state variables  
- **CPU impact**: None - passive monitoring, no polling
- **Startup time**: No impact - detection happens after load

## Known Behaviors

1. **2-second delay is intentional**:
   - Prevents false positives
   - Allows video to fully initialize
   - User barely notices in practice

2. **Video briefly appears before fallback**:
   - Normal - HTML5 video starts first
   - Then codec check happens
   - Then fallback triggers
   - User sees smooth transition

3. **External player is separate window**:
   - MPV opens its own window
   - App shows "external player" placeholder
   - This is expected behavior
   - Progress still tracked in app

## Success Criteria

✅ **Feature is working if**:
- Videos with codec issues automatically switch to external player
- User sees clear notification about what's happening
- Videos with supported codecs play normally in HTML5
- No errors in console (other than expected external player messages)
- Progress tracking continues to work
- User experience is seamless

❌ **Feature needs debugging if**:
- Videos with supported codecs trigger fallback
- Videos with unsupported codecs don't trigger fallback
- Infinite fallback loops occur
- Notifications don't appear
- External player doesn't launch when it should
