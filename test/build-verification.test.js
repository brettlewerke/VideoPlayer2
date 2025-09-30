/**
 * Build verification tests for H Player v3.0.0
 * Focuses on build artifacts and file integrity
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.join(__dirname, '..');

describe('Build Verification Tests', () => {
  describe('Build Artifacts', () => {
    it('should have all required build outputs', () => {
      const requiredPaths = [
        'dist/renderer/index.html',
        'dist/renderer/assets',
        'dist/main/main/main.js',
        'dist/main/preload',
        'dist/main/shared'
      ];

      requiredPaths.forEach(relativePath => {
        const fullPath = path.join(PROJECT_ROOT, relativePath);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`Missing build artifact: ${relativePath}`);
        }
        console.log(`✓ Found: ${relativePath}`);
      });
    });

    it('should verify package.json version is 3.0.0', () => {
      const packagePath = path.join(PROJECT_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (packageJson.version !== '3.0.0') {
        throw new Error(`Expected version 3.0.0, got ${packageJson.version}`);
      }
      
      console.log('✓ Package version is 3.0.0');
    });
  });

  describe('Distribution Files', () => {
    it('should verify installer exists', () => {
      const installerPath = path.join(PROJECT_ROOT, 'H-Player-Setup-3.0.0.exe');
      
      if (!fs.existsSync(installerPath)) {
        throw new Error('H-Player-Setup-3.0.0.exe not found');
      }
      
      const stats = fs.statSync(installerPath);
      console.log(`✓ Installer found: ${Math.round(stats.size / 1024 / 1024)} MB`);
      
      // Verify installer is not empty and reasonable size
      if (stats.size < 100 * 1024 * 1024) { // Less than 100MB might indicate incomplete build
        console.warn('⚠ Installer size seems small, verify build completed');
      }
    });

    it('should verify manual package exists', () => {
      const manualPackagePath = path.join(PROJECT_ROOT, 'H-Player-Manual-3.0.0.zip');
      
      if (!fs.existsSync(manualPackagePath)) {
        throw new Error('H-Player-Manual-3.0.0.zip not found');
      }
      
      const stats = fs.statSync(manualPackagePath);
      console.log(`✓ Manual package found: ${Math.round(stats.size / 1024 / 1024)} MB`);
    });
  });

  describe('File Integrity', () => {
    it('should verify key files have expected content', () => {
      // Check main.js has electron imports
      const mainJsPath = path.join(PROJECT_ROOT, 'dist/main/main/main.js');
      const mainContent = fs.readFileSync(mainJsPath, 'utf8');
      
      if (!mainContent.includes('electron')) {
        throw new Error('main.js should import electron');
      }
      
      console.log('✓ main.js contains electron imports');
      
      // Check index.html has proper structure
      const indexPath = path.join(PROJECT_ROOT, 'dist/renderer/index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      if (!indexContent.includes('<!DOCTYPE html>')) {
        throw new Error('index.html should be valid HTML');
      }
      
      console.log('✓ index.html is valid HTML');
    });

    it('should verify TypeScript compilation produced valid JavaScript', () => {
      const distMainPath = path.join(PROJECT_ROOT, 'dist/main');
      
      function checkJsFiles(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            checkJsFiles(fullPath);
          } else if (entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Basic syntax check - should not have TypeScript syntax
            // Filter out comments and strings to avoid false positives
            const codeLines = content.split('\n').filter(line => {
              const trimmed = line.trim();
              return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*');
            }).join('\n');
            
            if (codeLines.includes(': string') || codeLines.includes(': number') || codeLines.match(/\binterface\s+\w+/)) {
              throw new Error(`TypeScript syntax found in compiled JS: ${fullPath}`);
            }
          }
        }
      }
      
      checkJsFiles(distMainPath);
      console.log('✓ All JS files are properly compiled from TypeScript');
    });
  });

  describe('Dependency Verification', () => {
    it('should verify all FFmpeg DLLs have valid file signatures', () => {
      const vendorPath = path.join(PROJECT_ROOT, 'vendor/win32-x64');
      const dlls = [
        'avcodec-62.dll',
        'avformat-62.dll',
        'avutil-60.dll',
        'swresample-6.dll',
        'swscale-9.dll'
      ];
      
      dlls.forEach(dll => {
        const dllPath = path.join(vendorPath, dll);
        if (fs.existsSync(dllPath)) {
          const stats = fs.statSync(dllPath);
          const buffer = fs.readFileSync(dllPath, { start: 0, end: 2 });
          
          // Check for MZ header (PE executable)
          if (buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
            throw new Error(`Invalid DLL file signature: ${dll}`);
          }
          
          console.log(`✓ ${dll} has valid PE signature (${Math.round(stats.size / 1024)} KB)`);
        }
      });
    });

    it('should verify mpv.exe is valid', () => {
      const mpvPath = path.join(PROJECT_ROOT, 'vendor/win32-x64/mpv.exe');
      
      if (fs.existsSync(mpvPath)) {
        const stats = fs.statSync(mpvPath);
        const buffer = fs.readFileSync(mpvPath, { start: 0, end: 2 });
        
        // Check for MZ header (PE executable)
        if (buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
          throw new Error('Invalid mpv.exe file signature');
        }
        
        console.log(`✓ mpv.exe has valid PE signature (${Math.round(stats.size / 1024)} KB)`);
      } else {
        console.warn('⚠ mpv.exe not found in vendor directory');
      }
    });
  });
});