/**
 * Auto-installer for ffprobe
 * Downloads and installs ffprobe for codec detection
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// FFprobe download URL - using GitHub release for reliability
// Alternative: https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip
const FFPROBE_URL = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const FFPROBE_ZIP = path.join(TEMP_DIR, 'ffmpeg-essentials.zip');
const VENDOR_DIR = path.join(__dirname, '..', 'vendor', 'ffprobe');

console.log('=== FFprobe Auto-Installer ===');
console.log('Installing ffprobe for codec detection...\n');

// Create directories
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(VENDOR_DIR)) {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
}

/**
 * Download file from URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading from: ${url}`);
    console.log(`📁 Destination: ${dest}\n`);

    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;
    let totalBytes = 0;

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log('Following redirect...');
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      totalBytes = parseInt(response.headers['content-length'], 10);
      console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n✅ Download complete!\n');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

/**
 * Extract ffprobe.exe from zip
 */
function extractFFprobe(zipPath, destDir) {
  console.log('📦 Extracting ffprobe.exe...');
  
  try {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Find ffprobe.exe in the zip (it's usually in ffmpeg-xxx/bin/ffprobe.exe)
    let ffprobeEntry = null;
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('bin/ffprobe.exe')) {
        ffprobeEntry = entry;
        break;
      }
    }

    if (!ffprobeEntry) {
      throw new Error('ffprobe.exe not found in archive');
    }

    console.log(`Found: ${ffprobeEntry.entryName}`);

    // Extract to vendor directory
    const destPath = path.join(destDir, 'ffprobe.exe');
    fs.writeFileSync(destPath, ffprobeEntry.getData());

    console.log(`✅ Extracted to: ${destPath}`);
    
    // Verify the file
    const stats = fs.statSync(destPath);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Expected size is around 60-80 MB for ffprobe.exe
    if (stats.size < 1024 * 1024) {
      throw new Error('ffprobe.exe seems too small, extraction may have failed');
    }

    return destPath;
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
function cleanup() {
  console.log('\n🧹 Cleaning up temporary files...');
  
  try {
    if (fs.existsSync(FFPROBE_ZIP)) {
      fs.unlinkSync(FFPROBE_ZIP);
      console.log('✅ Removed temporary zip file');
    }
    
    // Try to remove temp directory if empty
    try {
      fs.rmdirSync(TEMP_DIR);
      console.log('✅ Removed temp directory');
    } catch (e) {
      // Directory not empty, that's fine
    }
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error.message);
  }
}

/**
 * Main installation process
 */
async function install() {
  try {
    // Check if ffprobe already exists
    const ffprobePath = path.join(VENDOR_DIR, 'ffprobe.exe');
    if (fs.existsSync(ffprobePath)) {
      const stats = fs.statSync(ffprobePath);
      console.log('ℹ️  ffprobe.exe already exists');
      console.log(`   Location: ${ffprobePath}`);
      console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('\n✅ FFprobe is already installed!');
      console.log('   To reinstall, delete vendor/ffprobe/ffprobe.exe and run this script again.\n');
      return;
    }

    // Download FFmpeg essentials (includes ffprobe)
    await downloadFile(FFPROBE_URL, FFPROBE_ZIP);

    // Extract ffprobe.exe
    const installedPath = extractFFprobe(FFPROBE_ZIP, VENDOR_DIR);

    // Clean up
    cleanup();

    console.log('\n🎉 FFprobe installation complete!');
    console.log(`   Installed to: ${installedPath}`);
    console.log('   Codec detection will now work automatically.\n');

  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    cleanup();
    process.exit(1);
  }
}

// Run installation
install();
