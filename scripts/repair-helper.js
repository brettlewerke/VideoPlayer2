#!/usr/bin/env node

/**
 * Runtime repair helper for H Player
 * Downloads and installs FFmpeg DLLs for MPV compatibility
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const crypto = require('crypto');
const os = require('os');

const PROJECT_ROOT = path.dirname(__dirname);
const VENDOR_DIR = path.join(PROJECT_ROOT, 'vendor');
const MANIFEST_FILE = path.join(VENDOR_DIR, 'manifest.json');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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
 * Download a file from URL with progress
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    log(`Downloading ${url}...`);

    const file = fs.createWriteStream(outputPath);
    let totalSize = 0;
    let downloaded = 0;

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      totalSize = parseInt(response.headers['content-length'], 10) || 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          const percent = Math.round((downloaded / totalSize) * 100);
          process.stdout.write(`\rProgress: ${percent}% (${downloaded}/${totalSize} bytes)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        process.stdout.write('\n');
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlinkSync(outputPath);
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Calculate file hash
 */
function calculateHash(filePath, algorithm = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Extract ZIP archive
 */
function extractZip(archivePath, extractDir) {
  const yauzl = require('yauzl');

  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory
          zipfile.readEntry();
        } else {
          // File
          const filePath = path.join(extractDir, entry.fileName);
          const dir = path.dirname(filePath);
          fs.mkdirSync(dir, { recursive: true });

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);

            const writeStream = fs.createWriteStream(filePath);
            readStream.pipe(writeStream);
            writeStream.on('close', () => {
              zipfile.readEntry();
            });
            writeStream.on('error', reject);
          });
        }
      });

      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
}

/**
 * Find FFmpeg DLLs in directory
 */
function findFfmpegDlls(dir) {
  const dlls = [];
  const patterns = [
    'ffmpeg.dll',
    'avcodec-*.dll',
    'avformat-*.dll',
    'avutil-*.dll',
    'avfilter-*.dll',
    'avdevice-*.dll',
    'swresample-*.dll',
    'swscale-*.dll'
  ];

  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else {
        for (const pattern of patterns) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          if (regex.test(item)) {
            dlls.push(fullPath);
            break;
          }
        }
      }
    }
  }

  scanDir(dir);
  return [...new Set(dlls)]; // Remove duplicates
}

/**
 * Copy FFmpeg DLLs to MPV directory
 */
function copyFfmpegDlls(dllPaths, targetDir) {
  const copied = [];
  for (const dllPath of dllPaths) {
    const fileName = path.basename(dllPath);
    const targetPath = path.join(targetDir, fileName);
    fs.copyFileSync(dllPath, targetPath);
    copied.push(fileName);
  }
  return copied;
}

/**
 * Load manifest
 */
function loadManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    throw new Error('Vendor manifest not found');
  }

  const manifestData = fs.readFileSync(MANIFEST_FILE, 'utf-8');
  return JSON.parse(manifestData);
}

/**
 * Update manifest with FFmpeg info
 */
function updateManifest(ffmpegInfo) {
  const manifest = loadManifest();
  manifest.binaries.ffmpeg = ffmpegInfo;
  manifest.timestamp = Date.now();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * Main repair function
 */
async function repairFfmpeg() {
  try {
    log('Starting FFmpeg repair for MPV...', 'blue');

    // Check platform
    if (os.platform() !== 'win32') {
      logError('FFmpeg repair is only supported on Windows');
      return { success: false, error: 'Unsupported platform' };
    }

    // Load manifest
    const manifest = loadManifest();
    if (!manifest.binaries.mpv.available) {
      logError('MPV is not available in manifest');
      return { success: false, error: 'MPV not available' };
    }

    const mpvPath = path.join(VENDOR_DIR, manifest.binaries.mpv.path);
    const mpvDir = path.dirname(mpvPath);

    log(`MPV directory: ${mpvDir}`);

    // Download FFmpeg
    const arch = os.arch();
    const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

    const tempDir = path.join(VENDOR_DIR, 'repair-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const archivePath = path.join(tempDir, 'ffmpeg.zip');
    const extractDir = path.join(tempDir, 'extracted');

    log('Downloading FFmpeg...');
    await downloadFile(ffmpegUrl, archivePath);

    log('Extracting FFmpeg...');
    await extractZip(archivePath, extractDir);

    log('Finding FFmpeg DLLs...');
    const ffmpegDlls = findFfmpegDlls(extractDir);
    if (ffmpegDlls.length === 0) {
      throw new Error('No FFmpeg DLLs found in downloaded archive');
    }

    log(`Found ${ffmpegDlls.length} FFmpeg DLLs`);

    log('Copying DLLs to MPV directory...');
    const copiedDlls = copyFfmpegDlls(ffmpegDlls, mpvDir);

    log('Cleaning up temporary files...');
    fs.rmSync(tempDir, { recursive: true });

    // Update manifest
    const ffmpegInfo = {
      available: true,
      dlls: copiedDlls.map(dll => path.relative(VENDOR_DIR, path.join(mpvDir, dll))),
      repaired: true,
      repairTimestamp: Date.now()
    };
    updateManifest(ffmpegInfo);

    logSuccess(`FFmpeg repair completed! Installed ${copiedDlls.length} DLLs:`);
    copiedDlls.forEach(dll => log(`  • ${dll}`, 'green'));

    return {
      success: true,
      message: `Successfully installed ${copiedDlls.length} FFmpeg DLLs`,
      dlls: copiedDlls
    };

  } catch (error) {
    logError(`FFmpeg repair failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if repair is needed
 */
function checkRepairNeeded() {
  try {
    const manifest = loadManifest();
    const mpvAvailable = manifest.binaries.mpv?.available;
    const ffmpegAvailable = manifest.binaries.ffmpeg?.available;

    if (!mpvAvailable) {
      return { needed: false, reason: 'MPV not available' };
    }

    if (ffmpegAvailable && !manifest.binaries.ffmpeg?.repaired) {
      return { needed: false, reason: 'FFmpeg already available' };
    }

    return { needed: true, reason: 'FFmpeg repair may be needed' };
  } catch (error) {
    return { needed: true, reason: 'Cannot check manifest' };
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'repair':
    repairFfmpeg().then(result => {
      process.exit(result.success ? 0 : 1);
    });
    break;

  case 'check':
    const check = checkRepairNeeded();
    console.log(JSON.stringify(check, null, 2));
    break;

  default:
    console.log('Usage:');
    console.log('  node repair-helper.js repair  - Download and install FFmpeg DLLs');
    console.log('  node repair-helper.js check   - Check if repair is needed');
    process.exit(1);
}