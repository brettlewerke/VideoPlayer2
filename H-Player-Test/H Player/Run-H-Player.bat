@echo off
echo Starting H Player...
cd /d "%~dp0"
if exist "electron.exe" (
  electron.exe "resources\app\main\main.js"
) else (
  echo Electron executable not found. Please ensure electron.exe is in the same directory.
  pause
)