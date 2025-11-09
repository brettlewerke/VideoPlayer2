#!/usr/bin/env node

/**
 * Test Report Generator
 * 
 * Generates a comprehensive report showing:
 * - Test failures (test code issues)
 * - Production code errors (compilation, runtime, import issues)
 * - Coverage information
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('📊 COMPREHENSIVE TEST & PRODUCTION CODE REPORT');
console.log('='.repeat(80));
console.log();

// 1. Check for TypeScript compilation errors in production code
console.log('1️⃣  Checking Production Code TypeScript Compilation...');
console.log('-'.repeat(80));
try {
  execSync('npm run build:main', { stdio: 'pipe' });
  console.log('✅ Main process code compiles successfully');
} catch (error) {
  console.log('❌ Production code has TypeScript errors:');
  console.log(error.stdout?.toString() || error.message);
}
console.log();

// 2. Run tests and capture results
console.log('2️⃣  Running Test Suite...');
console.log('-'.repeat(80));
let testOutput;
let testExitCode = 0;
try {
  testOutput = execSync('npm test -- --json --outputFile=./test-results/results.json', { 
    stdio: 'pipe',
    encoding: 'utf8' 
  });
  console.log('✅ All tests passed');
} catch (error) {
  testExitCode = error.status;
  testOutput = error.stdout?.toString() || '';
  console.log('⚠️  Some tests failed (details below)');
}
console.log();

// 3. Parse test results
console.log('3️⃣  Test Results Summary');
console.log('-'.repeat(80));

let testResults;
try {
  const resultsPath = path.join(__dirname, '../test-results/results.json');
  if (fs.existsSync(resultsPath)) {
    testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    console.log(`Total Test Suites: ${testResults.numTotalTestSuites}`);
    console.log(`  ✅ Passed: ${testResults.numPassedTestSuites}`);
    console.log(`  ❌ Failed: ${testResults.numFailedTestSuites}`);
    console.log();
    console.log(`Total Tests: ${testResults.numTotalTests}`);
    console.log(`  ✅ Passed: ${testResults.numPassedTests}`);
    console.log(`  ❌ Failed: ${testResults.numFailedTests}`);
    console.log(`  ⏭️  Skipped: ${testResults.numPendingTests}`);
    console.log();
    
    // Show failed tests
    if (testResults.testResults && testResults.numFailedTests > 0) {
      console.log('Failed Tests:');
      testResults.testResults.forEach(suite => {
        if (suite.status === 'failed') {
          console.log(`\n  📁 ${suite.name}`);
          if (suite.message) {
            console.log(`     ${suite.message.split('\n')[0]}`);
          }
          suite.assertionResults?.forEach(test => {
            if (test.status === 'failed') {
              console.log(`     ❌ ${test.fullName}`);
              if (test.failureMessages && test.failureMessages.length > 0) {
                const errorMsg = test.failureMessages[0].split('\n')[0];
                console.log(`        ${errorMsg.substring(0, 100)}...`);
              }
            }
          });
        }
      });
    }
  } else {
    console.log('⚠️  No test results JSON found - showing console output:');
    console.log(testOutput.split('\n').slice(-30).join('\n'));
  }
} catch (error) {
  console.log('⚠️  Could not parse test results:', error.message);
  console.log('\nTest output:');
  console.log(testOutput.split('\n').slice(-30).join('\n'));
}
console.log();

// 4. Check for linting/production code issues
console.log('4️⃣  Production Code Quality Checks');
console.log('-'.repeat(80));
try {
  const errors = execSync('npx tsc --noEmit --project tsconfig.json 2>&1', { 
    stdio: 'pipe',
    encoding: 'utf8' 
  });
  console.log('✅ No production code TypeScript errors');
} catch (error) {
  const output = error.stdout?.toString() || error.message;
  const errorLines = output.split('\n').filter(line => 
    line.includes('error TS') || line.includes('Cannot find module')
  );
  
  if (errorLines.length > 0) {
    console.log(`❌ Found ${errorLines.length} TypeScript errors in production code:`);
    errorLines.slice(0, 10).forEach(line => console.log(`   ${line}`));
    if (errorLines.length > 10) {
      console.log(`   ... and ${errorLines.length - 10} more errors`);
    }
  } else {
    console.log('✅ No critical production code errors');
  }
}
console.log();

// 5. Summary
console.log('='.repeat(80));
console.log('📋 SUMMARY');
console.log('='.repeat(80));
if (testExitCode === 0) {
  console.log('✅ All tests passed and production code is healthy');
  process.exit(0);
} else {
  console.log('⚠️  Issues detected - review report above');
  console.log('    - Check test failures for test code issues');
  console.log('    - Check TypeScript errors for production code issues');
  console.log();
  console.log('💡 Tip: Test failures may be due to:');
  console.log('    1. Production code bugs');
  console.log('    2. Incorrect test assertions');
  console.log('    3. Mock configuration issues');
  process.exit(1);
}
