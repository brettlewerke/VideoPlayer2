/**
 * Clean Build Script
 * Removes old build artifacts to ensure clean builds
 * Usage: node scripts/clean.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Directories to clean
const dirsToClean = [
  'dist-packages',
  'dist-portable',
  'dist-manual',
];

// File patterns to clean from root directory
const filePatternsToClean = [
  /^H-Player-.*\.zip$/,           // Old H Player packages
  /^Hoser-Video-.*\.zip$/,        // Old Hoser Video packages
  /^Hoser-Video-Setup-.*\.exe$/,  // Old setup files in root
];

console.log('\n🧹 Cleaning build directories...\n');

// Clean directories
dirsToClean.forEach(dir => {
  const dirPath = path.join(rootDir, dir);
  
  if (fs.existsSync(dirPath)) {
    console.log(`   Removing ${dir}/...`);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`   ✓ ${dir}/ removed`);
    } catch (error) {
      console.error(`   ❌ Failed to remove ${dir}/: ${error.message}`);
    }
  } else {
    console.log(`   ○ ${dir}/ doesn't exist (already clean)`);
  }
});

// Clean old package files from root
console.log('\n🧹 Cleaning old package files from root...\n');
try {
  const rootFiles = fs.readdirSync(rootDir);
  let removedCount = 0;
  
  rootFiles.forEach(file => {
    const shouldRemove = filePatternsToClean.some(pattern => pattern.test(file));
    
    if (shouldRemove) {
      const filePath = path.join(rootDir, file);
      console.log(`   Removing ${file}...`);
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✓ ${file} removed`);
        removedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to remove ${file}: ${error.message}`);
      }
    }
  });
  
  if (removedCount === 0) {
    console.log('   ○ No old package files found (already clean)');
  }
} catch (error) {
  console.error(`   ❌ Error scanning root directory: ${error.message}`);
}

console.log('\n✅ Clean completed!\n');
