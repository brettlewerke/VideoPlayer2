/**
 * Version Update Script
 * Updates version number across all project files
 * Usage: node scripts/set-version.js <version>
 * Example: node scripts/set-version.js 1.5.0
 */

const fs = require('fs');
const path = require('path');

// Get version from command line argument
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('❌ Error: Version number required');
  console.log('Usage: node scripts/set-version.js <version>');
  console.log('Example: node scripts/set-version.js 1.5.0');
  process.exit(1);
}

// Validate version format (semantic versioning)
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
  console.error('❌ Error: Invalid version format');
  console.log('Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.5.0)');
  process.exit(1);
}

console.log(`\n🔄 Updating version to ${newVersion}...\n`);

// Files to update
const rootDir = path.join(__dirname, '..');

// 1. Update package.json
console.log('📦 Updating package.json...');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log('   ✓ package.json updated');

// 2. Update installer.nsi
console.log('📦 Updating installer.nsi...');
const installerPath = path.join(rootDir, 'installer.nsi');
let installerContent = fs.readFileSync(installerPath, 'utf8');

// Update OutFile
installerContent = installerContent.replace(
  /OutFile "H-Player-Setup-.*\.exe"/,
  `OutFile "H-Player-Setup-${newVersion}.exe"`
);

// Update VIProductVersion (needs 4 parts: 1.2.0.0)
installerContent = installerContent.replace(
  /VIProductVersion "\d+\.\d+\.\d+\.\d+"/,
  `VIProductVersion "${newVersion}.0"`
);

// Update FileVersion
installerContent = installerContent.replace(
  /VIAddVersionKey "FileVersion" "\d+\.\d+\.\d+\.\d+"/,
  `VIAddVersionKey "FileVersion" "${newVersion}.0"`
);

// Update ProductVersion
installerContent = installerContent.replace(
  /VIAddVersionKey "ProductVersion" "\d+\.\d+\.\d+\.\d+"/,
  `VIAddVersionKey "ProductVersion" "${newVersion}.0"`
);

// Update DisplayVersion
installerContent = installerContent.replace(
  /WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\H Player" "DisplayVersion" "\d+\.\d+\.\d+"/,
  `WriteRegStr HKLM "Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Uninstall\\\\H Player" "DisplayVersion" "${newVersion}"`
);

fs.writeFileSync(installerPath, installerContent, 'utf8');
console.log('   ✓ installer.nsi updated');

// 3. Update package-lock.json if it exists
const packageLockPath = path.join(rootDir, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
  console.log('📦 Updating package-lock.json...');
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  packageLock.version = newVersion;
  if (packageLock.packages && packageLock.packages['']) {
    packageLock.packages[''].version = newVersion;
  }
  fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + '\n', 'utf8');
  console.log('   ✓ package-lock.json updated');
}

console.log(`\n✅ Version updated to ${newVersion} successfully!\n`);
console.log('📝 Files updated:');
console.log('   - package.json');
console.log('   - installer.nsi');
if (fs.existsSync(packageLockPath)) {
  console.log('   - package-lock.json');
}
console.log('\n💡 Next steps:');
console.log('   1. Review changes: git diff');
console.log('   2. Build the project: npm run build');
console.log('   3. Commit changes: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('   4. Create git tag: git tag v' + newVersion);
console.log('\n');
