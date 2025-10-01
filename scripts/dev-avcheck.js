/**
 * Dev-only A/V/Subtitle health check
 * Validates embedded player functionality end-to-end
 */

const { spawn } = require('child_process');
const { join } = require('path');
const { existsSync } = require('fs');

const FIXTURES_DIR = join(__dirname, '..', 'tests', 'fixtures');
const TEST_VIDEO = join(FIXTURES_DIR, 'colorbars_10s.mp4');
const TEST_SUBTITLE = join(FIXTURES_DIR, 'sample_en.srt');

async function main() {
  console.log('🔬 Starting A/V/Subtitle Health Check\n');

  // Check test assets exist
  if (!existsSync(TEST_VIDEO)) {
    console.error(`✗ Test video not found: ${TEST_VIDEO}`);
    console.log('  Run: npm run dev:avassets\n');
    process.exit(1);
  }

  console.log('✓ Test assets found');
  console.log(`  Video: ${TEST_VIDEO}`);
  console.log(`  Subtitle: ${existsSync(TEST_SUBTITLE) ? TEST_SUBTITLE : 'N/A'}\n`);

  console.log('Starting Hoser Video in dev mode...');
  console.log('The app will open with a test modal. Follow the on-screen instructions.\n');

  // Set environment variable to trigger test mode
  const env = { ...process.env, AV_CHECK_MODE: '1' };

  // Start dev server
  const devProcess = spawn('npm', ['run', 'dev'], {
    env,
    stdio: 'inherit',
    shell: true,
  });

  devProcess.on('error', (error) => {
    console.error('Failed to start dev server:', error);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n\nStopping dev server...');
    devProcess.kill();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
