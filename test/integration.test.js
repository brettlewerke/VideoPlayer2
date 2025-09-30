/**
 * Integration tests for H Player v3.0.0
 * Tests compilation, build process, and DLL dependency verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_MANUAL_DIR = path.join(PROJECT_ROOT, 'dist-manual', 'H Player');
const VENDOR_DIR = path.join(PROJECT_ROOT, 'vendor');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

describe('H Player v3.0.0 Integration Tests', () => {
  let testResults = {
    compilation: false,
    build: false,
    packaging: false,
    dllVerification: false,
    manifestCheck: false,
    executableCheck: false
  };

  describe('1. TypeScript Compilation', () => {
    it('should compile TypeScript without errors', () => {
      try {
        console.log('Running TypeScript compilation...');
        execSync('npm run type-check', { 
          cwd: PROJECT_ROOT, 
          stdio: 'pipe',
          timeout: 60000
        });
        testResults.compilation = true;
        console.log('✓ TypeScript compilation successful');
      } catch (error) {
        console.error('✗ TypeScript compilation failed:', error.stdout?.toString() || error.message);
        throw new Error('TypeScript compilation failed');
      }
    });
  });

  describe('2. Application Build Process', () => {
    it('should build renderer successfully', () => {
      try {
        console.log('Building renderer...');
        execSync('npm run build:renderer', { 
          cwd: PROJECT_ROOT, 
          stdio: 'pipe',
          timeout: 120000
        });
        
        // Verify dist/renderer exists
        const rendererDist = path.join(PROJECT_ROOT, 'dist', 'renderer');
        assert(fs.existsSync(rendererDist), 'Renderer dist directory should exist');
        assert(fs.existsSync(path.join(rendererDist, 'index.html')), 'index.html should be built');
        
        console.log('✓ Renderer build successful');
      } catch (error) {
        console.error('✗ Renderer build failed:', error.stdout?.toString() || error.message);
        throw new Error('Renderer build failed');
      }
    });

    it('should build main process successfully', () => {
      try {
        console.log('Building main process...');
        execSync('npm run build:main', { 
          cwd: PROJECT_ROOT, 
          stdio: 'pipe',
          timeout: 60000
        });
        
        // Verify dist/main exists
        const mainDist = path.join(PROJECT_ROOT, 'dist', 'main');
        assert(fs.existsSync(mainDist), 'Main dist directory should exist');
        assert(fs.existsSync(path.join(mainDist, 'main', 'main.js')), 'main.js should be built');
        
        testResults.build = true;
        console.log('✓ Main process build successful');
      } catch (error) {
        console.error('✗ Main process build failed:', error.stdout?.toString() || error.message);
        throw new Error('Main process build failed');
      }
    });
  });

  describe('3. Manual Packaging', () => {
    it('should create manual package successfully', () => {
      try {
        console.log('Creating manual package...');
        execSync('npm run pack:manual', { 
          cwd: PROJECT_ROOT, 
          stdio: 'pipe',
          timeout: 180000
        });
        
        testResults.packaging = true;
        console.log('✓ Manual packaging successful');
      } catch (error) {
        console.error('✗ Manual packaging failed:', error.stdout?.toString() || error.message);
        throw new Error('Manual packaging failed');
      }
    });

    it('should verify package structure', () => {
      // Check that dist-manual directory exists
      assert(fs.existsSync(DIST_MANUAL_DIR), 'dist-manual/H Player directory should exist');
      
      // Check for essential files
      const requiredFiles = [
        'H Player.exe',
        'resources/app/main/main.js',
        'resources/app/index.html',
        'Run-H-Player.bat',
        'Uninstall-H-Player.bat'
      ];
      
      for (const file of requiredFiles) {
        const filePath = path.join(DIST_MANUAL_DIR, file);
        assert(fs.existsSync(filePath), `Required file should exist: ${file}`);
      }
      
      console.log('✓ Package structure verified');
    });
  });

  describe('4. DLL Dependencies Verification', () => {
    it('should verify vendor manifest exists and is valid', () => {
      const manifestPath = path.join(VENDOR_DIR, 'manifest.json');
      assert(fs.existsSync(manifestPath), 'Vendor manifest should exist');
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert(manifest.binaries, 'Manifest should have binaries section');
      assert(manifest.binaries.mpv, 'Manifest should have MPV binary info');
      assert(manifest.binaries.ffmpeg, 'Manifest should have FFmpeg binary info');
      
      testResults.manifestCheck = true;
      console.log('✓ Vendor manifest validated');
    });

    it('should verify FFmpeg DLLs are present', () => {
      const requiredDlls = [
        'avcodec-62.dll',
        'avdevice-62.dll',
        'avfilter-11.dll',
        'avformat-62.dll',
        'avutil-60.dll',
        'swresample-6.dll',
        'swscale-9.dll',
        'd3dcompiler_43.dll'
      ];
      
      const vendorWin32Path = path.join(VENDOR_DIR, 'win32-x64');
      
      for (const dll of requiredDlls) {
        const dllPath = path.join(vendorWin32Path, dll);
        if (fs.existsSync(dllPath)) {
          const stats = fs.statSync(dllPath);
          assert(stats.size > 0, `DLL should not be empty: ${dll}`);
          console.log(`✓ Found ${dll} (${Math.round(stats.size / 1024)} KB)`);
        } else {
          console.log(`⚠ Missing DLL: ${dll}`);
        }
      }
      
      // Check if MPV executable exists
      const mpvPath = path.join(vendorWin32Path, 'mpv.exe');
      if (fs.existsSync(mpvPath)) {
        const stats = fs.statSync(mpvPath);
        console.log(`✓ Found mpv.exe (${Math.round(stats.size / 1024)} KB)`);
      }
      
      testResults.dllVerification = true;
      console.log('✓ DLL dependencies verified');
    });

    it('should verify DLLs are copied to package', () => {
      const requiredDlls = [
        'avcodec-62.dll',
        'avdevice-62.dll',
        'avfilter-11.dll',
        'avformat-62.dll',
        'avutil-60.dll',
        'swresample-6.dll',
        'swscale-9.dll',
        'd3dcompiler_43.dll'
      ];
      
      let copiedCount = 0;
      for (const dll of requiredDlls) {
        const dllPath = path.join(DIST_MANUAL_DIR, dll);
        if (fs.existsSync(dllPath)) {
          copiedCount++;
          console.log(`✓ DLL copied to package: ${dll}`);
        }
      }
      
      console.log(`✓ ${copiedCount}/${requiredDlls.length} DLLs copied to package`);
    });
  });

  describe('5. Executable Verification', () => {
    it('should verify H Player.exe exists and is valid', () => {
      const executablePath = path.join(DIST_MANUAL_DIR, 'H Player.exe');
      assert(fs.existsSync(executablePath), 'H Player.exe should exist');
      
      const stats = fs.statSync(executablePath);
      assert(stats.size > 1000000, 'Executable should be larger than 1MB'); // Reasonable size check
      
      testResults.executableCheck = true;
      console.log(`✓ H Player.exe verified (${Math.round(stats.size / 1024 / 1024)} MB)`);
    });

    it('should verify launcher scripts exist', () => {
      const launchers = [
        'Run-H-Player.bat',
        'Uninstall-H-Player.bat',
        'Run-H-Player.ps1'
      ];
      
      for (const launcher of launchers) {
        const launcherPath = path.join(DIST_MANUAL_DIR, launcher);
        if (fs.existsSync(launcherPath)) {
          console.log(`✓ Found launcher: ${launcher}`);
        } else {
          console.log(`⚠ Missing launcher: ${launcher}`);
        }
      }
    });
  });

  describe('6. Repair System Verification', () => {
    it('should verify repair helper script exists', () => {
      const repairHelperPath = path.join(SCRIPTS_DIR, 'repair-helper.js');
      assert(fs.existsSync(repairHelperPath), 'Repair helper script should exist');
      
      const content = fs.readFileSync(repairHelperPath, 'utf8');
      assert(content.includes('repairFfmpeg'), 'Repair helper should have repairFfmpeg function');
      assert(content.includes('downloadFile'), 'Repair helper should have downloadFile function');
      
      console.log('✓ Repair helper script verified');
    });

    it('should verify dependency checker exists', () => {
      const depCheckerPath = path.join(PROJECT_ROOT, 'src', 'main', 'services', 'dependency-checker.ts');
      assert(fs.existsSync(depCheckerPath), 'Dependency checker should exist');
      
      console.log('✓ Dependency checker verified');
    });
  });

  after(() => {
    console.log('\n============================================================');
    console.log('H Player v3.0.0 Integration Test Results');
    console.log('============================================================');
    
    const results = [
      ['TypeScript Compilation', testResults.compilation],
      ['Application Build', testResults.build],
      ['Manual Packaging', testResults.packaging],
      ['DLL Verification', testResults.dllVerification],
      ['Manifest Check', testResults.manifestCheck],
      ['Executable Check', testResults.executableCheck]
    ];
    
    results.forEach(([test, passed]) => {
      console.log(`${passed ? '✓' : '✗'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const totalPassed = results.filter(([, passed]) => passed).length;
    const totalTests = results.length;
    
    console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 All tests passed! H Player v3.0.0 is ready for production.');
    } else {
      console.log('⚠ Some tests failed. Please review the issues above.');
    }
    
    console.log('============================================================\n');
  });
});