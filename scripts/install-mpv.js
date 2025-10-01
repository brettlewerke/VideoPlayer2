/**
 * Auto-installer for MPV video player
 * Downloads and installs MPV portable for full codec support
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// MPV download URL - using direct GitHub release with 7z (latest build)
const MPV_URL = 'https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/20250929/mpv-x86_64-20250929-git-7037ff4.7z';
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const MPV_ARCHIVE = path.join(TEMP_DIR, 'mpv-portable.7z');
const VENDOR_MPV_DIR = path.join(__dirname, '..', 'vendor', 'mpv');
const FINAL_MPV_DIR = path.join(VENDOR_MPV_DIR, 'win32-x64');

console.log('=== MPV Auto-Installer ===');
console.log('Installing MPV player for full codec support (AC3, DTS, E-AC3, etc.)...\n');

// Check if already installed
const mpvExePath = path.join(FINAL_MPV_DIR, 'mpv.exe');
if (fs.existsSync(mpvExePath)) {
  console.log('✅ MPV is already installed at:', mpvExePath);
  console.log('Skipping download.\n');
  process.exit(0);
}

// Create directories
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(VENDOR_MPV_DIR)) {
  fs.mkdirSync(VENDOR_MPV_DIR, { recursive: true });
}

if (!fs.existsSync(FINAL_MPV_DIR)) {
  fs.mkdirSync(FINAL_MPV_DIR, { recursive: true });
}

/**
 * Download file from URL with redirect support
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading MPV from GitHub...`);
    console.log(`📁 Destination: ${dest}\n`);

    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let redirectCount = 0;
    const MAX_REDIRECTS = 10;

    const doRequest = (requestUrl) => {
      https.get(requestUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            reject(new Error('Too many redirects'));
            return;
          }
          console.log(`Following redirect ${redirectCount}...`);
          return doRequest(response.headers.location);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        if (totalBytes > 0) {
          console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
        }

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
          }
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
    };

    doRequest(url);
  });
}

/**
 * Extract 7z archive using PowerShell (Windows built-in)
 */
function extract7z(archivePath, destPath) {
  console.log('📦 Extracting MPV archive...');
  console.log(`From: ${archivePath}`);
  console.log(`To: ${destPath}\n`);

  try {
    // Use PowerShell's Expand-Archive... wait, that's for ZIP only
    // Use 7z if available, otherwise try tar (Windows 10+ has bsdtar)
    
    // Try using tar (available in Windows 10+)
    try {
      console.log('Trying Windows built-in tar...');
      execSync(`tar -xf "${archivePath}" -C "${destPath}"`, { stdio: 'inherit' });
      console.log('✅ Extraction complete!\n');
      return true;
    } catch (tarError) {
      console.log('Built-in tar failed, trying 7-Zip...');
    }

    // Try 7-Zip if installed
    const sevenZipPaths = [
      'C:\\Program Files\\7-Zip\\7z.exe',
      'C:\\Program Files (x86)\\7-Zip\\7z.exe',
      '7z' // In PATH
    ];

    for (const sevenZipPath of sevenZipPaths) {
      try {
        execSync(`"${sevenZipPath}" x "${archivePath}" -o"${destPath}" -y`, { stdio: 'inherit' });
        console.log('✅ Extraction complete!\n');
        return true;
      } catch (e) {
        continue;
      }
    }

    throw new Error('Could not find 7-Zip or tar to extract archive');
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    return false;
  }
}

/**
 * Move MPV files to final location
 */
function moveMPVFiles(extractPath, finalPath) {
  console.log('� Moving MPV files to vendor directory...\n');

  // Find the mpv.exe in extracted files
  const files = fs.readdirSync(extractPath, { recursive: true });
  let mpvExeFound = false;

  for (const file of files) {
    const fullPath = path.join(extractPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const fileName = path.basename(file);
      const destPath = path.join(finalPath, fileName);

      // Copy file
      fs.copyFileSync(fullPath, destPath);

      if (fileName === 'mpv.exe') {
        mpvExeFound = true;
        console.log(`✅ Copied: ${fileName}`);
      }
    }
  }

  if (!mpvExeFound) {
    throw new Error('mpv.exe not found in extracted files');
  }

  console.log('\n✅ MPV files copied successfully!\n');
}

/**
 * Cleanup temporary files
 */
function cleanup() {
  console.log('🧹 Cleaning up temporary files...\n');

  try {
    if (fs.existsSync(MPV_ARCHIVE)) {
      fs.unlinkSync(MPV_ARCHIVE);
    }
    
    // Remove temp extraction directory if it exists
    const tempExtractDir = path.join(TEMP_DIR, 'mpv-extract');
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }

    console.log('✅ Cleanup complete!\n');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

/**
 * Main installation process
 */
async function install() {
  try {
    console.log('🎬 Starting MPV installation...\n');

    // Download MPV
    await downloadFile(MPV_URL, MPV_ARCHIVE);

    // Extract to temp directory
    const tempExtractDir = path.join(TEMP_DIR, 'mpv-extract');
    if (!fs.existsSync(tempExtractDir)) {
      fs.mkdirSync(tempExtractDir, { recursive: true });
    }

    const extractSuccess = extract7z(MPV_ARCHIVE, tempExtractDir);
    if (!extractSuccess) {
      throw new Error('Failed to extract MPV archive');
    }

    // Move files to vendor directory
    moveMPVFiles(tempExtractDir, FINAL_MPV_DIR);

    // Cleanup
    cleanup();

    // Verify installation
    if (fs.existsSync(mpvExePath)) {
      const stats = fs.statSync(mpvExePath);
      console.log('✅ MPV successfully installed!');
      console.log(`📍 Location: ${mpvExePath}`);
      console.log(`📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);
      console.log('🎉 Your app now supports AC3, E-AC3, DTS, and all other codecs!\n');
    } else {
      throw new Error('Installation completed but mpv.exe not found');
    }

  } catch (error) {
    console.error('\n❌ MPV installation failed:', error.message);
    console.log('\n📋 Manual Installation Steps:');
    console.log('1. Download MPV from: https://github.com/shinchiro/mpv-winbuild-cmake/releases');
    console.log('2. Extract to: vendor/mpv/win32-x64/');
    console.log('3. Ensure mpv.exe exists at: vendor/mpv/win32-x64/mpv.exe');
    console.log('');
    console.log('The app will still work with HTML5 video for AAC/MP3 codecs.');
    console.log('MPV is only needed for AC3, E-AC3, DTS, and other advanced codecs.\n');
    
    // Don't fail the build - MPV is optional
    process.exit(0);
  }
}

// Run installation
install();
