#!/usr/bin/env node

/**
 * Icon generation script for H Player
 * Converts SVG logo to PNG icons of various sizes
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.dirname(__dirname);
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets', 'brand');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
const ICONS_DIR = path.join(BUILD_DIR, 'icons');

const SVG_PATH = path.join(ASSETS_DIR, 'H-logo.svg');

// Icon sizes needed for different platforms
const ICON_SIZES = [
  16, 24, 32, 48, 64, 128, 256, 512,  // General sizes
  20, 40, 60, 80, 100,  // Additional sizes
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
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

/**
 * Generate PNG icon from SVG
 */
async function generateIcon(size) {
  const outputPath = path.join(ICONS_DIR, `${size}x${size}.png`);

  try {
    await sharp(SVG_PATH)
      .resize(size, size)
      .png({
        quality: 100,
        compressionLevel: 6,
      })
      .toFile(outputPath);

    logSuccess(`Generated ${size}x${size}.png`);
    return outputPath;
  } catch (error) {
    logError(`Failed to generate ${size}x${size}.png: ${error.message}`);
    throw error;
  }
}

/**
 * Generate Windows ICO file
 */
async function generateWindowsIcon() {
  const icoPath = path.join(BUILD_DIR, 'icon.ico');

  try {
    // Use multiple sizes for ICO (16x16, 32x32, 48x48, 256x256)
    const icoSizes = [16, 32, 48, 256];
    const icoBuffers = [];

    for (const size of icoSizes) {
      const pngPath = path.join(ICONS_DIR, `${size}x${size}.png`);
      if (fs.existsSync(pngPath)) {
        const buffer = fs.readFileSync(pngPath);
        icoBuffers.push({ size, buffer });
      }
    }

    if (icoBuffers.length === 0) {
      throw new Error('No PNG files found for ICO generation');
    }

    // For now, just copy the 256x256 as ICO (proper ICO generation would need additional library)
    // This is a placeholder - in production you'd use a proper ICO library
    const largestIcon = icoBuffers[icoBuffers.length - 1];
    fs.copyFileSync(path.join(ICONS_DIR, `${largestIcon.size}x${largestIcon.size}.png`), icoPath);

    logSuccess('Generated icon.ico (placeholder)');
    return icoPath;
  } catch (error) {
    logError(`Failed to generate icon.ico: ${error.message}`);
    throw error;
  }
}

/**
 * Generate macOS ICNS file (placeholder)
 */
async function generateMacIcon() {
  const icnsPath = path.join(BUILD_DIR, 'icon.icns');

  try {
    // For now, just copy the 512x512 PNG as ICNS placeholder
    // Proper ICNS generation would require additional tools
    const sourcePng = path.join(ICONS_DIR, '512x512.png');
    if (fs.existsSync(sourcePng)) {
      fs.copyFileSync(sourcePng, icnsPath);
      logSuccess('Generated icon.icns (placeholder)');
      return icnsPath;
    } else {
      throw new Error('512x512.png not found for ICNS generation');
    }
  } catch (error) {
    logError(`Failed to generate icon.icns: ${error.message}`);
    throw error;
  }
}

/**
 * Main icon generation function
 */
async function main() {
  log('\\n' + '='.repeat(60), 'blue');
  log('H Player Icon Generation', 'blue');
  log('='.repeat(60), 'blue');
  log('\\nGenerating PNG icons from H-logo.svg\\n', 'bright');

  try {
    // Ensure directories exist
    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    // Check if SVG exists
    if (!fs.existsSync(SVG_PATH)) {
      throw new Error(`SVG source not found: ${SVG_PATH}`);
    }

    logStep('1/4', 'Generating PNG icons...');

    // Generate PNG icons of all sizes
    const pngPromises = ICON_SIZES.map(size => generateIcon(size));
    await Promise.all(pngPromises);

    logStep('2/4', 'Generating Windows ICO...');
    await generateWindowsIcon();

    logStep('3/4', 'Generating macOS ICNS...');
    await generateMacIcon();

    logStep('4/4', 'Verifying generated files...');

    // Verify all files were created
    const expectedFiles = [
      ...ICON_SIZES.map(size => path.join(ICONS_DIR, `${size}x${size}.png`)),
      path.join(BUILD_DIR, 'icon.ico'),
      path.join(BUILD_DIR, 'icon.icns'),
    ];

    let missingFiles = [];
    for (const file of expectedFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(path.relative(PROJECT_ROOT, file));
      }
    }

    if (missingFiles.length > 0) {
      logWarning(`Missing files: ${missingFiles.join(', ')}`);
    } else {
      logSuccess('All icon files generated successfully');
    }

    log('\\n' + '='.repeat(60), 'green');
    log('Icon generation completed!', 'green');
    log('='.repeat(60), 'green');

    log('\\nGenerated files:', 'bright');
    log(`  • PNG icons: ${ICON_SIZES.length} sizes in build/icons/`, 'cyan');
    log('  • Windows ICO: build/icon.ico', 'cyan');
    log('  • macOS ICNS: build/icon.icns', 'cyan');

    log('\\nThe H logo features:', 'bright');
    log('  • Stylized letter "H" in green gradient', 'cyan');
    log('  • Black rounded rectangle background', 'cyan');
    log('  • Subtle glow effect', 'cyan');
    log('  • Clean, modern design for media player branding', 'cyan');

  } catch (error) {
    log('\\n' + '='.repeat(60), 'red');
    log('Icon generation failed!', 'red');
    log('='.repeat(60), 'red');
    logError(error.message);
    log('\\nPlease check the error above and try again.', 'bright');
    process.exit(1);
  }
}

// Run icon generation if this script is called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateIcon,
  generateWindowsIcon,
  generateMacIcon,
};