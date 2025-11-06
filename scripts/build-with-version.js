#!/usr/bin/env node

/**
 * Build with Version Script
 * 
 * Convenience script to set version and build in one command.
 * Usage: npm run build:version <version>
 * Example: npm run build:version 3.2.12
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    process.exit(1);
  }
}

// Get version from command line
const newVersion = process.argv[2];

if (!newVersion) {
  console.log('\n' + '='.repeat(60));
  log('📦 Build Current Version', 'bright');
  console.log('='.repeat(60));
  
  // Get current version
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  log(`Current Version: ${packageJson.version}`, 'cyan');
  log('Building with current version...', 'yellow');
  console.log('');
  
  // Just build with current version
  log('Building renderer...', 'yellow');
  exec('npm run build:renderer');
  
  log('Building main process...', 'yellow');
  exec('npm run build:main');
  
  log('Packaging application...', 'yellow');
  exec('npm run package');
  
} else {
  // Validate version format
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(newVersion)) {
    log('❌ Invalid version format!', 'red');
    log('Version must be in format: MAJOR.MINOR.PATCH (e.g., 3.2.12)', 'yellow');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  log('📦 Build with New Version', 'bright');
  console.log('='.repeat(60));
  
  log(`New Version: ${newVersion}`, 'cyan');
  console.log('');
  
  // Update version
  log('Step 1: Updating version...', 'yellow');
  exec(`node scripts/set-version.js ${newVersion}`);
  
  console.log('');
  log('Step 2: Building application...', 'yellow');
  console.log('');
  
  log('Building renderer...', 'yellow');
  exec('npm run build:renderer');
  
  log('Building main process...', 'yellow');
  exec('npm run build:main');
  
  log('Packaging application...', 'yellow');
  exec('npm run package');
}

console.log('');
log('✅ All done!', 'green');
console.log('');
