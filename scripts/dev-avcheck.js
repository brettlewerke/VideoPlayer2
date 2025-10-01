#!/usr/bin/env node

/**
 * Development A/V self-test script
 * Tests video playback, audio, and subtitles end-to-end with embedded backend
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const SAMPLE_VIDEO = path.join(FIXTURES_DIR, 'colorbars_10s.mp4');
const SAMPLE_SUBS = path.join(FIXTURES_DIR, 'sample_en.srt');

async function main() {
  console.log('🎬 Hoser Video - A/V Self-Test');
  console.log('================================');

  // Check for test files
  if (!fs.existsSync(SAMPLE_VIDEO)) {
    console.log('❌ Test video not found:', SAMPLE_VIDEO);
    console.log('Please create a 10-second H.264/AAC test video');
    process.exit(1);
  }

  console.log('✅ Test video found');

  if (!fs.existsSync(SAMPLE_SUBS)) {
    console.log('⚠️  Test subtitles not found, subtitles test will be skipped');
  } else {
    console.log('✅ Test subtitles found');
  }

  // Start Vite dev server
  console.log('\n🚀 Starting Vite dev server...');
  const vite = spawn('npm', ['run', 'dev:renderer'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.join(__dirname, '..')
  });

  // Wait for Vite to be ready
  await new Promise((resolve) => {
    let ready = false;
    vite.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Vite]', output.trim());
      if (output.includes('ready in') && !ready) {
        ready = true;
        setTimeout(resolve, 2000); // Wait a bit more
      }
    });
  });

  // Start Electron
  console.log('\n⚡ Starting Electron...');
  const electron = spawn('npm', ['run', 'dev:main'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DEV_AV_TEST: 'true' },
    cwd: path.join(__dirname, '..')
  });

  let testResults = {
    videoDecoded: false,
    audioTracks: false,
    subtitleTracks: false,
    playbackControls: false,
    seekTest: false
  };

  // Monitor Electron output for test results
  electron.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[Electron]', output.trim());

    // Parse test results from logs
    if (output.includes('AV_TEST: video_decoded')) testResults.videoDecoded = true;
    if (output.includes('AV_TEST: audio_tracks')) testResults.audioTracks = true;
    if (output.includes('AV_TEST: subtitle_tracks')) testResults.subtitleTracks = true;
    if (output.includes('AV_TEST: playback_controls')) testResults.playbackControls = true;
    if (output.includes('AV_TEST: seek_test')) testResults.seekTest = true;
  });

  electron.stderr.on('data', (data) => {
    console.error('[Electron Error]', data.toString().trim());
  });

  // Wait for test completion or timeout
  const timeout = setTimeout(() => {
    console.log('\n⏰ Test timeout after 30 seconds');
    electron.kill();
    vite.kill();
    showResults(testResults);
  }, 30000);

  electron.on('exit', (code) => {
    clearTimeout(timeout);
    vite.kill();
    console.log(`\n📊 Test completed with exit code: ${code}`);
    showResults(testResults);
  });
}

function showResults(results) {
  console.log('\n📋 Test Results:');
  console.log('================');

  const checks = [
    { name: 'Video decoded and displayed', status: results.videoDecoded },
    { name: 'Audio tracks detected', status: results.audioTracks },
    { name: 'Subtitle tracks selectable', status: results.subtitleTracks },
    { name: 'Playback controls functional', status: results.playbackControls },
    { name: 'Seek functionality works', status: results.seekTest }
  ];

  let passed = 0;
  for (const check of checks) {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (check.status) passed++;
  }

  console.log(`\n🎯 Score: ${passed}/${checks.length}`);

  if (passed === checks.length) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check logs above.');
    console.log('💡 Suggestions:');
    console.log('   - Try disabling hardware acceleration in Settings');
    console.log('   - Switch backend to mpv/libVLC if available');
    console.log('   - Ensure test fixtures are valid media files');
  }

  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});