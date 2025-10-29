#!/usr/bin/env node
/**
 * Delayed dev:main starter
 * Waits a bit for Vite to start, then compiles TypeScript and starts Electron
 */

const { execSync } = require('child_process');

console.log('[dev-main] Waiting 2 seconds for Vite to start...');

setTimeout(() => {
  console.log('[dev-main] Starting TypeScript compilation and Electron...');
  try {
    execSync('tsc -p src/main/tsconfig.json && npx cross-env NODE_ENV=development electron dist/main/main/main.js', {
      stdio: 'inherit',
      shell: true
    });
  } catch (error) {
    console.error('[dev-main] Error:', error.message);
    process.exit(1);
  }
}, 2000);
