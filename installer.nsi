; H Player Production Installer
; Creates a professional Windows installer from manual packaging

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; General Configuration
Name "Hoser Video"
OutFile "Hoser-Video-Setup-3.3.3.exe"
Unicode True
InstallDir "$PROGRAMFILES\Hoser Video"
InstallDirRegKey HKCU "Software\Hoser Video" ""
RequestExecutionLevel admin

; Modern UI Configuration
!define MUI_ABORTWARNING

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
VIProductVersion "3.3.3.0"
VIAddVersionKey "ProductName" "Hoser Video"
VIAddVersionKey "CompanyName" "Hoser Video Project"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2024 Hoser Video Project"
VIAddVersionKey "FileVersion" "3.3.3.0"
VIAddVersionKey "ProductVersion" "3.3.3.0"
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

  ; Enable detailed file extraction logging with filenames
  SetDetailsPrint listonly
  
  DetailPrint "Preparing for clean installation..."
  DetailPrint " "
  
  ; Stop any running Hoser Video processes first
  DetailPrint "Stopping any running Hoser Video processes..."
  nsExec::Exec 'taskkill /f /im "Hoser Video.exe" /t'
  nsExec::Exec 'taskkill /f /im "electron.exe" /fi "WINDOWTITLE eq Hoser Video" /t'
  Sleep 1000
  
  ; Remove old shortcuts before installation
  DetailPrint "Removing existing shortcuts..."
  Delete "$DESKTOP\Hoser Video.lnk"
  Delete "$SMPROGRAMS\Hoser Video\Hoser Video.lnk"
  Delete "$SMPROGRAMS\Hoser Video\Uninstall.lnk"
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Hoser Video.lnk"
  RMDir "$SMPROGRAMS\Hoser Video"
  
  ; Remove old installation directory if it exists
  DetailPrint "Removing previous installation..."
  ${If} ${FileExists} "$INSTDIR\*.*"
    RMDir /r "$INSTDIR"
  ${EndIf}
  
  ; Remove .hoser-video database folders from all drives for clean install
  DetailPrint "Removing old database folders from all drives..."
  ${If} ${FileExists} "A:\.hoser-video\*.*"
    DetailPrint "Removing A:\.hoser-video..."
    RMDir /r "A:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "B:\.hoser-video\*.*"
    DetailPrint "Removing B:\.hoser-video..."
    RMDir /r "B:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "C:\.hoser-video\*.*"
    DetailPrint "Removing C:\.hoser-video..."
    RMDir /r "C:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "D:\.hoser-video\*.*"
    DetailPrint "Removing D:\.hoser-video..."
    RMDir /r "D:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "E:\.hoser-video\*.*"
    DetailPrint "Removing E:\.hoser-video..."
    RMDir /r "E:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "F:\.hoser-video\*.*"
    DetailPrint "Removing F:\.hoser-video..."
    RMDir /r "F:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "G:\.hoser-video\*.*"
    DetailPrint "Removing G:\.hoser-video..."
    RMDir /r "G:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "H:\.hoser-video\*.*"
    DetailPrint "Removing H:\.hoser-video..."
    RMDir /r "H:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "I:\.hoser-video\*.*"
    DetailPrint "Removing I:\.hoser-video..."
    RMDir /r "I:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "J:\.hoser-video\*.*"
    DetailPrint "Removing J:\.hoser-video..."
    RMDir /r "J:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "K:\.hoser-video\*.*"
    DetailPrint "Removing K:\.hoser-video..."
    RMDir /r "K:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "L:\.hoser-video\*.*"
    DetailPrint "Removing L:\.hoser-video..."
    RMDir /r "L:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "M:\.hoser-video\*.*"
    DetailPrint "Removing M:\.hoser-video..."
    RMDir /r "M:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "N:\.hoser-video\*.*"
    DetailPrint "Removing N:\.hoser-video..."
    RMDir /r "N:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "O:\.hoser-video\*.*"
    DetailPrint "Removing O:\.hoser-video..."
    RMDir /r "O:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "P:\.hoser-video\*.*"
    DetailPrint "Removing P:\.hoser-video..."
    RMDir /r "P:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "Q:\.hoser-video\*.*"
    DetailPrint "Removing Q:\.hoser-video..."
    RMDir /r "Q:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "R:\.hoser-video\*.*"
    DetailPrint "Removing R:\.hoser-video..."
    RMDir /r "R:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "S:\.hoser-video\*.*"
    DetailPrint "Removing S:\.hoser-video..."
    RMDir /r "S:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "T:\.hoser-video\*.*"
    DetailPrint "Removing T:\.hoser-video..."
    RMDir /r "T:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "U:\.hoser-video\*.*"
    DetailPrint "Removing U:\.hoser-video..."
    RMDir /r "U:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "V:\.hoser-video\*.*"
    DetailPrint "Removing V:\.hoser-video..."
    RMDir /r "V:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "W:\.hoser-video\*.*"
    DetailPrint "Removing W:\.hoser-video..."
    RMDir /r "W:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "X:\.hoser-video\*.*"
    DetailPrint "Removing X:\.hoser-video..."
    RMDir /r "X:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "Y:\.hoser-video\*.*"
    DetailPrint "Removing Y:\.hoser-video..."
    RMDir /r "Y:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "Z:\.hoser-video\*.*"
    DetailPrint "Removing Z:\.hoser-video..."
    RMDir /r "Z:\.hoser-video"
  ${EndIf}
  
  ; Remove old user data for fresh install
  DetailPrint "Removing old user settings..."
  ${If} ${FileExists} "$APPDATA\hoser-video\*.*"
    RMDir /r "$APPDATA\hoser-video"
  ${EndIf}
  ${If} ${FileExists} "$LOCALAPPDATA\hoser-video\*.*"
    RMDir /r "$LOCALAPPDATA\hoser-video"
  ${EndIf}
  
  ; Clean up any old registry entries
  DetailPrint "Cleaning old registry entries..."
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video"
  DeleteRegKey HKCU "Software\Hoser Video"

  SetOutPath "$INSTDIR"
  
  DetailPrint " "
  DetailPrint "Installing Hoser Video..."
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
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video" "Publisher" "Brett Lewerke"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Hoser Video" "DisplayVersion" "3.2.0"
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
  ${If} ${FileExists} "A:\.hoser-video\*.*"
    DetailPrint "Removing A:\.hoser-video..."
    RMDir /r "A:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "B:\.hoser-video\*.*"
    DetailPrint "Removing B:\.hoser-video..."
    RMDir /r "B:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "C:\.hoser-video\*.*"
    DetailPrint "Removing C:\.hoser-video..."
    RMDir /r "C:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "D:\.hoser-video\*.*"
    DetailPrint "Removing D:\.hoser-video..."
    RMDir /r "D:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "E:\.hoser-video\*.*"
    DetailPrint "Removing E:\.hoser-video..."
    RMDir /r "E:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "F:\.hoser-video\*.*"
    DetailPrint "Removing F:\.hoser-video..."
    RMDir /r "F:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "G:\.hoser-video\*.*"
    DetailPrint "Removing G:\.hoser-video..."
    RMDir /r "G:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "H:\.hoser-video\*.*"
    DetailPrint "Removing H:\.hoser-video..."
    RMDir /r "H:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "I:\.hoser-video\*.*"
    DetailPrint "Removing I:\.hoser-video..."
    RMDir /r "I:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "J:\.hoser-video\*.*"
    DetailPrint "Removing J:\.hoser-video..."
    RMDir /r "J:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "K:\.hoser-video\*.*"
    DetailPrint "Removing K:\.hoser-video..."
    RMDir /r "K:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "L:\.hoser-video\*.*"
    DetailPrint "Removing L:\.hoser-video..."
    RMDir /r "L:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "M:\.hoser-video\*.*"
    DetailPrint "Removing M:\.hoser-video..."
    RMDir /r "M:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "N:\.hoser-video\*.*"
    DetailPrint "Removing N:\.hoser-video..."
    RMDir /r "N:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "O:\.hoser-video\*.*"
    DetailPrint "Removing O:\.hoser-video..."
    RMDir /r "O:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "P:\.hoser-video\*.*"
    DetailPrint "Removing P:\.hoser-video..."
    RMDir /r "P:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "Q:\.hoser-video\*.*"
    DetailPrint "Removing Q:\.hoser-video..."
    RMDir /r "Q:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "R:\.hoser-video\*.*"
    DetailPrint "Removing R:\.hoser-video..."
    RMDir /r "R:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "S:\.hoser-video\*.*"
    DetailPrint "Removing S:\.hoser-video..."
    RMDir /r "S:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "T:\.hoser-video\*.*"
    DetailPrint "Removing T:\.hoser-video..."
    RMDir /r "T:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "U:\.hoser-video\*.*"
    DetailPrint "Removing U:\.hoser-video..."
    RMDir /r "U:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "V:\.hoser-video\*.*"
    DetailPrint "Removing V:\.hoser-video..."
    RMDir /r "V:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "W:\.hoser-video\*.*"
    DetailPrint "Removing W:\.hoser-video..."
    RMDir /r "W:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "X:\.hoser-video\*.*"
    DetailPrint "Removing X:\.hoser-video..."
    RMDir /r "X:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "Y:\.hoser-video\*.*"
    DetailPrint "Removing Y:\.hoser-video..."
    RMDir /r "Y:\.hoser-video"
  ${EndIf}
  ${If} ${FileExists} "Z:\.hoser-video\*.*"
    DetailPrint "Removing Z:\.hoser-video..."
    RMDir /r "Z:\.hoser-video"
  ${EndIf}

  ; Remove user data (optional - ask user)
  MessageBox MB_YESNO "Remove user data and settings?" IDNO skipUserData
  DetailPrint "Removing user data..."
  RMDir /r "$APPDATA\hoser-video"
  skipUserData:

  ; Remove registry entries
  DetailPrint "Cleaning up registry..."
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Hoser Video"
  DeleteRegKey HKCU "Software\Hoser Video"
  
  DetailPrint " "
  DetailPrint "Uninstallation completed successfully!"

SectionEnd