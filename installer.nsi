; ============================================================================
; Hoser Video - Complete Production Installer with Verbose Logging
; ============================================================================
;
; WORKSPACE FILES DETECTED:
; - Main Executable: dist-packages\win-unpacked\Hoser Video.exe
; - Core Libraries: ffmpeg.dll, chrome_*.pak, resources.pak, *.dll files
; - Resources: resources\app.asar, resources\assets\*, vendor\*
; - Documentation: README.md, LICENSE, REBRAND-SUCCESS.md
; - Vendor Binaries: vendor\mpv\, vendor\ffprobe\, vendor\ffmpeg-standalone\
; - Assets: assets\brand\*, assets\*.svg
; - Scripts: scripts\cleanup-hoser-databases.ps1
; - Launcher Scripts: Run-Hoser-Video.ps1, Run-Hoser-Video.command, run-hoser-video.sh
;
; ============================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "Sections.nsh"

; ============================================================================
; GENERAL CONFIGURATION
; ============================================================================

Name "Hoser Video"
OutFile "Hoser-Video-Setup-4.0.0.exe"
Unicode True
InstallDir "$PROGRAMFILES\Hoser Video"
InstallDirRegKey HKCU "Software\Hoser Video" ""
RequestExecutionLevel admin

; Branding
BrandingText "Hoser Video v11.0.1 Installer"

; ============================================================================
; MODERN UI CONFIGURATION
; ============================================================================

!define MUI_ABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"

; Welcome page
!define MUI_WELCOMEPAGE_TITLE "Welcome to Hoser Video Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Hoser Video - a beautiful, local desktop video player.$\r$\n$\r$\nClick Next to continue."

; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\Hoser Video.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Hoser Video"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\Docs\README.md"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "View README"

; Progress bar
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"
!define MUI_INSTFILESPAGE_COLORS "FFFFFF 000000"

; ============================================================================
; VARIABLES
; ============================================================================

Var CreateDesktopShortcut
Var CreateStartMenuShortcut
Var PinToTaskbar
Var StartAfterInstall
Var InstallDocumentation
Var InstallExamples
Var ConfirmUninstall
Var Dialog
Var Label
Var Checkbox

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY

; Custom page for shortcuts
Page custom ShortcutsPage ShortcutsPageLeave

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME

; Custom uninstall confirmation page
UninstPage custom un.ConfirmPageCreate un.ConfirmPageLeave

!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "4.0.0.0"
VIAddVersionKey "ProductName" "Hoser Video"
VIAddVersionKey "CompanyName" "Hoser Video Project"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2024 Hoser Video Project"
VIAddVersionKey "FileVersion" "4.0.0.0"
VIAddVersionKey "ProductVersion" "4.0.0.0"
VIAddVersionKey "FileDescription" "Hoser Video - Local Desktop Video Player"

; Custom page for shortcuts selection
Function ShortcutsPage
  !insertmacro MUI_HEADER_TEXT "Installation Options" "Choose additional installation options"
  
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
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
  
  ; Start after installation checkbox
  ${NSD_CreateCheckbox} 0 70u 100% 12u "Start Hoser Video after &installation"
  Pop $Checkbox
  ${NSD_SetState} $Checkbox ${BST_CHECKED}
  
  nsDialogs::Show
FunctionEnd

Function ShortcutsPageLeave
  ${NSD_GetState} $1 $CreateDesktopShortcut
  ${NSD_GetState} $2 $CreateStartMenuShortcut
  ${NSD_GetState} $3 $PinToTaskbar
  ${NSD_GetState} $Checkbox $StartAfterInstall
FunctionEnd

; ============================================================================
; INSTALLATION SECTIONS
; ============================================================================

; Core Application Files (Required)
Section "!Core Application Files" SecCore
  SectionIn RO  ; Read-only, cannot be deselected
  
  SetDetailsPrint listonly
  
  DetailPrint "=========================================="
  DetailPrint "HOSER VIDEO INSTALLATION"
  DetailPrint "=========================================="
  DetailPrint " "
  DetailPrint "Preparing for clean installation..."
  DetailPrint " "
  
  ; Stop any running Hoser Video processes first
  DetailPrint ">>> Stopping any running Hoser Video processes..."
  nsExec::Exec 'taskkill /f /im "Hoser Video.exe" /t'
  nsExec::Exec 'taskkill /f /im "electron.exe" /fi "WINDOWTITLE eq Hoser Video" /t'
  Sleep 1000
  DetailPrint "[OK] Processes terminated"
  DetailPrint " "
  
  ; Remove old shortcuts before installation
  DetailPrint ">>> Removing existing shortcuts..."
  Delete "$DESKTOP\Hoser Video.lnk"
  Delete "$SMPROGRAMS\Hoser Video\Hoser Video.lnk"
  Delete "$SMPROGRAMS\Hoser Video\Uninstall.lnk"
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Hoser Video.lnk"
  RMDir "$SMPROGRAMS\Hoser Video"
  DetailPrint "[OK] Shortcuts removed"
  DetailPrint " "
  
  ; Remove old installation directory if it exists
  DetailPrint ">>> Removing previous installation..."
  ${If} ${FileExists} "$INSTDIR\*.*"
    RMDir /r "$INSTDIR"
    DetailPrint "[OK] Previous installation removed"
  ${Else}
    DetailPrint "[OK] No previous installation found"
  ${EndIf}
  DetailPrint " "
  
  ; Remove .hoser-video database folders from all drives for clean install
  DetailPrint ">>> SCANNING ALL DRIVES FOR .HOSER-VIDEO FOLDERS <<<"
  DetailPrint " "
  ${If} ${FileExists} "A:\.hoser-video\*.*"
    DetailPrint "Checking A:\ ... [FOUND & REMOVED]"
    RMDir /r "A:\.hoser-video"
  ${Else}
    DetailPrint "Checking A:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "B:\.hoser-video\*.*"
    DetailPrint "Checking B:\ ... [FOUND & REMOVED]"
    RMDir /r "B:\.hoser-video"
  ${Else}
    DetailPrint "Checking B:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "C:\.hoser-video\*.*"
    DetailPrint "Checking C:\ ... [FOUND & REMOVED]"
    RMDir /r "C:\.hoser-video"
  ${Else}
    DetailPrint "Checking C:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "D:\.hoser-video\*.*"
    DetailPrint "Checking D:\ ... [FOUND & REMOVED]"
    RMDir /r "D:\.hoser-video"
  ${Else}
    DetailPrint "Checking D:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "E:\.hoser-video\*.*"
    DetailPrint "Checking E:\ ... [FOUND & REMOVED]"
    RMDir /r "E:\.hoser-video"
  ${Else}
    DetailPrint "Checking E:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "F:\.hoser-video\*.*"
    DetailPrint "Checking F:\ ... [FOUND & REMOVED]"
    RMDir /r "F:\.hoser-video"
  ${Else}
    DetailPrint "Checking F:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "G:\.hoser-video\*.*"
    DetailPrint "Checking G:\ ... [FOUND & REMOVED]"
    RMDir /r "G:\.hoser-video"
  ${Else}
    DetailPrint "Checking G:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "H:\.hoser-video\*.*"
    DetailPrint "Checking H:\ ... [FOUND & REMOVED]"
    RMDir /r "H:\.hoser-video"
  ${Else}
    DetailPrint "Checking H:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "I:\.hoser-video\*.*"
    DetailPrint "Checking I:\ ... [FOUND & REMOVED]"
    RMDir /r "I:\.hoser-video"
  ${Else}
    DetailPrint "Checking I:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "J:\.hoser-video\*.*"
    DetailPrint "Checking J:\ ... [FOUND & REMOVED]"
    RMDir /r "J:\.hoser-video"
  ${Else}
    DetailPrint "Checking J:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "K:\.hoser-video\*.*"
    DetailPrint "Checking K:\ ... [FOUND & REMOVED]"
    RMDir /r "K:\.hoser-video"
  ${Else}
    DetailPrint "Checking K:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "L:\.hoser-video\*.*"
    DetailPrint "Checking L:\ ... [FOUND & REMOVED]"
    RMDir /r "L:\.hoser-video"
  ${Else}
    DetailPrint "Checking L:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "M:\.hoser-video\*.*"
    DetailPrint "Checking M:\ ... [FOUND & REMOVED]"
    RMDir /r "M:\.hoser-video"
  ${Else}
    DetailPrint "Checking M:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "N:\.hoser-video\*.*"
    DetailPrint "Checking N:\ ... [FOUND & REMOVED]"
    RMDir /r "N:\.hoser-video"
  ${Else}
    DetailPrint "Checking N:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "O:\.hoser-video\*.*"
    DetailPrint "Checking O:\ ... [FOUND & REMOVED]"
    RMDir /r "O:\.hoser-video"
  ${Else}
    DetailPrint "Checking O:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "P:\.hoser-video\*.*"
    DetailPrint "Checking P:\ ... [FOUND & REMOVED]"
    RMDir /r "P:\.hoser-video"
  ${Else}
    DetailPrint "Checking P:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "Q:\.hoser-video\*.*"
    DetailPrint "Checking Q:\ ... [FOUND & REMOVED]"
    RMDir /r "Q:\.hoser-video"
  ${Else}
    DetailPrint "Checking Q:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "R:\.hoser-video\*.*"
    DetailPrint "Checking R:\ ... [FOUND & REMOVED]"
    RMDir /r "R:\.hoser-video"
  ${Else}
    DetailPrint "Checking R:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "S:\.hoser-video\*.*"
    DetailPrint "Checking S:\ ... [FOUND & REMOVED]"
    RMDir /r "S:\.hoser-video"
  ${Else}
    DetailPrint "Checking S:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "T:\.hoser-video\*.*"
    DetailPrint "Checking T:\ ... [FOUND & REMOVED]"
    RMDir /r "T:\.hoser-video"
  ${Else}
    DetailPrint "Checking T:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "U:\.hoser-video\*.*"
    DetailPrint "Checking U:\ ... [FOUND & REMOVED]"
    RMDir /r "U:\.hoser-video"
  ${Else}
    DetailPrint "Checking U:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "V:\.hoser-video\*.*"
    DetailPrint "Checking V:\ ... [FOUND & REMOVED]"
    RMDir /r "V:\.hoser-video"
  ${Else}
    DetailPrint "Checking V:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "W:\.hoser-video\*.*"
    DetailPrint "Checking W:\ ... [FOUND & REMOVED]"
    RMDir /r "W:\.hoser-video"
  ${Else}
    DetailPrint "Checking W:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "X:\.hoser-video\*.*"
    DetailPrint "Checking X:\ ... [FOUND & REMOVED]"
    RMDir /r "X:\.hoser-video"
  ${Else}
    DetailPrint "Checking X:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "Y:\.hoser-video\*.*"
    DetailPrint "Checking Y:\ ... [FOUND & REMOVED]"
    RMDir /r "Y:\.hoser-video"
  ${Else}
    DetailPrint "Checking Y:\ ... [NOT FOUND]"
  ${EndIf}
  ${If} ${FileExists} "Z:\.hoser-video\*.*"
    DetailPrint "Checking Z:\ ... [FOUND & REMOVED]"
    RMDir /r "Z:\.hoser-video"
  ${Else}
    DetailPrint "Checking Z:\ ... [NOT FOUND]"
  ${EndIf}
  DetailPrint " "
  DetailPrint "[OK] Drive scan completed"
  DetailPrint " "
  
  ; Remove old user data for fresh install
  DetailPrint ">>> Removing old user settings..."
  ${If} ${FileExists} "$APPDATA\hoser-video\*.*"
    RMDir /r "$APPDATA\hoser-video"
    DetailPrint "[OK] AppData removed"
  ${EndIf}
  ${If} ${FileExists} "$LOCALAPPDATA\hoser-video\*.*"
    RMDir /r "$LOCALAPPDATA\hoser-video"
    DetailPrint "[OK] LocalAppData removed"
  ${EndIf}
  ${If} ${FileExists} "$PROGRAMDATA\hoser-video\*.*"
    RMDir /r "$PROGRAMDATA\hoser-video"
    DetailPrint "[OK] ProgramData removed"
  ${EndIf}
  DetailPrint " "
  
  ; Clean up any old registry entries
  DetailPrint ">>> Cleaning old registry entries..."
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video"
  DeleteRegKey HKCU "Software\Hoser Video"
  DetailPrint "[OK] Registry cleaned"
  DetailPrint " "

  SetOutPath "$INSTDIR"
  
  DetailPrint "=========================================="
  DetailPrint "COPYING APPLICATION FILES"
  DetailPrint "=========================================="
  DetailPrint " "

  ; Copy all files from electron-builder's win-unpacked directory
  DetailPrint ">>> Installing core application files..."
  File /r "dist-packages\win-unpacked\*.*"
  DetailPrint "[OK] Core files installed"
  DetailPrint " "
  
  DetailPrint "=========================================="
  DetailPrint "CONFIGURING APPLICATION"
  DetailPrint "=========================================="
  DetailPrint " "

  ; Create uninstaller
  DetailPrint ">>> Creating uninstaller..."
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  DetailPrint "[OK] Uninstaller created: $INSTDIR\Uninstall.exe"
  DetailPrint " "

  ; Create desktop shortcut if selected
  ${If} $CreateDesktopShortcut == ${BST_CHECKED}
    DetailPrint ">>> Creating desktop shortcut..."
    CreateShortCut "$DESKTOP\Hoser Video.lnk" "$INSTDIR\Hoser Video.exe"
    DetailPrint "[OK] Desktop shortcut created"
  ${EndIf}

  ; Create start menu entries if selected
  ${If} $CreateStartMenuShortcut == ${BST_CHECKED}
    DetailPrint ">>> Creating Start Menu shortcuts..."
    CreateDirectory "$SMPROGRAMS\Hoser Video"
    CreateShortCut "$SMPROGRAMS\Hoser Video\Hoser Video.lnk" "$INSTDIR\Hoser Video.exe"
    CreateShortCut "$SMPROGRAMS\Hoser Video\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    DetailPrint "[OK] Start Menu shortcuts created"
  ${Else}
    ; Always create uninstaller shortcut in a minimal location
    CreateDirectory "$SMPROGRAMS\Hoser Video"
    CreateShortCut "$SMPROGRAMS\Hoser Video\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  ${EndIf}
  DetailPrint " "
  
  ; Pin to taskbar if selected (Windows 10/11)
  ${If} $PinToTaskbar == ${BST_CHECKED}
    DetailPrint ">>> Pinning to taskbar..."
    nsExec::Exec 'powershell -WindowStyle Hidden -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\"$env:APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar\\Hoser Video.lnk\"); $s.TargetPath=\"$INSTDIR\\Hoser Video.exe\"; $s.Save()"'
    DetailPrint "[OK] Taskbar shortcut created"
    DetailPrint " "
  ${EndIf}

  ; Registry entries for Add/Remove Programs
  DetailPrint ">>> Registering with Windows..."
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "DisplayName" "Hoser Video"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "QuietUninstallString" "$INSTDIR\Uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "DisplayIcon" "$INSTDIR\\Hoser Video.exe,0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "Publisher" "Hoser Video Project"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Hoser Video" "DisplayVersion" "4.0.0"
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "EstimatedSize" "$0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "NoRepair" 1
  DetailPrint "[OK] Registry entries created"
  DetailPrint " "

  ; Store installation folder
  WriteRegStr HKCU "Software\Hoser Video" "" $INSTDIR
  WriteRegStr HKCU "Software\Hoser Video" "InstallPath" $INSTDIR
  
  DetailPrint "=========================================="
  DetailPrint "INSTALLATION SUMMARY"
  DetailPrint "=========================================="
  DetailPrint "Installation path: $INSTDIR"
  DetailPrint "Application: Hoser Video v4.0.0"
  DetailPrint "Installation completed successfully!"
  DetailPrint "=========================================="

SectionEnd

; Documentation Files (Optional)
Section "Documentation" SecDocs
  SectionIn 1
  
  SetDetailsPrint listonly
  DetailPrint " "
  DetailPrint ">>> Installing documentation..."
  
  SetOutPath "$INSTDIR\Docs"
  
  ; Copy documentation files
  File "README.md"
  File "LICENSE"
  File "REBRAND-SUCCESS.md"
  
  DetailPrint "[OK] README.md"
  DetailPrint "[OK] LICENSE"
  DetailPrint "[OK] REBRAND-SUCCESS.md"
  DetailPrint "[OK] Documentation installed to: $INSTDIR\Docs"
  DetailPrint " "
  
  ; Set the variable so we know docs were installed
  StrCpy $InstallDocumentation "1"
  
SectionEnd

; Example/Asset Files (Optional)
Section "Example Assets" SecExamples
  SectionIn 1
  
  SetDetailsPrint listonly
  DetailPrint " "
  DetailPrint ">>> Installing example assets..."
  
  SetOutPath "$INSTDIR\Examples"
  
  ; Copy asset files
  File "assets\backdrop-placeholder.svg"
  File "assets\poster-placeholder.svg"
  File "assets\video-placeholder.svg"
  File "assets\README.md"
  
  DetailPrint "[OK] backdrop-placeholder.svg"
  DetailPrint "[OK] poster-placeholder.svg"
  DetailPrint "[OK] video-placeholder.svg"
  DetailPrint "[OK] README.md"
  
  ; Copy brand assets
  SetOutPath "$INSTDIR\Examples\Brand"
  File /r "assets\brand\*.*"
  
  DetailPrint "[OK] Brand assets"
  DetailPrint "[OK] Examples installed to: $INSTDIR\Examples"
  DetailPrint " "
  
  ; Set the variable so we know examples were installed
  StrCpy $InstallExamples "1"
  
SectionEnd

; Section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} "Core application files including the Hoser Video executable, libraries, and runtime dependencies. This component is required and cannot be deselected."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDocs} "Install documentation files including README, LICENSE, and release notes. Recommended for first-time users."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecExamples} "Install example assets and brand files for reference. Includes placeholder images and branding assets."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Post-installation function to launch app if selected
Function .onInstSuccess
  ${If} $StartAfterInstall == ${BST_CHECKED}
    Exec "$INSTDIR\Hoser Video.exe"
  ${EndIf}
FunctionEnd

; ============================================================================
; UNINSTALLER FUNCTIONS
; ============================================================================

; Custom uninstall confirmation page
Function un.ConfirmPageCreate
  !insertmacro MUI_HEADER_TEXT "Confirm Uninstallation" "WARNING: Complete Data Removal"
  
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  ; Warning message
  ${NSD_CreateLabel} 0 0 100% 24u "⚠️ WARNING: This will permanently remove ALL Hoser Video data from your computer, including:"
  Pop $Label
  
  ${NSD_CreateLabel} 10u 30u 100% 80u "• Application files from Program Files$\r$\n• All shortcuts (Desktop, Start Menu, Taskbar)$\r$\n• Registry entries and Windows integration$\r$\n• User settings and cache ($\r$\n  AppData, LocalAppData, ProgramData)$\r$\n• .hoser-video database folders from ALL drives$\r$\n  (A:\ through Z:\)$\r$\n• Temporary files and logs"
  Pop $Label
  
  ; Confirmation checkbox
  ${NSD_CreateCheckbox} 0 120u 100% 12u "I understand that ALL data will be permanently deleted and cannot be recovered"
  Pop $ConfirmUninstall
  ${NSD_SetState} $ConfirmUninstall ${BST_UNCHECKED}
  
  nsDialogs::Show
FunctionEnd

Function un.ConfirmPageLeave
  ${NSD_GetState} $ConfirmUninstall $0
  ${If} $0 != ${BST_CHECKED}
    MessageBox MB_OK|MB_ICONEXCLAMATION "You must confirm that you understand all data will be permanently deleted before proceeding with the uninstallation."
    Abort
  ${EndIf}
FunctionEnd

; ============================================================================
; UNINSTALLER SECTION
; ============================================================================

Section "Uninstall"
  
  ; Enable detailed logging for uninstall with filenames
  SetDetailsPrint listonly

  DetailPrint "=========================================="
  DetailPrint "HOSER VIDEO UNINSTALLATION"
  DetailPrint "=========================================="
  DetailPrint " "

  ; Stop any running Hoser Video processes
  DetailPrint ">>> Stopping Hoser Video processes..."
  nsExec::Exec 'taskkill /f /im "Hoser Video.exe" /t'
  nsExec::Exec 'taskkill /f /im "electron.exe" /fi "WINDOWTITLE eq Hoser Video" /t'
  Sleep 1000
  DetailPrint "[OK] All processes terminated"
  DetailPrint " "

  ; Remove shortcuts first
  DetailPrint "=========================================="
  DetailPrint "REMOVING SHORTCUTS"
  DetailPrint "=========================================="
  DetailPrint " "
  
  DetailPrint ">>> Removing desktop shortcut..."
  Delete "$DESKTOP\Hoser Video.lnk"
  DetailPrint "[OK] Desktop shortcut removed"
  
  DetailPrint ">>> Removing Start Menu shortcuts..."
  Delete "$SMPROGRAMS\Hoser Video\Hoser Video.lnk"
  Delete "$SMPROGRAMS\Hoser Video\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Hoser Video"
  DetailPrint "[OK] Start Menu shortcuts removed"
  
  DetailPrint ">>> Removing taskbar shortcut..."
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Hoser Video.lnk"
  DetailPrint "[OK] Taskbar shortcut removed"
  DetailPrint " "

  ; Remove application files
  DetailPrint "=========================================="
  DetailPrint "REMOVING APPLICATION FILES"
  DetailPrint "=========================================="
  DetailPrint " "
  
  DetailPrint ">>> Removing installation directory..."
  DetailPrint "Path: $INSTDIR"
  
  ; Remove specific components if they were installed
  ${If} ${FileExists} "$INSTDIR\Docs\*.*"
    DetailPrint "Removing documentation..."
    RMDir /r "$INSTDIR\Docs"
    DetailPrint "[OK] Documentation removed"
  ${EndIf}
  
  ${If} ${FileExists} "$INSTDIR\Examples\*.*"
    DetailPrint "Removing examples..."
    RMDir /r "$INSTDIR\Examples"
    DetailPrint "[OK] Examples removed"
  ${EndIf}
  
  Delete "$INSTDIR\Uninstall.exe"
  DetailPrint "[OK] Uninstaller removed"
  
  ; Remove all files and folders
  RMDir /r "$INSTDIR"
  DetailPrint "[OK] Application files removed"
  DetailPrint " "

  ; Remove user data directories
  DetailPrint "=========================================="
  DetailPrint "REMOVING USER DATA"
  DetailPrint "=========================================="
  DetailPrint " "
  
  DetailPrint ">>> Removing AppData..."
  ${If} ${FileExists} "$APPDATA\hoser-video\*.*"
    RMDir /r "$APPDATA\hoser-video"
    DetailPrint "[OK] $APPDATA\hoser-video removed"
  ${Else}
    DetailPrint "[OK] $APPDATA\hoser-video not found"
  ${EndIf}
  
  DetailPrint ">>> Removing LocalAppData..."
  ${If} ${FileExists} "$LOCALAPPDATA\hoser-video\*.*"
    RMDir /r "$LOCALAPPDATA\hoser-video"
    DetailPrint "[OK] $LOCALAPPDATA\hoser-video removed"
  ${Else}
    DetailPrint "[OK] $LOCALAPPDATA\hoser-video not found"
  ${EndIf}
  
  DetailPrint ">>> Removing ProgramData..."
  ${If} ${FileExists} "$PROGRAMDATA\hoser-video\*.*"
    RMDir /r "$PROGRAMDATA\hoser-video"
    DetailPrint "[OK] $PROGRAMDATA\hoser-video removed"
  ${Else}
    DetailPrint "[OK] $PROGRAMDATA\hoser-video not found"
  ${EndIf}
  
  DetailPrint ">>> Removing temporary files..."
  ${If} ${FileExists} "$TEMP\hoser-video*"
    Delete "$TEMP\hoser-video*"
    DetailPrint "[OK] Temp files removed"
  ${Else}
    DetailPrint "[OK] No temp files found"
  ${EndIf}
  DetailPrint " "

  ; Remove .hoser-video database folders from all drives
  DetailPrint "=========================================="
  DetailPrint ">>> SCANNING ALL DRIVES FOR .HOSER-VIDEO FOLDERS <<<"
  DetailPrint "=========================================="
  DetailPrint " "
  
  ${If} ${FileExists} "A:\.hoser-video\*.*"
    DetailPrint "Checking A:\ ... [FOUND & REMOVED]"
    RMDir /r "A:\.hoser-video"
  ${Else}
    DetailPrint "Checking A:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "B:\.hoser-video\*.*"
    DetailPrint "Checking B:\ ... [FOUND & REMOVED]"
    RMDir /r "B:\.hoser-video"
  ${Else}
    DetailPrint "Checking B:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "C:\.hoser-video\*.*"
    DetailPrint "Checking C:\ ... [FOUND & REMOVED]"
    RMDir /r "C:\.hoser-video"
  ${Else}
    DetailPrint "Checking C:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "D:\.hoser-video\*.*"
    DetailPrint "Checking D:\ ... [FOUND & REMOVED]"
    RMDir /r "D:\.hoser-video"
  ${Else}
    DetailPrint "Checking D:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "E:\.hoser-video\*.*"
    DetailPrint "Checking E:\ ... [FOUND & REMOVED]"
    RMDir /r "E:\.hoser-video"
  ${Else}
    DetailPrint "Checking E:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "F:\.hoser-video\*.*"
    DetailPrint "Checking F:\ ... [FOUND & REMOVED]"
    RMDir /r "F:\.hoser-video"
  ${Else}
    DetailPrint "Checking F:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "G:\.hoser-video\*.*"
    DetailPrint "Checking G:\ ... [FOUND & REMOVED]"
    RMDir /r "G:\.hoser-video"
  ${Else}
    DetailPrint "Checking G:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "H:\.hoser-video\*.*"
    DetailPrint "Checking H:\ ... [FOUND & REMOVED]"
    RMDir /r "H:\.hoser-video"
  ${Else}
    DetailPrint "Checking H:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "I:\.hoser-video\*.*"
    DetailPrint "Checking I:\ ... [FOUND & REMOVED]"
    RMDir /r "I:\.hoser-video"
  ${Else}
    DetailPrint "Checking I:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "J:\.hoser-video\*.*"
    DetailPrint "Checking J:\ ... [FOUND & REMOVED]"
    RMDir /r "J:\.hoser-video"
  ${Else}
    DetailPrint "Checking J:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "K:\.hoser-video\*.*"
    DetailPrint "Checking K:\ ... [FOUND & REMOVED]"
    RMDir /r "K:\.hoser-video"
  ${Else}
    DetailPrint "Checking K:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "L:\.hoser-video\*.*"
    DetailPrint "Checking L:\ ... [FOUND & REMOVED]"
    RMDir /r "L:\.hoser-video"
  ${Else}
    DetailPrint "Checking L:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "M:\.hoser-video\*.*"
    DetailPrint "Checking M:\ ... [FOUND & REMOVED]"
    RMDir /r "M:\.hoser-video"
  ${Else}
    DetailPrint "Checking M:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "N:\.hoser-video\*.*"
    DetailPrint "Checking N:\ ... [FOUND & REMOVED]"
    RMDir /r "N:\.hoser-video"
  ${Else}
    DetailPrint "Checking N:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "O:\.hoser-video\*.*"
    DetailPrint "Checking O:\ ... [FOUND & REMOVED]"
    RMDir /r "O:\.hoser-video"
  ${Else}
    DetailPrint "Checking O:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "P:\.hoser-video\*.*"
    DetailPrint "Checking P:\ ... [FOUND & REMOVED]"
    RMDir /r "P:\.hoser-video"
  ${Else}
    DetailPrint "Checking P:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "Q:\.hoser-video\*.*"
    DetailPrint "Checking Q:\ ... [FOUND & REMOVED]"
    RMDir /r "Q:\.hoser-video"
  ${Else}
    DetailPrint "Checking Q:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "R:\.hoser-video\*.*"
    DetailPrint "Checking R:\ ... [FOUND & REMOVED]"
    RMDir /r "R:\.hoser-video"
  ${Else}
    DetailPrint "Checking R:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "S:\.hoser-video\*.*"
    DetailPrint "Checking S:\ ... [FOUND & REMOVED]"
    RMDir /r "S:\.hoser-video"
  ${Else}
    DetailPrint "Checking S:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "T:\.hoser-video\*.*"
    DetailPrint "Checking T:\ ... [FOUND & REMOVED]"
    RMDir /r "T:\.hoser-video"
  ${Else}
    DetailPrint "Checking T:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "U:\.hoser-video\*.*"
    DetailPrint "Checking U:\ ... [FOUND & REMOVED]"
    RMDir /r "U:\.hoser-video"
  ${Else}
    DetailPrint "Checking U:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "V:\.hoser-video\*.*"
    DetailPrint "Checking V:\ ... [FOUND & REMOVED]"
    RMDir /r "V:\.hoser-video"
  ${Else}
    DetailPrint "Checking V:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "W:\.hoser-video\*.*"
    DetailPrint "Checking W:\ ... [FOUND & REMOVED]"
    RMDir /r "W:\.hoser-video"
  ${Else}
    DetailPrint "Checking W:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "X:\.hoser-video\*.*"
    DetailPrint "Checking X:\ ... [FOUND & REMOVED]"
    RMDir /r "X:\.hoser-video"
  ${Else}
    DetailPrint "Checking X:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "Y:\.hoser-video\*.*"
    DetailPrint "Checking Y:\ ... [FOUND & REMOVED]"
    RMDir /r "Y:\.hoser-video"
  ${Else}
    DetailPrint "Checking Y:\ ... [NOT FOUND]"
  ${EndIf}
  
  ${If} ${FileExists} "Z:\.hoser-video\*.*"
    DetailPrint "Checking Z:\ ... [FOUND & REMOVED]"
    RMDir /r "Z:\.hoser-video"
  ${Else}
    DetailPrint "Checking Z:\ ... [NOT FOUND]"
  ${EndIf}
  
  DetailPrint " "
  DetailPrint "[OK] Drive scan completed"
  DetailPrint " "

  ; Remove registry entries
  DetailPrint "=========================================="
  DetailPrint "CLEANING REGISTRY"
  DetailPrint "=========================================="
  DetailPrint " "
  
  DetailPrint ">>> Removing registry entries..."
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video"
  DetailPrint "[OK] Uninstall registry key removed (HKLM)"
  
  DeleteRegKey HKCU "Software\Hoser Video"
  DetailPrint "[OK] Application registry key removed (HKCU)"
  
  DeleteRegKey HKLM "Software\Hoser Video"
  DetailPrint "[OK] Application registry key removed (HKLM)"
  DetailPrint " "
  
  DetailPrint "=========================================="
  DetailPrint "UNINSTALLATION SUMMARY"
  DetailPrint "=========================================="
  DetailPrint "✓ Application files removed"
  DetailPrint "✓ Shortcuts removed"
  DetailPrint "✓ User data removed"
  DetailPrint "✓ Registry entries removed"
  DetailPrint "✓ Database folders removed from all drives"
  DetailPrint " "
  DetailPrint "Hoser Video has been completely uninstalled!"
  DetailPrint "=========================================="

SectionEnd