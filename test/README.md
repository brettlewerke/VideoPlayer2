# H Player v3.0.0 Test Suite

This directory contains comprehensive tests for verifying the build, packaging, and deployment readiness of H Player v3.0.0.

## Test Files

### 1. `integration.test.js`
**Comprehensive integration testing**
- TypeScript compilation verification
- Renderer and main process build testing
- Manual packaging validation
- DLL dependency verification
- Manifest file validation
- Executable verification
- Repair system validation

### 2. `build-verification.test.js`
**Build artifacts and file integrity**
- Verification of all required build outputs
- Package.json version validation
- Distribution file verification (installer & manual package)
- File integrity checks and content validation
- TypeScript to JavaScript compilation verification
- FFmpeg DLL file signature validation

### 3. `production-deployment.test.js`
**Production deployment readiness**
- NSIS installer structure verification
- Manual package launch configuration
- Asset inclusion verification
- Repair system execution testing
- Cross-platform launcher script validation
- Performance and size validation

### 4. `run-tests.js`
**Test runner and reporting**
- Executes all test suites in sequence
- Provides comprehensive reporting
- Pre-flight environment checks
- Final deployment readiness assessment

## Running Tests

### Run All Tests
```bash
node test/run-tests.js
```

### Run Individual Test Suites
```bash
# Integration tests
npx mocha test/integration.test.js --timeout 300000

# Build verification
npx mocha test/build-verification.test.js --timeout 300000

# Production deployment
npx mocha test/production-deployment.test.js --timeout 300000
```

## Test Requirements

- Node.js 18+ 
- Mocha test framework (`npm install mocha`)
- Complete project build (`npm run build`)
- Manual packaging completed (`npm run pack:manual`)

## Test Coverage

### ✅ Compilation & Build
- TypeScript compilation without errors
- Renderer build (Vite)
- Main process build
- Build artifact verification

### ✅ Packaging & Distribution
- Manual packaging success
- Package structure validation
- Installer creation
- File integrity checks

### ✅ Dependencies & DLLs
- FFmpeg DLL presence and validity
- MPV executable verification
- Vendor manifest validation
- DLL copying to package

### ✅ Repair System
- Dependency checker functionality
- Repair helper script execution
- IPC repair handlers
- Manual instruction availability

### ✅ Production Readiness
- Installer structure validation
- Launch configuration verification
- Cross-platform script availability
- Performance requirements validation

## Expected Results

When all tests pass, you should see:

```
🎉 ALL TESTS PASSED! H Player v3.0.0 is ready for production deployment.

Recommended next steps:
  1. Test the installer on a clean Windows machine
  2. Verify the application starts and basic functionality works
  3. Test the FFmpeg repair system by removing DLLs
  4. Package for distribution
```

## Troubleshooting

### Common Issues

**"TypeScript compilation failed"**
- Run `npm run type-check` to see specific errors
- Fix TypeScript errors before proceeding

**"Manual packaging failed"**
- Ensure build completed successfully
- Check for sufficient disk space
- Verify file permissions

**"Missing DLL files"**
- Run `node scripts/setup.js` to download dependencies
- Check vendor/win32-x64 directory
- Verify internet connection for downloads

**"Installer verification failed"**
- Ensure NSIS is installed
- Check installer.nsi configuration
- Verify dist-manual directory exists

## Test Output Files

Tests may create temporary files for verification:
- Build artifacts in `dist/`
- Package outputs in `dist-manual/`
- Distribution files (`H-Player-Setup-3.0.0.exe`, `H-Player-Manual-3.0.0.zip`)

## Contributing

When adding new features, update the relevant test files:
- Add compilation tests for new TypeScript files
- Add packaging tests for new assets or dependencies
- Add deployment tests for new installation requirements
- Update the test runner if new test suites are added