#!/usr/bin/env node

/**
 * Smart Packaging Script for Hoser Video
 * 
 * Automatically detects OS and architecture, then builds the appropriate
 * distribution package. Works seamlessly with npm run build.
 */

const { execSync } = require('child_process');
const os = require('os');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Execute command
function exec(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    process.exit(1);
  }
}

// Detect OS and architecture
function detectPlatform() {
  const platform = os.platform();
  const arch = os.arch();
  
  return {
    platform,
    arch,
    isLinux: platform === 'linux',
    isMac: platform === 'darwin',
    isWindows: platform === 'win32',
    isARM: arch.startsWith('arm') || arch === 'arm64',
    isX64: arch === 'x64'
  };
}

// Build the appropriate package
function buildPackage() {
  const info = detectPlatform();
  const fs = require('fs');
  const path = require('path');
  
  console.log('\n' + '='.repeat(60));
  log('📦 Smart Packaging for Hoser Video', 'bright');
  console.log('='.repeat(60));
  
  log(`Platform: ${info.platform}`, 'cyan');
  log(`Architecture: ${info.arch}`, 'cyan');
  
  // Read package.json to modify build config temporarily
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const originalConfig = JSON.stringify(packageJson.build, null, 2);
  
  let builderCommand = 'npx electron-builder';
  
  // Add platform flag
  if (info.isMac) {
    builderCommand += ' -m';
    log('Building for macOS...', 'yellow');
  } else if (info.isWindows) {
    builderCommand += ' -w';
    log('Building for Windows...', 'yellow');
  } else if (info.isLinux) {
    builderCommand += ' -l';
    
    // Modify package.json build config for current architecture only
    if (info.isARM) {
      // Only build ARM64 AppImage (deb packaging doesn't work on ARM)
      packageJson.build.linux.target = [
        { target: "AppImage", arch: ["arm64"] }
      ];
      builderCommand += ' --arm64';
      log('Building for Linux ARM64 (Raspberry Pi)...', 'yellow');
      log('Note: Building AppImage only (deb not supported on ARM build)', 'cyan');
    } else if (info.isX64) {
      // Build both x64 targets
      packageJson.build.linux.target = [
        { target: "AppImage", arch: ["x64"] },
        { target: "deb", arch: ["x64"] }
      ];
      builderCommand += ' --x64';
      log('Building for Linux x64...', 'yellow');
      log('Note: Building AppImage and deb packages', 'cyan');
    } else {
      log('Building for Linux (auto-detect architecture)...', 'yellow');
    }
    
    // Write temporary modified package.json
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  }
  
  console.log('');
  log(`Command: ${builderCommand}`, 'cyan');
  console.log('');
  
  try {
    // Execute the build
    exec(builderCommand);
    
    console.log('');
    log('✅ Packaging completed successfully!', 'green');
    console.log('');
  } finally {
    // Restore original package.json if we modified it
    if (info.isLinux) {
      packageJson.build = JSON.parse(originalConfig);
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      log('✓ Restored original package.json', 'cyan');
    }
  }
}

// Main execution
buildPackage();
