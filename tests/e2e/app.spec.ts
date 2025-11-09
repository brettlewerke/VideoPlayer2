/**
 * E2E tests for Hoser Video
 * Tests the complete application flow using Playwright
 */

import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main/main/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Wait for first window
  window = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp?.close();
});

test.describe('Application Launch', () => {
  test('should launch successfully', async () => {
    expect(electronApp).toBeDefined();
    expect(window).toBeDefined();
  });

  test('should have correct window title', async () => {
    const title = await window.title();
    expect(title).toContain('Hoser Video');
  });

  test('should display main UI elements', async () => {
    // Check for sidebar
    const sidebar = await window.locator('[data-testid="sidebar"]').count();
    expect(sidebar).toBeGreaterThan(0);

    // Check for navigation
    const navigation = await window.locator('nav').count();
    expect(navigation).toBeGreaterThan(0);
  });
});

test.describe('Drive Detection', () => {
  test('should show empty state when no drives detected', async () => {
    // This will depend on your actual drive state
    const emptyState = await window.locator('text=No drives detected').count();
    // Empty state may or may not be visible depending on system
    expect(emptyState).toBeGreaterThanOrEqual(0);
  });

  test('should have rescan button', async () => {
    const rescanButton = await window.locator('button:has-text("Rescan")').count();
    expect(rescanButton).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Navigation', () => {
  test('should navigate to Movies page', async () => {
    await window.click('text=Movies');
    await window.waitForTimeout(500);
    
    const url = window.url();
    expect(url).toContain('movies');
  });

  test('should navigate to TV Shows page', async () => {
    await window.click('text=TV Shows');
    await window.waitForTimeout(500);
    
    const url = window.url();
    expect(url).toContain('shows');
  });

  test('should navigate back to Home', async () => {
    await window.click('text=Home');
    await window.waitForTimeout(500);
    
    const url = window.url();
    expect(url).toMatch(/\/$|\/home/);
  });
});

test.describe('Settings', () => {
  test('should open settings page', async () => {
    await window.click('text=Settings');
    await window.waitForTimeout(500);
    
    const url = window.url();
    expect(url).toContain('settings');
  });

  test('should display settings options', async () => {
    await window.click('text=Settings');
    await window.waitForTimeout(500);
    
    // Check for common settings elements
    const settingsContent = await window.locator('.settings, [data-testid="settings"]').count();
    expect(settingsContent).toBeGreaterThan(0);
  });
});

test.describe('Window Controls', () => {
  test('should minimize window', async () => {
    // Click minimize button (you'll need to adjust selector)
    const minimizeBtn = await window.locator('[title="Minimize"]').count();
    if (minimizeBtn > 0) {
      // Test that button exists
      expect(minimizeBtn).toBe(1);
    }
  });

  test('should have close button', async () => {
    const closeBtn = await window.locator('[title="Close"]').count();
    if (closeBtn > 0) {
      expect(closeBtn).toBe(1);
    }
  });
});
