<#
.SYNOPSIS
  Launches Hoser Video from a portable bundle. Creates an optional desktop shortcut on first run.
#>

$ErrorActionPreference = 'SilentlyContinue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$exeNames = @('Hoser Video.exe','Hoser-Video.exe','HoserVideo.exe')
$exe = $exeNames | ForEach-Object { Join-Path $ScriptDir $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { Write-Host 'Executable not found next to script.'; exit 1 }

$shortcutFlag = Join-Path $ScriptDir '.shortcut-created'
if (-not (Test-Path $shortcutFlag)) {
  try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut((Join-Path $desktop 'Hoser Video.lnk'))
    $lnk.TargetPath = $exe
    $lnk.WorkingDirectory = $ScriptDir
    $lnk.IconLocation = (Join-Path $ScriptDir 'build/icon.ico')
    $lnk.Description = 'Hoser Video – local desktop video player'
    $lnk.Save()
    New-Item -ItemType File -Path $shortcutFlag -Force | Out-Null
    Write-Host 'Desktop shortcut created.'
  } catch {
    Write-Host 'Shortcut creation failed (non-fatal).'
  }
}

Start-Process -FilePath $exe -WorkingDirectory $ScriptDir
