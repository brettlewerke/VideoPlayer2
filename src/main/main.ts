/**
 * Main Electron process
 */

import { app, BrowserWindow, Menu, globalShortcut, nativeTheme, dialog } from 'electron';
import { join } from 'path';
import { platform } from 'os';
import { existsSync } from 'fs';
import { request } from 'http';
import { DatabaseManager } from './database/database.js';
import { DriveManager } from './services/drive-manager.js';
import { MediaScanner } from './services/media-scanner.js';
import { PlayerFactory } from './player/player-factory.js';
import { IpcHandler } from './ipc/ipc-handler.js';
import { DependencyChecker } from './services/dependency-checker';
import { DEFAULT_SETTINGS } from '../shared/constants.js';

class VideoPlayerApp {
  private mainWindow: BrowserWindow | null = null;
  private repairWindow: BrowserWindow | null = null;
  private database: DatabaseManager;
  private playerFactory: PlayerFactory;
  private ipcHandler: IpcHandler;
  private driveManager: DriveManager;
  private mediaScanner: MediaScanner;
  private dependencyChecker: DependencyChecker;

  constructor() {
    this.database = new DatabaseManager();
    this.playerFactory = new PlayerFactory();
    this.driveManager = new DriveManager(this.database);
    this.mediaScanner = new MediaScanner(this.database);
    this.dependencyChecker = new DependencyChecker();
    this.ipcHandler = new IpcHandler(this.database, this.playerFactory);
  }

  async initialize(): Promise<void> {
    // Initialize database
    await this.database.initialize();
    
    // Load settings and apply them
    await this.loadSettings();
    
    // Initialize services
    await this.driveManager.initialize();
    await this.mediaScanner.initialize();
    
    // Set up IPC handlers
    this.ipcHandler.setupHandlers();
    
    // Start drive monitoring
    this.driveManager.startMonitoring();
    
    console.log('VideoPlayer application initialized successfully');
  }

  async createMainWindow(): Promise<void> {
    // On Windows, check dependencies before creating the main window
    if (platform() === 'win32') {
      const dependencyCheck = await this.dependencyChecker.verifyWindowsPlaybackDeps();
      if (!dependencyCheck.success) {
        console.log('Dependency check failed, showing repair screen:', dependencyCheck.error);
        await this.createRepairWindow(dependencyCheck);
        return;
      }
    }

    // Dependencies are OK, create the main window
    await this.createMainApplicationWindow();
  }

  async createMainApplicationWindow(): Promise<void> {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
      icon: this.getAppIcon(),
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1f2937',
        symbolColor: '#ffffff',
      },
      show: false, // Don't show until ready
      title: 'H Player',
      backgroundColor: '#050706'
    });

    // Load the renderer based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`[renderer] Environment: ${process.env.NODE_ENV}, isDevelopment: ${isDevelopment}`);

    if (isDevelopment) {
      // Development: Load from Vite dev server
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
      console.log(`[renderer] Loading development renderer from: ${devServerUrl}`);

      // Wait for Vite dev server to be ready
      await this.waitForViteDevServer(devServerUrl);

      await this.mainWindow.loadURL(devServerUrl);
      this.mainWindow.webContents.openDevTools();
    } else {
      // Production: Load from built files
      const rendererPath = join(__dirname, '../renderer/index.html');
      console.log(`[renderer] Loading production renderer from: ${rendererPath}`);
      await this.mainWindow.loadFile(rendererPath);
    }

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (isDevelopment) {
        this.mainWindow?.focus();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle window state changes
    this.mainWindow.on('enter-full-screen', () => {
      this.ipcHandler.sendToRenderer('app:fullscreen-changed', true);
    });

    this.mainWindow.on('leave-full-screen', () => {
      this.ipcHandler.sendToRenderer('app:fullscreen-changed', false);
    });
  }

  async createRepairWindow(dependencyCheck: any): Promise<void> {
    // Create a repair window with the same styling but focused on the repair UI
    this.repairWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
      icon: this.getAppIcon(),
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1f2937',
        symbolColor: '#ffffff',
      },
      show: false,
      title: 'H Player - Dependency Repair',
      backgroundColor: '#050706',
      modal: true,
      parent: undefined, // Not modal to main window since it doesn't exist yet
    });

    // Load the repair page based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
      await this.waitForViteDevServer(devServerUrl);
      await this.repairWindow.loadURL(`${devServerUrl}#/repair`);
      this.repairWindow.webContents.openDevTools();
    } else {
      const rendererPath = join(__dirname, '../renderer/index.html');
      await this.repairWindow.loadFile(rendererPath, { hash: '#/repair' });
    }

    // Pass the dependency check result to the renderer
    this.repairWindow.webContents.once('did-finish-load', () => {
      this.repairWindow?.webContents.send('repair:dependency-check-result', dependencyCheck);
    });

    // Show window when ready
    this.repairWindow.once('ready-to-show', () => {
      this.repairWindow?.show();
    });

    // Handle window closed
    this.repairWindow.on('closed', () => {
      this.repairWindow = null;
      // If repair window is closed without fixing, quit the app
      if (!this.mainWindow) {
        app.quit();
      }
    });
  }

  private getAppIcon(): string | undefined {
    // In production, electron-builder places resources in app.asar or resources folder
    // In development, use build/ directory
    const isPackaged = app.isPackaged;
    let candidate: string | undefined;

    switch (platform()) {
      case 'win32':
        candidate = isPackaged
          ? join(process.resourcesPath, 'build', 'icon.ico')
          : join(__dirname, '..', '..', '..', 'build', 'icon.ico');
        break;
      case 'darwin':
        candidate = isPackaged
          ? join(process.resourcesPath, 'build', 'icon.icns')
          : join(__dirname, '..', '..', '..', 'build', 'icon.icns');
        break;
      default: // linux
        candidate = isPackaged
          ? join(process.resourcesPath, 'build', 'icons', '512x512.png')
          : join(__dirname, '..', '..', '..', 'build', 'icons', '512x512.png');
        break;
    }

    // Fallback: try alternative paths if primary candidate doesn't exist
    if (candidate && existsSync(candidate)) {
      return candidate;
    }

    // Try without resources path in packaged app
    if (isPackaged) {
      switch (platform()) {
        case 'win32':
          candidate = join(__dirname, '..', '..', '..', 'build', 'icon.ico');
          break;
        case 'darwin':
          candidate = join(__dirname, '..', '..', '..', 'build', 'icon.icns');
          break;
        default:
          candidate = join(__dirname, '..', '..', '..', 'build', 'icons', '512x512.png');
          break;
      }
    }

    return candidate && existsSync(candidate) ? candidate : undefined;
  }

  /**
   * Wait for Vite dev server to be ready with timeout
   */
  private async waitForViteDevServer(devServerUrl: string, timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    console.log(`[renderer] Waiting for Vite dev server at ${devServerUrl}...`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const isReady = await this.checkViteDevServer(devServerUrl);
        if (isReady) {
          console.log(`[renderer] Vite dev server is ready`);
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Vite dev server at ${devServerUrl} did not become ready within ${timeoutMs}ms`);
  }

  /**
   * Check if Vite dev server is responding
   */
  private async checkViteDevServer(devServerUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = request({
        hostname: '127.0.0.1',
        port: parseInt(new URL(devServerUrl).port),
        path: '/',
        method: 'GET',
        timeout: 2000,
        family: 4
      }, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 304);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      // Ensure database is migrated before loading settings
      await this.database.migrate();
      
      const savedSettings = await this.database.getAllSettings();
      
      // Merge with defaults
      const settings = { ...DEFAULT_SETTINGS, ...savedSettings };
      
      // Apply player backend setting
      if (settings.playerBackend) {
        this.playerFactory.setBackend(settings.playerBackend);
      }
      
      console.log('Settings loaded:', settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Continue with defaults
    }
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Media Folder',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              this.openMediaFolder();
            },
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              this.mainWindow?.reload();
            },
          },
          {
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              this.mainWindow?.webContents.reloadIgnoringCache();
            },
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => {
              this.mainWindow?.webContents.toggleDevTools();
            },
          },
          { type: 'separator' },
          {
            label: 'Actual Size',
            accelerator: 'CmdOrCtrl+0',
            click: () => {
              this.mainWindow?.webContents.setZoomLevel(0);
            },
          },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
              const level = this.mainWindow?.webContents.getZoomLevel() || 0;
              this.mainWindow?.webContents.setZoomLevel(level + 1);
            },
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => {
              const level = this.mainWindow?.webContents.getZoomLevel() || 0;
              this.mainWindow?.webContents.setZoomLevel(level - 1);
            },
          },
          { type: 'separator' },
          {
            label: 'Toggle Fullscreen',
            accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
              }
            },
          },
        ],
      },
      {
        label: 'Library',
        submenu: [
          {
            label: 'Scan for Media',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => {
              this.startMediaScan();
            },
          },
          {
            label: 'Refresh Library',
            accelerator: 'F5',
            click: () => {
              this.ipcHandler.sendToRenderer('library:refresh');
            },
          },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About VideoPlayer2',
            click: () => {
              this.showAboutDialog();
            },
          },
        ],
      },
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          {
            label: 'About ' + app.getName(),
            role: 'about',
          },
          { type: 'separator' },
          {
            label: 'Services',
            role: 'services',
            submenu: [],
          },
          { type: 'separator' },
          {
            label: 'Hide ' + app.getName(),
            accelerator: 'Command+H',
            role: 'hide',
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            role: 'hideOthers',
          },
          {
            label: 'Show All',
            role: 'unhide',
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private async openMediaFolder(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Media Folder',
      message: 'Choose a folder containing Movies and TV Shows folders',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      // Trigger a manual scan of this folder
      this.mediaScanner.scanPath(folderPath);
    }
  }

  private async startMediaScan(): Promise<void> {
    try {
      await this.mediaScanner.scanAllDrives();
      this.ipcHandler.sendToRenderer('library:refresh');
    } catch (error) {
      console.error('Failed to start media scan:', error);
    }
  }

  private showAboutDialog(): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About VideoPlayer2',
      message: 'VideoPlayer2',
      detail: `Version: ${app.getVersion()}\\nElectron: ${process.versions.electron}\\nNode: ${process.versions.node}\\n\\nA cross-platform desktop media player for local video libraries.`,
      buttons: ['OK'],
    });
  }

  async cleanup(): Promise<void> {
    try {
      // Stop monitoring
      this.driveManager.stopMonitoring();
      
      // Cleanup IPC handlers
      this.ipcHandler.cleanup();
      
      // Close database
      this.database.close();
      
      console.log('Application cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Global app instance
let videoPlayerApp: VideoPlayerApp | null = null;

// Electron app event handlers
app.whenReady().then(async () => {
  try {
    videoPlayerApp = new VideoPlayerApp();
    await videoPlayerApp.initialize();
    await videoPlayerApp.createMainWindow();
    
    console.log('VideoPlayer2 started successfully');
  } catch (error) {
    console.error('Failed to start VideoPlayer2:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0 && videoPlayerApp) {
    await videoPlayerApp.createMainWindow();
  }
});

app.on('before-quit', async () => {
  if (videoPlayerApp) {
    await videoPlayerApp.cleanup();
  }
});

// Handle certificate errors in development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (process.env.NODE_ENV === 'development') {
    // In development, ignore certificate errors for localhost
    if (url.startsWith('https://localhost') || url.startsWith('http://localhost')) {
      event.preventDefault();
      callback(true);
      return;
    }
  }
  
  // Use default behavior for production
  callback(false);
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    console.warn('Blocked new window creation:', url);
    return { action: 'deny' };
  });
});

export default VideoPlayerApp;