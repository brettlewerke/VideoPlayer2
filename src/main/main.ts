/**
 * Main Electron process
 */

import { app, BrowserWindow, Menu, globalShortcut, nativeTheme, dialog } from 'electron';
import { join } from 'path';
import { platform } from 'os';
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { request } from 'http';
import { DatabaseManager } from './database/database.js';
import { DriveManager } from './services/drive-manager.js';
import { MediaScanner } from './services/media-scanner.js';
import { PlayerFactory } from './player/player-factory.js';
import { IpcHandler } from './ipc/ipc-handler.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';

class VideoPlayerApp {
  private mainWindow: BrowserWindow | null = null;
  private database: DatabaseManager;
  private playerFactory: PlayerFactory;
  private ipcHandler: IpcHandler;
  private driveManager: DriveManager;
  private mediaScanner: MediaScanner;

  constructor() {
    this.database = new DatabaseManager();
    this.playerFactory = new PlayerFactory();
    this.driveManager = new DriveManager(this.database);
    this.mediaScanner = new MediaScanner(this.database);
    this.ipcHandler = new IpcHandler(this.database, this.playerFactory, this.driveManager, this.mediaScanner);
  }

  async initialize(): Promise<void> {
    // Migrate user data from old app name (h-player) to new (hoser-video)
    await this.migrateUserData();
    
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
    
    console.log('Hoser Video application initialized successfully');
  }

  /**
   * Migrate user data from old app name (h-player) to new (hoser-video)
   * This is a one-time migration that preserves database, settings, and cache
   */
  private async migrateUserData(): Promise<void> {
    try {
      const appDataRoot = app.getPath('appData');
      const oldDataDir = join(appDataRoot, 'h-player');
      const newDataDir = app.getPath('userData'); // Will be 'hoser-video'
      
      // Check if old directory exists and new one doesn't (first run after rename)
      if (existsSync(oldDataDir) && !existsSync(newDataDir)) {
        console.log('[Migration] Migrating user data from h-player to hoser-video...');
        
        // Create new directory
        mkdirSync(newDataDir, { recursive: true });
        
        // Recursively copy all files and directories
        this.copyDirectory(oldDataDir, newDataDir);
        
        console.log('[Migration] User data migration completed successfully');
      } else if (existsSync(newDataDir)) {
        // Already migrated or fresh install
        console.log('[Migration] User data directory already exists, no migration needed');
      } else {
        // Fresh install
        console.log('[Migration] Fresh installation, no migration needed');
      }
    } catch (error) {
      console.error('[Migration] Failed to migrate user data:', error);
      // Don't throw - allow app to continue with fresh data
    }
  }

  /**
   * Recursively copy directory contents
   */
  private copyDirectory(source: string, destination: string): void {
    const entries = readdirSync(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = join(source, entry.name);
      const destPath = join(destination, entry.name);
      
      if (entry.isDirectory()) {
        mkdirSync(destPath, { recursive: true });
        this.copyDirectory(sourcePath, destPath);
      } else {
        copyFileSync(sourcePath, destPath);
        console.log(`[Migration] Copied: ${entry.name}`);
      }
    }
  }

  async createMainWindow(): Promise<void> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In both dev and prod, preload is at the same relative path from __dirname
    // __dirname in dev: dist/main/main
    // __dirname in prod (asar): dist/main/main
    const preloadPath = join(__dirname, '../preload/preload.js');
    
    console.log(`[Main] Creating window with preload: ${preloadPath}`);
    console.log(`[Main] __dirname: ${__dirname}`);
    console.log(`[Main] Development mode: ${isDevelopment}`);
    
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
      },
      icon: this.getAppIcon(),
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1f2937',
        symbolColor: '#ffffff',
      },
      show: false, // Don't show until ready
      title: 'Hoser Video',
      backgroundColor: '#050706'
    });

    // Load the renderer
    if (isDevelopment) {
      // Dynamically discover the running Vite dev server port
      try {
        const devUrl = await this.findViteDevServer();
        console.log(`[Main] Loading dev URL: ${devUrl}`);
        await this.mainWindow.loadURL(devUrl);
        this.mainWindow.webContents.openDevTools();
      } catch (error) {
        console.error('[Main] Failed to find Vite dev server:', error);
        console.error('[Main] Make sure Vite is running on port 3000 or set VITE_DEV_PORT');
        app.quit();
        return;
      }
    } else {
      // Production mode - load from built files
      // In asar: __dirname is dist/main/main, so renderer is at ../../renderer/index.html
      const indexPath = join(__dirname, '../../renderer/index.html');
      console.log(`[Main] Loading production file: ${indexPath}`);
      
      if (existsSync(indexPath)) {
        await this.mainWindow.loadFile(indexPath);
      } else {
        console.error(`[Main] Renderer index.html not found at: ${indexPath}`);
        console.error(`[Main] Searched from __dirname: ${__dirname}`);
        // Try to continue anyway in case the path resolution differs in asar
        try {
          await this.mainWindow.loadFile(indexPath);
        } catch (err) {
          console.error('[Main] Failed to load renderer:', err);
        }
      }
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
   * Attempt to find the Vite dev server by probing a set of candidate ports.
   * Returns the first responsive base URL. Throws if none are found.
   */
  private async findViteDevServer(): Promise<string> {
    const explicit = process.env.VITE_DEV_PORT ? [Number(process.env.VITE_DEV_PORT)] : [];
    const candidates = [...explicit, ...Array.from({ length: 20 }, (_, i) => 3000 + i)];
    
    console.log(`[dev] Searching for Vite dev server on ports: ${candidates.join(', ')}`);
    
    // First, try all ports once
    for (const port of candidates) {
      try {
        console.log(`[dev] Testing port ${port}...`);
        const isVite = await this.testPort(port);
        if (isVite) {
          console.log(`[dev] ✓ Found Vite dev server at http://localhost:${port}`);
          return `http://localhost:${port}`;
        }
      } catch (err) {
        console.log(`[dev] Port ${port} test failed: ${err}`);
      }
    }
    
    // If nothing found, wait a bit and try again (Vite might still be starting)
    console.log(`[dev] No Vite server found on first pass, waiting and retrying...`);
    await new Promise(r => setTimeout(r, 1000));
    
    for (const port of candidates) {
      try {
        const isVite = await this.testPort(port);
        if (isVite) {
          console.log(`[dev] ✓ Found Vite dev server at http://localhost:${port} (retry)`);
          return `http://localhost:${port}`;
        }
      } catch (err) {
        // Silent retry
      }
    }
    
    const msg = `Unable to locate Vite dev server on candidate ports: ${candidates.join(', ')}`;
    console.error(`[dev] ${msg}`);
    throw new Error(msg);
  }

  /**
   * Test if a port is responding with what looks like a Vite dev server
   */
  private testPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = request({
        hostname: '127.0.0.1', // Use IPv4 explicitly instead of 'localhost'
        port: port,
        path: '/',
        method: 'GET',
        timeout: 1000,
        family: 4 // Force IPv4
      }, (res) => {
        console.log(`[dev] Port ${port} returned status ${res.statusCode}`);
        
        // Accept successful responses and some dev server specific codes
        if (res.statusCode && (
          (res.statusCode >= 200 && res.statusCode < 300) || 
          res.statusCode === 426 || // Upgrade Required - common with Vite dev server
          res.statusCode === 304    // Not Modified
        )) {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
            // Stop reading once we have enough to check
            if (data.length > 500) {
              res.destroy();
            }
          });
          res.on('end', () => {
            const lowerData = data.toLowerCase();
            // Look for Vite-specific markers or typical HTML structure
            const isVite = lowerData.includes('vite') || 
                          lowerData.includes('<!doctype html') ||
                          lowerData.includes('<script type="module"') ||
                          lowerData.includes('@vite/client') ||
                          res.statusCode === 426; // 426 is often Vite dev server
            console.log(`[dev] Port ${port} response check: ${isVite ? 'VITE' : 'OTHER'} (${data.slice(0, 100)}...)`);
            resolve(isVite);
          });
          res.on('error', (err) => {
            console.log(`[dev] Port ${port} response error: ${err.message}`);
            resolve(false);
          });
        } else {
          // Non-success status - reject this port
          resolve(false);
        }
      });
      
      req.on('error', (err) => {
        console.log(`[dev] Port ${port} connection failed: ${err.message}`);
        resolve(false);
      });
      req.on('timeout', () => {
        console.log(`[dev] Port ${port} timeout`);
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  private async loadSettings(): Promise<void> {
    try {
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
            label: 'About Hoser Video',
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
      title: 'About Hoser Video',
      message: 'Hoser Video',
      detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\n\nA cross-platform desktop media player for local video libraries.`,
      buttons: ['OK'],
    });
  }

  async cleanup(): Promise<void> {
    try {
      // Stop monitoring
      this.driveManager.stopMonitoring();
      
      // Cleanup IPC handlers
      this.ipcHandler.cleanup();
      
      // Close and delete database to force fresh scan on next startup
      // This ensures new movies/shows are detected when drives are reconnected
      this.database.closeAndDelete();
      
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
    
    console.log('Hoser Video started successfully');
  } catch (error) {
    console.error('Failed to start Hoser Video:', error);
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