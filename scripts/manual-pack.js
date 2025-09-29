const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

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

fs.writeFileSync(path.join(appDir, 'Run-H-Player.bat'), launcherContent);

// Create ZIP archive
const zipPath = path.join(__dirname, '..', 'H-Player-Manual-1.0.0.zip');
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
  console.log('3. Run Run-H-Player.bat');
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(appDir, 'H Player');
archive.finalize();