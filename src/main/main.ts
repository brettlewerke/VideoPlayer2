/**
 * Main Electron process
 */

import { app, BrowserWindow, Menu, globalShortcut, nativeTheme, dialog } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
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
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      // Development mode - load from Vite dev server
      await this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      // Production mode - load from built files
      const indexPath = join(__dirname, '../renderer/index.html');
      if (existsSync(indexPath)) {
        await this.mainWindow.loadFile(indexPath);
      } else {
        throw new Error('Renderer files not found. Please run "npm run build" first.');
      }
    }

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (process.env.NODE_ENV === 'development') {
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
    const iconPath = join(__dirname, '../assets/icon.png');
    return existsSync(iconPath) ? iconPath : undefined;
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