# Quick Start: Testing Per-Drive Databases + Real Playback

## Prerequisites
- At least one external drive with video files (.mp4, .mkv, .avi, etc.)
- Windows system with mpv installed (optional, app includes vendor folder)

## Test Steps

### 1. Clean Start (Optional)
To test from scratch:
```powershell
# Delete old app data
Remove-Item -Recurse -Force "$env:APPDATA\hoser-video" -ErrorAction SilentlyContinue
```

### 2. Launch Development Build
```powershell
npm run dev
```

### 3. What to Observe

#### On First Launch:
```
[Database] Settings database initialized
[Migration] Fresh installation, no migration needed
[Database] Opened database for drive: C:\
[Database] Opened database for drive: D:\   (for each connected drive)
```

#### During Media Scan:
```
[Database] Inserted movie: <Movie Name>
[Database] Inserted show: <Show Name>
```

#### Check File System:
- `C:\Users\Brett\AppData\Roaming\hoser-video\database\settings.db` ✓
- `D:\.hoser-video\media.db` (for drive D:) ✓
- `E:\.hoser-video\media.db` (for drive E:) ✓

### 4. Test Real Playback

#### Using Dev Script:
```powershell
npm run dev:play "D:\Movies\Avatar.mkv"
```

#### Through UI:
1. Navigate to Movies or Shows
2. Click on a title
3. Observe:
   - Loading overlay appears
   - mpv window opens
   - Video plays
4. Close mpv
5. Re-open same title
6. Should resume from last position

### 5. Test Progress Tracking

1. Play a video for 30 seconds
2. Close mpv
3. Check database:
```sql
-- In D:\.hoser-video\media.db
SELECT * FROM playback_progress;
```
4. Re-launch app
5. Go to "Continue Watching" section
6. Verify video appears with progress

### 6. Test Drive Swapping

1. Scan drive D: with media
2. Play a video, watch for 1 minute
3. Safely eject drive D:
4. Verify video disappears from library
5. Re-connect drive D:
6. Verify video re-appears
7. Play video - should resume from 1 minute mark

### 7. Test Multiple Drives

1. Connect drives D:, E:, F: each with media
2. Scan all drives
3. Verify `.hoser-video` folder on each:
   - `D:\.hoser-video\media.db`
   - `E:\.hoser-video\media.db`
   - `F:\.hoser-video\media.db`
4. Play videos from different drives
5. Verify progress tracked independently

## Troubleshooting

### Issue: mpv not found
**Solution**: 
- Install mpv: `winget install mpv`
- Or place mpv.exe in `vendor/win32/x64/mpv.exe`

### Issue: No .hoser-video folder created
**Cause**: No media files found during scan
**Solution**: 
- Ensure drive has supported video files (.mp4, .mkv, .avi, .webm, .flv, .mov, .wmv, .m4v, .mpg, .mpeg, .ogv)
- Check file permissions

### Issue: Database errors
**Solution**: 
- Close app
- Delete `$env:APPDATA\hoser-video`
- Restart app (fresh database creation)

### Issue: Progress not saving
**Check**: 
1. Watch video for at least 5-10 seconds
2. Verify progress polling logs:
   ```
   [Player] Progress update: position=15.5, duration=120.0
   [Database] Setting progress...
   ```

## Verification Commands

### Check Settings Database:
```powershell
# View settings database
sqlite3 "$env:APPDATA\hoser-video\database\settings.db" "SELECT * FROM drives;"
```

### Check Drive Database:
```powershell
# View drive D: database
sqlite3 "D:\.hoser-video\media.db" ".tables"
sqlite3 "D:\.hoser-video\media.db" "SELECT title FROM movies LIMIT 5;"
sqlite3 "D:\.hoser-video\media.db" "SELECT * FROM playback_progress;"
```

### Monitor Logs:
Watch console for:
- `[Database]` - Database operations
- `[Player]` - Playback events
- `[IPC]` - Communication between main/renderer
- `[mpv]` - mpv player status

## Success Criteria

✅ **Database Creation**
- Settings DB in app userData
- Media DBs on each drive

✅ **Media Discovery**
- Movies/Shows appear in library
- Metadata populated

✅ **Real Playback**
- mpv spawns successfully
- Video plays
- No mock player messages

✅ **Progress Tracking**
- Position saved every 5-10s
- Resume works after restart
- Continue Watching shows in-progress items

✅ **Drive Swapping**
- Media disappears when drive ejected
- Media re-appears when drive reconnected
- Progress persists across reconnections

## Performance Benchmarks

Expected times:
- App launch: < 3 seconds
- Drive scan (1000 videos): 5-30 seconds
- Database query (all movies): < 100ms per drive
- Playback start: < 2 seconds

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 📝 Document any issues
3. 🎯 Test edge cases (network drives, read-only media, etc.)
4. 🚀 Package for distribution: `npm run build`
5. 📦 Test installed version from `dist-packages\`

---

**Ready to test!** 🎬

Start with: `npm run dev`
