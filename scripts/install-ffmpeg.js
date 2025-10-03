/**
 * Download and install full-codec FFmpeg for Electron
 * This replaces the limited FFmpeg that ships with Electron
 * with a version that supports all codecs (AC3, DTS, H.265, etc.)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const AdmZip = require('adm-zip');

// Electron version from package.json
const packageJson = require('../package.json');
const electronVersion = packageJson.devDependencies.electron.replace('^', '');

console.log(`[FFmpeg Installer] Installing full-codec FFmpeg for Electron ${electronVersion}`);

// Determine platform
const platform = process.platform;
const arch = process.arch;

// FFmpeg download URLs
const FFMPEG_URLS = {
  win32: {
    x64: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-win32-x64.zip`,
    ia32: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-win32-ia32.zip`,
    arm64: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-win32-arm64.zip`
  },
  darwin: {
    x64: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-darwin-x64.zip`,
    arm64: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-darwin-arm64.zip`
  },
  linux: {
    x64: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-linux-x64.zip`,
    arm64: `https://github.com/electron/electron/releases/download/v${electronVersion}/ffmpeg-v${electronVersion}-linux-arm64.zip`
  }
};

// Get the correct download URL
const downloadUrl = FFMPEG_URLS[platform]?.[arch];
if (!downloadUrl) {
  console.error(`[FFmpeg Installer] ❌ Unsupported platform: ${platform}-${arch}`);
  process.exit(1);
}

console.log(`[FFmpeg Installer] Platform: ${platform}-${arch}`);
console.log(`[FFmpeg Installer] Download URL: ${downloadUrl}`);

// Paths
const tempDir = path.join(__dirname, '..', '.temp');
const tempZipPath = path.join(tempDir, 'ffmpeg.zip');
const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');

// FFmpeg file names by platform
const FFMPEG_FILES = {
  win32: 'ffmpeg.dll',
  darwin: 'libffmpeg.dylib',
  linux: 'libffmpeg.so'
};

const ffmpegFileName = FFMPEG_FILES[platform];
const targetPath = path.join(electronPath, ffmpegFileName);

// Download file
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`[FFmpeg Installer] Following redirect to: ${response.headers.location}`);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const fileStream = fs.createWriteStream(dest);
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\r[FFmpeg Installer] Downloading: ${percent}%`);
      });

      streamPipeline(response, fileStream)
        .then(() => {
          console.log('\n[FFmpeg Installer] ✅ Download complete');
          resolve();
        })
        .catch(reject);
    }).on('error', reject);
  });
}

// Extract FFmpeg from ZIP
function extractFFmpeg(zipPath, targetPath) {
  console.log(`[FFmpeg Installer] Extracting ${ffmpegFileName}...`);
  
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  
  // Find the FFmpeg file in the ZIP
  const ffmpegEntry = zipEntries.find(entry => entry.entryName === ffmpegFileName);
  
  if (!ffmpegEntry) {
    throw new Error(`${ffmpegFileName} not found in downloaded archive`);
  }
  
  // Extract to target location
  zip.extractEntryTo(ffmpegEntry, path.dirname(targetPath), false, true);
  console.log(`[FFmpeg Installer] ✅ Extracted to: ${targetPath}`);
}

// Main installation process
async function installFFmpeg() {
  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Check if Electron is installed
    if (!fs.existsSync(electronPath)) {
      console.log('[FFmpeg Installer] ⚠️  Electron not found. Run `npm install` first.');
      return;
    }

    // Backup existing FFmpeg if it exists
    if (fs.existsSync(targetPath)) {
      const backupPath = targetPath + '.backup';
      if (!fs.existsSync(backupPath)) {
        console.log(`[FFmpeg Installer] Backing up original FFmpeg to: ${backupPath}`);
        fs.copyFileSync(targetPath, backupPath);
      }
    }

    // Download FFmpeg
    console.log('[FFmpeg Installer] Downloading full-codec FFmpeg...');
    await downloadFile(downloadUrl, tempZipPath);

    // Extract FFmpeg
    extractFFmpeg(tempZipPath, targetPath);

    // Verify installation
    const stats = fs.statSync(targetPath);
    console.log(`[FFmpeg Installer] ✅ FFmpeg installed successfully (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Cleanup
    console.log('[FFmpeg Installer] Cleaning up...');
    fs.unlinkSync(tempZipPath);
    fs.rmdirSync(tempDir);

    console.log('[FFmpeg Installer] 🎉 Installation complete!');
    console.log('[FFmpeg Installer] Your app now supports all video/audio codecs including:');
    console.log('[FFmpeg Installer]   - Video: H.265/HEVC, AV1, etc.');
    console.log('[FFmpeg Installer]   - Audio: AC3, DTS, TrueHD, E-AC3, etc.');

  } catch (error) {
    console.error('[FFmpeg Installer] ❌ Installation failed:', error.message);
    console.error('[FFmpeg Installer] You can try manually downloading from:');
    console.error(`[FFmpeg Installer] ${downloadUrl}`);
    process.exit(1);
  }
}

// Run installation
installFFmpeg();
