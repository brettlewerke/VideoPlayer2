#!/usr/bin/env node

/**
 * Development script to test playback of a specific file
 * Usage: npm run dev:play <ABS_PATH_TO_VIDEO_FILE>
 */

const { spawn } = require('child_process');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npm run dev:play <ABS_PATH_TO_VIDEO_FILE>');
  process.exit(1);
}

// Check if file exists
const fs = require('fs');
if (!fs.existsSync(filePath)) {
  console.error(`File does not exist: ${filePath}`);
  process.exit(1);
}

console.log(`Testing playback of: ${filePath}`);

// Start the app in dev mode
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DEV_PLAY_FILE: filePath }
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});