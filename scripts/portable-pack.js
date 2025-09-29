#!/usr/bin/env node

/**
 * Portable packaging script for H Player
 * Creates platform-specific archives containing the packaged app,
 * vendor binaries, runner scripts, and branding assets
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const archiver = require('archiver');

const PROJECT_ROOT = path.dirname(__dirname);
const DIST_PACKAGES_DIR = path.join(PROJECT_ROOT, 'dist-packages');
const PORTABLE_DIR = path.join(PROJECT_ROOT, 'dist-portable');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Run a command and return a promise
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: PROJECT_ROOT,
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Create a ZIP archive
 */
function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      logSuccess(`Archive created: ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add all files from source directory
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Create a tar.gz archive
 */
function createTarGzArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

    output.on('close', () => {
      logSuccess(`Archive created: ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Add all files from source directory
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Get platform-specific app directory name from electron-builder output
 */
function getAppDirName(platform, arch) {
  const packageJson = require(path.join(PROJECT_ROOT, 'package.json'));
  const productName = packageJson.build.productName.replace(/\s+/g, ' ');

  switch (platform) {
    case 'win32':
      return arch === 'x64' ? `${productName}-win32-x64` : `${productName}-win32-ia32`;
    case 'darwin':
      return arch === 'arm64' ? `${productName}-darwin-arm64` : `${productName}-darwin-x64`;
    case 'linux':
      return `${productName}-linux-x64`;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Prepare portable bundle for a specific platform
 */
async function preparePortableBundle(platform, arch) {
  const appDirName = getAppDirName(platform, arch);
  const appDir = path.join(DIST_PACKAGES_DIR, appDirName);

  if (!fs.existsSync(appDir)) {
    throw new Error(`App directory not found: ${appDir}. Run 'npm run build' first.`);
  }

  const bundleName = `H-Player-Portable-${platform}-${arch}`;
  const bundleDir = path.join(PORTABLE_DIR, bundleName);

  logStep(`Prepare ${platform}/${arch}`, `Creating portable bundle: ${bundleName}`);

  // Create bundle directory
  if (fs.existsSync(bundleDir)) {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }
  fs.mkdirSync(bundleDir, { recursive: true });

  // Copy the packaged app
  const appDest = path.join(bundleDir, appDirName);
  fs.cpSync(appDir, appDest, { recursive: true });

  // Copy vendor directory if it exists
  const vendorSrc = path.join(PROJECT_ROOT, 'vendor');
  if (fs.existsSync(vendorSrc)) {
    fs.cpSync(vendorSrc, path.join(bundleDir, 'vendor'), { recursive: true });
  }

  // Copy branding assets
  const assetsSrc = path.join(PROJECT_ROOT, 'assets');
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, path.join(bundleDir, 'assets'), { recursive: true });
  }

  // Copy build icons
  const buildSrc = path.join(PROJECT_ROOT, 'build');
  if (fs.existsSync(buildSrc)) {
    fs.cpSync(buildSrc, path.join(bundleDir, 'build'), { recursive: true });
  }

  // Copy platform-specific runner script
  let runnerScript;
  switch (platform) {
    case 'win32':
      runnerScript = 'Run-H-Player.ps1';
      break;
    case 'darwin':
      runnerScript = 'Run-H-Player.command';
      break;
    case 'linux':
      runnerScript = 'run-h-player.sh';
      // Also copy desktop file
      const desktopSrc = path.join(PROJECT_ROOT, 'scripts', 'portable', 'h-player.desktop');
      if (fs.existsSync(desktopSrc)) {
        fs.copyFileSync(desktopSrc, path.join(bundleDir, 'h-player.desktop'));
      }
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  const runnerSrc = path.join(PROJECT_ROOT, runnerScript);
  if (fs.existsSync(runnerSrc)) {
    fs.copyFileSync(runnerSrc, path.join(bundleDir, runnerScript));
    // Make scripts executable on Unix systems
    if (platform !== 'win32') {
      fs.chmodSync(path.join(bundleDir, runnerScript), '755');
    }
  }

  // Create README.txt
  const readmeContent = `# H Player - Portable Bundle

This is a portable version of H Player that can run without installation.

## How to Run

Double-click the launcher script for your platform:

- Windows: Run-H-Player.ps1
- macOS: Run-H-Player.command
- Linux: run-h-player.sh

## Features

- Local media player for Movies & TV Shows on plugged-in drives
- No internet connection required
- No installation needed
- Green and black theme with H logo branding

## Requirements

- Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- External drive with Movies/ and TV Shows/ folders

## Troubleshooting

If the app doesn't start:
1. Ensure you have a drive connected with media files
2. Check that the launcher script has execute permissions (Linux/macOS)
3. Try running as administrator/sudo if permission errors occur

For more information, visit the project repository.
`;

  fs.writeFileSync(path.join(bundleDir, 'README.txt'), readmeContent);

  return bundleDir;
}

/**
 * Create archive for a platform bundle
 */
async function createArchive(bundleDir, platform) {
  const bundleName = path.basename(bundleDir);
  const archiveDir = path.dirname(bundleDir);

  let archivePath;
  if (platform === 'win32') {
    archivePath = path.join(archiveDir, `${bundleName}.zip`);
    await createZipArchive(bundleDir, archivePath);
  } else {
    archivePath = path.join(archiveDir, `${bundleName}.tar.gz`);
    await createTarGzArchive(bundleDir, archivePath);
  }

  return archivePath;
}

/**
 * Main packaging function
 */
async function main() {
  const currentPlatform = os.platform();
  const currentArch = os.arch();

  log('\\n' + '='.repeat(60), 'blue');
  log('H Player Portable Packaging', 'blue');
  log('='.repeat(60), 'blue');
  log('\\nCreating portable bundles for distribution.\\n', 'bright');

  try {
    // Ensure dist-packages exists
    if (!fs.existsSync(DIST_PACKAGES_DIR)) {
      logError('dist-packages directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    // Create portable directory
    if (!fs.existsSync(PORTABLE_DIR)) {
      fs.mkdirSync(PORTABLE_DIR, { recursive: true });
    }

    // Build the application first
    logStep('1/3', 'Building application...');
    await runCommand('npm', ['run', 'build']);
    logSuccess('Application built successfully');

    // Package with electron-builder
    logStep('2/3', 'Packaging application...');
    await runCommand('npm', ['run', 'package']);
    logSuccess('Application packaged successfully');

    // Create portable bundles
    logStep('3/3', 'Creating portable bundles...');

    const platforms = [
      { platform: 'win32', arch: 'x64' },
      { platform: 'win32', arch: 'ia32' },
      { platform: 'darwin', arch: 'x64' },
      { platform: 'darwin', arch: 'arm64' },
      { platform: 'linux', arch: 'x64' },
    ];

    const createdArchives = [];

    for (const { platform, arch } of platforms) {
      try {
        const bundleDir = await preparePortableBundle(platform, arch);
        const archivePath = await createArchive(bundleDir, platform);
        createdArchives.push(archivePath);

        // Clean up bundle directory
        fs.rmSync(bundleDir, { recursive: true, force: true });
      } catch (error) {
        logWarning(`Failed to create bundle for ${platform}/${arch}: ${error.message}`);
      }
    }

    log('\\n' + '='.repeat(60), 'green');
    log('Portable packaging completed successfully!', 'green');
    log('='.repeat(60), 'green');

    log('\\nCreated archives:', 'bright');
    createdArchives.forEach(archive => {
      log(`  ${path.relative(PROJECT_ROOT, archive)}`, 'cyan');
    });

    log('\\nEach archive contains:', 'bright');
    log('  • Packaged H Player application', 'cyan');
    log('  • Vendor binaries (mpv, ffmpeg)', 'cyan');
    log('  • Platform-specific launcher script', 'cyan');
    log('  • Branding assets and icons', 'cyan');
    log('  • README with usage instructions', 'cyan');

    log('\\nUsers can now:', 'bright');
    log('  • Download and extract the archive', 'cyan');
    log('  • Double-click the launcher script to start', 'cyan');
    log('  • Use without installation or admin rights', 'cyan');

  } catch (error) {
    log('\\n' + '='.repeat(60), 'red');
    log('Portable packaging failed!', 'red');
    log('='.repeat(60), 'red');
    logError(error.message);
    log('\\nPlease check the error above and try again.', 'bright');
    process.exit(1);
  }
}

// Run packaging if this script is called directly
if (require.main === module) {
  main();
}

module.exports = {
  preparePortableBundle,
  createArchive,
};