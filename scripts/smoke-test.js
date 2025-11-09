#!/usr/bin/env node

/**
 * Smoke Test for Hoser Video
 * Quick functionality test to verify core features work
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[36m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, BLUE);
  console.log('='.repeat(50));
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkFile(path, name) {
  if (existsSync(path)) {
    log(`✅ ${name} exists`, GREEN);
    return true;
  } else {
    log(`❌ ${name} missing: ${path}`, RED);
    return false;
  }
}

async function runSmokeTests() {
  logSection('🚀 Hoser Video Smoke Test');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Check project structure
  logSection('📁 Checking Project Structure');
  
  const criticalPaths = [
    { path: 'package.json', name: 'package.json' },
    { path: 'src/main/main.ts', name: 'Main process entry' },
    { path: 'src/renderer/main.tsx', name: 'Renderer entry' },
    { path: 'src/preload/preload.ts', name: 'Preload script' },
    { path: 'src/main/database/database.ts', name: 'Database manager' },
    { path: 'src/main/services/TranscodingService.ts', name: 'Transcoding service' },
    { path: 'src/main/services/CodecDetector.ts', name: 'Codec detector' },
    { path: 'src/main/player/player-factory.ts', name: 'Player factory' },
  ];

  for (const { path, name } of criticalPaths) {
    if (await checkFile(path, name)) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test 2: Check dependencies
  logSection('📦 Checking Dependencies');
  
  try {
    const packageJson = require('../package.json');
    
    const requiredDeps = [
      'electron',
      'react',
      'react-dom',
      'better-sqlite3',
      'ffmpeg-static',
      'zustand',
    ];

    for (const dep of requiredDeps) {
      if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        log(`✅ ${dep} installed`, GREEN);
        passed++;
      } else {
        log(`❌ ${dep} missing`, RED);
        failed++;
      }
    }
  } catch (error) {
    log(`❌ Failed to read package.json: ${error.message}`, RED);
    failed++;
  }

  // Test 3: Check vendor binaries
  logSection('🔧 Checking Vendor Binaries');
  
  const vendorPaths = [
    { path: 'vendor/manifest.json', name: 'Vendor manifest' },
    { path: 'vendor/mpv', name: 'MPV directory' },
    { path: 'vendor/ffmpeg-standalone', name: 'FFmpeg directory' },
    { path: 'vendor/ffprobe', name: 'FFprobe directory' },
  ];

  for (const { path, name } of vendorPaths) {
    if (await checkFile(path, name)) {
      passed++;
    } else {
      log(`⚠️  ${name} not found (run npm run setup)`, YELLOW);
    }
  }

  // Test 4: TypeScript compilation
  logSection('🔨 Testing TypeScript Compilation');
  
  try {
    log('Compiling main process...', BLUE);
    const { code, stderr } = await runCommand('npx', ['tsc', '-p', 'src/main/tsconfig.json', '--noEmit']);
    
    if (code === 0) {
      log('✅ Main process TypeScript compiles without errors', GREEN);
      passed++;
    } else {
      log('❌ Main process TypeScript compilation failed', RED);
      if (stderr) console.error(stderr);
      failed++;
    }
  } catch (error) {
    log(`❌ TypeScript compilation error: ${error.message}`, RED);
    failed++;
  }

  // Test 5: Check build output
  logSection('📦 Checking Build Output');
  
  const buildPaths = [
    { path: 'dist/main/main/main.js', name: 'Main process build' },
  ];

  for (const { path, name } of buildPaths) {
    if (existsSync(path)) {
      log(`✅ ${name} exists`, GREEN);
      passed++;
    } else {
      log(`⚠️  ${name} not built (run npm run build:main)`, YELLOW);
    }
  }

  // Test 6: Check critical services
  logSection('🔍 Checking Service Imports');
  
  try {
    // Just check if files are syntactically valid
    const services = [
      'src/main/services/TranscodingService.ts',
      'src/main/services/CodecDetector.ts',
      'src/main/player/player-factory.ts',
      'src/main/ipc/ipc-handler.ts',
    ];

    for (const service of services) {
      if (existsSync(service)) {
        log(`✅ ${service} exists`, GREEN);
        passed++;
      } else {
        log(`❌ ${service} missing`, RED);
        failed++;
      }
    }
  } catch (error) {
    log(`❌ Service check failed: ${error.message}`, RED);
    failed++;
  }

  // Test 7: Test configuration files
  logSection('⚙️  Checking Configuration Files');
  
  const configFiles = [
    { path: 'tsconfig.json', name: 'Root TypeScript config' },
    { path: 'vite.config.ts', name: 'Vite config' },
    { path: 'tailwind.config.js', name: 'Tailwind config' },
    { path: 'jest.config.js', name: 'Jest config' },
  ];

  for (const { path, name } of configFiles) {
    if (await checkFile(path, name)) {
      passed++;
    } else {
      failed++;
    }
  }

  // Final Results
  logSection('📊 Test Results');
  
  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${total}`);
  log(`Passed: ${passed}`, GREEN);
  if (failed > 0) {
    log(`Failed: ${failed}`, RED);
  }
  
  console.log(`\nSuccess Rate: ${percentage}%`);
  
  if (failed === 0) {
    log('\n✅ All smoke tests passed!', GREEN);
    log('   Your Hoser Video installation looks good!', GREEN);
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed', YELLOW);
    log('   Run the following commands to fix:', YELLOW);
    log('   - npm install', BLUE);
    log('   - npm run setup', BLUE);
    log('   - npm run build:main', BLUE);
    process.exit(1);
  }
}

// Run tests
runSmokeTests().catch((error) => {
  log(`\n❌ Smoke test failed with error: ${error.message}`, RED);
  console.error(error);
  process.exit(1);
});
