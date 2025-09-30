/**
 * Validation script for packaging fixes
 * Run with: node scripts/validate-packaging.js
 */

const fs = require('fs');
const path = require('path');

console.log('=== H Player Packaging Validation ===\n');

let errors = 0;
let warnings = 0;

function error(msg) {
  console.error(`❌ ERROR: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`⚠️  WARNING: ${msg}`);
  warnings++;
}

function success(msg) {
  console.log(`✅ ${msg}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    success(`${description}: ${filePath}`);
    return true;
  } else {
    error(`${description} not found: ${filePath}`);
    return false;
  }
}

function checkFileContains(filePath, searchString, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    error(`File not found for check: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchString)) {
    success(`${description} in ${filePath}`);
    return true;
  } else {
    error(`${description} not found in ${filePath}`);
    return false;
  }
}

// 1. Check source files exist
console.log('1. Checking source files...');
checkFile('src/common/ipc-channels.ts', 'Common IPC channels');
checkFile('src/preload/preload.ts', 'Preload script');
checkFile('src/renderer/types/global.d.ts', 'Type declarations');
checkFile('src/renderer/store/useAppStore.ts', 'App store');
checkFile('src/renderer/components/EmptyState.tsx', 'Empty state component');
checkFile('src/renderer/App.tsx', 'Main App component');
checkFile('src/main/main.ts', 'Main process');
console.log('');

// 2. Check compiled files exist
console.log('2. Checking compiled files...');
const hasMainJs = checkFile('dist/main/main/main.js', 'Compiled main process');
const hasPreloadJs = checkFile('dist/main/preload/preload.js', 'Compiled preload');
checkFile('dist/renderer/index.html', 'Compiled renderer HTML');
console.log('');

// 3. Check preload has no relative imports
console.log('3. Checking preload bundle...');
if (hasPreloadJs) {
  const preloadPath = path.join(__dirname, '..', 'dist/main/preload/preload.js');
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  
  // Check for problematic imports
  if (preloadContent.includes('../shared/ipc')) {
    error('Preload contains relative import to ../shared/ipc');
  } else if (preloadContent.includes('require("../shared')) {
    error('Preload contains require call to ../shared');
  } else if (preloadContent.includes('require("../../shared')) {
    error('Preload contains require call to ../../shared');
  } else {
    success('Preload has no problematic relative imports');
  }
  
  // Check for inlined IPC_CHANNELS
  if (preloadContent.includes('IPC_CHANNELS')) {
    success('Preload contains inlined IPC_CHANNELS');
  } else {
    warn('Preload may be missing IPC_CHANNELS constant');
  }
  
  // Check for HPlayerAPI
  if (preloadContent.includes('HPlayerAPI')) {
    success('Preload exposes HPlayerAPI namespace');
  } else {
    error('Preload does not expose HPlayerAPI');
  }
}
console.log('');

// 4. Check main process __dirname usage
console.log('4. Checking main process paths...');
if (hasMainJs) {
  const mainPath = path.join(__dirname, '..', 'dist/main/main/main.js');
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  
  // Check for proper preload path
  if (mainContent.includes("'../preload/preload.js'") || mainContent.includes('"../preload/preload.js"')) {
    success('Main process uses relative preload path');
  } else {
    warn('Main process may not be using correct preload path');
  }
  
  // Check for proper renderer path
  if (mainContent.includes("'../../renderer/index.html'") || mainContent.includes('"../../renderer/index.html"')) {
    success('Main process uses relative renderer path');
  } else {
    warn('Main process may not be using correct renderer path');
  }
}
console.log('');

// 5. Check TypeScript config
console.log('5. Checking TypeScript configuration...');
checkFileContains('tsconfig.json', '@common/*', 'Path alias @common/*');
checkFileContains('tsconfig.json', '@renderer/*', 'Path alias @renderer/*');
checkFileContains('src/main/tsconfig.json', '@common/*', 'Main tsconfig has @common/*');
console.log('');

// 6. Check store guards
console.log('6. Checking store API guards...');
checkFileContains('src/renderer/store/useAppStore.ts', 'getAPI()', 'Store uses getAPI() helper');
checkFileContains('src/renderer/store/useAppStore.ts', 'status:', 'Store has status field');
checkFileContains('src/renderer/store/useAppStore.ts', 'no-drives', 'Store handles no-drives state');
checkFileContains('src/renderer/store/useAppStore.ts', 'no-folders', 'Store handles no-folders state');
console.log('');

// 7. Check App.tsx bridge check
console.log('7. Checking App bridge readiness...');
checkFileContains('src/renderer/App.tsx', 'bridgeReady', 'App checks bridge readiness');
checkFileContains('src/renderer/App.tsx', 'ping()', 'App pings API');
checkFileContains('src/renderer/App.tsx', 'bridgeError', 'App handles bridge errors');
console.log('');

// 8. Check empty state integration
console.log('8. Checking empty state integration...');
checkFileContains('src/renderer/pages/HomePage.tsx', 'EmptyState', 'HomePage imports EmptyState');
checkFileContains('src/renderer/pages/HomePage.tsx', 'no-drives', 'HomePage handles no-drives');
checkFileContains('src/renderer/pages/HomePage.tsx', 'no-folders', 'HomePage handles no-folders');
console.log('');

// 9. Check package.json
console.log('9. Checking package.json build config...');
checkFileContains('package.json', '"dist/**/*"', 'package.json includes dist in files');
console.log('');

// Summary
console.log('=== Validation Summary ===');
if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed! Ready for development and packaging.');
} else {
  if (errors > 0) {
    console.log(`❌ Found ${errors} error(s)`);
  }
  if (warnings > 0) {
    console.log(`⚠️  Found ${warnings} warning(s)`);
  }
  process.exit(1);
}
