@echo off
title H Player v3.0.0 - Quick Setup

echo.
echo ===================================
echo H Player v3.0.0 - Quick Setup
echo ===================================
echo.

set "DOWNLOAD_PATH=%USERPROFILE%\Downloads\H-Player"
set "ZIP_FILE=H-Player-Manual-v3.0.0.zip"
set "ZIP_PATH=%DOWNLOAD_PATH%\%ZIP_FILE%"
set "EXTRACT_PATH=%DOWNLOAD_PATH%\H Player"
set "EXE_PATH=%EXTRACT_PATH%\H Player.exe"

if not exist "%DOWNLOAD_PATH%" (
    echo Creating download directory...
    mkdir "%DOWNLOAD_PATH%"
)

if exist "%ZIP_PATH%" (
    echo Found H Player package: %ZIP_PATH%
    echo.
    echo Choose an option:
    echo 1. Extract H Player
    echo 2. Extract and Run H Player
    echo 3. Exit
    echo.
    set /p choice="Enter your choice (1-3): "
    
    if "%choice%"=="1" goto extract
    if "%choice%"=="2" goto extract_and_run
    if "%choice%"=="3" goto end
    goto invalid_choice
) else (
    echo H Player package not found!
    echo.
    echo Please:
    echo 1. Download H-Player-Manual-v3.0.0.zip
    echo 2. Place it in: %DOWNLOAD_PATH%
    echo 3. Run this script again
    echo.
    pause
    goto end
)

:extract
echo.
echo Extracting H Player...
if exist "%EXTRACT_PATH%" rmdir /s /q "%EXTRACT_PATH%"
powershell -Command "Expand-Archive -Path '%ZIP_PATH%' -DestinationPath '%DOWNLOAD_PATH%' -Force"
echo Extraction complete!
echo.
echo H Player is ready at: %EXTRACT_PATH%
echo Run "H Player.exe" to start the application
pause
goto end

:extract_and_run
echo.
echo Extracting H Player...
if exist "%EXTRACT_PATH%" rmdir /s /q "%EXTRACT_PATH%"
powershell -Command "Expand-Archive -Path '%ZIP_PATH%' -DestinationPath '%DOWNLOAD_PATH%' -Force"
echo Extraction complete!
echo.
if exist "%EXE_PATH%" (
    echo Starting H Player...
    start "" "%EXE_PATH%"
) else (
    echo ERROR: H Player.exe not found!
    pause
)
goto end

:invalid_choice
echo Invalid choice! Please try again.
pause
goto end

:end
echo.
echo Thank you for using H Player!
pause