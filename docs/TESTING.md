# Testing Guide for Hoser Video

This document explains the testing strategy and how to run tests for Hoser Video.

## Test Structure

```
src/
├── main/
│   ├── database/__tests__/
│   │   └── database.test.ts          # Database tests
│   ├── services/__tests__/
│   │   ├── TranscodingService.test.ts # Transcoding service tests
│   │   ├── CodecDetector.test.ts      # Codec detection tests
│   │   └── integration.test.ts        # Integration tests
│   └── player/__tests__/
│       └── player-factory.test.ts     # Player factory tests
├── common/media/__tests__/
│   └── extensions.test.ts             # Media extensions tests
tests/
└── e2e/
    └── app.spec.ts                    # End-to-end application tests
scripts/
└── smoke-test.js                      # Quick smoke test for CI/CD
```

## Running Tests

### Unit Tests

Run all unit tests:
```bash
npm run test
```

Run tests in watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

Run tests with coverage report:
```bash
npm run test -- --coverage
```

Run specific test file:
```bash
npm run test -- TranscodingService
```

Run tests in a specific directory:
```bash
npm run test -- src/main/services
```

### End-to-End Tests

**Note**: E2E tests require the app to be built first.

Build and run E2E tests:
```bash
npm run build:main
npm run test:e2e
```

Run E2E tests in headed mode (see the browser):
```bash
npm run test:e2e -- --headed
```

Run specific E2E test:
```bash
npm run test:e2e -- app.spec.ts
```

### Smoke Test

Quick functionality check:
```bash
npm run smoke-test
```

This runs a fast sanity check to ensure:
- Project structure is correct
- Dependencies are installed
- Vendor binaries exist
- TypeScript compiles without errors
- Configuration files are present

### Code Quality

Check for linting errors:
```bash
npm run lint
```

Auto-fix linting issues:
```bash
npm run lint:fix
```

TypeScript type checking:
```bash
npm run type-check
```

## Test Coverage

### What's Tested

#### TranscodingService Tests
- ✅ Codec detection (AC3, DTS, E-AC3, AAC, MP3, etc.)
- ✅ Transcoding session management
- ✅ HTTP streaming server
- ✅ Multiple concurrent sessions
- ✅ Session cleanup

#### CodecDetector Tests
- ✅ Supported codec identification
- ✅ Unsupported codec detection
- ✅ FFprobe integration
- ✅ Error handling

#### PlayerFactory Tests
- ✅ MPV backend availability detection
- ✅ Player instance creation
- ✅ Backend switching
- ✅ Mock player for testing

#### Integration Tests
- ✅ Complete playback flow (codec detection → transcoding)
- ✅ Multiple video format handling
- ✅ Session reuse logic
- ✅ Error scenarios

#### Media Extensions Tests
- ✅ File extension validation
- ✅ Path validation
- ✅ Case-insensitive matching

### Current Coverage

Run with coverage to see detailed report:
```bash
npm run test -- --coverage
```

View HTML coverage report:
```bash
npm run test -- --coverage
# Then open: coverage/lcov-report/index.html
```

## Writing New Tests

### Unit Test Example

Create a new test file in `__tests__` directory:

```typescript
// src/main/services/__tests__/MyService.test.ts
import { MyService } from '../MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('myMethod', () => {
    it('should do something', () => {
      const result = service.myMethod();
      expect(result).toBe(expected);
    });

    it('should handle errors', () => {
      expect(() => service.myMethod()).toThrow('Error message');
    });
  });
});
```

### Integration Test Example

```typescript
// src/main/services/__tests__/my-integration.test.ts
describe('Feature Integration', () => {
  it('should work end-to-end', async () => {
    // Setup
    const service1 = new Service1();
    const service2 = new Service2();

    // Execute
    const result = await service1.process();
    const final = await service2.handle(result);

    // Assert
    expect(final).toHaveProperty('success', true);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('should perform user action', async ({ page }) => {
  await page.goto('/');
  await page.click('button[data-testid="my-button"]');
  await expect(page.locator('.result')).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run smoke test
        run: npm run smoke-test
      
      - name: Run unit tests
        run: npm run test -- --coverage
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build:main
      
      - name: Run E2E tests
        run: npm run test:e2e
```

## Debugging Tests

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasenameNoExtension}",
        "--config",
        "jest.config.js"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest: All Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--config",
        "jest.config.js"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug in Terminal

Run Jest with node debugger:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then attach Chrome DevTools or VS Code debugger.

## Mocking

### Mocking Modules

```typescript
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// In test:
(existsSync as jest.Mock).mockReturnValue(true);
```

### Mocking Electron

```typescript
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    isPackaged: false,
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
}));
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   it('should do something', () => {
     // Arrange
     const input = setupInput();
     
     // Act
     const result = doSomething(input);
     
     // Assert
     expect(result).toBe(expected);
   });
   ```

2. **Test one thing per test**: Keep tests focused

3. **Use descriptive names**: Test names should explain what they test
   ```typescript
   ✅ it('should return transcoding URL for AC3 codec', () => {})
   ❌ it('test1', () => {})
   ```

4. **Clean up after tests**: Use `afterEach` to cleanup
   ```typescript
   afterEach(() => {
     service.cleanup();
     jest.clearAllMocks();
   });
   ```

5. **Mock external dependencies**: Don't make real HTTP calls or file system access

6. **Test edge cases**: Include error scenarios and boundary conditions

## Troubleshooting

### Tests are slow
- Use `--maxWorkers=4` to limit parallel workers
- Mock expensive operations (file I/O, network calls)
- Use `jest.setTimeout()` for long-running tests

### Type errors in tests
- Ensure `@types/jest` is installed
- Add jest types to `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "types": ["jest", "node"]
    }
  }
  ```

### Module resolution errors
- Check `moduleNameMapper` in `jest.config.js`
- Ensure imports use correct paths

### E2E tests failing
- Ensure app is built: `npm run build:main`
- Check Playwright is installed: `npx playwright install`
- Run in headed mode to see what's happening

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [TypeScript with Jest](https://kulshekhar.github.io/ts-jest/)
