const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = packageJson.version;

console.log('\n============================================================');
console.log('H Player Manual Packaging (No electron-builder)');
console.log('============================================================\n');

// Build the application first
console.log('[1/4] Building application...');
try {
  execSync('npm run build:renderer', { stdio: 'inherit' });
  execSync('npm run build:main', { stdio: 'inherit' });
  console.log('✓ Build completed successfully');
} catch (error) {
  console.error('✗ Build failed:', error.message);
  process.exit(1);
}

// Create output directory
const outputDir = path.join(__dirname, '..', 'dist-manual');
const appDir = path.join(outputDir, 'H Player');

console.log('[2/4] Creating application directory...');
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(appDir, { recursive: true });

// Copy built files
console.log('[3/4] Copying application files...');

// Copy main process files
const mainSrc = path.join(__dirname, '..', 'dist', 'main');
const mainDest = path.join(appDir, 'resources', 'app');
fs.mkdirSync(mainDest, { recursive: true });

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (error) {
        console.log(`⚠ Warning: Could not copy ${srcPath}:`, error.message);
      }
    }
  }
}

copyDir(mainSrc, mainDest);

// Copy renderer files
const rendererSrc = path.join(__dirname, '..', 'dist', 'renderer');
const rendererDest = path.join(appDir, 'resources', 'app');
copyDir(rendererSrc, rendererDest);

// Copy vendor binaries
const vendorSrc = path.join(__dirname, '..', 'vendor');
const vendorDest = path.join(appDir, 'vendor');
if (fs.existsSync(vendorSrc)) {
  copyDir(vendorSrc, vendorDest);
}

// Copy FFmpeg DLLs to main directory for MPV compatibility
console.log('Copying FFmpeg libraries to main directory...');
const dlls = [
  'avcodec-62.dll',
  'avdevice-62.dll', 
  'avfilter-11.dll',
  'avformat-62.dll',
  'avutil-60.dll',
  'swresample-6.dll',
  'swscale-9.dll',
  'd3dcompiler_43.dll'
];

for (const dll of dlls) {
  const dllPath = path.join(vendorSrc, 'win32-x64', dll);
  if (fs.existsSync(dllPath)) {
    fs.copyFileSync(dllPath, path.join(appDir, dll));
  }
}

// Copy assets
const assetsSrc = path.join(__dirname, '..', 'assets');
const assetsDest = path.join(appDir, 'assets');
if (fs.existsSync(assetsSrc)) {
  try {
    copyDir(assetsSrc, assetsDest);
  } catch (error) {
    console.log('⚠ Warning: Some assets could not be copied:', error.message);
  }
}

// Copy launcher scripts
const scripts = ['Run-H-Player.ps1', 'Run-H-Player.command', 'run-h-player.sh'];
for (const script of scripts) {
  const scriptPath = path.join(__dirname, '..', script);
  if (fs.existsSync(scriptPath)) {
    fs.copyFileSync(scriptPath, path.join(appDir, script));
  }
}

// Copy electron executable (we'll use a simple approach)
console.log('[4/4] Creating launcher and packaging...');

// Create a simple batch launcher for Windows
const launcherContent = `@echo off
echo Starting H Player...
cd /d "%~dp0"
if exist "electron.exe" (
  electron.exe "resources\\app\\main\\main.js"
) else (
  echo Electron executable not found. Please ensure electron.exe is in the same directory.
  pause
)`;

// Create an uninstaller script
const uninstallerContent = `@echo off
echo ============================================
echo    H Player Uninstaller v1.1.0
echo ============================================
echo.
echo This will completely remove H Player and all associated files.
echo.

REM Stop any running H Player processes
echo Stopping any running H Player processes...
taskkill /f /im "electron.exe" /fi "WINDOWTITLE eq H Player" >nul 2>&1
taskkill /f /im "H Player.exe" >nul 2>&1
echo Done.
echo.

REM Remove desktop shortcuts
echo Removing desktop shortcuts...
if exist "%USERPROFILE%\\Desktop\\H Player.lnk" (
  del "%USERPROFILE%\\Desktop\\H Player.lnk" 2>nul
  echo ✓ Removed desktop shortcut
) else (
  echo - No desktop shortcut found
)

REM Remove start menu shortcuts
echo Removing start menu shortcuts...
if exist "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\H Player" (
  rmdir /s /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\H Player" 2>nul
  echo ✓ Removed start menu shortcuts
) else (
  echo - No start menu shortcuts found
)

REM Remove quick launch shortcuts
echo Removing quick launch shortcuts...
if exist "%APPDATA%\\Microsoft\\Internet Explorer\\Quick Launch\\H Player.lnk" (
  del "%APPDATA%\\Microsoft\\Internet Explorer\\Quick Launch\\H Player.lnk" 2>nul
  echo ✓ Removed quick launch shortcut
) else (
  echo - No quick launch shortcut found
)

REM Remove taskbar pinned shortcuts (if any)
echo Checking for taskbar pins...
reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Taskband" /v Favorites >nul 2>&1
if %errorlevel% equ 0 (
  echo - Taskbar pins may need to be manually removed
)

echo.
echo ============================================
echo    Data Removal Options
echo ============================================
echo.
echo H Player stores data in the following locations:
echo 1. Application directory (program files)
echo 2. User data directory (AppData)
echo 3. Registry entries (settings)
echo.

:menu
echo Choose what to remove:
echo [1] Remove everything (complete uninstall)
echo [2] Keep user data, remove application
echo [3] Keep application, remove user data only
echo [4] Cancel uninstall
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto remove_all
if "%choice%"=="2" goto remove_app_only
if "%choice%"=="3" goto remove_data_only
if "%choice%"=="4" goto cancel
echo Invalid choice. Please try again.
goto menu

:remove_all
echo.
echo ============================================
echo    COMPLETE UNINSTALL
echo ============================================
echo Removing application directory...
for %%I in ("%~dp0.") do set "currentDir=%%~fI"
set "appDir=%currentDir%"
cd ..
echo Removing: %appDir%
rmdir /s /q "%appDir%" 2>nul
if exist "%appDir%" (
  echo ⚠ Could not remove application directory. It may be in use.
  echo   Please close all H Player windows and try again.
) else (
  echo ✓ Application directory removed
)

echo Removing user data directory...
set "userDataDir=%APPDATA%\\H Player"
if exist "%userDataDir%" (
  echo Removing: %userDataDir%
  rmdir /s /q "%userDataDir%" 2>nul
  if exist "%userDataDir%" (
    echo ⚠ Could not remove user data directory
  ) else (
    echo ✓ User data directory removed
  )
) else (
  echo - No user data directory found
)

echo Removing registry entries...
reg delete "HKCU\\Software\\H Player" /f >nul 2>&1
if %errorlevel% equ 0 (
  echo ✓ Registry entries removed
) else (
  echo - No registry entries found
)

echo Removing temporary files...
set "tempDir=%TEMP%\\H Player"
if exist "%tempDir%" (
  rmdir /s /q "%tempDir%" 2>nul
  echo ✓ Temporary files removed
) else (
  echo - No temporary files found
)

goto finish

:remove_app_only
echo.
echo ============================================
echo    APPLICATION REMOVAL ONLY
echo ============================================
echo Removing application directory...
for %%I in ("%~dp0.") do set "currentDir=%%~fI"
set "appDir=%currentDir%"
cd ..
echo Removing: %appDir%
rmdir /s /q "%appDir%" 2>nul
if exist "%appDir%" (
  echo ⚠ Could not remove application directory. It may be in use.
  echo   Please close all H Player windows and try again.
) else (
  echo ✓ Application directory removed
  echo ✓ User data preserved in: %APPDATA%\\H Player
)
goto finish

:remove_data_only
echo.
echo ============================================
echo    DATA REMOVAL ONLY
echo ============================================
echo Removing user data directory...
set "userDataDir=%APPDATA%\\H Player"
if exist "%userDataDir%" (
  echo Removing: %userDataDir%
  echo WARNING: This will delete your media library and settings!
  set /p confirm="Are you sure? (yes/no): "
  if /i "%confirm%"=="yes" (
    rmdir /s /q "%userDataDir%" 2>nul
    if exist "%userDataDir%" (
      echo ⚠ Could not remove user data directory
    ) else (
      echo ✓ User data directory removed
    )
  ) else (
    echo - Data removal cancelled
  )
) else (
  echo - No user data directory found
)

echo Removing registry entries...
reg delete "HKCU\\Software\\H Player" /f >nul 2>&1
if %errorlevel% equ 0 (
  echo ✓ Registry entries removed
) else (
  echo - No registry entries found
)
goto finish

:cancel
echo.
echo Uninstall cancelled. No files were removed.
goto end

:finish
echo.
echo ============================================
echo    UNINSTALL COMPLETE
echo ============================================
echo H Player has been successfully uninstalled!
echo.
echo If you have any issues or want to reinstall,
echo download the latest version from the project page.
echo.

:end
echo.
echo Press any key to exit...
pause >nul
`;

fs.writeFileSync(path.join(appDir, 'Run-H-Player.bat'), launcherContent);
fs.writeFileSync(path.join(appDir, 'Uninstall-H-Player.bat'), uninstallerContent);

// Create ZIP archive
const zipPath = path.join(__dirname, '..', `H-Player-Manual-${version}.zip`);
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✓ Archive created: ${zipPath} (${archive.pointer()} bytes)`);
  console.log('\n============================================================');
  console.log('Manual packaging completed successfully!');
  console.log('============================================================');
  console.log(`\nDistribution package: ${zipPath}`);
  console.log('\nTo use this package:');
  console.log('1. Extract the ZIP file');
  console.log('2. Place electron.exe in the extracted directory');
  console.log('3. Run Run-H-Player.bat to start the application');
  console.log('4. Run Uninstall-H-Player.bat to uninstall when needed');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(appDir, 'H Player');
archive.finalize();