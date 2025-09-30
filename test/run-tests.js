/**
 * Test runner script for H Player v3.0.0
 * Executes all test suites and provides comprehensive reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

console.log('============================================================');
console.log('H Player v3.0.0 Comprehensive Test Suite');
console.log('============================================================\n');

// Test configuration
const testSuites = [
  {
    name: 'Integration Tests',
    file: 'integration.test.js',
    description: 'Tests compilation, build process, and DLL dependencies'
  },
  {
    name: 'Build Verification',
    file: 'build-verification.test.js', 
    description: 'Verifies build artifacts and file integrity'
  },
  {
    name: 'Production Deployment',
    file: 'production-deployment.test.js',
    description: 'Tests installation, execution, and repair system'
  }
];

let overallResults = {
  totalSuites: testSuites.length,
  passedSuites: 0,
  failedSuites: 0,
  details: []
};

// Pre-flight checks
console.log('Running pre-flight checks...');

// Check if Node.js version is compatible
const nodeVersion = process.version;
console.log(`✓ Node.js version: ${nodeVersion}`);

// Check if we're in the right directory
if (!fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
  console.error('✗ Not in H Player project directory');
  process.exit(1);
}

// Check if project dependencies are installed
if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules'))) {
  console.error('✗ Node modules not installed. Run: npm install');
  process.exit(1);
}

console.log('✓ Pre-flight checks passed\n');

// Function to run a single test suite
function runTestSuite(suite) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${suite.name}`);
  console.log(`Description: ${suite.description}`);
  console.log(`${'='.repeat(60)}`);
  
  const testPath = path.join(__dirname, suite.file);
  
  if (!fs.existsSync(testPath)) {
    console.error(`✗ Test file not found: ${suite.file}`);
    return false;
  }
  
  try {
    // Use Mocha to run the test file
    const command = `npx mocha "${testPath}" --timeout 300000 --reporter spec`;
    
    console.log(`Executing: ${command}\n`);
    
    const output = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log(`\n✓ ${suite.name} completed successfully`);
    return true;
    
  } catch (error) {
    console.error(`\n✗ ${suite.name} failed:`);
    console.error(error.message);
    return false;
  }
}

// Run all test suites
console.log('Starting test execution...\n');

for (const suite of testSuites) {
  const startTime = Date.now();
  const success = runTestSuite(suite);
  const duration = Date.now() - startTime;
  
  const result = {
    suite: suite.name,
    success,
    duration: Math.round(duration / 1000),
    file: suite.file
  };
  
  overallResults.details.push(result);
  
  if (success) {
    overallResults.passedSuites++;
  } else {
    overallResults.failedSuites++;
  }
}

// Generate final report
console.log('\n\n' + '='.repeat(80));
console.log('FINAL TEST REPORT - H Player v3.0.0');
console.log('='.repeat(80));

console.log('\nTest Suite Results:');
overallResults.details.forEach((result, index) => {
  const status = result.success ? '✓ PASS' : '✗ FAIL';
  const duration = `(${result.duration}s)`;
  console.log(`  ${index + 1}. ${result.suite.padEnd(25)} ${status} ${duration}`);
});

console.log('\nSummary:');
console.log(`  Total Test Suites: ${overallResults.totalSuites}`);
console.log(`  Passed: ${overallResults.passedSuites}`);
console.log(`  Failed: ${overallResults.failedSuites}`);
console.log(`  Success Rate: ${Math.round((overallResults.passedSuites / overallResults.totalSuites) * 100)}%`);

// Overall status
if (overallResults.failedSuites === 0) {
  console.log('\n🎉 ALL TESTS PASSED! H Player v3.0.0 is ready for production deployment.');
  console.log('\nRecommended next steps:');
  console.log('  1. Test the installer on a clean Windows machine');
  console.log('  2. Verify the application starts and basic functionality works');
  console.log('  3. Test the FFmpeg repair system by removing DLLs');
  console.log('  4. Package for distribution');
} else {
  console.log('\n⚠ SOME TESTS FAILED. Please review the issues above before deployment.');
  console.log('\nAction required:');
  console.log('  1. Review failed test output');
  console.log('  2. Fix identified issues');
  console.log('  3. Re-run tests until all pass');
}

console.log('\n' + '='.repeat(80));

// Exit with appropriate code
process.exit(overallResults.failedSuites === 0 ? 0 : 1);