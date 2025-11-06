#!/usr/bin/env node

/**
 * Smart Auto-Build Script for Hoser Video
 * 
 * Automatically detects OS and architecture, cleans old builds,
 * and creates the proper distribution package with version handling.
 * 
 * Usage:
 *   npm run build:auto
 *   npm run build:auto -- --version 3.2.12
 *   npm run build:auto -- --clean-only
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Helper function for colored console output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

// Execute command with proper error handling
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options
    });
    return result;
  } catch (error) {
    log(`Error executing: ${command}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Detect operating system
function detectOS() {
  const platform = os.platform();
  const platformMap = {
    'darwin': 'macOS',
    'win32': 'Windows',
    'linux': 'Linux'
  };
  return {
    platform,
    name: platformMap[platform] || platform,
    isLinux: platform === 'linux',
    isMac: platform === 'darwin',
    isWindows: platform === 'win32'
  };
}

// Detect architecture
function detectArchitecture() {
  const arch = os.arch();
  const archMap = {
    'x64': 'x64',
    'arm64': 'arm64',
    'arm': 'armv7l',
    'ia32': 'ia32'
  };
  return {
    raw: arch,
    normalized: archMap[arch] || arch,
    isARM: arch.startsWith('arm'),
    isX64: arch === 'x64'
  };
}

// Get current package version
function getCurrentVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  return packageData.version;
}

// Update package version
function updateVersion(newVersion) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  packageData.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  log(`✓ Updated version to ${newVersion}`, 'green');
}

// Clean old builds
function cleanBuilds() {
  logSection('🧹 Cleaning Old Builds');
  
  const dirsToClean = [
    'dist',
    'dist-packages',
    'dist-main'
  ];

  for (const dir of dirsToClean) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      log(`Removing ${dir}/...`, 'yellow');
      exec(`rm -rf "${dirPath}"`);
    }
  }
  
  log('✓ Clean completed', 'green');
}

// Build renderer (Vite)
function buildRenderer() {
  logSection('🎨 Building Renderer (React + Vite)');
  exec('npm run build:renderer');
  log('✓ Renderer build completed', 'green');
}

// Build main process (TypeScript)
function buildMain() {
  logSection('⚡ Building Main Process (Electron)');
  exec('npm run build:main');
  log('✓ Main process build completed', 'green');
}

// Package application with electron-builder
function packageApp(osInfo, archInfo) {
  logSection('📦 Packaging Application');
  
  let builderArgs = '';
  
  // Determine platform flag
  if (osInfo.isMac) {
    builderArgs = '-m';
  } else if (osInfo.isWindows) {
    builderArgs = '-w';
  } else if (osInfo.isLinux) {
    builderArgs = '-l';
  }
  
  // Add architecture flag for Linux ARM
  if (osInfo.isLinux) {
    if (archInfo.isARM) {
      builderArgs += ' --arm64';
    } else {
      builderArgs += ' --x64';
    }
  }
  
  log(`Building for: ${osInfo.name} (${archInfo.normalized})`, 'cyan');
  log(`Command: electron-builder ${builderArgs}`, 'cyan');
  
  exec(`npx electron-builder ${builderArgs}`);
  log('✓ Packaging completed', 'green');
}

// Display build summary
function displaySummary(osInfo, archInfo, version, startTime) {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  logSection('✨ Build Summary');
  
  console.log(`
  ${colors.bright}Version:${colors.reset}      ${colors.green}${version}${colors.reset}
  ${colors.bright}Platform:${colors.reset}     ${colors.cyan}${osInfo.name}${colors.reset}
  ${colors.bright}Architecture:${colors.reset} ${colors.cyan}${archInfo.normalized}${colors.reset}
  ${colors.bright}Duration:${colors.reset}     ${colors.yellow}${duration}s${colors.reset}
  ${colors.bright}Output:${colors.reset}       ${colors.magenta}dist-packages/${colors.reset}
  `);
  
  // List generated files
  const distPath = path.join(__dirname, '..', 'dist-packages');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    if (files.length > 0) {
      log('Generated Files:', 'bright');
      files.forEach(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        log(`  • ${file} (${sizeMB} MB)`, 'green');
      });
    }
  }
  
  console.log('');
  log('🎉 Build completed successfully!', 'green');
  console.log('');
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    version: null,
    cleanOnly: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' && args[i + 1]) {
      options.version = args[i + 1];
      i++;
    } else if (args[i] === '--clean-only') {
      options.cleanOnly = true;
    }
  }
  
  return options;
}

// Main build process
async function main() {
  const startTime = Date.now();
  
  log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║           🎬 Hoser Video - Smart Auto Build 🎬           ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `, 'cyan');
  
  // Parse command line arguments
  const options = parseArgs();
  
  // Detect system information
  const osInfo = detectOS();
  const archInfo = detectArchitecture();
  let version = getCurrentVersion();
  
  logSection('🔍 System Detection');
  log(`Operating System: ${osInfo.name}`, 'cyan');
  log(`Architecture: ${archInfo.normalized} (${archInfo.raw})`, 'cyan');
  log(`Current Version: ${version}`, 'cyan');
  
  // Update version if specified
  if (options.version) {
    logSection('📝 Version Update');
    updateVersion(options.version);
    version = options.version;
  }
  
  // Clean old builds
  cleanBuilds();
  
  // Exit if clean-only mode
  if (options.cleanOnly) {
    log('\n✓ Clean-only mode: Exiting', 'yellow');
    return;
  }
  
  // Verify dependencies for ARM builds
  if (osInfo.isLinux && archInfo.isARM) {
    logSection('🔧 Raspberry Pi Build Detected');
    log('Note: Building on ARM architecture (Raspberry Pi)', 'yellow');
    log('This may take longer than x64 builds...', 'yellow');
  }
  
  // Build process
  try {
    buildRenderer();
    buildMain();
    packageApp(osInfo, archInfo);
    displaySummary(osInfo, archInfo, version, startTime);
  } catch (error) {
    log('\n❌ Build failed!', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the build
main().catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
