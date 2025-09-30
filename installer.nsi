; H Player Production Installer
; Creates a professional Windows installer from manual packaging

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; General Configuration
Name "H Player"
OutFile "H-Player-Setup-3.0.0.exe"
Unicode True
InstallDir "$PROGRAMFILES\H Player"
InstallDirRegKey HKCU "Software\H Player" ""
RequestExecutionLevel admin

; Modern UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "build\icons\256x256.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "build\icons\256x256.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "build\icons\256x256.bmp"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "1.2.0.0"
VIAddVersionKey "ProductName" "H Player"
VIAddVersionKey "CompanyName" "H Player Project"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2024 H Player Project"
VIAddVersionKey "FileVersion" "1.2.0.0"
VIAddVersionKey "ProductVersion" "1.2.0.0"
VIAddVersionKey "FileDescription" "H Player - Local Desktop Video Player"

; Installer Section
Section "H Player" SecApp
  SectionIn RO

  SetOutPath "$INSTDIR"

  ; Copy application files from manual packaging (includes FFmpeg DLLs)
  DetailPrint "Installing H Player..."
  File /r "dist-manual\H Player\*.*"

  ; Copy electron.exe from node_modules to main directory
  DetailPrint "Installing Electron runtime..."
  File "node_modules\electron\dist\electron.exe"

  ; Rename electron.exe to H Player.exe for better branding
  Rename "$INSTDIR\electron.exe" "$INSTDIR\H Player.exe"

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\H Player.lnk" "$INSTDIR\H Player.exe" "" "$INSTDIR\resources\app\build\icon.ico"

  ; Create start menu entries
  CreateDirectory "$SMPROGRAMS\H Player"
  CreateShortCut "$SMPROGRAMS\H Player\H Player.lnk" "$INSTDIR\H Player.exe" "" "$INSTDIR\resources\app\build\icon.ico"
  CreateShortCut "$SMPROGRAMS\H Player\Uninstall.lnk" "$INSTDIR\Uninstall.exe"

  ; Registry entries for Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "DisplayName" "H Player"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "QuietUninstallString" "$INSTDIR\Uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "DisplayIcon" "$INSTDIR\resources\app\build\icon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "Publisher" "H Player Project"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "DisplayVersion" "1.2.0"
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "EstimatedSize" "$0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "NoRepair" 1

  ; Store installation folder
  WriteRegStr HKCU "Software\H Player" "" $INSTDIR

SectionEnd

; Uninstaller Section
Section "Uninstall"

  ; Stop any running H Player processes
  DetailPrint "Stopping H Player processes..."
  nsExec::ExecToLog 'taskkill /f /im "H Player.exe" /t'
  nsExec::ExecToLog 'taskkill /f /im "electron.exe" /fi "WINDOWTITLE eq H Player" /t'

  ; Remove files
  DetailPrint "Removing application files..."
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  DetailPrint "Removing shortcuts..."
  Delete "$DESKTOP\H Player.lnk"
  RMDir /r "$SMPROGRAMS\H Player"

  ; Remove user data (optional - ask user)
  MessageBox MB_YESNO "Remove user data and settings?" IDNO skipUserData
  DetailPrint "Removing user data..."
  RMDir /r "$APPDATA\H Player"
  skipUserData:

  ; Remove registry entries
  DetailPrint "Cleaning up registry..."
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player"
  DeleteRegKey HKCU "Software\H Player"

SectionEnd