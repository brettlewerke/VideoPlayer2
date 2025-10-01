/**
 * Generate test media assets for A/V/subtitle validation
 * Uses ffmpeg if available, otherwise provides guidance
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const FIXTURES_DIR = join(__dirname, '..', 'tests', 'fixtures');
const COLORBAR_OUTPUT = join(FIXTURES_DIR, 'colorbars_10s.mp4');

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function generateColorBars() {
  console.log('Generating color bars test video...');
  
  const command = `ffmpeg -y -f lavfi -i testsrc=duration=10:size=640x480:rate=30 -f lavfi -i sine=frequency=1000:duration=10:sample_rate=48000 -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -shortest "${COLORBAR_OUTPUT}"`;
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Generated: ${COLORBAR_OUTPUT}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to generate color bars video');
    return false;
  }
}

function main() {
  // Ensure fixtures directory exists
  if (!existsSync(FIXTURES_DIR)) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  if (!checkFfmpeg()) {
    console.error('⚠ ffmpeg not found in PATH');
    console.log('');
    console.log('To generate test assets, install ffmpeg:');
    console.log('  - Windows: choco install ffmpeg');
    console.log('  - macOS: brew install ffmpeg');
    console.log('  - Linux: sudo apt install ffmpeg');
    console.log('');
    console.log('Alternatively, tiny prebuilt test files are committed to the repo.');
    process.exit(1);
  }

  console.log('Generating test media assets...\n');
  
  if (existsSync(COLORBAR_OUTPUT)) {
    console.log(`ℹ ${COLORBAR_OUTPUT} already exists (skipping)`);
  } else {
    generateColorBars();
  }

  console.log('\n✓ Test asset generation complete');
}

main();
