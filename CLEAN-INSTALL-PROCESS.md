# Hoser Video Clean Install & Uninstall Process

## Version: 3.2.0

## Clean Install Process

When you run the installer, it performs the following cleanup steps **BEFORE** installing the new version:

### 1. Process Cleanup
- Terminates any running `Hoser Video.exe` processes
- Terminates any Electron processes with "Hoser Video" window title
- Waits 1 second to ensure processes are fully terminated

### 2. Shortcut Removal
- **Desktop**: `%USERPROFILE%\Desktop\Hoser Video.lnk`
- **Start Menu**: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Hoser Video\*.lnk`
- **Taskbar**: `%APPDATA%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Hoser Video.lnk`

### 3. Previous Installation Removal
- **Program Files**: `%PROGRAMFILES%\Hoser Video\*.*` (all files and subdirectories)

### 4. Database Cleanup (ALL DRIVES)
- Scans all drives (C:, D:, E:, Z:, etc.)
- Removes `.hoser-video` folder from the root of each drive
- This includes all media metadata and scan results

### 5. User Data Cleanup
- **Roaming**: `%APPDATA%\hoser-video\*.*`
  - Application settings database
  - Electron cache and preferences
- **Local**: `%LOCALAPPDATA%\hoser-video\*.*`
  - Local application data

### 6. Registry Cleanup
- **Uninstall Key**: `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video`
- **User Preferences**: `HKCU\Software\Hoser Video`

---

## Uninstall Process

When you uninstall Hoser Video:

### Automatic Removal
1. Terminates running processes
2. Removes all shortcuts (Desktop, Start Menu, Taskbar)
3. Removes application files from Program Files
4. Removes `.hoser-video` folders from ALL drives
5. Removes registry entries

### Optional (User Prompt)
- **"Remove user data and settings?"**
  - If **YES**: Removes `%APPDATA%\hoser-video` (settings database, cache, preferences)
  - If **NO**: Keeps user settings for potential reinstall

---

## Manual Cleanup Script

If you need to manually clean up database folders, run:

```powershell
.\scripts\cleanup-hoser-databases.ps1
```

This script:
- Scans all drives for `.hoser-video` folders
- Shows folder sizes before deletion
- Provides detailed progress and summary
- Can be run independently of the installer

---

## File Locations Reference

| Type | Location | Contents |
|------|----------|----------|
| **Application** | `C:\Program Files\Hoser Video\` | Installed application files |
| **User Settings** | `C:\Users\[User]\AppData\Roaming\hoser-video\` | Settings DB, cache, preferences |
| **Drive Databases** | `X:\.hoser-video\` | Media metadata per drive |
| **Desktop Shortcut** | `C:\Users\[User]\Desktop\Hoser Video.lnk` | Desktop launcher |
| **Start Menu** | `C:\Users\[User]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Hoser Video\` | Start menu items |
| **Taskbar Pin** | `C:\Users\[User]\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\` | Taskbar shortcut |

---

## Benefits of Clean Install

✅ **No leftover files** from previous versions  
✅ **Fresh database** - no corrupted or outdated metadata  
✅ **Clean settings** - default configuration  
✅ **No registry pollution** - clean Windows registry  
✅ **Consistent behavior** - same as first-time install  
✅ **Update-safe** - prevents version conflicts  

---

## Notes

- The installer requires **Administrator privileges** to access all drives and registry
- All cleanup operations use PowerShell for drive scanning (Windows 7+)
- The process is automatic and requires no user intervention during install
- Shortcut creation is optional and can be customized during installation
