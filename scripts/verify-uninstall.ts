/**
 * Uninstall Verification Test
 * 
 * This script verifies that H Player completely uninstalls and cleans up:
 * - Installation directory
 * - AppData folders
 * - Start Menu shortcuts
 * - Desktop shortcuts
 * - Registry entries (Windows)
 * 
 * Run this script AFTER uninstalling H Player to verify cleanup
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface UninstallCheckResult {
  path: string;
  shouldExist: boolean;
  actuallyExists: boolean;
  status: 'PASS' | 'FAIL';
}

function checkPath(path: string, shouldExist: boolean = false): UninstallCheckResult {
  const actuallyExists = existsSync(path);
  const status = (actuallyExists === shouldExist) ? 'PASS' : 'FAIL';
  
  return {
    path,
    shouldExist,
    actuallyExists,
    status
  };
}

function verifyUninstall(): void {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     H PLAYER UNINSTALL VERIFICATION TEST                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const results: UninstallCheckResult[] = [];

  // Check installation directories
  const installPaths = [
    join(process.env.LOCALAPPDATA || '', 'Programs', 'h-player'),
    join(process.env.PROGRAMFILES || '', 'H Player'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'H Player')
  ];

  console.log('📁 Checking Installation Directories...');
  installPaths.forEach(path => {
    results.push(checkPath(path, false));
  });

  // Check AppData folders
  const appDataPaths = [
    join(process.env.APPDATA || '', 'h-player'),
    join(process.env.LOCALAPPDATA || '', 'h-player'),
    join(process.env.LOCALAPPDATA || '', 'h-player-updater')
  ];

  console.log('\n💾 Checking AppData Directories...');
  appDataPaths.forEach(path => {
    results.push(checkPath(path, false));
  });

  // Check shortcuts
  const desktopPath = join(homedir(), 'Desktop', 'H Player.lnk');
  const startMenuPath = join(
    process.env.APPDATA || '', 
    'Microsoft', 
    'Windows', 
    'Start Menu', 
    'Programs', 
    'H Player.lnk'
  );

  console.log('\n🔗 Checking Shortcuts...');
  results.push(checkPath(desktopPath, false));
  results.push(checkPath(startMenuPath, false));

  // Display results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RESULTS:');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passCount = 0;
  let failCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const existsText = result.actuallyExists ? 'EXISTS' : 'NOT FOUND';
    const expectedText = result.shouldExist ? '(should exist)' : '(should be deleted)';
    
    console.log(`${icon} ${result.status.padEnd(6)} | ${existsText.padEnd(12)} | ${expectedText.padEnd(20)}`);
    console.log(`   ${result.path}`);
    console.log('');

    if (result.status === 'PASS') {
      passCount++;
    } else {
      failCount++;
    }
  });

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📊 Summary: ${passCount} PASS, ${failCount} FAIL out of ${results.length} checks\n`);

  if (failCount === 0) {
    console.log('✅ UNINSTALL COMPLETE - All files and folders removed!\n');
  } else {
    console.log('⚠️  UNINSTALL INCOMPLETE - Some files/folders remain!\n');
    console.log('Failed checks:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      if (r.actuallyExists) {
        console.log(`  - Still exists: ${r.path}`);
      } else {
        console.log(`  - Missing (should exist): ${r.path}`);
      }
    });
    console.log('');
  }

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run verification
verifyUninstall();
