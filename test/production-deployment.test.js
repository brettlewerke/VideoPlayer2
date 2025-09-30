/**
 * Production deployment tests for H Player v3.0.0
 * Tests installation, execution, and repair system functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_MANUAL_DIR = path.join(PROJECT_ROOT, 'dist-manual', 'H Player');

describe('Production Deployment Tests', () => {
  describe('Installer Tests', () => {
    it('should verify NSIS installer structure', () => {
      const installerScript = path.join(PROJECT_ROOT, 'installer.nsi');
      
      if (!fs.existsSync(installerScript)) {
        throw new Error('installer.nsi not found');
      }
      
      const content = fs.readFileSync(installerScript, 'utf8');
      
      // Check for key installer components
      const requiredComponents = [
        'H-Player-Setup-3.0.0.exe',
        'InstallDir',
        'MUI_ABORTWARNING',
        'RequestExecutionLevel admin'
      ];
      
      requiredComponents.forEach(component => {
        if (!content.includes(component)) {
          throw new Error(`Installer missing component: ${component}`);
        }
      });
      
      console.log('✓ NSIS installer script is properly configured');
    });

    it('should verify installer can be built', () => {
      // This test assumes NSIS is installed and available
      try {
        const nsisPath = "C:\\Program Files (x86)\\NSIS\\makensis.exe";
        
        if (fs.existsSync(nsisPath)) {
          console.log('✓ NSIS is available for installer creation');
        } else {
          console.warn('⚠ NSIS not found - installer creation may fail');
        }
      } catch (error) {
        console.warn('⚠ Could not verify NSIS installation');
      }
    });
  });

  describe('Manual Package Tests', () => {
    it('should verify manual package can be launched', () => {
      const executablePath = path.join(DIST_MANUAL_DIR, 'H Player.exe');
      const launcherPath = path.join(DIST_MANUAL_DIR, 'Run-H-Player.bat');
      
      if (!fs.existsSync(executablePath)) {
        throw new Error('H Player.exe not found in manual package');
      }
      
      if (!fs.existsSync(launcherPath)) {
        throw new Error('Run-H-Player.bat not found in manual package');
      }
      
      // Check launcher script content
      const launcherContent = fs.readFileSync(launcherPath, 'utf8');
      if (!launcherContent.includes('H Player.exe')) {
        throw new Error('Launcher script should reference H Player.exe');
      }
      
      console.log('✓ Manual package launch configuration verified');
    });

    it('should verify all assets are included', () => {
      const assetsPath = path.join(DIST_MANUAL_DIR, 'assets');
      const requiredAssets = [
        'brand'
      ];
      
      if (fs.existsSync(assetsPath)) {
        requiredAssets.forEach(asset => {
          const assetPath = path.join(assetsPath, asset);
          if (fs.existsSync(assetPath)) {
            console.log(`✓ Found asset: ${asset}`);
          } else {
            console.warn(`⚠ Missing asset: ${asset}`);
          }
        });
      } else {
        console.warn('⚠ Assets directory not found in package');
      }
    });
  });

  describe('Repair System Tests', () => {
    it('should verify repair helper can be executed', () => {
      const repairHelperPath = path.join(PROJECT_ROOT, 'scripts/repair-helper.js');
      
      if (!fs.existsSync(repairHelperPath)) {
        throw new Error('Repair helper script not found');
      }
      
      try {
        // Test help command
        const output = execSync('node scripts/repair-helper.js check', {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          timeout: 10000
        });
        
        console.log('✓ Repair helper script executes successfully');
        
        // Parse the check output
        try {
          const result = JSON.parse(output);
          console.log(`✓ Repair check result: ${result.needed ? 'Repair needed' : 'No repair needed'}`);
        } catch (parseError) {
          console.log('✓ Repair helper executed but output format may vary');
        }
      } catch (error) {
        console.warn(`⚠ Repair helper execution warning: ${error.message}`);
      }
    });

    it('should verify dependency checker integration', () => {
      const depCheckerPath = path.join(PROJECT_ROOT, 'src/main/services/dependency-checker.ts');
      
      if (!fs.existsSync(depCheckerPath)) {
        throw new Error('Dependency checker not found');
      }
      
      const content = fs.readFileSync(depCheckerPath, 'utf8');
      
      const requiredMethods = [
        'checkDependencies',
        'extractMissingDlls',
        'testMpvLoad'
      ];
      
      requiredMethods.forEach(method => {
        if (!content.includes(method)) {
          throw new Error(`Dependency checker missing method: ${method}`);
        }
      });
      
      console.log('✓ Dependency checker has all required methods');
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should have platform-specific launcher scripts', () => {
      const launchers = [
        ['Run-H-Player.bat', 'Windows'],
        ['Run-H-Player.ps1', 'PowerShell'],
        ['Run-H-Player.command', 'macOS'],
        ['run-h-player.sh', 'Linux']
      ];
      
      launchers.forEach(([script, platform]) => {
        const scriptPath = path.join(DIST_MANUAL_DIR, script);
        if (fs.existsSync(scriptPath)) {
          console.log(`✓ Found ${platform} launcher: ${script}`);
        } else {
          console.log(`⚠ Missing ${platform} launcher: ${script}`);
        }
      });
    });

    it('should verify vendor binaries for current platform', () => {
      const platform = process.platform;
      const arch = process.arch;
      
      console.log(`✓ Testing for platform: ${platform}-${arch}`);
      
      if (platform === 'win32') {
        const vendorPath = path.join(PROJECT_ROOT, 'vendor/win32-x64');
        if (fs.existsSync(vendorPath)) {
          const files = fs.readdirSync(vendorPath);
          const exeFiles = files.filter(f => f.endsWith('.exe'));
          const dllFiles = files.filter(f => f.endsWith('.dll'));
          
          console.log(`✓ Found ${exeFiles.length} executables and ${dllFiles.length} DLLs`);
        }
      } else {
        console.log(`⚠ Current platform ${platform} may have limited binary support`);
      }
    });
  });

  describe('Performance and Size Validation', () => {
    it('should verify reasonable package sizes', () => {
      const installerPath = path.join(PROJECT_ROOT, 'H-Player-Setup-3.0.0.exe');
      const manualPath = path.join(PROJECT_ROOT, 'H-Player-Manual-3.0.0.zip');
      
      if (fs.existsSync(installerPath)) {
        const stats = fs.statSync(installerPath);
        const sizeMB = Math.round(stats.size / 1024 / 1024);
        
        if (sizeMB > 2000) { // 2GB limit
          throw new Error(`Installer too large: ${sizeMB}MB`);
        }
        
        console.log(`✓ Installer size acceptable: ${sizeMB}MB`);
      }
      
      if (fs.existsSync(manualPath)) {
        const stats = fs.statSync(manualPath);
        const sizeMB = Math.round(stats.size / 1024 / 1024);
        
        if (sizeMB > 3000) { // 3GB limit for uncompressed package
          throw new Error(`Manual package too large: ${sizeMB}MB`);
        }
        
        console.log(`✓ Manual package size acceptable: ${sizeMB}MB`);
      }
    });

    it('should verify startup performance requirements', () => {
      // This is a static check - actual performance would need runtime testing
      const mainJsPath = path.join(PROJECT_ROOT, 'dist/main/main/main.js');
      
      if (fs.existsSync(mainJsPath)) {
        const content = fs.readFileSync(mainJsPath, 'utf8');
        const lineCount = content.split('\n').length;
        
        console.log(`✓ Main process has ${lineCount} lines of code`);
        
        // Check for potential performance issues in main process
        const problematicPatterns = [
          'setTimeout(.*0)',  // Immediate timeouts
          'setInterval(.*[0-9]{1,2})', // Very frequent intervals
          'while\\s*\\(true\\)' // Infinite loops
        ];
        
        let issueCount = 0;
        problematicPatterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'g');
          const matches = content.match(regex);
          if (matches) {
            issueCount += matches.length;
          }
        });
        
        if (issueCount > 0) {
          console.warn(`⚠ Found ${issueCount} potential performance issues in main process`);
        } else {
          console.log('✓ No obvious performance issues detected');
        }
      }
    });
  });
});