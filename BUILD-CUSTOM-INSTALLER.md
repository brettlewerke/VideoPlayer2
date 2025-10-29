# Building the Custom Installer with Shortcut Options

## Why We Need a Custom Installer

The electron-builder's default NSIS installer doesn't support custom pages for choosing shortcuts. The custom `installer.nsi` file we created allows users to:

1. ✅ Choose installation location
2. ✅ **Select shortcut options** (Desktop, Start Menu, Taskbar)
3. ✅ See detailed file-by-file installation progress

## Installation Steps

### 1. Install NSIS (if not already installed)

Download and install NSIS from: https://nsis.sourceforge.io/Download

Or use Chocolatey:
```powershell
choco install nsis -y
```

### 2. Build the Electron App

```powershell
npm run build
```

This creates `dist-packages\win-unpacked\` with all application files.

### 3. Compile the Custom Installer

```powershell
& "C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
```

Or if NSIS is in PATH:
```powershell
makensis installer.nsi
```

This creates: `Hoser-Video-Setup-2.1.1.exe`

## What the Installer Will Show

### Installation Flow:

1. **Welcome Page** - Introduction
2. **License Agreement** - MIT License from LICENSE file
3. **Choose Installation Location** - Default: `C:\Program Files\Hoser Video`
4. **🆕 Additional Icons Page** - NEW CUSTOM PAGE with:
   - ☑ Create a desktop shortcut (checked by default)
   - ☑ Create a Start Menu shortcut (checked by default)  
   - ☑ Pin to taskbar (checked by default)
   - Back/Next buttons to navigate
5. **Installing Files** - File-by-file progress display
6. **Completion** - Finish page

## Features of Custom Installer

### User Choices:
- **Desktop Shortcut**: Creates `Desktop\Hoser Video.lnk` (optional)
- **Start Menu**: Creates `Start Menu\Hoser Video\Hoser Video.lnk` (optional)
- **Taskbar Pin**: Pins to Windows taskbar (optional)
- **Uninstaller**: Always created in Start Menu for easy uninstall

### Progress Display:
```
Installing Hoser Video...

Copying application files...
extract: Hoser Video.exe
extract: chrome_100_percent.pak
extract: resources\app.asar
extract: resources\vendor\ffprobe\ffprobe.exe
... (1500+ files with smooth progress bar)

Configuring application...
Creating uninstaller...
Creating desktop shortcut...
Creating Start Menu shortcuts...
Pinning to taskbar...
Registering with Windows...

Installation completed successfully!
```

## Icon Handling

The shortcuts use the embedded icon from `Hoser Video.exe` automatically:
- No separate icon file needed
- Works even if icon files are moved
- Consistent appearance across all shortcuts

## Registry Keys Created

- **Uninstall Entry**: `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video`
- **App Settings**: `HKCU\Software\Hoser Video`

## File Size Comparison

- **Old (x64 + ia32)**: ~3.3 GB in dist-packages
- **New (x64 only)**: ~1.6 GB in dist-packages
- **Installer Size**: ~650 MB (compressed)

## Troubleshooting

### "Cannot find makensis.exe"
- Install NSIS or add it to PATH
- Use full path: `& "C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi`

### "Cannot find dist-packages\win-unpacked"
- Run `npm run build` first
- Make sure build completed successfully

### Shortcuts page doesn't appear
- Make sure `!include "nsDialogs.nsh"` is in the installer.nsi
- Verify the `Page custom ShortcutsPage ShortcutsPageLeave` line exists
- Check NSIS compilation output for errors

## Quick Test

After building installer, test it:

```powershell
# Run the installer
.\Hoser-Video-Setup-2.1.1.exe

# Check all three shortcut options are presented
# Try unchecking one and verify it's not created
```

## Navigation Flow

```
[Welcome] 
    ↓ Next
[License]
    ↓ I Agree
[Choose Location]
    ↓ Next
[🆕 Shortcut Options] ← NEW PAGE
    ↑ Back (to location)
    ↓ Install
[Installing Files]
    ↓ (automatic)
[Finish]
```

Users can now:
- Go from Location → Shortcuts → Install
- Or go back: Shortcuts → Location
- Choose exactly which shortcuts they want
