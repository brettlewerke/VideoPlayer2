/**
 * Main Electron process
 */

import { app, BrowserWindow, Menu, globalShortcut, nativeTheme, dialog, protocol } from 'electron';
import { join } from 'path';
import { platform } from 'os';
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync, readFileSync } from 'fs';
import { request } from 'http';
import { DatabaseManager } from './database/database.js';
import { DriveManager } from './services/drive-manager.js';
import { MediaScanner } from './services/media-scanner.js';
import { FileWatcher } from './services/file-watcher.js';
import { PosterFetcher } from './services/poster-fetcher.js';
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
  private fileWatcher: FileWatcher;
  private posterFetcher: PosterFetcher;

  constructor() {
    this.database = new DatabaseManager();
    this.playerFactory = new PlayerFactory();
    this.driveManager = new DriveManager(this.database);
    this.mediaScanner = new MediaScanner(this.database);
    this.fileWatcher = new FileWatcher();
    this.posterFetcher = new PosterFetcher(this.database);
    this.ipcHandler = new IpcHandler(this.database, this.playerFactory, this.driveManager, this.mediaScanner, this.posterFetcher);
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
    
    // Start file system watching
    await this.startFileWatching();
    
    // Start poster fetching in background (non-blocking)
    this.startPosterFetching();
    
    // Listen to drive events to update file watcher
    this.driveManager.on('driveConnected', (drive) => {
      console.log(`[Main] Drive connected: ${drive.label}, updating file watcher`);
      this.fileWatcher.addDrive(drive);
    });

    this.driveManager.on('driveDisconnected', (drive) => {
      console.log(`[Main] Drive disconnected: ${drive.label}, updating file watcher`);
      this.fileWatcher.removeDrive(drive.id);
    });
    
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
      console.log('[Main] Window ready-to-show event fired');
      this.mainWindow?.show();
      
      if (isDevelopment) {
        this.mainWindow?.focus();
        console.log('[Main] Window shown and focused');
      }
    });
    
    // Set window reference for poster fetcher to send updates
    this.posterFetcher.setMainWindow(this.mainWindow);
    
    // Fallback: Force show after a delay if ready-to-show doesn't fire
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log('[Main] Forcing window to show (ready-to-show timeout)');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    }, 3000);

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
    
    // Try up to 5 times with increasing delays
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        const delay = attempt * 1500; // 1.5s, 3s, 4.5s, 6s
        console.log(`[dev] Attempt ${attempt}/${maxAttempts} - waiting ${delay}ms before retry...`);
        await new Promise(r => setTimeout(r, delay));
      }
      
      for (const port of candidates) {
        try {
          if (attempt === 1) {
            console.log(`[dev] Testing port ${port}...`);
          }
          const isVite = await this.testPort(port);
          if (isVite) {
            console.log(`[dev] ✓ Found Vite dev server at http://localhost:${port}`);
            return `http://localhost:${port}`;
          }
        } catch (err) {
          if (attempt === 1) {
            console.log(`[dev] Port ${port} test failed: ${err}`);
          }
        }
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
        path: '/index.html', // Request index.html instead of root
        method: 'GET',
        timeout: 1000,
        family: 4 // Force IPv4
      }, (res) => {
        console.log(`[dev] Port ${port} returned status ${res.statusCode}`);
        
        // Accept successful responses, 404 (Vite serves specific routes), and some dev server specific codes
        if (res.statusCode && (
          (res.statusCode >= 200 && res.statusCode < 300) || 
          res.statusCode === 404 || // Vite returns 404 for / but is still running
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

  /**
   * Start file system watching for automatic media library updates
   */
  private async startFileWatching(): Promise<void> {
    try {
      // Get all connected drives
      const drives = await this.database.getDrives();
      const connectedDrives = drives.filter(d => d.isConnected);

      // Start watching
      this.fileWatcher.startWatching(connectedDrives);

      // Listen for rescan requests from file watcher
      this.fileWatcher.on('rescan-needed', async ({ driveId, type }) => {
        console.log(`[FileWatcher] Rescan triggered for drive ${driveId} (${type})`);
        
        try {
          // Find the drive
          const drive = await this.database.getDrives().then(drives => 
            drives.find(d => d.id === driveId)
          );

          if (drive && drive.isConnected) {
            console.log(`[FileWatcher] Starting rescan of drive: ${drive.label}`);
            await this.mediaScanner.scanDrive(drive);
            
            // Notify renderer to refresh the media list
            this.ipcHandler.sendToRenderer('media:updated', { driveId, type });
            console.log(`[FileWatcher] Rescan completed for drive: ${drive.label}`);
          }
        } catch (error) {
          console.error(`[FileWatcher] Rescan failed:`, error);
        }
      });

      console.log('[FileWatcher] File system monitoring started');
    } catch (error) {
      console.error('[FileWatcher] Failed to start file watching:', error);
      // Non-fatal - app can continue without file watching
    }
  }

  /**
   * Start poster fetching from OMDb API for movies/shows without posters
   * Runs asynchronously in the background - does not block app startup
   */
  private startPosterFetching(): void {
    // Fire and forget - runs in background
    this.posterFetcher.fetchAllMissingPosters().catch(error => {
      // Silent fail - don't let poster fetching errors crash the app
      console.error('[PosterFetcher] Background poster fetching failed:', error);
    });
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
      // Stop file watcher
      this.fileWatcher.stopAll();
      
      // Stop monitoring
      this.driveManager.stopMonitoring();
      
      // Cleanup IPC handlers
      this.ipcHandler.cleanup();
      
      // Close database (don't delete - we want to keep the data now with file watching)
      // The file watcher will keep the database updated
      
      console.log('Application cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Global app instance
let videoPlayerApp: VideoPlayerApp | null = null;

// Disable hardware acceleration if GPU process crashes (common in dev mode)
// Uncomment this line if you experience GPU process errors
// app.disableHardwareAcceleration();

// Register custom protocol for serving local poster files
// This must be done before app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'poster',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: false,
      stream: true
    }
  }
]);

// Electron app event handlers
app.whenReady().then(async () => {
  try {
    // Register the poster:// protocol handler
    protocol.registerFileProtocol('poster', (request, callback) => {
      // Convert poster://C:/path/to/file.jpg to C:\path\to\file.jpg
      const url = request.url.replace('poster:///', '');
      const filePath = decodeURIComponent(url).replace(/\//g, '\\');
      
      console.log(`[Protocol] Serving poster: ${filePath}`);
      
      if (existsSync(filePath)) {
        callback({ path: filePath });
      } else {
        console.error(`[Protocol] Poster file not found: ${filePath}`);
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    });
    
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