; H Player Installer Script
; This script creates an installer for H Player with uninstall support

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; General Configuration
Name "H Player"
OutFile "H-Player-Setup-1.1.0.exe"
Unicode True
InstallDir "$PROGRAMFILES\H Player"
InstallDirRegKey HKCU "Software\H Player" ""
RequestExecutionLevel admin

; Modern UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "..\build\icon.ico"
!define MUI_UNICON "..\build\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "..\build\icons\256x256.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "..\build\icons\256x256.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "..\build\icons\256x256.bmp"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
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
VIProductVersion "1.1.0.0"
VIAddVersionKey "ProductName" "H Player"
VIAddVersionKey "CompanyName" "H Player Project"
VIAddVersionKey "FileVersion" "1.1.0.0"
VIAddVersionKey "ProductVersion" "1.1.0.0"
VIAddVersionKey "FileDescription" "H Player - Local Desktop Video Player"

; Installer Section
Section "H Player" SecApp
  SectionIn RO

  SetOutPath "$INSTDIR"

  ; Copy application files
  DetailPrint "Installing H Player..."
  File /r "..\dist-manual\H Player\*.*"

  ; Copy electron.exe (assuming it's in the same directory as the installer)
  File "..\node_modules\electron\dist\electron.exe"

  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\H Player.lnk" "$INSTDIR\electron.exe" '"$INSTDIR\resources\app\main\main.js"' "$INSTDIR\resources\app\build\icon.ico"

  ; Create start menu entries
  CreateDirectory "$SMPROGRAMS\H Player"
  CreateShortCut "$SMPROGRAMS\H Player\H Player.lnk" "$INSTDIR\electron.exe" '"$INSTDIR\resources\app\main\main.js"' "$INSTDIR\resources\app\build\icon.ico"
  CreateShortCut "$SMPROGRAMS\H Player\Uninstall.lnk" "$INSTDIR\Uninstall.exe"

  ; Registry entries for Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "DisplayName" "H Player"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "QuietUninstallString" "$INSTDIR\Uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "DisplayIcon" "$INSTDIR\resources\app\build\icon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "Publisher" "H Player Project"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "DisplayVersion" "1.1.0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "NoRepair" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player" "EstimatedSize" 164000

  ; Store installation folder
  WriteRegStr HKCU "Software\H Player" "" $INSTDIR

SectionEnd

; Uninstaller Section
Section "Uninstall"

  ; Remove files
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$DESKTOP\H Player.lnk"
  RMDir /r "$SMPROGRAMS\H Player"

  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\H Player"
  DeleteRegKey HKCU "Software\H Player"

SectionEnd