/**
 * Build with Version Update Script
 * Updates version number and builds the project
 * Usage: node scripts/build-version.js <version>
 * Example: node scripts/build-version.js 1.5.0
 */

const { execSync } = require('child_process');
const path = require('path');

// Get version from command line argument
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('❌ Error: Version number required');
  console.log('Usage: node scripts/build-version.js <version>');
  console.log('Example: node scripts/build-version.js 1.5.0');
  process.exit(1);
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
  console.error('❌ Error: Invalid version format');
  console.log('Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.5.0)');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log(`🚀 Building Hoser Video v${newVersion}`);
console.log('='.repeat(60) + '\n');

try {
  // Step 1: Update version
  console.log('📋 Step 1/2: Updating version numbers...\n');
  execSync(`node scripts/set-version.js ${newVersion}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  // Step 2: Build
  console.log('\n📋 Step 2/2: Building project...\n');
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Build completed successfully!`);
  console.log('='.repeat(60) + '\n');
  console.log(`📦 Installer created: dist-packages\\Hoser-Video-Setup-${newVersion}.exe`);
  console.log(`📁 Unpacked build: dist-packages\\win-unpacked\\Hoser Video.exe`);
  console.log('\n💡 Ready to distribute!\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
