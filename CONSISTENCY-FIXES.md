# Consistency Fixes Report
**Date:** October 28, 2025  
**Project:** Hoser Video (VideoPlayer2)

## Summary
Scanned workspace for naming inconsistencies and filepath issues that could prevent video playback.

## Critical Issues Fixed ✅

### 1. **Corrupted TypeScript Definitions** (FIXED)
**File:** `src/renderer/types/global.d.ts`  
**Issue:** File had severely corrupted content with duplicate and garbled type definitions  
**Impact:** Could break TypeScript compilation and prevent proper type checking  
**Status:** ✅ **FIXED** - Completely rewrote the file with clean, proper type definitions

### 2. **Incorrect API Call Signature in PlayerPage** (FIXED)
**File:** `src/renderer/pages/PlayerPage.tsx` (line 134)  
**Issue:** `fallbackToExternalPlayer()` was calling `player.start()` with wrong parameters:
```typescript
// ❌ WRONG - passing single object
player.start({
  path: videoPath,
  forceExternal: true,
  startOptions: { position, autoplay }
})

// ✅ CORRECT - separate path and options
player.start(videoPath, {
  start: currentPosition,
  forceExternal: true
})
```
**Impact:** This would cause the external player fallback to fail, preventing videos with unsupported codecs from playing  
**Status:** ✅ **FIXED** - Corrected to match the actual API signature from preload.ts

### 3. **Incorrect File URL Format for HTML5 Video** (FIXED)
**File:** `src/renderer/pages/PlayerPage.tsx` (line 598)  
**Issue:** Video element was using incorrect file URL format:
```typescript
// ❌ WRONG - doesn't work on Windows
<video src={`file://${videoPath}`} />
// Example: file://C:\Users\video.mp4 (invalid - backslashes and missing slash)

// ✅ CORRECT - proper file URL with forward slashes
<video src={getVideoUrl(videoPath)} />
// Example: file:///C:/Users/video.mp4 (valid - 3 slashes, forward slashes)
```
**Impact:** HTML5 video player would fail to load video files on Windows, showing no error but video wouldn't play  
**Status:** ✅ **FIXED** - Added `getVideoUrl()` helper function to properly convert Windows paths to file:// URLs

### 4. **Security Restriction: File Protocol Blocked** (FIXED)
**Files:** `src/main/main.ts` (lines 693-730), `src/renderer/pages/PlayerPage.tsx`  
**Issue:** Chromium/Electron blocks direct `file://` access to local files due to security policies:
```
Not allowed to load local resource: file:///D:/Movies/video.mp4
MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check
```
**Solution:** Registered custom `media://` protocol handler in main process to securely serve video files:
```typescript
// In main.ts - Register custom protocol
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { stream: true, ... } }
]);

protocol.registerFileProtocol('media', (request, callback) => {
  const filePath = decodeURIComponent(request.url.replace('media:///', ''));
  callback({ path: filePath });
});

// In PlayerPage.tsx - Use media:// instead of file://
<video src="media:///D:/Movies/video.mp4" />
```
**Impact:** This was the PRIMARY cause of videos not playing - browser security blocked all local file access  
**Status:** ✅ **FIXED** - Custom protocol handler bypasses security restrictions while maintaining security

## Naming Conventions Found (Consistent)

### Application Names
- **Package Name:** `hoser-video` (in package.json)
- **Product Name:** `Hoser Video` (user-facing)
- **App ID:** `com.example.hoservideo`
- **API Names:** Both `HPlayerAPI` and `HoserVideoAPI` exposed (for backward compatibility)

### Database Locations
- **App Data:** `%AppData%/hoser-video/` (migrated from old `h-player`)
- **Drive Data:** `<Drive>:\.hoser-video\` (per-drive databases)
- **Database File:** `videoplayer.db` (consistent across all locations)

### API Usage Patterns
All code correctly uses:
- `window.HPlayerAPI` - Main API object
- `window.HoserVideoAPI` - Alias pointing to same object
- Both are properly exposed in preload.ts via `contextBridge`

## File Path Patterns (All Consistent)

### Posters
- `<Drive>:\.hoser-video\posters\<MovieOrShowName>\poster.jpg`

### Databases  
- User settings: `%AppData%/hoser-video/database/videoplayer.db`
- Per-drive media: `<Drive>:\.hoser-video\media.db`

### Executables
- Windows: `Hoser Video.exe`
- Scripts: `Run-Hoser-Video.ps1`, `Run-Hoser-Video.command`, `run-hoser-video.sh`

## Player API Verification ✅

### Player Start Method
**Correct Signature:**
```typescript
player.start(path: string, options?: { start?: number, forceExternal?: boolean })
```

**Usage in Code:**
- ✅ MovieDetailPage.tsx - Uses `api.player.start(path, { start: position })`
- ✅ ShowDetailPage.tsx - Uses `api.player.start(path, { start: 0 })` or with progress
- ✅ PlayerPage.tsx - Uses `api.player.start(videoPath, { start: position, forceExternal: true })` (FIXED)
- ✅ useAppStore.ts - Uses `api.player.start(path, { start: progress.position })`

**IPC Handler:**
- ✅ Properly handles `PLAYER_START` channel
- ✅ Extracts `path`, `start`, and `forceExternal` from payload
- ✅ Performs codec detection
- ✅ Falls back to HTML5 if external player unavailable

## Migration Paths (Handled Correctly)

The app properly migrates from old naming:
```typescript
// In main.ts
const oldDataDir = app.getPath('userData').replace('hoser-video', 'h-player');
const newDataDir = app.getPath('userData'); // Will be 'hoser-video'
```

## No Issues Found ✅

1. ✅ Database filename consistent (`videoplayer.db` everywhere)
2. ✅ Drive folder naming consistent (`.hoser-video` everywhere)
3. ✅ API exposed correctly (both `HPlayerAPI` and `HoserVideoAPI`)
4. ✅ Player methods properly defined in preload.ts
5. ✅ IPC channels properly mapped
6. ✅ All file paths use proper separators
7. ✅ No broken import paths detected

## Recommendations

### Video Playback Debugging
If videos still don't play, check these areas:

1. **Console Logs** - Look for:
   - `[IPC] Codec detection result:`
   - `[IPC] Player start requested:`
   - `[MovieDetail] Player.start result:`

2. **External Player** - Verify MPV installation:
   ```powershell
   Test-Path "vendor/mpv/win32-x64/mpv.exe"
   ```

3. **File Permissions** - Ensure app can read video files:
   ```powershell
   Get-Acl "path\to\video.mp4"
   ```

4. **Codec Detection** - Run the codec check script:
   ```powershell
   node scripts/check-codec-support.js
   ```

5. **HTML5 Fallback** - Check browser DevTools console for errors when using HTML5 player

### Code Quality
- Consider consolidating to single API name (`HPlayerAPI` recommended)
- Add TypeScript strict mode checks
- Add unit tests for IPC handlers
- Document codec detection behavior

## Conclusion

✅ **FOUR Critical bugs fixed:**
1. **Corrupted `global.d.ts`** - Completely rewritten with proper type definitions
2. **Wrong API call in PlayerPage** - Fixed `player.start()` to use correct signature  
3. **Invalid file:// URL format** - Fixed Windows path conversion for HTML5 video element
4. **🔥 Security blocked file:// protocol** - Added custom `media://` protocol to bypass Chromium security restrictions

✅ **No naming inconsistencies** found that would prevent video playback  
✅ **All APIs properly connected** between preload, IPC handlers, and renderer  

### Root Cause of "Video Not Playing"
The video player wasn't working because **Chromium's security policy blocks direct `file://` access**. This is a standard security feature in modern browsers and Electron apps. The error `Media load rejected by URL safety check` prevented ANY video from loading, regardless of codec support.

**The fix:** Custom `media://` protocol handler that securely serves files through the main process, bypassing the security restriction.

After these fixes, videos should now:
- ✅ Load correctly using the custom `media://` protocol
- ✅ Stream properly with seeking support
- ✅ Fall back to external player (MPV) when codecs are unsupported
- ✅ Show proper error messages if external player is unavailable

### Testing the Fix
1. **Restart the app** (the protocol handler is registered at startup)
2. Try playing any video - you should see in DevTools:
   ```
   [Protocol] Serving media: D:\Movies\video.mp4
   [PlayerPage] 📝 Media protocol URL: media:///D:/Movies/video.mp4
   ```
3. Video should start playing immediately

### If Videos Still Don't Play
If videos still don't play after these fixes, check:
1. **Browser DevTools Console** - Look for video loading errors
2. **Main Process Logs** - Check for codec detection messages
3. **MPV Installation** - Verify `vendor/mpv/win32-x64/mpv.exe` exists
4. **File Permissions** - Ensure the app can read video files
5. **Video Format** - Try with a standard H.264+AAC MP4 file first
