; H Player Production Installer
; Creates a professional Windows installer from manual packaging

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; General Configuration
Name "Hoser Video"
OutFile "Hoser-Video-Setup-2.2.1.exe"
Unicode True
InstallDir "$PROGRAMFILES\Hoser Video"
InstallDirRegKey HKCU "Software\Hoser Video" ""
RequestExecutionLevel admin

; Modern UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"

; Detailed progress bar
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"
!define MUI_INSTFILESPAGE_COLORS "FFFFFF 000000"

; Variables for user choices
Var CreateDesktopShortcut
Var CreateStartMenuShortcut
Var PinToTaskbar

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY

; Custom page for shortcuts
Page custom ShortcutsPage ShortcutsPageLeave

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "2.2.1.0"
VIAddVersionKey "ProductName" "Hoser Video"
VIAddVersionKey "CompanyName" "Hoser Video Project"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2024 Hoser Video Project"
VIAddVersionKey "FileVersion" "2.2.1.0"
VIAddVersionKey "ProductVersion" "2.2.1.0"
VIAddVersionKey "FileDescription" "Hoser Video - Local Desktop Video Player"

; Custom page for shortcuts selection
Function ShortcutsPage
  !insertmacro MUI_HEADER_TEXT "Additional Icons" "Select where you would like Hoser Video shortcuts to be created"
  
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  
  ; Desktop shortcut checkbox
  ${NSD_CreateCheckbox} 0 10u 100% 12u "Create a &desktop shortcut"
  Pop $1
  ${NSD_SetState} $1 ${BST_CHECKED}
  
  ; Start Menu shortcut checkbox  
  ${NSD_CreateCheckbox} 0 30u 100% 12u "Create a &Start Menu shortcut"
  Pop $2
  ${NSD_SetState} $2 ${BST_CHECKED}
  
  ; Taskbar pin checkbox  
  ${NSD_CreateCheckbox} 0 50u 100% 12u "Pin to &taskbar"
  Pop $3
  ${NSD_SetState} $3 ${BST_CHECKED}
  
  nsDialogs::Show
FunctionEnd

Function ShortcutsPageLeave
  ${NSD_GetState} $1 $CreateDesktopShortcut
  ${NSD_GetState} $2 $CreateStartMenuShortcut
  ${NSD_GetState} $3 $PinToTaskbar
FunctionEnd

; Installer Section
Section "H Player" SecApp
  SectionIn RO

  SetOutPath "$INSTDIR"
  
  ; Enable detailed file extraction logging with filenames
  SetDetailsPrint listonly
  
  DetailPrint "Installing H Player..."
  DetailPrint " "
  DetailPrint "Copying application files..."

  ; Copy all files from electron-builder's win-unpacked directory
  ; This shows each file being copied in the details
  File /r "dist-packages\win-unpacked\*.*"
  
  DetailPrint " "
  DetailPrint "Configuring application..."

  ; Create uninstaller
  DetailPrint "Creating uninstaller..."
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Create desktop shortcut if selected
  ${If} $CreateDesktopShortcut == ${BST_CHECKED}
    DetailPrint "Creating desktop shortcut..."
    CreateShortCut "$DESKTOP\Hoser Video.lnk" "$INSTDIR\Hoser Video.exe"
  ${EndIf}

  ; Create start menu entries if selected
  ${If} $CreateStartMenuShortcut == ${BST_CHECKED}
    DetailPrint "Creating Start Menu shortcuts..."
    CreateDirectory "$SMPROGRAMS\Hoser Video"
    CreateShortCut "$SMPROGRAMS\Hoser Video\Hoser Video.lnk" "$INSTDIR\Hoser Video.exe"
    CreateShortCut "$SMPROGRAMS\Hoser Video\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  ${Else}
    ; Always create uninstaller shortcut in a minimal location
    CreateDirectory "$SMPROGRAMS\Hoser Video"
    CreateShortCut "$SMPROGRAMS\Hoser Video\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  ${EndIf}
  
  ; Pin to taskbar if selected (Windows 10/11)
  ${If} $PinToTaskbar == ${BST_CHECKED}
    DetailPrint "Pinning to taskbar..."
    nsExec::Exec 'powershell -WindowStyle Hidden -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\"$env:APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar\\Hoser Video.lnk\"); $s.TargetPath=\"$INSTDIR\\Hoser Video.exe\"; $s.Save()"'
  ${EndIf}

  ; Registry entries for Add/Remove Programs
  DetailPrint "Registering with Windows..."
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "DisplayName" "Hoser Video"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "QuietUninstallString" "$INSTDIR\Uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "DisplayIcon" "$INSTDIR\\Hoser Video.exe,0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "Publisher" "Hoser Video Project"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Hoser Video" "DisplayVersion" "2.2.0"
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "EstimatedSize" "$0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "NoRepair" 1

  ; Store installation folder
  WriteRegStr HKCU "Software\Hoser Video" "" $INSTDIR
  
  DetailPrint " "
  DetailPrint "Installation completed successfully!"

SectionEnd

; Uninstaller Section
Section "Uninstall"
  
  ; Enable detailed logging for uninstall with filenames
  SetDetailsPrint listonly

  ; Stop any running Hoser Video processes
  DetailPrint "Stopping Hoser Video processes..."
  nsExec::Exec 'taskkill /f /im "Hoser Video.exe" /t'
  nsExec::Exec 'taskkill /f /im "electron.exe" /fi "WINDOWTITLE eq Hoser Video" /t'

  ; Remove shortcuts first
  DetailPrint "Removing desktop shortcut..."
  Delete "$DESKTOP\Hoser Video.lnk"
  
  DetailPrint "Removing Start Menu shortcuts..."
  Delete "$SMPROGRAMS\Hoser Video\Hoser Video.lnk"
  Delete "$SMPROGRAMS\Hoser Video\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Hoser Video"
  
  ; Remove taskbar pin
  DetailPrint "Removing taskbar shortcut..."
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Hoser Video.lnk"

  ; Remove application files
  DetailPrint " "
  DetailPrint "Removing application files..."
  Delete "$INSTDIR\Uninstall.exe"
  
  ; Remove all files and folders
  RMDir /r "$INSTDIR"

  ; Remove .hoser-video database folders from all drives
  DetailPrint " "
  DetailPrint "Removing database folders from all drives..."
  nsExec::Exec 'powershell -WindowStyle Hidden -Command "Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Root -match ''^[A-Z]:\\$$'' } | ForEach-Object { $path = Join-Path $_.Root ''.hoser-video''; if (Test-Path $path) { Remove-Item $path -Recurse -Force } }"'

  ; Remove user data (optional - ask user)
  MessageBox MB_YESNO "Remove user data and settings?" IDNO skipUserData
  DetailPrint "Removing user data..."
  RMDir /r "$APPDATA\Hoser Video"
  skipUserData:

  ; Remove registry entries
  DetailPrint "Cleaning up registry..."
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video"
  DeleteRegKey HKCU "Software\Hoser Video"
  
  DetailPrint " "
  DetailPrint "Uninstallation completed successfully!"

SectionEnd